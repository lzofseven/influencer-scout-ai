import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import admin from 'firebase-admin';
import { LRUCache } from 'lru-cache';
import nodemailer from 'nodemailer';
import { generateVerificationEmail } from './emailTemplate.js';

// Load .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

try {
    if (admin.apps.length === 0) {
        admin.initializeApp({
            projectId: "influencer-pro-2025-lohan"
        });
    }
    console.log('✅ Firebase Admin Iniciado Localmente (Project ID: influencer-pro-2025-lohan)');
} catch (error: any) {
    console.error('❌ Firebase Admin Initialization Error:', error.message);
}

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSy_Colar_Aqui_A_Key";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "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";

// Cache L2 No Backend
const searchCache = new LRUCache<string, { influencers: any[], groundingUrls: string[] }>({
    max: 100,
    ttl: 1000 * 60 * 60, // 1 hora
});

// Cache for OTP verification
const otpCache = new LRUCache<string, { code: string }>({
    max: 1000,
    ttl: 1000 * 60 * 10, // 10 minutos
});

// Setup Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'influencerpro.lz@gmail.com',
        pass: process.env.EMAIL_PASS || 'lajj djys bseu mddh'
    }
});

// Middleware de Autenticação Estrita (Zero Trust)
const verifyAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Não autorizado. Token Ausente.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
};

// Rota de Busca (Híbrida: Gemni + DuckDuckGo + Scraping)
app.post('/api/search', verifyAuth, async (req: any, res: any) => {
    const { query } = req.body;
    const userUid = req.user.uid;

    if (!query) return res.status(400).json({ error: 'Query é obrigatória.' });

    try {
        console.log(`\n🔍 Iniciando busca para usuário: ${userUid}`);
        console.log(`📝 Query: "${query}"`);

        // 1. Validar tier e créditos
        const userRef = db.collection('users').doc(userUid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return res.status(404).json({ error: 'Usuário não encontrado.' });

        const userData = userDoc.data()!;
        const credits = userData.credits || 0;
        const userTier = userData.tier || 'Starter';

        if (credits < 1) return res.status(403).json({ error: 'Créditos insuficientes.' });

        // 3. Buscar Configurações de IA do Firestore (Dinamismo Total)
        console.log('--- Buscando Configurações de IA do Firestore ---');
        const aiSettingsRef = db.collection('settings').doc('ai');
        let aiSettingsDoc;
        try {
            aiSettingsDoc = await aiSettingsRef.get();
            console.log('✅ Firestore Settings Fetch Status:', aiSettingsDoc.exists ? 'Found' : 'Missing');
        } catch (fErr: any) {
            console.error('❌ FATAL: Erro ao ler Firestore (Settings):', fErr.message);
            throw fErr;
        }

        const aiSettings = aiSettingsDoc.exists ? aiSettingsDoc.data() : {
            primaryModel: 'gemini-2.0-flash',
            fallbackModel: 'moonshotai/kimi-k2.5',
            temperature: 0.1,
            maxTokens: 1500,
            enableFallback: true
        };

        const { primaryModel, fallbackModel, temperature, maxTokens, enableFallback } = aiSettings!;
        console.log(`🤖 Usando Modelo: ${primaryModel} (Fallback: ${enableFallback ? fallbackModel : 'Desativado'})`);

        let TARGET_PROFILES = 15;
        if (userTier === 'Starter') TARGET_PROFILES = 20;
        if (userTier === 'Scale') TARGET_PROFILES = 50;

        const normalizedQuery = query.toLowerCase().trim();
        if (searchCache.has(normalizedQuery)) {
            console.log('🚀 Cache Hit L2!');
            const cached = searchCache.get(normalizedQuery)!;
            return res.json(cached);
        }

        // --- STEP 1: Tradução e Extração de Intenção (Gemini) ---
        console.log('--- STEP 1: Extração de Intenção ---');
        const intentPrompt = `Você é um engenheiro de busca especializado em marketing de influência.
Análise a query do usuário: "${query}"
Extraia em JSON:
1. "keywords": array de strings para busca no DuckDuckGo (em inglês e português).
2. "niche": o nicho principal.
3. "location": cidade ou país se mencionado.
4. "minFollowers": número mínimo de seguidores se detectado.
Responda APENAS o JSON puro.`;

        let text = "{}";
        let isGeminiSuccess = false;

        try {
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: intentPrompt }] }],
                    generationConfig: {
                        temperature: temperature || 0.1,
                        maxOutputTokens: 150
                    }
                })
            });

            if (aiRes.ok) {
                const json = await aiRes.json();
                text = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                isGeminiSuccess = true;
            } else if (enableFallback) {
                console.error("Gemini Intent API failed. Falling back to Kimi...");
                const fallbackRes = await fetch("https://api.nvapi.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: fallbackModel || "moonshotai/kimi-k2.5",
                        messages: [{ role: "user", content: intentPrompt }],
                        max_tokens: 150,
                        temperature: temperature || 0.1
                    })
                });
                const json = await fallbackRes.json();
                text = json.choices?.[0]?.message?.content || "{}";
            }
        } catch (e) {
            console.error("Erro na extração de intenção:", e);
        }

        const intent = JSON.parse(text.replace(/```json|```/g, "").trim());
        console.log('✅ Intenção extraída:', intent);

        // --- STEP 2: Scrape DuckDuckGo (Híbrido) ---
        console.log('--- STEP 2: Web Scraping (DuckDuckGo) ---');
        const searchTerms = intent.keywords?.join(" ") || query;
        const ddgUrl = `https://duckduckgo.com/html/?q=site:instagram.com ${encodeURIComponent(searchTerms)}`;

        const ddgRes = await fetch(ddgUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
        });
        const ddgHtml = await ddgRes.text();

        // Regex para capturar handles do instagram
        const handleRegex = /instagram\.com\/([a-zA-Z0-9._]+)/g;
        const foundHandles = new Set<string>();
        let match;
        while ((match = handleRegex.exec(ddgHtml)) !== null) {
            const h = match[1].toLowerCase();
            if (!['p', 'explore', 'reels', 'stories', 'direct', 'accounts'].includes(h)) {
                foundHandles.add(h);
            }
        }

        const handlesList = Array.from(foundHandles).slice(0, 40);
        console.log(`✅ Handles encontrados via Scraping: ${handlesList.length}`);

        // --- STEP 3: Enriquecimento via AI Service ---
        console.log('--- STEP 3: Enriquecimento de Dados ---');
        const analysisPrompt = `Analise os seguintes perfis do Instagram no nicho "${intent.niche}": ${handlesList.join(", ")}.
Gere um array JSON de objetos contendo os seguintes campos para os ${TARGET_PROFILES} melhores:
"name", "handle", "platform" (sempre "Instagram"), "followerCount", "engagementRate", "category", "bioUrl".
Baseie-se em estimativas realistas para o nicho se necessário.
Responda APENAS o array JSON.`;

        let influencers: any[] = [];
        try {
            const analysisRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
                    generationConfig: {
                        temperature: temperature || 0.1,
                        maxOutputTokens: maxTokens || 1500
                    }
                })
            });

            if (analysisRes.ok) {
                const json = await analysisRes.json();
                const textRes = json.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
                influencers = JSON.parse(textRes.replace(/```json|```/g, "").trim());
            } else if (enableFallback) {
                console.error("Gemini Analysis failing. Falling back to Kimi...");
                const fallbackRes = await fetch("https://api.nvapi.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: fallbackModel || "moonshotai/kimi-k2.5",
                        messages: [{ role: "user", content: analysisPrompt }],
                        max_tokens: maxTokens || 1500,
                        temperature: temperature || 0.1
                    })
                });
                const json = await fallbackRes.json();
                influencers = JSON.parse(json.choices?.[0]?.message?.content.replace(/```json|```/g, "") || "[]");
            }
        } catch (e) {
            console.error("Erro na análise de influencers:", e);
        }

        const uniqueGroundingUrls = [`https://www.instagram.com/explore/tags/${intent.niche?.replace(/\s/g, '')}`];

        // Cache e Credits
        searchCache.set(normalizedQuery, { influencers, groundingUrls: uniqueGroundingUrls });

        await userRef.update({
            credits: admin.firestore.FieldValue.increment(-1)
        });

        await db.collection('history').add({
            userId: userUid,
            query: query,
            resultsCount: influencers.length,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            results: influencers
        });

        return res.json({ influencers, groundingUrls: uniqueGroundingUrls });

    } catch (error: any) {
        console.error("Erro no proxy de busca:", error);
        res.status(500).json({ error: 'Erro interno no servidor de IA.' });
    }
});

// Endpoint de Webhook para Cakto (Monetização)
app.post('/api/webhooks/cakto', async (req, res) => {
    const { event, data } = req.body;
    if (!data || !data.order) return res.status(400).send('Payload inválido');
    console.log(`Webhook Cakto recebido: ${event}`);
    res.json({ status: 'ok' });
});

// Envio de OTP
app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpCache.set(email, { code });

    try {
        await transporter.sendMail({
            from: '"InfluencerPRO" <influencerpro.lz@gmail.com>',
            to: email,
            subject: `Código de Verificação: ${code}`,
            html: generateVerificationEmail(code)
        });
        res.json({ status: 'sent' });
    } catch (error) {
        console.error("Erro ao enviar e-mail:", error);
        res.status(500).json({ error: 'Erro ao enviar e-mail de verificação' });
    }
});

// Verificação de OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    const cached = otpCache.get(email);

    if (cached && cached.code === code) {
        res.json({ status: 'verified' });
    } else {
        res.status(400).json({ error: 'Código inválido ou expirado' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🔒 Server-side Security Layer running on port ${PORT}`);
});

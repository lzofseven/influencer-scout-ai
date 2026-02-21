import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { LRUCache } from 'lru-cache';
import nodemailer from 'nodemailer';
import { generateVerificationEmail } from './emailTemplate.js';

dotenv.config();

try {
    admin.initializeApp({
        projectId: "influencer-pro-2025-lohan"
    });
    console.log('✅ Firebase Admin Iniciado Localmente');
} catch (error) {
    console.log('⚠️ Firebase Admin Initialization Warning');
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
const verifyAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
        return res.status(401).json({ error: 'Token Inválido ou Expirado.' });
    }
};

declare global {
    namespace Express {
        interface Request {
            user?: admin.auth.DecodedIdToken;
        }
    }
}

const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs: number = 2500) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
};

// Rotas de Autenticação (OTP + Cloudflare Turnstile)
app.post('/api/auth/send-otp', async (req, res) => {
    const { email, turnstileToken } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });

    // Verificar Cloudflare Turnstile (Se fornecido)
    if (turnstileToken) {
        try {
            const formData = new URLSearchParams();
            formData.append('secret', process.env.TURNSTILE_SECRET_KEY || 'OGijRLyCv5hY-_KHMsnGd8P1iP_wU9RXE5lLcmDy');
            formData.append('response', turnstileToken);

            const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const cfData = await cfRes.json();
            if (!cfData.success) {
                return res.status(403).json({ error: 'Falha na verificação de segurança (Cloudflare).' });
            }
        } catch (err) {
            return res.status(500).json({ error: 'Erro ao validar recaptcha.' });
        }
    }

    // Gerar código de 6 digitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpCache.set(email, { code });

    const nomeUser = req.body.nome || "Usuário(a)";
    const htmlContent = generateVerificationEmail(code, nomeUser);

    try {
        await transporter.sendMail({
            from: `"InfluencerPRO" <${process.env.EMAIL_USER || 'influencerpro.lz@gmail.com'}>`,
            to: email,
            subject: 'InfluencerPRO - O teu código de verificação',
            html: htmlContent
        });
        return res.json({ success: true, message: 'OTP enviado com sucesso.' });
    } catch (error) {
        console.error("Erro ao enviar email OTP:", error);
        return res.status(500).json({ error: 'Falha ao enviar e-mail de código.' });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email e código são obrigatórios.' });

    const storedData = otpCache.get(email);
    if (!storedData) {
        return res.status(400).json({ error: 'Código expirado ou não encontrado.' });
    }

    if (storedData.code !== code) {
        return res.status(400).json({ error: 'Código incorreto.' });
    }

    otpCache.delete(email);
    return res.json({ success: true, message: 'Código verificado com sucesso.' });
});

// Rota Segura de Busca
app.post('/api/search', verifyAuth, async (req, res) => {
    const { query, userTier } = req.body;
    const uid = req.user!.uid;

    if (!query) return res.status(400).json({ error: 'Query vazia.' });

    try {
        // 1. Validar Créditos NO SERVIDOR (Impenetrável)
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Usuário não encontrado no banco.' });
        }

        const userData = userDoc.data();
        if (userData!.credits < 1) {
            return res.status(403).json({ error: 'Créditos insuficientes. Acesso negado pela SecOps.' });
        }

        let TARGET_PROFILES = 15;
        if (userTier === 'Starter') TARGET_PROFILES = 20;
        if (userTier === 'Scale') TARGET_PROFILES = 50;

        const normalizedQuery = query.toLowerCase().trim();
        if (searchCache.has(normalizedQuery)) {
            const cachedData = searchCache.get(normalizedQuery)!;

            // 2. Debitar crédito APÓS buscar com sucesso
            await userRef.update({ credits: admin.firestore.FieldValue.increment(-1) });

            // Salvar histórico no Firebase Server-Side
            await db.collection('users').doc(uid).collection('searchHistory').add({
                query: query,
                resultsCount: Math.min(cachedData.influencers.length, TARGET_PROFILES),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                results: cachedData.influencers.slice(0, TARGET_PROFILES)
            });

            return res.json({
                influencers: cachedData.influencers.slice(0, TARGET_PROFILES),
                groundingUrls: cachedData.groundingUrls
            });
        }

        // --- LÓGICA DE IA MIGRADA DO CLIENTE ---
        const startTime = Date.now();
        const HARD_TIMEOUT = 18000;

        const intentPrompt = `O usuário digitou: "${query}".\nExtraia o nicho principal pesquisado e o requisito numérico mínimo de seguidores.\nSe o usuário não especificar uma quantidade de seguidores explícita, assuma 10000 como mínimo padrão.\nRetorne EXATAMENTE UM JSON com as duas propriedades: \n - "cleanedQuery": o termo ideal para buscar no instagram(ex: "matemática e finanças").\n - "minFollowers": um número inteiro. (ex: se pediu "10 mil", retorne 10000. se pediu "1M", retorne 1000000. se não falar número, 10000).`;

        let cleanedQuery = query;
        let minFollowers = 10000;

        try {
            let aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: intentPrompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 150
                    }
                })
            });
            let isGeminiSuccess = aiRes.ok;
            let json;
            let text = "{}";

            if (isGeminiSuccess) {
                json = await aiRes.json();
                text = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            } else {
                console.error("Gemini Intent API failed:", await aiRes.text(), "Falling back to Kimi...");
                aiRes = await fetch("https://api.nvapi.com/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "moonshotai/kimi-k2.5",
                        messages: [{ role: "user", content: intentPrompt }],
                        max_tokens: 150,
                        temperature: 0.1
                    })
                });
                if (aiRes.ok) {
                    json = await aiRes.json();
                    text = json.choices?.[0]?.message?.content || "{}";
                }
            }

            text = text.replace(/```json /gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(text);
            if (parsed.cleanedQuery) cleanedQuery = parsed.cleanedQuery;
            if (parsed.minFollowers) minFollowers = parsed.minFollowers;
        } catch (e) {
            console.error("Erro Intent:", e);
        }

        let allHandles = new Set<string>();
        const validProfiles: any[] = [];
        const groundingUrls: string[] = [];
        let searchRound = 0;
        const MAX_ROUNDS = 5;

        const discoverHandles = async (currentQuery: string, round: number) => {
            const promises = [];
            if (round < 2) {
                const duckQueries = [
                    `site:instagram.com ${currentQuery}`,
                    `site:instagram.com "criador de conteúdo" ${currentQuery}`
                ];
                promises.push(...duckQueries.map(async (sq) => {
                    try {
                        // Note: DuckDuckGo proxy is running locally or we hit directly
                        const searchRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(sq)}`);
                        if (!searchRes.ok) return;
                        const htmlText = await searchRes.text();
                        const instaRegex = /instagram\.com\/([a-zA-Z0-9._]+)\/?/g;
                        const matches = [...htmlText.matchAll(instaRegex)];
                        const ignoredHandles = ['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'about', 'developer', 'instagram', 'help', 'legal', 'privacy', 'terms', 'directory', 'tags', 'blog', 'press', 'api', 'support', 'jobs'];
                        matches.forEach(m => {
                            const h = m[1].toLowerCase().trim();
                            if (!ignoredHandles.includes(h) && h.length > 2) allHandles.add(h);
                        });
                    } catch (e) { }
                }));
            }

            const handlesPrompt = `Retorne um array JSON com 50 handles de Instagram sobre "${currentQuery}". Somente o JSON.`;
            promises.push(fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: handlesPrompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000
                    }
                })
            }).then(async (res) => {
                let text = "[]";
                if (res.ok) {
                    const json = await res.json();
                    text = json.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
                } else {
                    console.error("Gemini Handles API failed:", await res.text(), "Falling back to Kimi...");
                    const fallbackRes = await fetch("https://api.nvapi.com/v1/chat/completions", {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ model: "moonshotai/kimi-k2.5", messages: [{ role: "user", content: handlesPrompt }], max_tokens: 1000, temperature: 0.7 })
                    });
                    if (fallbackRes.ok) {
                        const json = await fallbackRes.json();
                        text = json.choices?.[0]?.message?.content || "[]";
                    }
                }

                text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                const kimiHandles = JSON.parse(text);
                if (Array.isArray(kimiHandles)) {
                    kimiHandles.forEach((h: string) => allHandles.add(h.replace('@', '').toLowerCase().trim()));
                }
            }).catch(() => { }));

            await Promise.race([Promise.all(promises), new Promise(r => setTimeout(r, 6000))]);
        };

        await discoverHandles(cleanedQuery, 0);

        while (validProfiles.length < TARGET_PROFILES && searchRound < MAX_ROUNDS) {
            if (Date.now() - startTime > HARD_TIMEOUT) break;

            const unprocessedHandles = Array.from(allHandles).filter(h => !validProfiles.some(v => v.user_info.username.toLowerCase() === h));
            const validationChunk = unprocessedHandles.slice(0, 80);

            await Promise.all(validationChunk.map(async (h) => {
                if (validProfiles.length >= TARGET_PROFILES || Date.now() - startTime > HARD_TIMEOUT) return;
                try {
                    const instaRes = await fetchWithTimeout(`https://insta-api-lz.pages.dev/api?username=${h}`, {}, 2500);
                    if (instaRes.ok) {
                        const profileData = await instaRes.json();
                        const followers = profileData?.user_info?.follower_count || 0;
                        if (profileData?.user_info?.username && followers >= (searchRound > 1 ? 500 : minFollowers)) {
                            if (validProfiles.length < TARGET_PROFILES && !validProfiles.some(p => p.user_info.username === profileData.user_info.username)) {
                                validProfiles.push(profileData);
                                groundingUrls.push(`https://instagram.com/${profileData.user_info.username}`);
                            }
                        }
                    }
                } catch (e) { }
            }));

            if (validProfiles.length < TARGET_PROFILES) {
                searchRound++;
                await discoverHandles(cleanedQuery, searchRound);
            }
        }

        if (validProfiles.length === 0) {
            return res.json({ influencers: [], groundingUrls: [] });
        }

        const simplifiedProfilesForLLM = validProfiles.map(p => ({
            username: p.user_info.username,
            category: p.user_info.category,
            biography: p.user_info.biography,
            follower_count: p.user_info.follower_count,
            recent_captions: p.posts?.slice(0, 3).map((post: any) => post.caption?.substring(0, 150) || "")
        }));

        const LLM_CHUNK_SIZE = 15;
        const llmPromises = [];
        let influencers: any[] = [];

        for (let i = 0; i < simplifiedProfilesForLLM.length; i += LLM_CHUNK_SIZE) {
            const chunk = simplifiedProfilesForLLM.slice(i, i + LLM_CHUNK_SIZE);
            const analysisPrompt = `Abaixo estão os dados RESUMIDOS da NOSSA API OFICIAL para ${chunk.length} influenciadores.
DADOS JSON:
---
${JSON.stringify(chunk)}
---
Sua Tarefa: Transforme e embeleze os dados acima para exibição no frontend.
Retorne EXATAMENTE UM ARRAY DE OBJETOS JSON com as chaves:
- "name": O nome oficial ou do username
- "handle": "@" + username
- "platform": "Instagram"
- "followerCount": Um string amigável (ex: "1.2M", "500K", converta o follower_count)
- "engagementRate": "0.00%"
- "bioUrl": "https://instagram.com/" + username
- "summary": Um breve resumo MTO CRIATIVO e PREMIUM em Português sobre o tipo de conteúdo (aprox 2 linhas max).
- "topics": Array de strings com 3 tópicos/nichos em português.
- "location": "Brasil"
- "profilePicUrl": "vazio"
- "sourceUrl": A url do instagram dele.
LEMBRE-SE: Retorne APENAS o JSON puro \`[ { ... } ]\` sem formatação extra!`;

            llmPromises.push(
                Promise.race([
                    fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
                            generationConfig: {
                                temperature: 0.1,
                                maxOutputTokens: 1500
                            }
                        })
                    }).then(async (res) => {
                        let text = "[]";
                        if (res.ok) {
                            const json = await res.json();
                            text = json.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
                        } else {
                            console.error("Gemini Analysis API failed:", await res.text(), "Falling back to Kimi...");
                            const fallbackRes = await fetch("https://api.nvapi.com/v1/chat/completions", {
                                method: "POST",
                                headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
                                body: JSON.stringify({ model: "moonshotai/kimi-k2.5", messages: [{ role: "user", content: analysisPrompt }], max_tokens: 1500, temperature: 0.1 })
                            });
                            if (fallbackRes.ok) {
                                const json = await fallbackRes.json();
                                text = json.choices?.[0]?.message?.content || "[]";
                            } else {
                                return [];
                            }
                        }

                        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                        let parsedBatch: any[] = [];
                        try { parsedBatch = JSON.parse(text); } catch (e) { return []; }

                        parsedBatch.forEach((inf: any) => {
                            if (!inf.handle) return;
                            const infClean = inf.handle.replace('@', '').toLowerCase().trim();
                            const realProfile = validProfiles.find(p => p.user_info.username.toLowerCase() === infClean);
                            if (realProfile) {
                                const formattedFollowers = Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(realProfile.user_info.follower_count || 0);
                                const finalInfluencer = {
                                    ...inf,
                                    followerCount: formattedFollowers,
                                    profilePicUrl: realProfile.user_info.profile_pic_url,
                                    originalBio: realProfile.user_info.biography || "",
                                    views_count: realProfile.metrics?.total_loaded?.views || 0,
                                    likes_count: realProfile.metrics?.total_loaded?.likes || 0,
                                    posts_count: realProfile.metrics?.total_loaded?.posts || 0,
                                    comments_count: realProfile.metrics?.total_loaded?.comments || 0,
                                    category: realProfile.user_info.category || undefined,
                                    engagementRate: realProfile.metrics?.total_loaded?.engagement || inf.engagementRate,
                                    lastPostImageUrl: realProfile.posts?.[0]?.image_url || undefined,
                                };
                                if (!influencers.some(i => i.handle === finalInfluencer.handle)) influencers.push(finalInfluencer);
                            }
                        });
                        return parsedBatch;
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
                ]).catch(() => [])
            );
        }

        await Promise.all(llmPromises).catch(() => { });

        if (influencers.length === 0) {
            influencers = validProfiles.map(p => ({
                name: p.user_info.full_name || p.user_info.username,
                handle: "@" + p.user_info.username,
                platform: "Instagram",
                followerCount: Intl.NumberFormat('en-US', { notation: "compact" }).format(p.user_info.follower_count),
                engagementRate: p.metrics?.total_loaded?.engagement || "Oculto",
                bioUrl: `https://instagram.com/${p.user_info.username}`,
                summary: p.user_info.biography?.substring(0, 160) || "Perfil verificado",
                topics: [p.user_info.category || "Criador"],
                location: "Brasil",
                profilePicUrl: p.user_info.profile_pic_url,
                sourceUrl: `https://instagram.com/${p.user_info.username}`,
                views_count: p.metrics?.total_loaded?.views || 0,
                likes_count: p.metrics?.total_loaded?.likes || 0,
                posts_count: p.metrics?.total_loaded?.posts || 0,
                comments_count: p.metrics?.total_loaded?.comments || 0,
                lastPostImageUrl: p.posts?.[0]?.image_url
            }));
        }

        const uniqueGroundingUrls = Array.from(new Set(groundingUrls));
        searchCache.set(normalizedQuery, { influencers, groundingUrls: uniqueGroundingUrls });

        // CREDIT DEDUCTION IS COMPLETELY SECURE: Done after successful search
        // Server-side deduction
        await userRef.update({ credits: admin.firestore.FieldValue.increment(-1) });

        // Server-side history logging
        await db.collection('users').doc(uid).collection('searchHistory').add({
            query: query,
            resultsCount: Math.min(influencers.length, TARGET_PROFILES),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            results: influencers.slice(0, TARGET_PROFILES)
        });

        return res.json({ influencers, groundingUrls: uniqueGroundingUrls });

    } catch (error: any) {
        console.error("Erro no proxy de busca:", error);
        res.status(500).json({ error: 'Erro interno no servidor de IA.' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🔒 Server-side Security Layer running on port ${PORT}`);
});

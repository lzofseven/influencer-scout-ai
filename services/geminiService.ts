import { Influencer } from "../types";
import { LRUCache } from 'lru-cache';

// Cache para armazenar buscas frequentes e poupar dinheiro de API e tempo (Inspiração da Ideia #1)
const searchCache = new LRUCache<string, { influencers: Influencer[], groundingUrls: string[] }>({
  max: 100, // Armazena as últimas 100 pesquisas distintas
  ttl: 1000 * 60 * 60, // 1 hora de validade
});

const NVIDIA_API_KEY = "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";

export const searchInfluencers = async (
  query: string,
  onProgress?: (msg: string, current: number, target: number) => void,
  onInfluencerReady?: (influencer: Influencer) => void
): Promise<{ influencers: Influencer[], groundingUrls: string[] }> => {
  // 0. Cache Check Imediato
  const normalizedQuery = query.toLowerCase().trim();
  if (searchCache.has(normalizedQuery)) {
    console.log(`📦 DELIVERING FROM CACHE: ${normalizedQuery}`);
    if (onProgress) onProgress(`Recuperando cache super-rápido para "${normalizedQuery}"...`, 15, 15);
    // Simula um delay minimo para UI não piscar brutalmente
    await new Promise(r => setTimeout(r, 800));
    return searchCache.get(normalizedQuery)!;
  }
  try {
    const TARGET_PROFILES = 15;
    const startTime = Date.now();
    const HARD_TIMEOUT = 18000; // 18 segundos de limite rígido para GARANTIR < 20s

    // 1. Decodificar a Intenção do Usuário (Nicho + Seguidores Dinâmicos) e Iniciar Buscas em Paralelo
    const intentPrompt = `O usuário digitou: "${query}".
Extraia o nicho principal pesquisado e o requisito numérico mínimo de seguidores.
Se o usuário não especificar uma quantidade de seguidores explícita, assuma 10000 como mínimo padrão.
Retorne EXATAMENTE UM JSON com as duas propriedades:
- "cleanedQuery": o termo ideal para buscar no instagram (ex: "matemática e finanças").
- "minFollowers": um número inteiro. (ex: se pediu "10 mil", retorne 10000. se pediu "1M", retorne 1000000. se não falar número, 10000).`;

    // Iniciar decodificação de intenção em background
    const intentPromise = fetch("/api/nvidia/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "moonshotai/kimi-k2.5",
        messages: [{ role: "user", content: intentPrompt }],
        max_tokens: 150,
        temperature: 0.1
      })
    }).then(async (res) => {
      if (res.ok) {
        const json = await res.json();
        let text = json.choices?.[0]?.message?.content || "{}";
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(text);
      }
      return { cleanedQuery: query, minFollowers: 10000 };
    }).catch(() => ({ cleanedQuery: query, minFollowers: 10000 }));

    // Inicia progresso na UI imediatamente
    if (onProgress) onProgress(query, 0, TARGET_PROFILES);

    let allHandles = new Set<string>();
    const validProfiles: any[] = [];
    const groundingUrls: string[] = [];
    let searchRound = 0;
    const MAX_ROUNDS = 5; // Reduzido para velocidade agressiva

    // 2. BUSCA MULTIFACETADA PARALELA (Handle Discovery)
    const discoverHandles = async (currentQuery: string, round: number) => {
      const promises = [];

      // DuckDuckGo em paralelo (Limitado a 2 para velocidade)
      if (round < 2) {
        const duckQueries = [
          `site:instagram.com ${currentQuery}`,
          `site:instagram.com "criador de conteúdo" ${currentQuery}`
        ];
        promises.push(...duckQueries.map(async (sq) => {
          try {
            const searchRes = await fetch(`/api/ddg/html/?q=${encodeURIComponent(sq)}`);
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

      // Kimi gera handles em paralelo (Apenas se DuckDuckGo falhar em dar massa crítica)
      if (allHandles.size < 15) {
        const handlesPrompt = `Retorne um array JSON com 50 handles de Instagram sobre "${currentQuery}". Somente o JSON sem texto.`;
        promises.push(fetch("/api/nvidia/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "moonshotai/kimi-k2.5", messages: [{ role: "user", content: handlesPrompt }], max_tokens: 1000, temperature: 0.7 })
        }).then(async (res) => {
          if (res.ok) {
            const json = await res.json();
            let text = json.choices?.[0]?.message?.content || "[]";
            text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            const kimiHandles = JSON.parse(text);
            if (Array.isArray(kimiHandles)) {
              kimiHandles.forEach((h: string) => allHandles.add(h.replace('@', '').toLowerCase().trim()));
            }
          }
        }).catch(() => { }));
      }

      // Aguarda no máximo 6s por esta rodada de descoberta
      await Promise.race([
        Promise.all(promises),
        new Promise(r => setTimeout(r, 6000))
      ]);
    };

    // Aguarda apenas a primeira descoberta rápida
    await discoverHandles(query, 0);

    // Resolve intenção para saber o minFollowers real (com fallback robusto)
    const intentRes = await intentPromise || { cleanedQuery: query, minFollowers: 10000 };
    const minFollowers = typeof intentRes.minFollowers === 'number' ? intentRes.minFollowers : 10000;
    const cleanedQuery = intentRes.cleanedQuery || query;

    console.log(`Buscando "${cleanedQuery}" com minFollowers >= ${minFollowers}.`);

    while (validProfiles.length < TARGET_PROFILES && searchRound < MAX_ROUNDS) {
      // Check hard timeout
      if (Date.now() - startTime > HARD_TIMEOUT) {
        console.warn("Hard timeout reached during profile validation. Returning partial results.");
        break;
      }

      const unprocessedHandles = Array.from(allHandles).filter(
        h => !validProfiles.some(v => v.user_info.username.toLowerCase() === h)
      );

      // Validação massiva (chunks pequenos para liberar o event loop e emitir parciais mais rápido)
      const validationChunk = unprocessedHandles.slice(0, 40);
      await Promise.all(validationChunk.map(async (h) => {
        if (validProfiles.length >= TARGET_PROFILES || Date.now() - startTime > HARD_TIMEOUT) return;
        try {
          const instaRes = await fetch(`https://insta-api-lz.pages.dev/api?username=${h}`);
          if (instaRes.ok) {
            const profileData = await instaRes.json();
            const followers = profileData?.user_info?.follower_count || 0;
            if (profileData?.user_info?.username && followers >= (searchRound > 1 ? 500 : minFollowers)) {
              if (validProfiles.length < TARGET_PROFILES && !validProfiles.some(p => p.user_info.username === profileData.user_info.username)) {
                validProfiles.push(profileData);
                groundingUrls.push(`https://instagram.com/${profileData.user_info.username}`);

                const partial: Influencer = {
                  name: profileData.user_info.full_name || profileData.user_info.username,
                  handle: "@" + profileData.user_info.username,
                  platform: "Instagram",
                  followerCount: Intl.NumberFormat('en-US', { notation: "compact" }).format(followers),
                  engagementRate: profileData.metrics?.total_loaded?.engagement || "Calculando...",
                  bioUrl: `https://instagram.com/${profileData.user_info.username}`,
                  summary: "Analisando perfil com IA...",
                  topics: [profileData.user_info.category || "Influenciador"],
                  location: "Brasil",
                  profilePicUrl: profileData.user_info.profile_pic_url,
                  sourceUrl: `https://instagram.com/${profileData.user_info.username}`,
                  originalBio: profileData.user_info.biography
                };
                if (onInfluencerReady) onInfluencerReady(partial);
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


    // Fallback de emergência (raro agora)
    if (validProfiles.length === 0) {
      console.warn("Nenhum perfil válido ou aberto encontrado na API com os requisitos exigidos.");
      return { influencers: [], groundingUrls: [] };
    }

    // 3. IA analisa os perfis válidos OBTIDOS REAIS. 
    // Para nã estourar o limite de Contexto da IA (e economizar dinheiro), simplificamos o objeto enviado.
    const simplifiedProfilesForLLM = validProfiles.map(p => ({
      username: p.user_info.username,
      category: p.user_info.category,
      biography: p.user_info.biography,
      follower_count: p.user_info.follower_count,
      // Reduzimos as legendas para 3 e o tamanho da string para ser extremamente rapido no processamento paralelo
      recent_captions: p.posts?.slice(0, 3).map((post: any) => post.caption?.substring(0, 150) || "")
    }));

    console.log(`Enviando ${simplifiedProfilesForLLM.length} perfis reais para o Kimi resumir EM PARALELO...`);

    const LLM_CHUNK_SIZE = 15; // Aumentado para 15 para fazer apenas 1 request total
    const llmPromises = [];
    let influencers: Influencer[] = [];

    for (let i = 0; i < simplifiedProfilesForLLM.length; i += LLM_CHUNK_SIZE) {
      const chunk = simplifiedProfilesForLLM.slice(i, i + LLM_CHUNK_SIZE);

      const analysisPrompt = `Abaixo estão os dados RESUMIDOS da NOSSA API OFICIAL para ${chunk.length} influenciadores.

DADOS JSON:
---
${JSON.stringify(chunk)}
---

Sua Tarefa: Transforme e embeleze os dados acima para exibição no frontend.
Crie resumos engajadores sobre o conteúdo deles com base na biografia e captions.

Retorne EXATAMENTE UM ARRAY DE OBJETOS JSON com as chaves:
- "name": O nome oficial ou do username
- "handle": "@" + username
- "platform": "Instagram"
- "followerCount": Um string amigável (ex: "1.2M", "500K", converta o follower_count)
- "engagementRate": "0.00%" (pode mandar 0.00%, nosso sistema vai substituir pela métrica oficial depois)
- "bioUrl": "https://instagram.com/" + username
- "summary": Um breve resumo MTO CRIATIVO e PREMIUM em Português sobre o tipo de conteúdo (aprox 2 linhas max).
- "topics": Array de strings com 3 tópicos/nichos em português.
- "location": "Brasil"
- "profilePicUrl": "vazio" (pode deixar vazio, sistema substituirá).
- "sourceUrl": A url do instagram dele.

LEMBRE-SE: Retorne APENAS o JSON puro \`[ { ... } ]\` sem formatação extra!`;

      llmPromises.push(
        Promise.race([
          fetch("/api/nvidia/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${NVIDIA_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "moonshotai/kimi-k2.5",
              messages: [{ role: "user", content: analysisPrompt }],
              max_tokens: 1500, // Reduzido para ser mais rápido
              temperature: 0.1
            })
          }).then(async (res) => {
            if (!res.ok) return [];
            const json = await res.json();
            let text = json.choices?.[0]?.message?.content || "[]";
            text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            let parsedBatch: any[] = [];
            try {
              parsedBatch = JSON.parse(text);
            } catch (e) {
              return [];
            }

            parsedBatch.forEach((inf: any) => {
              if (!inf.handle) return;
              const infClean = inf.handle.replace('@', '').toLowerCase().trim();
              const realProfile = validProfiles.find(p => p.user_info.username.toLowerCase() === infClean);

              if (realProfile) {
                const rawFollowers = realProfile.user_info.follower_count || 0;
                const formattedFollowers = Intl.NumberFormat('en-US', {
                  notation: "compact",
                  maximumFractionDigits: 1
                }).format(rawFollowers);

                const finalInfluencer: Influencer = {
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

                // Evitar duplicados na lista final
                if (!influencers.some(i => i.handle === finalInfluencer.handle)) {
                  influencers.push(finalInfluencer);
                  if (onInfluencerReady) onInfluencerReady(finalInfluencer);
                }
              }
            });

            return parsedBatch;
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
        ]).catch(() => [])
      );
    }

    // Aguarda apenas 10s para a IA terminar tudo, se não der, devolve o que tem
    await Promise.all(llmPromises).catch(() => { });

    // Se o array final de influencers analisados estiver vazio (ex: falha na IA/429), 
    // preenchemos com os dados básicos dos validProfiles para não retornar nada vazio.
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

    // Grava no cache ANTES de devolver
    const uniqueGroundingUrls = Array.from(new Set(groundingUrls));
    searchCache.set(normalizedQuery, { influencers, groundingUrls: uniqueGroundingUrls });

    return { influencers, groundingUrls: uniqueGroundingUrls };

  } catch (error) {
    console.error("Error computing Kimi & InstaAPI workflow:", error);
    throw error;
  }
};

export const generateInfluencerImage = async (topics: string[], aesthetic: string): Promise<string | null> => {
  // O modelo Kimi não gera imagens diretamente por este endpoint na Nvidia.
  // Vamos pular a geração ou retornar um placeholder simples para manter o app visualmente funcional.
  return null;
};
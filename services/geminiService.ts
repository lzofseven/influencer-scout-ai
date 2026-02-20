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

    // 1. Decodificar a Intenção do Usuário (Nicho + Seguidores Dinâmicos)
    const intentPrompt = `O usuário digitou: "${query}".
Extraia o nicho principal pesquisado e o requisito numérico mínimo de seguidores.
Se o usuário não especificar uma quantidade de seguidores explícita, assuma 10000 como mínimo padrão.
Retorne EXATAMENTE UM JSON com as duas propriedades:
- "cleanedQuery": o termo ideal para buscar no instagram (ex: "matemática e finanças").
- "minFollowers": um número inteiro. (ex: se pediu "10 mil", retorne 10000. se pediu "1M", retorne 1000000. se não falar número, 10000).`;

    let cleanedQuery = query;
    let minFollowers = 10000;

    try {
      const intentRes = await fetch("/api/nvidia/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "moonshotai/kimi-k2.5",
          messages: [{ role: "user", content: intentPrompt }],
          max_tokens: 150,
          temperature: 0.1
        })
      });
      if (intentRes.ok) {
        const intentJson = await intentRes.json();
        let intentText = intentJson.choices?.[0]?.message?.content || "{}";
        intentText = intentText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsedIntent = JSON.parse(intentText);
        if (parsedIntent.cleanedQuery) cleanedQuery = parsedIntent.cleanedQuery;
        if (typeof parsedIntent.minFollowers === 'number') minFollowers = parsedIntent.minFollowers;
      }
    } catch (e) {
      console.warn("Falha ao decodificar intenção, usando padrões", e);
    }

    // Inicia progresso na UI
    if (onProgress) onProgress(cleanedQuery, 0, TARGET_PROFILES);

    let allHandles = new Set<string>();
    const validProfiles: any[] = [];
    const groundingUrls: string[] = [];
    let searchRound = 0;
    let currentMinFollowers = minFollowers;
    const MAX_ROUNDS = 15;

    console.log(`Buscando "${cleanedQuery}" com minFollowers >= ${currentMinFollowers}. Alvo: ${TARGET_PROFILES}`);

    // Loop contínuo FORÇADO até encontrar exatamente 15 válidos, limitando a 15 rodadas
    while (validProfiles.length < TARGET_PROFILES && searchRound < MAX_ROUNDS) {

      // A cada 3 rodadas sem sucesso total, relaxamos a exigência de seguidores pela metade
      if (searchRound > 0 && searchRound % 3 === 0) {
        currentMinFollowers = Math.max(1000, Math.floor(currentMinFollowers / 2));
        console.log(`Dificuldade alta. Reduzindo filtro para: ${currentMinFollowers} seguidores`);
        if (onProgress) onProgress(`Relaxando filtro para ${currentMinFollowers} seg...`, validProfiles.length, TARGET_PROFILES);
      }

      // DDG só é usado nas primeiras rodadas, depois Kimi assume 100% pra evitar bloqueios do Google
      if (searchRound < 4) {
        const duckQueries = [
          `site:instagram.com ${cleanedQuery} ${searchRound > 0 ? "influenciador" : ""}`,
          `site:instagram.com "criador de conteúdo" ${cleanedQuery} ${searchRound > 1 ? "oficial" : ""}`,
          `melhores influenciadores de ${cleanedQuery} instagram ${searchRound > 0 ? "lista" : ""}`,
          `site:instagram.com "${cleanedQuery}" ${searchRound > 2 ? "contato" : ""}`,
          `site:instagram.com "k seguidores" ${cleanedQuery} ${searchRound > 2 ? "brasil" : ""}`
        ];

        await Promise.all(duckQueries.map(async (sq) => {
          try {
            const searchRes = await fetch(`/api/ddg/html/?q=${encodeURIComponent(sq)}`);
            if (!searchRes.ok) return;
            const htmlText = await searchRes.text();
            const instaRegex = /instagram\.com\/([a-zA-Z0-9._]+)\/?/g;
            const matches = [...htmlText.matchAll(instaRegex)];
            const ignoredHandles = ['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'about', 'developer', 'instagram', 'help', 'legal', 'privacy', 'terms', 'directory', 'tags', 'blog', 'press', 'api', 'support', 'jobs'];

            matches.forEach(m => {
              const h = m[1].toLowerCase().trim();
              if (!ignoredHandles.includes(h) && h.length > 2 && !allHandles.has(h)) {
                allHandles.add(h);
              }
            });
          } catch (e) { }
        }));
      }

      let unprocessedHandles = Array.from(allHandles).filter(
        h => !validProfiles.some(v => v.user_info.username.toLowerCase() === h)
      );

      // Se DDG falhou ou esgotou (poucos handles pra testar), Kimi FORÇA a criação de arrobas reais repetidamente
      if (unprocessedHandles.length < 15) {
        console.log("Kimi invocado para INJETAR force handles...");
        if (onProgress) onProgress(`IA gerando novos perfis de ${cleanedQuery}...`, validProfiles.length, TARGET_PROFILES);

        const alreadyExplored = Array.from(allHandles).slice(-50).join(', ');
        const handlesPrompt = `O sistema PRECISA de influenciadores reais focados no assunto: "${cleanedQuery}". 
         Retorne ESTRITAMENTE um array JSON puro com 45 handles reais e famosos do Instagram sem @.
         IMPORTANTE: Não repita NENHUM destes nomes: ${alreadyExplored}`;

        try {
          const kimiRes = await fetch("/api/nvidia/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "moonshotai/kimi-k2.5", messages: [{ role: "user", content: handlesPrompt }], max_tokens: 2000, temperature: 0.7 })
          });
          if (kimiRes.ok) {
            const kimiJson = await kimiRes.json();
            let text = kimiJson.choices?.[0]?.message?.content || "[]";
            text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            const kimiHandles = JSON.parse(text);
            if (Array.isArray(kimiHandles)) {
              kimiHandles.forEach((h: string) => allHandles.add(h.replace('@', '').toLowerCase().trim()));
            }
          }
        } catch (e) {
          console.error("Kimi handle generation failed", e);
        }

        // Re-calculamos logo em seguida
        unprocessedHandles = Array.from(allHandles).filter(
          h => !validProfiles.some(v => v.user_info.username.toLowerCase() === h)
        );
      }

      // Validação massiva em lotes 
      const CHUNK_SIZE = 25;
      for (let i = 0; i < unprocessedHandles.length; i += CHUNK_SIZE) {
        if (validProfiles.length >= TARGET_PROFILES) break;

        const chunk = unprocessedHandles.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (h) => {
          if (validProfiles.length >= TARGET_PROFILES) return;
          try {
            const instaRes = await fetch(`https://insta-api-lz.pages.dev/api?username=${h}`);
            if (instaRes.ok) {
              const profileData = await instaRes.json();

              const followers = profileData?.user_info?.follower_count || 0;
              const isMinimalInfluencer = followers >= currentMinFollowers; // Filtro Inteligente! Dinâmico!

              if (profileData && profileData.user_info && profileData.user_info.username && isMinimalInfluencer) {
                if (!validProfiles.some(p => p.user_info.username === profileData.user_info.username)) {
                  if (validProfiles.length < TARGET_PROFILES) {
                    validProfiles.push(profileData);
                    groundingUrls.push(`https://instagram.com/${profileData.user_info.username}`);

                    // EMITINDO PROGRESSO REAL PRO FRONTEND
                    if (onProgress) onProgress(`Analisando ${cleanedQuery}...`, validProfiles.length, TARGET_PROFILES);
                  }
                }
              }
            }
          } catch (e) {
            // Conta inexistente ou bloqueada
          }
        }));
      }

      searchRound++;
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

    const LLM_CHUNK_SIZE = 5;
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
        fetch("/api/nvidia/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${NVIDIA_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "moonshotai/kimi-k2.5",
            messages: [{ role: "user", content: analysisPrompt }],
            max_tokens: 4096, // Menor pois são apenas 5 por vez
            temperature: 0.1,
            chat_template_kwargs: { "thinking": false }
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

          // Merge this specific batch with real API data and emit immediately
          parsedBatch.forEach((inf: any) => {
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

              influencers.push(finalInfluencer);
              if (onInfluencerReady) onInfluencerReady(finalInfluencer);
            }
          });

          return parsedBatch;
        }).catch(() => [])
      );
    }

    // Aguarda todas as chamadas paralelas da IA terminarem de forma rapidíssima
    await Promise.all(llmPromises);

    // Grava no cache antes de devolver
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
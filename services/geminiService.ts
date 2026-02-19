import { Influencer } from "../types";

const NVIDIA_API_KEY = "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";

export const searchInfluencers = async (query: string): Promise<{ influencers: Influencer[], groundingUrls: string[] }> => {
  try {
    let allHandles = new Set<string>();

    // 1. Scraping direto massivo (DuckDuckGo HTML Proxy) para achar handles reais do nicho.
    // Usamos variadas formas de buscar para garantir dezenas de resultados no funil.
    const searchQueries = [
      `site:instagram.com ${query}`,
      `site:instagram.com "influenciador" OR "criativo" ${query}`,
      `site:instagram.com "criador de conteúdo" ${query}`,
      `melhores influenciadores de ${query} instagram`,
      `instagram perfis sobre ${query}`
    ];

    // Executa as buscas em paralelo para acelerar ao máximo
    await Promise.all(searchQueries.map(async (sq) => {
      try {
        const searchRes = await fetch(`/api/ddg/html/?q=${encodeURIComponent(sq)}`);
        if (!searchRes.ok) return;
        const htmlText = await searchRes.text();

        // Regex para capturar handles do Instagram
        const instaRegex = /instagram\.com\/([a-zA-Z0-9._]+)\/?/g;
        const matches = [...htmlText.matchAll(instaRegex)];

        // Excluir palavras reservadas comuns da URL do instagram
        const ignoredHandles = ['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'about', 'developer', 'instagram', 'help', 'legal', 'privacy', 'terms', 'directory', 'tags', 'blog', 'press', 'api', 'support', 'jobs'];

        matches.forEach(m => {
          const h = m[1].toLowerCase().trim();
          if (!ignoredHandles.includes(h) && h.length > 2) {
            allHandles.add(h);
          }
        });
      } catch (e) {
        console.warn(`Erro na busca DDG para: ${sq}`, e);
      }
    }));

    let handlesList = Array.from(allHandles);

    // Se a busca web falhou categoricamente, usamos Kimi como último recurso para sugerir no mínimo 30
    if (handlesList.length < 10) {
      console.log("Poucos resultados na web, invocando Kimi para expandir lista...");
      const handlesPrompt = `O usuário procura: "${query}". Liste no MÍNIMO 40 nomes de usuário (handles) do Instagram de influenciadores FAMOSOS e REAIS desse nicho. Retorne ESTRITAMENTE um array JSON puro de strings. Ex: ["user1", "user2"]`;
      try {
        const kimiRes = await fetch("/api/nvidia/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "moonshotai/kimi-k2.5",
            messages: [{ role: "user", content: handlesPrompt }],
            max_tokens: 2048,
            temperature: 0.2
          })
        });
        if (kimiRes.ok) {
          const kimiJson = await kimiRes.json();
          let text = kimiJson.choices?.[0]?.message?.content || "[]";
          text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const kimiHandles = JSON.parse(text);
          if (Array.isArray(kimiHandles)) {
            kimiHandles.forEach(h => handlesList.push(h.replace('@', '').toLowerCase().trim()));
          }
        }
      } catch (e) {
        console.warn("Kimi falhou ao gerar handles extras.", e);
      }
    }

    // Limpa duplicados e garante os fallbacks finais só pra não quebrar
    handlesList = Array.from(new Set(handlesList));
    if (handlesList.length === 0) {
      handlesList = ["loohansb", "natanrabelo", "kibestudio", "tiagofonsecaoficial", "mayke.garbo", "rocketseat", "filipe_deschamps", "lucasmontano", "akitaonrails"];
    }

    // 2. Validar iterativamente na API oficial até termos 20 perfis ou esgotarmos a lista
    const validProfiles: any[] = [];
    const groundingUrls: string[] = [];
    const TARGET_PROFILES = 20;
    const CHUNK_SIZE = 12; // Testar 12 de cada vez para não tomar Rate Limit brusco e ser rápido

    console.log(`Encontrados ${handlesList.length} possíveis handles. Validando até ${TARGET_PROFILES}...`);

    for (let i = 0; i < handlesList.length; i += CHUNK_SIZE) {
      if (validProfiles.length >= TARGET_PROFILES) break;

      const chunk = handlesList.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (h) => {
        // Se outro processo no Promise.all já preencheu a cota, abortamos o push
        if (validProfiles.length >= TARGET_PROFILES) return;
        try {
          const instaRes = await fetch(`https://insta-api-lz.pages.dev/api?username=${h}`);
          if (instaRes.ok) {
            const profileData = await instaRes.json();
            if (profileData && profileData.user_info && profileData.user_info.username) {
              // Verifica se já não inserimos um igual (devido ao paralelismo)
              if (!validProfiles.some(p => p.user_info.username === profileData.user_info.username)) {
                if (validProfiles.length < TARGET_PROFILES) {
                  validProfiles.push(profileData);
                  groundingUrls.push(`https://instagram.com/${profileData.user_info.username}`);
                }
              }
            }
          }
        } catch (e) {
          // Ignorar handlers inválidos
        }
      }));
    }

    if (validProfiles.length === 0) {
      console.warn("Nenhum perfil válido ou aberto encontrado na API.");
      return { influencers: [], groundingUrls: [] };
    }

    // 3. IA analisa os perfis válidos OBTIDOS REAIS. 
    // Para nã estourar o limite de Contexto da IA (e economizar dinheiro), simplificamos o objeto enviado.
    const simplifiedProfilesForLLM = validProfiles.map(p => ({
      username: p.user_info.username,
      category: p.user_info.category,
      biography: p.user_info.biography,
      follower_count: p.user_info.follower_count,
      // Apenas os últimos 5 posts (legendas) para ele entender o nicho
      recent_captions: p.posts?.slice(0, 5).map((post: any) => post.caption?.substring(0, 200) || "")
    }));

    console.log(`Enviando ${simplifiedProfilesForLLM.length} perfis reais para o Kimi resumir...`);

    const analysisPrompt = `Abaixo estão os dados RESUMIDOS da NOSSA API OFICIAL para ${simplifiedProfilesForLLM.length} influenciadores.

DADOS JSON:
---
${JSON.stringify(simplifiedProfilesForLLM)}
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

    const finalRes = await fetch("/api/nvidia/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "moonshotai/kimi-k2.5",
        messages: [{ role: "user", content: analysisPrompt }],
        max_tokens: 16000,
        temperature: 0.1,
        chat_template_kwargs: { "thinking": false }
      })
    });

    if (!finalRes.ok) throw new Error(`Kimi Analysis Error: ${finalRes.statusText}`);
    const finalJson = await finalRes.json();
    let finalOut = finalJson.choices?.[0]?.message?.content || "[]";
    finalOut = finalOut.replace(/```json/gi, '').replace(/```/g, '').trim();

    let influencers: Influencer[] = [];
    try {
      const parsedArray: Influencer[] = JSON.parse(finalOut);

      // 4. Último Merge: Junta os textos bonitos do LLM com os números FECHADOS e IMAGENS da nossa API oficial.
      influencers = parsedArray.map(inf => {
        const infClean = inf.handle.replace('@', '').toLowerCase().trim();
        const realProfile = validProfiles.find(p => p.user_info.username.toLowerCase() === infClean);

        if (realProfile) {
          // Format the exact follower count directly from the API
          const rawFollowers = realProfile.user_info.follower_count || 0;
          const formattedFollowers = Intl.NumberFormat('en-US', {
            notation: "compact",
            maximumFractionDigits: 1
          }).format(rawFollowers);

          return {
            ...inf,
            followerCount: formattedFollowers, // STRICT OVERRIDE: Never trust LLM for followers
            profilePicUrl: realProfile.user_info.profile_pic_url,
            views_count: realProfile.metrics?.total_loaded?.views || 0,
            likes_count: realProfile.metrics?.total_loaded?.likes || 0,
            posts_count: realProfile.metrics?.total_loaded?.posts || 0,
            comments_count: realProfile.metrics?.total_loaded?.comments || 0,
            category: realProfile.user_info.category || undefined,
            engagementRate: realProfile.metrics?.total_loaded?.engagement || inf.engagementRate,
            lastPostImageUrl: realProfile.posts?.[0]?.image_url || undefined,
          };
        }
        return inf;
      });

    } catch (e) {
      console.error("Parse failed for Kimi final output", finalOut);
    }

    return { influencers, groundingUrls: Array.from(new Set(groundingUrls)) };

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
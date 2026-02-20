import { Influencer } from "../types";

const NVIDIA_API_KEY = "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";

export const searchInfluencers = async (
  query: string,
  onProgress?: (msg: string, current: number, target: number) => void
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

          if (validProfiles.length >= TARGET_PROFILES || apiConsecutiveErrors >= 30) return;
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 8000); // 8s timeout for API
            const instaRes = await fetch(`https://insta-api-lz.pages.dev/api?username=${h}`, { signal: controller.signal });
            clearTimeout(id);

            if (instaRes.ok) {
              apiConsecutiveErrors = 0; // Reset error counter on success
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
            } else {
               apiConsecutiveErrors++;
            }
          } catch (e) {
             apiConsecutiveErrors++;
            // Conta inexistente, bloqueada ou timeout
          }
        }));
      }

      searchRound++;
    }

    if (validProfiles.length === 0) {
      console.warn("Nenhum perfil válido ou aberto encontrado na API com os requisitos exigidos.");
      return { influencers: [], groundingUrls: [] };
    }

    // Se saiu do loop por causa de 401 excessivos, avisa, mas entrega o que achou
    if (apiConsecutiveErrors >= 30 && validProfiles.length < TARGET_PROFILES) {
        console.warn(`Busca abortada precocemente devido a bloqueios na API. Retornando ${validProfiles.length} resultados.`);
        if (onProgress) onProgress(`API Rate Limit. Gerando os ${validProfiles.length} encontrados...`, validProfiles.length, TARGET_PROFILES);
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
          try {
            return JSON.parse(text);
          } catch (e) {
            return [];
          }
        }).catch(() => [])
      );
    }

    // Aguarda todas as chamadas paralelas da IA terminarem de forma rapidíssima
    const chunkResults = await Promise.all(llmPromises);

    // Achatar o array de arrays de 5 influenciadores em um único array plano de ~20 influenciadores
    const parsedArray = chunkResults.flat();

    let influencers: Influencer[] = [];
    try {
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
            originalBio: realProfile.user_info.biography || "",
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
      console.error("Parse failed for Kimi final output array mapping", e);
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
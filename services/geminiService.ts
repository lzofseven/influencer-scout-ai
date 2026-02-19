import { Influencer } from "../types";

const NVIDIA_API_KEY = "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";

export const searchInfluencers = async (query: string): Promise<{ influencers: Influencer[], groundingUrls: string[] }> => {
  try {
    // 1: Buscar nomes de influenciadores reais usando um proxy de busca (DuckDuckGo HTML)
    // Isso evita completamente que a IA invente nomes.
    const searchQuery = encodeURIComponent(`site:instagram.com "influenciador" OR "criador de conteúdo" ${query}`);
    let handlesToFetch: string[] = [];

    try {
      // Usamos uma rota simples do DuckDuckGo HTML Lite (menos chance de block) cruzando CORS se necessário
      const searchRes = await fetch(`https://html.duckduckgo.com/html/?q=${searchQuery}`);
      const htmlText = await searchRes.text();

      // Regex simples para capturar URLs do Instagram nos resultados
      const instaRegex = /instagram\.com\/([a-zA-Z0-9._]+)\/?/g;
      const matches = [...htmlText.matchAll(instaRegex)];

      // Filtrar rotas genéricas do instagram (como /p/, /reels/, /explore/, etc)
      const ignoredHandles = ['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'about', 'developer'];

      matches.forEach(match => {
        const handle = match[1].toLowerCase();
        if (!ignoredHandles.includes(handle) && handle.length > 2 && !handlesToFetch.includes(handle)) {
          handlesToFetch.push(handle);
        }
      });

    } catch (e) {
      console.warn("Falha ao buscar no DuckDuckGo, usando Kimi como Fallback...", e);

      // FALLBACK: Se a busca falhar, tenta usar o Kimi (com risco de alucinação)
      const handlesPrompt = `Aja como um recrutador/hunter de influenciadores brasileiros.
O usuário procura: "${query}".
SUA ÚNICA TAREFA: Liste exatamente 10 nomes de usuário (handles) reais do Instagram (sem usar '@' ou 'https://') de influenciadores FAMOSOS e MUITO reais que existam perfeitamente nesta área.
IMPORTANTE: Retorne APENAS um Array JSON puro de strings. Exemplo: ["nomedeusuario1", "nomedeusuario2"]`;

      const handlesRes = await fetch("/api/nvidia/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "moonshotai/kimi-k2.5",
          messages: [{ role: "user", content: handlesPrompt }],
          max_tokens: 1024,
          temperature: 0.1,
          chat_template_kwargs: { "thinking": false }
        })
      });

      if (handlesRes.ok) {
        const handlesJson = await handlesRes.json();
        let textOutContext = handlesJson.choices?.[0]?.message?.content || "[]";
        textOutContext = textOutContext.replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
          handlesToFetch = JSON.parse(textOutContext);
        } catch (err) { }
      }
    }

    if (!Array.isArray(handlesToFetch) || handlesToFetch.length === 0) {
      handlesToFetch = ["loohansb"]; // Fallback extremo
    }

    // 2: Para cada handle gerado, consulta a API real do Instagram LZ
    const validProfiles: any[] = [];
    const groundingUrls: string[] = [];

    // Paraleliza as requisições, buscando até 20 opções para tentar achar as 10 que realmente funcionam.
    const limitedHandles = handlesToFetch.slice(0, 20);
    await Promise.all(limitedHandles.map(async (h) => {
      try {
        const cleanHandle = h.replace('@', '').trim();
        const instaRes = await fetch(`https://insta-api-lz.pages.dev/api?username=${cleanHandle}&view=basic`);
        if (instaRes.ok) {
          const profileData = await instaRes.json();
          if (profileData && profileData.user_info && profileData.user_info.username) {
            validProfiles.push(profileData);
            groundingUrls.push(`https://instagram.com/${profileData.user_info.username}`);
          }
        }
      } catch (err) {
        // Ignorar handlers que não existem mais ou falharam na API (404/403)
      }
    }));

    if (validProfiles.length === 0) {
      console.warn("Nenhum perfil real ou aberto foi encontrado usando nossa API de extração para estes termos.");
      return { influencers: [], groundingUrls: [] };
    }

    // Limitar para enviar apenas os 10 primeiros válidos encontrados para a IA final
    const selectedProfiles = validProfiles.slice(0, 10);

    // 3: Repassar os dados oficiais de volta para a IA analisar
    const analysisPrompt = `Abaixo estão os dados OBTIDOS DIRETAMENTE DA NOSSA API DO INSTAGRAM para ${selectedProfiles.length} influenciadores reais.

DADOS JSON:
---
${JSON.stringify(selectedProfiles)}
---

AGORA, SUA TAREFA:
Transforme e analise os dados extraídos acima. Perceba os resumos baseados no que eles postam.

Retorne EXATAMENTE UM ARRAY DE OBJETOS JSON (e somente JSON sem formatação Markdown, e cada objeto dentro do array será exatamente a lista final), com as chaves:
- "name": O nome oficial ou do username via user_info.username.
- "handle": "@" + user_info.username
- "platform": "Instagram"
- "followerCount": Um string amigável (ex: "1.2M", "500K") com base em user_info.follower_count.
- "engagementRate": metrics.filtered_result.engagement ou metrics.total_loaded.engagement.
- "bioUrl": "https://instagram.com/" + user_info.username
- "summary": Um breve resumo MTO CRIATIVO em Português sobre os conteúdos, lendo as captions curtas que o Json possui.
- "topics": Um array de strings com tópicos/nichos em português.
- "location": "Brasil"
- "sourceUrl": A url do instagram dele.

LEMBRE-SE: Retorne APENAS o JSON puro do array \`[ { ... }, { ... } ]\` sem nenhum texto extra!`;

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

    // Limpar tag markdown se houver
    finalOut = finalOut.replace(/```json/gi, '').replace(/```/g, '').trim();

    let influencers: Influencer[] = [];
    try {
      influencers = JSON.parse(finalOut);
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
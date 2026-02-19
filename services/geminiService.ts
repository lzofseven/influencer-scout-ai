import { Influencer } from "../types";

const NVIDIA_API_KEY = "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";

export const searchInfluencers = async (query: string): Promise<{ influencers: Influencer[], groundingUrls: string[] }> => {
  try {
    let handlesToFetch: string[] = [];

    // 1: Solicita ao Kimi pelo menos 10 nomes de influenciadores reais.
    // Desta vez, fornecemos a ele a FERRAMENTA (tool) de buscar na web para que ele NÃO invente.
    const handlesPrompt = `Aja como um recrutador/hunter de influenciadores brasileiros.
O usuário procura: "${query}".

SUA ÚNICA TAREFA: Liste exatamente 10 nomes de usuário (handles) reais do Instagram (sem usar '@' ou 'https://') de influenciadores FAMOSOS e MUITO reais que existam perfeitamente nesta área. Se não tiver certeza de 10, liste menos (ex: 5).
É EXTREMAMENTE IMPORTANTE que esses perfis existam de verdade na plataforma. Não invente nomes!

VOCÊ DEVE USAR A FERRAMENTA 'search_web' PARA CONSULTAR A INTERNET E ENCONTRAR PERFIS REAIS ANTES DE RESPONDER.
Consulte algo como: site:instagram.com "influenciador" OR "criador de conteúdo" ${query}

IMPORTANTE: A sua resposta final ao usuário DEVE SER ESTRITAMENTE E UNICAMENTE UM ARRAY JSON PURO de strings.
Exemplo: ["nomedeusuario1", "nomedeusuario2", "luvadepedreiro"]`;

    // Define the tool available to the model
    const tools = [
      {
        type: "function",
        function: {
          name: "search_web",
          description: "Pesquisa na web usando DuckDuckGo para encontrar informações reais, URLs e handles do Instagram.",
          parameters: {
            type: "object",
            properties: {
              search_query: {
                type: "string",
                description: "A query de busca (ex: site:instagram.com tech)"
              }
            },
            required: ["search_query"]
          }
        }
      }
    ];

    let messages: any[] = [{ role: "user", content: handlesPrompt }];

    // Primeira chamada: O modelo pode pedir para usar a ferramenta
    const firstRes = await fetch("/api/nvidia/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "moonshotai/kimi-k2.5",
        messages: messages,
        tools: tools,
        max_tokens: 1024,
        temperature: 0.1
      })
    });

    if (!firstRes.ok) throw new Error(`Kimi Handles Error 1: ${firstRes.statusText}`);
    const firstJson = await firstRes.json();
    const responseMessage = firstJson.choices[0].message;

    // Verifica se o modelo quer chamar a ferramenta
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      messages.push(responseMessage); // Adiciona a assistente chamando a feramenta no histórico

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === "search_web") {
          const args = JSON.parse(toolCall.function.arguments);
          const sq = encodeURIComponent(args.search_query);

          // Executa a busca real na nossa proxy
          let toolResultText = "Nenhum resultado encontrado.";
          try {
            const searchRes = await fetch(`/api/ddg/html/?q=${sq}`);
            const htmlText = await searchRes.text();

            // Extrair handles do HTML para economizar tokens
            const instaRegex = /instagram\.com\/([a-zA-Z0-9._]+)\/?/g;
            const matches = [...htmlText.matchAll(instaRegex)];
            const ignoredHandles = ['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'about', 'developer'];
            const found = matches.map(m => m[1].toLowerCase()).filter(h => !ignoredHandles.includes(h) && h.length > 2);

            toolResultText = `Encontrei estes perfis no Google/DuckDuckGo: ${Array.from(new Set(found)).join(", ")}`;
          } catch (e) {
            toolResultText = "Erro ao buscar na web.";
          }

          // Devolve a resposta da ferramenta pro modelo
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: toolResultText
          });
        }
      }

      // Segunda chamada com os resultados da ferramenta
      const secondRes = await fetch("/api/nvidia/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "moonshotai/kimi-k2.5",
          messages: messages,
          max_tokens: 1024,
          temperature: 0.1
        })
      });

      if (secondRes.ok) {
        const secondJson = await secondRes.json();
        let finalAnswer = secondJson.choices[0].message.content || "[]";
        finalAnswer = finalAnswer.replace(/```json/gi, '').replace(/```/g, '').trim();
        try { handlesToFetch = JSON.parse(finalAnswer); } catch (e) { }
      }
    } else {
      // Se o modelo resolveu responder direto sem a ferramenta
      let textOutContext = responseMessage.content || "[]";
      textOutContext = textOutContext.replace(/```json/gi, '').replace(/```/g, '').trim();
      try { handlesToFetch = JSON.parse(textOutContext); } catch (e) { }
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
        const instaRes = await fetch(`https://insta-api-lz.pages.dev/api?username=${cleanHandle}`);
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
- "profilePicUrl": copie EXATAMENTE a URL de user_info.profile_pic_url
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
      const parsedArray: Influencer[] = JSON.parse(finalOut);

      // Mesclar dados exatos OBTIDOS da API real na saída final da IA (garante zero alucinação pra números fechados)
      influencers = parsedArray.map(inf => {
        const infClean = inf.handle.replace('@', '').toLowerCase().trim();
        const realProfile = validProfiles.find(p => p.user_info.username.toLowerCase() === infClean);

        if (realProfile) {
          return {
            ...inf,
            views_count: realProfile.metrics?.total_loaded?.views || 0,
            likes_count: realProfile.metrics?.total_loaded?.likes || 0,
            posts_count: realProfile.metrics?.total_loaded?.posts || 0,
            comments_count: realProfile.metrics?.total_loaded?.comments || 0,
            category: realProfile.user_info.category || undefined,
            // Sobrescrever engagement rate caso o modelo tenha cuspido algo estranho
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
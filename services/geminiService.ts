import { Influencer } from "../types";

const NVIDIA_API_KEY = "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";

export const searchInfluencers = async (query: string): Promise<{ influencers: Influencer[], groundingUrls: string[] }> => {
  try {
    // 1: Solicita ao Kimi pelo menos 10 nomes de influenciadores (Instagram handles) daquele assunto.
    const handlesPrompt = `Aja como um recrutador/hunter de influenciadores brasileiros.
O usuário procura: "${query}".
SUA ÚNICA TAREFA: Liste exatamente 10 nomes de usuário (handles) reais do Instagram (sem usar '@' ou 'https://') de influenciadores MUITO reais que existam perfeitamente nesta área. Se não tiver certeza de 10, liste menos (ex: de 5 ou 8).
IMPORTANTE: Sua resposta DEVE SER ESTRITAMENTE E UNICAMENTE UM ARRAY JSON PURO de strings, sem qualquer explicação a mais e SEM TEXTO MARKDOWN.
Exemplo:
["nomedeusuario1", "nomedeusuario2", "luvadepedreiro"]`;

    const handlesRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
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

    if (!handlesRes.ok) throw new Error(`Kimi Handles Error: ${handlesRes.statusText}`);
    const handlesJson = await handlesRes.json();
    let textOutContext = handlesJson.choices?.[0]?.message?.content || "[]";

    // Limpar markdown da resposta do Kimi
    textOutContext = textOutContext.replace(/```json/gi, '').replace(/```/g, '').trim();
    let handlesToFetch: string[] = [];
    try {
      handlesToFetch = JSON.parse(textOutContext);
    } catch (e) {
      console.warn("Failed to parse handles from Kimi, falling back to a default handle.", textOutContext);
    }

    if (!Array.isArray(handlesToFetch) || handlesToFetch.length === 0) {
      handlesToFetch = ["loohansb"]; // Fallback safe
    }

    // 2: Para cada handle gerado, consulta a API real do Instagram LZ
    const validProfiles: any[] = [];
    const groundingUrls: string[] = [];

    // Paraleliza as requisições até um máximo razoável. Para manter performance, limitamos a 10.
    const limitedHandles = handlesToFetch.slice(0, 10);
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
      throw new Error("Nenhum perfil real ou aberto foi encontrado usando nossa API de extração para estes termos.");
    }

    // 3: Repassar os dados oficiais de volta para a IA analisar
    const analysisPrompt = `Abaixo estão os dados OBTIDOS DIRETAMENTE DA NOSSA API DO INSTAGRAM para ${validProfiles.length} influenciadores reais.

DADOS JSON:
---
${JSON.stringify(validProfiles)}
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
- "visualAnalysis": Uma análise estética inferida através de is_video e como o engajamento flui, estilo do perfil em PT-BR.

LEMBRE-SE: Retorne APENAS o JSON puro do array \`[ { ... }, { ... } ]\` sem nenhum texto extra!`;

    const finalRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
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
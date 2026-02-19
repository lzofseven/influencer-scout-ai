import { Influencer } from "../types";
import { fetchInstagramData } from "./instagramService";
import { aggregateScrapingData } from "./scrapingService";

const NVIDIA_API_KEY = "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";
const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export const searchInfluencers = async (query: string): Promise<{ influencers: Influencer[], groundingUrls: string[] }> => {
  try {
    // Passo 1: Usar as 3 ferramentas de scraping para buscar influenciadores
    const scrapedData = await aggregateScrapingData(query);
    const scrapedHandles = scrapedData.map(d => d.handle).join(", ");

    // Passo 2: Enviar para a IA Kimi-k2.5 com os dados de scraping como contexto
    const response = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "moonshotai/kimi-k2.5",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em marketing de influência. Sua tarefa é encontrar influenciadores REAIS no Instagram para uma determinada busca.
            
            Você tem acesso a dados de scraping web que já encontraram alguns influenciadores. Use esses dados como base para sua análise.
            
            Retorne APENAS um JSON válido no seguinte formato:
            [
              {
                "name": "Nome Real",
                "handle": "@usuario",
                "summary": "Breve resumo em português",
                "topics": ["Tópico 1", "Tópico 2"],
                "visualAnalysis": "Análise do estilo visual em português",
                "sourceUrl": "URL de onde você encontrou a informação"
              }
            ]
            
            Regras:
            1. Retorne no máximo 10 influenciadores por vez para garantir precisão.
            2. Certifique-se de que os handles (@) são reais e ativos.
            3. Não invente dados - use os dados de scraping como referência.
            4. Priorize influenciadores encontrados pelo scraping web.`
          },
          {
            role: "user",
            content: `Encontre influenciadores para: "${query}"
            
            Dados de scraping web encontrados: ${scrapedHandles || "Nenhum encontrado"}
            
            Enriqueça esses dados com análise de IA e retorne informações detalhadas sobre cada influenciador.`
          }
        ],
        temperature: 0.3,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    // Extrair JSON do conteúdo (caso a IA coloque markdown)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const rawInfluencers = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Passo 3: Enriquecer dados com a API do Instagram
    const enrichedInfluencers: Influencer[] = [];

    for (const raw of rawInfluencers) {
      const realData = await fetchInstagramData(raw.handle);
      
      if (realData) {
        enrichedInfluencers.push({
          ...raw,
          name: realData.name || raw.name,
          handle: realData.handle || raw.handle,
          platform: "Instagram",
          followerCount: realData.followerCount || "N/A",
          engagementRate: realData.engagementRate || "N/A",
          bioUrl: realData.bioUrl || `https://www.instagram.com/${raw.handle.replace('@', '')}`,
          profilePicUrl: realData.profilePicUrl,
          location: realData.location || raw.location || ""
        });
      } else {
        // Se não encontrar na API, mantemos os dados da IA mas marcamos como não verificado
        enrichedInfluencers.push({
          ...raw,
          platform: "Instagram",
          followerCount: "N/A",
          engagementRate: "N/A",
          bioUrl: `https://www.instagram.com/${raw.handle.replace('@', '')}`,
        });
      }
    }

    // Combinar URLs de scraping com URLs de resultado
    const allSourceUrls = [
      ...scrapedData.map(d => d.sourceUrl).filter(Boolean),
      ...enrichedInfluencers.map(i => i.sourceUrl).filter(Boolean)
    ] as string[];

    return { 
      influencers: enrichedInfluencers, 
      groundingUrls: Array.from(new Set(allSourceUrls)) // Remove duplicatas
    };

  } catch (error) {
    console.error("Error searching influencers with NVIDIA/Kimi:", error);
    throw error;
  }
};

// Função removida conforme solicitado (não gera mais imagens por IA)
export const generateInfluencerImage = async (): Promise<string | null> => {
  return null;
};

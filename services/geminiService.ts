import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Influencer } from "../types";

// Define the response schema for strict JSON output
const influencerSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Full name of the influencer (Must be real)" },
      handle: { type: Type.STRING, description: "Real Instagram handle starting with @ (Must be verified to exist)" },
      platform: { type: Type.STRING, description: "Primary platform" },
      followerCount: { type: Type.STRING, description: "Real follower count found in search (e.g. 1.2M, 500K)" },
      engagementRate: { type: Type.STRING, description: "Estimated engagement or 'N/A'" },
      bioUrl: { type: Type.STRING, description: "Full link to their profile" },
      summary: { type: Type.STRING, description: "Brief summary in Portuguese" },
      topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Topics in Portuguese" },
      location: { type: Type.STRING, description: "City/Country" },
      sourceUrl: { type: Type.STRING, description: "The EXACT URL where you found this influencer (e.g. a Top 10 list, news article, or their social profile)" },
      visualAnalysis: { type: Type.STRING, description: "Visual aesthetic analysis in Portuguese" }
    },
    required: ["name", "handle", "followerCount", "summary", "topics", "visualAnalysis"],
  },
};

export const searchInfluencers = async (query: string): Promise<{ influencers: Influencer[], groundingUrls: string[] }> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Execute uma busca rigorosa por influenciadores reais para: "${query}".
      
      REGRAS CRÍTICAS DE VERACIDADE:
      1. NÃO INVENTE PERFIS. Se você não encontrar 40, retorne menos, mas APENAS PERFIS REAIS.
      2. USE O GOOGLE SEARCH para verificar cada @handle. Se o handle não existir nas buscas, descarte.
      3. Priorize perfis que aparecem em listas recentes (2023-2025) de "Top Influenciadores" ou artigos de notícias.
      4. Para cada perfil, você DEVE encontrar uma URL de fonte (sourceUrl) que comprove sua existência.
      
      Instruções de Formatação:
      - Resumo (summary) e Tópicos (topics) em Português.
      - Análise Visual (visualAnalysis) deve descrever o estilo provável das fotos baseada no nicho.
      - Tente chegar a 40 perfis, mas a PRECISÃO é mais importante que a quantidade.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: influencerSchema,
      },
    });

    const jsonText = response.text;
    let influencers: Influencer[] = [];
    
    if (jsonText) {
      try {
        influencers = JSON.parse(jsonText);
        // Double check filter for obviously fake handles if needed, 
        // but reliance on prompt instruction is primary here.
      } catch (e) {
        console.error("Failed to parse JSON response", e);
      }
    }

    // Extract grounding chunks (URLs used by the model)
    const groundingUrls: string[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach(chunk => {
        if (chunk.web?.uri) {
          groundingUrls.push(chunk.web.uri);
        }
      });
    }

    // Deduplicate URLs
    const uniqueUrls = Array.from(new Set(groundingUrls));

    return { influencers, groundingUrls: uniqueUrls };

  } catch (error) {
    console.error("Error fetching influencers:", error);
    throw error;
  }
};

export const generateInfluencerImage = async (topics: string[], aesthetic: string): Promise<string | null> => {
  if (!process.env.API_KEY) return null;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `A high-quality, abstract social media background image representing: ${topics.join(", ")}. 
    Visual style: ${aesthetic}. 
    Minimalist, professional, soft lighting, no text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        }
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error generating placeholder image:", error);
    return null;
  }
};
/**
 * Serviço de IA Kimi-k2.5 da NVIDIA
 * Responsável por buscar e analisar influenciadores usando IA
 * Agora usa backend para scraping web
 */

import { Influencer } from "../types";

/**
 * Busca influenciadores usando a IA Kimi-k2.5 via backend
 */
export const searchInfluencers = async (query: string): Promise<{ influencers: Influencer[], groundingUrls: string[] }> => {
  try {
    // Chamar API backend que faz o scraping e IA
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? '/api/search'
      : 'http://localhost:3000/api/search';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      influencers: data.influencers || [],
      groundingUrls: data.groundingUrls || []
    };

  } catch (error) {
    console.error("Error searching influencers:", error);
    throw error;
  }
};

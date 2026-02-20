/// <reference types="vite/client" />
import { Influencer } from "../types";
import { auth } from "../src/lib/firebase";

export const searchInfluencers = async (
  query: string,
  userTier: string = 'free',
  onProgress?: (msg: string, current: number, target: number) => void,
  onInfluencerReady?: (influencer: Influencer) => void
): Promise<{ influencers: Influencer[], groundingUrls: string[] }> => {

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Usuário não autenticado.");
  }

  // Pegar o token super seguro atualizado do Google Auth
  const idToken = await currentUser.getIdToken(true);

  if (onProgress) {
    onProgress("Enviando requisição segura para os servidores de IA...", 0, 15);
  }

  try {
    const URL_BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/search';

    // Conexão Segura com o Backend que valida o Token e debita o crédito no servidor (SecOps)
    const res = await fetch(URL_BACKEND, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ query, userTier })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || `Erro HTTP ${res.status}`);
    }

    if (onProgress) {
      onProgress("Sincronizando dados analisados...", 15, 15);
    }

    const data = await res.json();

    if (onInfluencerReady && data.influencers) {
      // Simulando fluxo contínuo na UI já que a API síncrona devolve tudo de uma vez
      data.influencers.forEach((inf: Influencer, index: number) => {
        setTimeout(() => onInfluencerReady(inf), index * 300);
      });
    }

    return {
      influencers: data.influencers || [],
      groundingUrls: data.groundingUrls || []
    };

  } catch (error) {
    console.error("Erro no serviço de inteligência proxy:", error);
    throw error;
  }
};

export const generateInfluencerImage = async (topics: string[], aesthetic: string): Promise<string | null> => {
  return null;
};
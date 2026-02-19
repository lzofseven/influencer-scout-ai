/**
 * Cloudflare Pages Function para busca de influenciadores
 * Executa scraping web no backend e integra com NVIDIA Kimi-k2.5
 */

import { Influencer } from '../../client/src/types';

interface ScrapedData {
  handle: string;
  name?: string;
  bio?: string;
  followerCount?: string;
  engagementRate?: string;
  topics?: string[];
  sourceUrl?: string;
  verified?: boolean;
}

/**
 * Ferramenta 1: Google Search Scraping
 */
async function googleSearchInfluencer(query: string): Promise<ScrapedData[]> {
  try {
    const searchQuery = encodeURIComponent(`${query} influencer instagram`);
    const response = await fetch(
      `https://www.google.com/search?q=${searchQuery}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) return [];

    const html = await response.text();
    
    // Extrair handles do Instagram
    const instagramHandleRegex = /@([a-zA-Z0-9_.]+)/g;
    const handles = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = instagramHandleRegex.exec(html)) !== null) {
      if (match[1].length > 2 && match[1].length < 30) {
        handles.add(match[1]);
      }
    }

    return Array.from(handles).slice(0, 5).map(handle => ({
      handle: `@${handle}`,
      sourceUrl: `https://www.google.com/search?q=${searchQuery}`
    }));
  } catch (error) {
    console.error('Google Search scraping error:', error);
    return [];
  }
}

/**
 * Ferramenta 2: Social Media Links Scraping
 */
async function socialMediaLinksScrap(query: string): Promise<ScrapedData[]> {
  try {
    const sources = [
      `https://www.instagram.com/explore/search/?q=${encodeURIComponent(query)}`,
      `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`,
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    ];

    const results: ScrapedData[] = [];

    for (const source of sources) {
      try {
        const response = await fetch(source, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) continue;

        const html = await response.text();
        
        // Extrair dados de perfil
        const handleRegex = /(?:instagram\.com\/|@)([a-zA-Z0-9_.]+)/g;
        let match: RegExpExecArray | null;

        while ((match = handleRegex.exec(html)) !== null) {
          if (match[1] && !results.some(r => r.handle === `@${match[1]}`)) {
            results.push({
              handle: `@${match[1]}`,
              sourceUrl: source
            });
          }
        }
      } catch (e) {
        console.warn(`Error scraping ${source}:`, e);
      }
    }

    return results.slice(0, 5);
  } catch (error) {
    console.error('Social Media Links scraping error:', error);
    return [];
  }
}

/**
 * Ferramenta 3: Profile Analysis Scraping
 */
async function profileAnalysisScrap(handles: string[]): Promise<ScrapedData[]> {
  try {
    const results: ScrapedData[] = [];

    for (const handle of handles) {
      try {
        const cleanHandle = handle.replace('@', '');
        const profileUrl = `https://www.instagram.com/${cleanHandle}/`;
        
        const response = await fetch(profileUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) continue;

        const html = await response.text();

        // Extrair dados de bio e descrição
        const bioRegex = /"biography":"([^"]*)/;
        const nameRegex = /"full_name":"([^"]*)/;
        const followerRegex = /"edge_followed_by":{"count":(\d+)/;

        const bioMatch = html.match(bioRegex);
        const nameMatch = html.match(nameRegex);
        const followerMatch = html.match(followerRegex);

        if (bioMatch || nameMatch) {
          results.push({
            handle: `@${cleanHandle}`,
            name: nameMatch ? nameMatch[1] : undefined,
            bio: bioMatch ? bioMatch[1] : undefined,
            followerCount: followerMatch ? `${parseInt(followerMatch[1]) / 1000}K` : undefined,
            sourceUrl: profileUrl,
            verified: html.includes('"is_verified":true')
          });
        }
      } catch (e) {
        console.warn(`Error analyzing profile ${handle}:`, e);
      }
    }

    return results;
  } catch (error) {
    console.error('Profile Analysis scraping error:', error);
    return [];
  }
}

/**
 * Função agregadora que combina todas as 3 ferramentas
 */
async function aggregateScrapingData(query: string): Promise<ScrapedData[]> {
  try {
    const [googleResults, socialResults] = await Promise.all([
      googleSearchInfluencer(query),
      socialMediaLinksScrap(query)
    ]);

    const allResults = [...googleResults, ...socialResults];
    const uniqueHandles = new Map<string, ScrapedData>();

    for (const result of allResults) {
      if (result.handle && !uniqueHandles.has(result.handle)) {
        uniqueHandles.set(result.handle, result);
      }
    }

    return Array.from(uniqueHandles.values()).slice(0, 10);
  } catch (error) {
    console.error('Error aggregating scraping data:', error);
    return [];
  }
}

/**
 * Busca influenciadores usando NVIDIA Kimi-k2.5
 */
async function searchInfluencersWithKimi(query: string, scrapedHandles: string): Promise<any[]> {
  const NVIDIA_API_KEY = "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";
  const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

  try {
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
      throw new Error(`NVIDIA Kimi API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    // Extrair JSON do conteúdo
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const rawInfluencers = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return rawInfluencers;
  } catch (error) {
    console.error("Error searching influencers with Kimi-k2.5:", error);
    return [];
  }
}

/**
 * Handler principal da função
 */
export default async function handler(request: Request): Promise<Response> {
  // Apenas aceitar POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as { query: string };
    const { query } = body;

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Passo 1: Scraping web
    const scrapedData = await aggregateScrapingData(query);
    const scrapedHandles = scrapedData.map(d => d.handle).join(", ");

    // Passo 2: IA Kimi-k2.5
    const rawInfluencers = await searchInfluencersWithKimi(query, scrapedHandles);

    // Passo 3: Enriquecer com dados reais (simplificado para demo)
    const enrichedInfluencers: Influencer[] = rawInfluencers.map((raw: any) => ({
      ...raw,
      platform: "Instagram",
      followerCount: raw.followerCount || "N/A",
      engagementRate: raw.engagementRate || "N/A",
      bioUrl: `https://www.instagram.com/${raw.handle.replace('@', '')}`
    }));

    // Combinar URLs de scraping
    const allSourceUrls = [
      ...scrapedData.map(d => d.sourceUrl).filter(Boolean),
      ...enrichedInfluencers.map(i => i.sourceUrl).filter(Boolean)
    ] as string[];

    return new Response(JSON.stringify({
      influencers: enrichedInfluencers,
      groundingUrls: Array.from(new Set(allSourceUrls))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in search handler:", error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

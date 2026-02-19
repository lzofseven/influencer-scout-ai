/**
 * Serviço de Scraping Web para pesquisa de influenciadores
 * Integra 3 ferramentas principais:
 * 1. Google Search (via API pública)
 * 2. Social Media Links (busca de URLs de redes sociais)
 * 3. Profile Analysis (análise de bios e descrições)
 */

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
 * Busca informações públicas sobre influenciadores no Google
 */
export const googleSearchInfluencer = async (query: string): Promise<ScrapedData[]> => {
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
    
    // Extrair handles do Instagram da resposta
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
};

/**
 * Ferramenta 2: Social Media Links Scraping
 * Busca links de redes sociais em diretórios e listas públicas
 */
export const socialMediaLinksScrap = async (query: string): Promise<ScrapedData[]> => {
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
        
        // Extrair dados de perfil da resposta
    const handleRegex = /(?:instagram\.com\/|@)([a-zA-Z0-9_.]+)/g;
        let match: RegExpExecArray | null;

    while ((match = handleRegex.exec(html)) !== null) {
          if (match![1] && !results.some(r => r.handle === `@${match![1]}`)) {
            results.push({
              handle: `@${match[1]!}`,
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
};

/**
 * Ferramenta 3: Profile Analysis Scraping
 * Analisa bios, descrições e conteúdo público para extrair informações
 */
export const profileAnalysisScrap = async (handles: string[]): Promise<ScrapedData[]> => {
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

        const bioMatch = html.match(bioRegex) as RegExpMatchArray | null;
        const nameMatch = html.match(nameRegex) as RegExpMatchArray | null;
        const followerMatch = html.match(followerRegex) as RegExpMatchArray | null;

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
};

/**
 * Função agregadora que combina todas as 3 ferramentas de scraping
 */
export const aggregateScrapingData = async (query: string): Promise<ScrapedData[]> => {
  try {
    // Executar as 3 ferramentas em paralelo
    const [googleResults, socialResults, profileResults] = await Promise.all([
      googleSearchInfluencer(query),
      socialMediaLinksScrap(query),
      profileAnalysisScrap([])
    ]);

    // Combinar e deduplica resultados
    const allResults = [...googleResults, ...socialResults, ...profileResults];
    const uniqueHandles = new Map<string, ScrapedData>();

    for (const result of allResults) {
      if (result.handle && !uniqueHandles.has(result.handle)) {
        uniqueHandles.set(result.handle, result);
      } else if (result.handle && uniqueHandles.has(result.handle)) {
        // Mesclar dados se o handle já existe
        const existing = uniqueHandles.get(result.handle)!;
        uniqueHandles.set(result.handle, {
          ...existing,
          ...result,
          bio: result.bio || existing.bio,
          name: result.name || existing.name
        });
      }
    }

    return Array.from(uniqueHandles.values()).slice(0, 10);
  } catch (error) {
    console.error('Error aggregating scraping data:', error);
    return [];
  }
};

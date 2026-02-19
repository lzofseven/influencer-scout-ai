import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dados de exemplo para fallback
const DEMO_INFLUENCERS = {
  "Influenciadores de tecnologia": [
    {
      name: "Felipe Tech",
      handle: "@felipetech",
      summary: "Especialista em tecnologia e inovação com foco em startups",
      topics: ["Tecnologia", "Startups", "Inovação"],
      visualAnalysis: "Estilo moderno e minimalista, com paleta de cores azul e branco",
      sourceUrl: "https://www.instagram.com/felipetech",
      platform: "Instagram",
      followerCount: "250K",
      engagementRate: "4.5%",
      bioUrl: "https://www.instagram.com/felipetech"
    },
    {
      name: "Tech Reviews BR",
      handle: "@techreviewsbr",
      summary: "Análises detalhadas de produtos de tecnologia",
      topics: ["Reviews", "Gadgets", "Tecnologia"],
      visualAnalysis: "Conteúdo técnico e profissional com imagens de alta qualidade",
      sourceUrl: "https://www.instagram.com/techreviewsbr",
      platform: "Instagram",
      followerCount: "180K",
      engagementRate: "3.8%",
      bioUrl: "https://www.instagram.com/techreviewsbr"
    },
    {
      name: "Dev Life",
      handle: "@devlife",
      summary: "Conteúdo sobre desenvolvimento de software e programação",
      topics: ["Desenvolvimento", "Programação", "Code"],
      visualAnalysis: "Estilo descontraído com memes de programação",
      sourceUrl: "https://www.instagram.com/devlife",
      platform: "Instagram",
      followerCount: "320K",
      engagementRate: "5.2%",
      bioUrl: "https://www.instagram.com/devlife"
    }
  ],
  "Moda sustentável": [
    {
      name: "Eco Fashion",
      handle: "@ecofashion",
      summary: "Moda sustentável e consciente com foco em marcas éticas",
      topics: ["Moda", "Sustentabilidade", "Eco-friendly"],
      visualAnalysis: "Estilo natural e orgânico com cores terrosas",
      sourceUrl: "https://www.instagram.com/ecofashion",
      platform: "Instagram",
      followerCount: "150K",
      engagementRate: "6.1%",
      bioUrl: "https://www.instagram.com/ecofashion"
    },
    {
      name: "Sustainable Style",
      handle: "@sustainablestyle",
      summary: "Dicas de moda sustentável e slow fashion",
      topics: ["Moda", "Sustentabilidade", "Slow Fashion"],
      visualAnalysis: "Minimalista e elegante com tons neutros",
      sourceUrl: "https://www.instagram.com/sustainablestyle",
      platform: "Instagram",
      followerCount: "200K",
      engagementRate: "4.9%",
      bioUrl: "https://www.instagram.com/sustainablestyle"
    }
  ],
  "Fitness e saúde": [
    {
      name: "Fitness Coach",
      handle: "@fitnesscoachjr",
      summary: "Treinos e dicas de nutrição para estilo de vida saudável",
      topics: ["Fitness", "Saúde", "Nutrição"],
      visualAnalysis: "Dinâmico com imagens de treinos e transformações",
      sourceUrl: "https://www.instagram.com/fitnesscoachjr",
      platform: "Instagram",
      followerCount: "450K",
      engagementRate: "7.3%",
      bioUrl: "https://www.instagram.com/fitnesscoachjr"
    }
  ]
};

async function enrichWithAI(query: string, baseInfluencers: any[]): Promise<any[]> {
  try {
    const NVIDIA_API_KEY = "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";
    const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

    const influencerHandles = baseInfluencers.map(i => i.handle).join(", ");

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
            content: `Você é um especialista em marketing de influência e análise de redes sociais. 
            Sua tarefa é enriquecer dados de influenciadores com análises profundas.
            
            Retorne APENAS um JSON válido com a seguinte estrutura:
            {
              "enrichedInfluencers": [
                {
                  "handle": "@usuario",
                  "aiInsights": "Análise de estilo e audiência em português",
                  "recommendedCampaigns": ["Campanha 1", "Campanha 2"],
                  "audienceDemographics": "Descrição da audiência",
                  "contentStrategy": "Estratégia de conteúdo"
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Enriqueça estes influenciadores para a busca "${query}": ${influencerHandles}
            
            Forneça análises profundas sobre cada um, incluindo insights sobre sua audiência, estratégia de conteúdo e campanhas recomendadas.`
          }
        ],
        temperature: 0.5,
        max_tokens: 1024,
        top_p: 0.7
      })
    });

    if (!response.ok) {
      console.error(`NVIDIA API error: ${response.status}`);
      return baseInfluencers;
    }

    const aiData = await response.json() as any;
    const content = aiData.choices[0].message.content as string;
    
    // Extrair JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return baseInfluencers;
    }

    const enrichedData = JSON.parse(jsonMatch[0] as string);
    
    // Mesclar dados de IA com dados base
    return baseInfluencers.map((influencer: any) => {
      const aiEnrichment = enrichedData.enrichedInfluencers?.find(
        (e: any) => e.handle === influencer.handle
      );
      
      return {
        ...influencer,
        aiInsights: aiEnrichment?.aiInsights || influencer.summary,
        recommendedCampaigns: aiEnrichment?.recommendedCampaigns || influencer.topics,
        audienceDemographics: aiEnrichment?.audienceDemographics || "Audiência diversa",
        contentStrategy: aiEnrichment?.contentStrategy || influencer.visualAnalysis
      };
    });
  } catch (error) {
    console.error("Error enriching with AI:", error);
    return baseInfluencers;
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(express.json());

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // API Routes
  app.post("/api/search", async (req, res) => {
    try {
      const { query } = req.body as { query: string };

      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      // Buscar dados de exemplo baseado na query
      let results = [];
      
      // Procurar por palavras-chave na query
      for (const [key, influencers] of Object.entries(DEMO_INFLUENCERS)) {
        if (query.toLowerCase().includes(key.toLowerCase().split(" ")[0])) {
          results = influencers as any[];
          break;
        }
      }

      // Se não encontrar, retornar dados aleatórios
      if (results.length === 0) {
        const allInfluencers = Object.values(DEMO_INFLUENCERS).flat();
        results = allInfluencers.slice(0, 3);
      }

      // Enriquecer com IA
      const enrichedResults = await enrichWithAI(query, results);

      res.json({
        influencers: enrichedResults,
        groundingUrls: ["https://www.instagram.com", "https://www.tiktok.com"]
      });

    } catch (error) {
      console.error("Error in search API:", error);
      res.status(500).json({ error: "Internal server error", details: String(error) });
    }
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

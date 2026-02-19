import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Loader2, AlertCircle, Check, Terminal } from 'lucide-react';
import { InfluencerCard } from './components/InfluencerCard';
import { MetricsChart } from './components/MetricsChart';
import { Footer } from './components/Footer';
import { searchInfluencers } from './services/kimiService';
import { Influencer, SearchStatus } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SearchStatus>(SearchStatus.IDLE);
  const [results, setResults] = useState<Influencer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [groundingUrls, setGroundingUrls] = useState<string[]>([]);
  
  // Timeline state
  const [searchStep, setSearchStep] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const searchSteps = [
    "Inicializando agentes de busca...",
    "Analisando contexto semântico...",
    "Varrendo bases do Instagram/TikTok...",
    "Filtrando por contagem de seguidores...",
    "Calculando taxas de engajamento...",
    "Validando links e biografias...",
    "Formatando relatório final..."
  ];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Effect to handle the timeline animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === SearchStatus.SEARCHING) {
      setSearchStep(0);
      interval = setInterval(() => {
        setSearchStep((prev) => {
          if (prev < searchSteps.length - 1) return prev + 1;
          return prev;
        });
      }, 1500); // Slightly slower steps for larger result set
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setStatus(SearchStatus.SEARCHING);
    setError(null);
    setResults([]);
    setGroundingUrls([]);

    try {
      const data = await searchInfluencers(query);
      setResults(data.influencers);
      setGroundingUrls(data.groundingUrls);
      setStatus(SearchStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError("Não conseguimos processar o pedido. Tente palavras-chave diferentes.");
      setStatus(SearchStatus.ERROR);
    }
  };

  const exampleQueries = [
    "Reviewers de tecnologia > 500k seguidores",
    "Moda sustentável em São Paulo",
    "Treinadores de fitness dieta keto",
    "Micro-influenciadores de games"
  ];

  const isSearching = status === SearchStatus.SEARCHING;

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col overflow-x-hidden">
      
      {/* Navbar / Header - Ultra Minimal */}
      <header className="border-b border-gray-100 py-6 px-6 md:px-12 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-sm z-50 opacity-0 animate-fade-in-up">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2">
          <Terminal size={20} />
          INFLUENCER SCOUT.
        </div>
        <div className="text-sm font-medium text-gray-400">v1.0</div>
      </header>

      <main className="flex-grow flex flex-col px-6 md:px-12 max-w-7xl mx-auto w-full pt-12 md:pt-24 pb-20">
        
        {/* Search Section */}
        <section className={`mb-12 max-w-4xl transition-all duration-700 ${status === SearchStatus.COMPLETED ? 'mb-12' : 'mb-20'}`}>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter leading-[0.9] opacity-0 animate-fade-in-up [animation-delay:200ms]">
            Encontre criadores.<br />
            Analise métricas.
          </h1>
          
          <form onSubmit={handleSearch} className="relative w-full mb-8 opacity-0 animate-fade-in-up [animation-delay:400ms]">
            <div className="relative group">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isSearching}
                placeholder={isSearching ? "Processando busca..." : "Descreva o perfil ideal..."}
                className={`w-full bg-transparent border-b-2 border-gray-200 text-2xl md:text-4xl py-4 pr-16 font-medium placeholder:text-gray-300 focus:outline-none focus:border-black transition-all duration-300 rounded-none focus:pl-2 ${isSearching ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <button 
                type="submit"
                disabled={isSearching || !query.trim()}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:opacity-70 transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
              >
                {isSearching ? (
                  <Loader2 className="animate-spin w-8 h-8 text-black" />
                ) : (
                  <ArrowRight className="w-8 h-8 text-black" />
                )}
              </button>
            </div>
          </form>
          
          {/* Timeline / Progress Log */}
          {status === SearchStatus.SEARCHING && (
            <div className="mt-8 border-l-2 border-black pl-6 py-2 space-y-3 font-mono text-sm">
              {searchSteps.map((step, idx) => {
                if (idx > searchStep) return null;
                const isActive = idx === searchStep;
                
                return (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-3 transition-all duration-500 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-40 translate-x-0'}`}
                  >
                    <div className="w-4 flex justify-center">
                      {isActive ? (
                        <div className="w-2 h-2 bg-black animate-pulse" />
                      ) : (
                        <Check size={14} />
                      )}
                    </div>
                    <span className={isActive ? 'font-bold' : ''}>
                      {step}
                      {isActive && <span className="animate-pulse ml-1">_</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Example Pills (Hide during search) */}
          {status !== SearchStatus.SEARCHING && (
            <div className="flex flex-wrap gap-3 opacity-0 animate-fade-in-up [animation-delay:600ms]">
              <span className="text-sm text-gray-400 font-medium py-1">Tente:</span>
              {exampleQueries.map((q, i) => (
                <button 
                  key={i}
                  onClick={() => setQuery(q)}
                  className="text-sm border border-gray-200 px-3 py-1 rounded-full text-gray-600 hover:border-black hover:text-black hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Results Section */}
        <section className="flex-grow">
          {status === SearchStatus.ERROR && (
             <div className="border border-red-200 bg-red-50 p-4 flex items-center gap-3 text-red-800 text-sm font-medium mb-12 animate-fade-in-up">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
             </div>
          )}

          {results.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-end justify-between mb-8 pb-4 border-b border-gray-100 opacity-0 animate-fade-in-up">
                  <h2 className="text-xl font-semibold tracking-tight">Resultados da Busca</h2>
                  <span className="text-xs font-mono text-gray-500">
                    {results.length} ENCONTRADOS
                  </span>
               </div>

               {/* New Visualization Chart */}
               <MetricsChart data={results} />
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {results.map((influencer, index) => (
                    <InfluencerCard 
                      key={index} 
                      data={influencer} 
                      className={`opacity-0 animate-fade-in-up stagger-${(index % 6) + 1}`}
                    />
                  ))}
               </div>

               {/* Grounding Sources */}
               {groundingUrls.length > 0 && (
                 <div className="mt-20 pt-8 border-t border-gray-100 opacity-0 animate-fade-in-up [animation-delay:600ms]">
                    <p className="text-xs font-mono text-gray-400 mb-4 uppercase">Fontes de Dados (Geral)</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {groundingUrls.map((url, idx) => (
                        <a 
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-black underline decoration-gray-300 hover:decoration-black underline-offset-4 truncate max-w-xs transition-colors"
                        >
                          {new URL(url).hostname}
                        </a>
                      ))}
                    </div>
                 </div>
               )}
            </div>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default App;
import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Loader2, AlertCircle, Check, Terminal, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { InfluencerCard } from './components/InfluencerCard';
import { MetricsChart } from './components/MetricsChart';
import { Footer } from './components/Footer';
import { searchInfluencers } from './services/geminiService';
import { Influencer, SearchStatus } from './types';

// Skeleton Component to display while loading
const SkeletonCard = () => (
  <div className="w-full bg-white dark:bg-[#111111] border-2 border-dashed border-gray-200 dark:border-[#333333] p-8 shadow-[12px_12px_0px_rgba(0,0,0,0.05)] dark:shadow-[12px_12px_0px_rgba(255,255,255,0.02)] h-full flex flex-col relative transition-colors duration-500 overflow-hidden">
    <div className="flex gap-4 mb-8">
      <div className="w-24 h-24 rounded-full stretch-0 animate-shimmer" />
      <div className="flex flex-col justify-center flex-1 space-y-3">
        <div className="h-6 w-3/4 rounded animate-shimmer" />
        <div className="h-4 w-1/2 rounded animate-shimmer stagger-2" />
        <div className="flex gap-2">
          <div className="w-16 h-5 rounded-full animate-shimmer stagger-3" />
          <div className="w-16 h-5 rounded-full animate-shimmer stagger-4" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-4 gap-4 px-4 py-8 bg-gray-50 dark:bg-[#151515] border-y border-gray-100 dark:border-[#222222] mb-8 mt-auto mx-[-32px] transition-colors">
      <div className="h-8 rounded w-full animate-shimmer stagger-1" />
      <div className="h-8 rounded w-full animate-shimmer stagger-2" />
      <div className="h-8 rounded w-full animate-shimmer stagger-3" />
      <div className="h-8 rounded w-full animate-shimmer stagger-4" />
    </div>
    <div className="space-y-3 mt-4">
      <div className="h-3 w-full rounded animate-shimmer stagger-1" />
      <div className="h-3 w-full rounded animate-shimmer stagger-2" />
      <div className="h-3 w-4/5 rounded animate-shimmer stagger-3" />
    </div>
  </div>
);

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SearchStatus>(SearchStatus.IDLE);
  const [results, setResults] = useState<Influencer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [groundingUrls, setGroundingUrls] = useState<string[]>([]);
  const [progressText, setProgressText] = useState<string | null>(null);

  // Timeline state
  const [searchStep, setSearchStep] = useState(0);
  const { theme, setTheme } = useTheme();

  const inputRef = useRef<HTMLInputElement>(null);

  const searchSteps = [
    "Inicializando agentes de busca...",
    "Analisando contexto semântico...",
    "Varrendo bases do Instagram...",
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

  // Keyboard shortcut (CMD/CTRL + K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);



  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setStatus(SearchStatus.SEARCHING);
    setSearchStep(0);
    setError(null);
    setResults([]);
    setGroundingUrls([]);

    // Progress Simulation
    const progressInterval = setInterval(() => {
      setSearchStep(prev => (prev < searchSteps.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const data = await searchInfluencers(
        query,
        (text) => setProgressText(text),
        (influencer) => {
          setResults(prev => {
            const index = prev.findIndex(i => i.handle === influencer.handle);
            if (index !== -1) {
              const newResults = [...prev];
              newResults[index] = influencer;
              return newResults;
            }
            return [...prev, influencer];
          });
        }
      );
      setResults(data.influencers);
      setGroundingUrls(data.groundingUrls);
      setStatus(SearchStatus.COMPLETED);
      setProgressText(null);
    } catch (err: any) {
      console.error(err);
      setError("Não conseguimos processar o pedido. Tente palavras-chave diferentes.");
      setStatus(SearchStatus.ERROR);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const exampleQueries = [
    "Influenciadoras maternas +10k",
    "treinador fitness em são paulo",
    "barbeiro profissional +100k"
  ];

  const isSearching = status === SearchStatus.SEARCHING;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-black dark:text-[#FAFAFA] font-sans flex flex-col overflow-x-hidden transition-colors duration-500">

      {/* Navbar / Header - Ultra Minimal */}
      <header className="border-b border-gray-100 dark:border-[#1F1F1F] py-6 px-6 md:px-12 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm z-50 opacity-0 animate-fade-in-up transition-colors duration-500">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2">
          <Terminal size={20} className="dark:text-[#FAFAFA]" />
          INFLUENCER SCOUT.
        </div>
        <div className="flex items-center gap-6">
          <div className="text-sm font-medium text-gray-400 dark:text-gray-500">v1.0</div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#1F1F1F] transition-colors"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col px-6 md:px-12 max-w-7xl mx-auto w-full pt-12 md:pt-24 pb-20">

        {/* Search Section */}
        <section className={`mb-12 max-w-4xl transition-all duration-700 ${status === SearchStatus.COMPLETED ? 'mb-12' : 'mb-20'}`}>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tighter leading-[0.9] opacity-0 animate-fade-in-up [animation-delay:200ms]">
            Encontre criadores.<br />
            <span className="dark:text-gray-400 text-gray-700 transition-colors">Analise métricas.</span>
          </h1>

          <form onSubmit={handleSearch} className="relative w-full mb-8 opacity-0 animate-fade-in-up [animation-delay:400ms]">
            <div className="relative group flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isSearching}
                placeholder={isSearching ? "Processando busca..." : "Descreva o perfil ideal..."}
                className={`w-full bg-transparent border-b-2 border-gray-200 dark:border-[#333] text-2xl md:text-4xl py-4 pr-32 font-medium placeholder:text-gray-300 dark:placeholder:text-[#444] text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-all duration-300 rounded-none focus:pl-2 ${isSearching ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {!query && !isSearching && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2 pointer-events-none hidden md:flex items-center gap-1 opacity-40">
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#444] rounded text-xs font-mono font-bold text-gray-500 dark:text-gray-400">⌘</kbd>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-[#444] rounded text-xs font-mono font-bold text-gray-500 dark:text-gray-400">K</kbd>
                </div>
              )}
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:opacity-70 transition-all disabled:opacity-30 hover:scale-110 active:scale-95 text-black dark:text-white"
              >
                {isSearching ? (
                  <Loader2 className="animate-spin w-8 h-8" />
                ) : (
                  <ArrowRight className="w-8 h-8" />
                )}
              </button>
            </div>
          </form>

          {/* Timeline / Progress Log */}
          {status === SearchStatus.SEARCHING && (
            <div className="mt-8 border-l-2 border-black dark:border-white pl-6 py-2 space-y-4 font-mono text-sm transition-colors">
              <div className="flex items-center gap-3 transition-all duration-500 opacity-100">
                <div className="w-4 flex justify-center">
                  <div className="w-2 h-2 bg-black dark:bg-white animate-pulse" />
                </div>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {progressText || "Iniciando inteligência de busca e extração de intenções..."}
                  <span className="animate-pulse ml-1">_</span>
                </span>
              </div>
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
                        <div className="w-2 h-2 bg-black dark:bg-white animate-pulse" />
                      ) : (
                        <Check size={14} className="dark:text-white text-black" />
                      )}
                    </div>
                    <span className={isActive ? 'font-bold dark:text-white text-black' : 'dark:text-gray-400 text-gray-500'}>
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
                  className="text-sm border border-gray-200 dark:border-[#333] px-3 py-1 rounded-full text-gray-600 dark:text-gray-400 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-all duration-300 transform hover:-translate-y-0.5"
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

          {(results.length > 0 || status === SearchStatus.SEARCHING) && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {status === SearchStatus.COMPLETED && (
                <div className="flex items-end justify-between mb-8 pb-4 border-b border-gray-100 opacity-0 animate-fade-in-up">
                  <h2 className="text-xl font-semibold tracking-tight">Resultados da Busca</h2>
                  <span className="text-xs font-mono text-gray-500">
                    {results.length} ENCONTRADOS
                  </span>
                </div>
              )}

              {/* Visualization Chart only renders when completed to avoid jittering */}
              {status === SearchStatus.COMPLETED && (
                <MetricsChart data={results} />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-32">
                {results.map((influencer, index) => (
                  <InfluencerCard
                    key={index}
                    data={influencer}
                    className={`opacity-0 animate-fade-in-up stagger-${(index % 6) + 1}`}
                  />
                ))}

                {/* Dynamically render skeletons to fill the rest of the layout while searching */}
                {status === SearchStatus.SEARCHING && Array.from({ length: Math.max(0, 9 - results.length) }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="opacity-50 transition-opacity duration-1000">
                    <SkeletonCard />
                  </div>
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
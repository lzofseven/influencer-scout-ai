import React from 'react';
import { Influencer } from '../types';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { ExternalLink, MapPin, Search, ArrowRight } from 'lucide-react';

interface InfluencerCardProps {
  data: Influencer;
  style?: React.CSSProperties;
  className?: string;
}

export const InfluencerCard: React.FC<InfluencerCardProps> = ({ data, style, className }) => {
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Clean handle for URL construction
  const cleanHandle = data.handle.replace('@', '').trim();
  const profileUrl = data.bioUrl || `https://www.instagram.com/${cleanHandle}`;

  return (
    <div
      style={{ perspective: '1000px', ...style }}
      className={`group relative flex flex-col h-full p-0 overflow-visible ${className || ''}`}
    >
      <div className="relative flex flex-col h-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-[#333] transition-all duration-500 transform-gpu group-hover:scale-[1.02] group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:group-hover:shadow-[0_20px_40px_rgba(255,255,255,0.05)] overflow-hidden">

        {/* Banner Section */}
        <div className="relative h-32 w-full overflow-hidden bg-gray-100 dark:bg-[#222]">
          {data.lastPostImageUrl ? (
            <img
              src={data.lastPostImageUrl}
              alt="Last Post Banner"
              className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-110 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#222] dark:to-[#1a1a1a]"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 dark:from-[#111111]/90 via-transparent to-transparent"></div>
        </div>

        {/* Profile & Header Section */}
        <div className="px-4 md:px-6 -mt-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 border-b border-gray-50 dark:border-[#222] pb-5 gap-4">
            <div className="flex items-end gap-3 md:gap-4">
              {data.profilePicUrl ? (
                <img
                  src={data.profilePicUrl}
                  alt={data.name}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-white dark:border-[#111] shadow-lg bg-white dark:bg-[#111]"
                />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 dark:bg-[#222] flex items-center justify-center text-black dark:text-white font-bold text-xl md:text-2xl tracking-wider border-4 border-white dark:border-[#111] shadow-lg group-hover:bg-black group-hover:text-white transition-colors duration-300 rounded-full">
                  {getInitials(data.name)}
                </div>
              )}
              <div className="overflow-hidden mb-1 flex-1">
                <h3 className="font-bold text-lg md:text-xl leading-tight truncate pr-2 text-black dark:text-white">
                  {data.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-1 font-medium transition-colors"
                  >
                    {data.handle}
                    <ExternalLink size={12} />
                  </a>
                  {data.category && (
                    <span className="text-[10px] bg-gray-50 dark:bg-[#222] px-1.5 py-0.5 rounded-sm text-gray-400 dark:text-gray-300 font-semibold uppercase tracking-tight border border-gray-100 dark:border-[#333]">
                      {data.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mb-4 py-3 border-y border-gray-50 dark:border-[#222] group-hover:border-gray-200 dark:group-hover:border-[#444] transition-colors items-center">
            <div className="flex flex-col overflow-hidden">
              <p className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mb-1 truncate">Seguidores</p>
              <p className="text-xs md:text-sm font-bold font-mono text-gray-900 dark:text-white truncate">{data.followerCount}</p>
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mb-1 truncate">Views</p>
              <p className="text-xs md:text-sm font-bold font-mono text-gray-900 dark:text-white truncate">
                {typeof data.views_count === 'number' ? Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(data.views_count) : 'Oculto'}
              </p>
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mb-1 truncate">Curtidas</p>
              <p className="text-xs md:text-sm font-bold font-mono text-gray-900 dark:text-white truncate">
                {typeof data.likes_count === 'number' ? Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(data.likes_count) : 'Oculto'}
              </p>
            </div>

            <div className="flex flex-col overflow-hidden border-l border-gray-100 dark:border-[#333] pl-2">
              <p className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-bold mb-1 truncate">Engaj.</p>
              <div className="w-8 h-8 font-bold mt-0.5">
                {(() => {
                  if (!data.engagementRate) {
                    return <p className="text-xs font-bold font-mono text-gray-900 dark:text-white mt-0.5">Oculto</p>;
                  }

                  // Sanitiza a string (ex: "2.20%" -> 2.20)
                  const cleanRate = data.engagementRate.toString().replace(/[^0-9.]/g, '');
                  const rateValue = parseFloat(cleanRate) || 0;

                  // Formata com no máximo 1 casa decimal para caber certinho no círculo pequeno (ex: 29.7 em vez de 29.71)
                  const displayValue = rateValue >= 10 ? rateValue.toFixed(0) : rateValue.toFixed(1);

                  return (
                    <CircularProgressbar
                      value={rateValue}
                      text={`${displayValue}%`}
                      strokeWidth={12}
                      styles={buildStyles({
                        textSize: '26px', // Tamanho reduzido para não transbordar
                        pathColor: rateValue >= 5 ? '#10B981' : rateValue >= 2 ? '#3B82F6' : '#6B7280',
                        textColor: 'currentColor',
                        trailColor: 'rgba(156, 163, 175, 0.2)', // Adapts better to dark/light
                      })}
                    />
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Text Content OUTSIDE THE GRID */}
          <div>
            {data.location && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 mb-2 font-medium uppercase tracking-wide">
                <MapPin size={10} />
                {data.location}
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-[10px] font-bold text-gray-900 dark:text-gray-300 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                Bio Original
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-mono bg-gray-50 dark:bg-[#1A1A1A] p-2 border border-gray-100 dark:border-[#2A2A2A] rounded-sm whitespace-pre-wrap line-clamp-3">
                {data.originalBio || 'Sem biografia.'}
              </p>
            </div>

            <div className="mb-4">
              <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                Análise IA
              </h4>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                {data.summary}
              </p>
            </div>
          </div>

          {/* Footer / Tags */}
          <div className="mt-auto p-6 pt-0">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {data.topics.slice(0, 3).map((topic, idx) => (
                <span key={idx} className="text-[9px] uppercase tracking-wide border border-gray-100 dark:border-[#333] px-2 py-1 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#222] rounded-sm">
                  {topic}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#222] mt-2">
              {data.sourceUrl ? (
                <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] text-gray-400 hover:text-blue-600 transition-colors truncate max-w-[150px]">
                  <Search size={10} />
                  <span className="truncate">Fonte Verificada</span>
                </a>
              ) : (
                <span className="text-[9px] text-gray-300 flex items-center gap-1.5">
                  <Search size={10} />
                  IA Search
                </span>
              )}

              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 justify-end items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800 hover:underline"
              >
                Acessar Perfil <ArrowRightIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Icon
const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);
import React from 'react';
import { Influencer } from '../types';
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
      style={style}
      className={`group relative flex flex-col h-full bg-white border border-gray-200 hover:border-black hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 p-0 overflow-hidden ${className || ''}`}
    >
      {/* Banner Section */}
      <div className="relative h-32 w-full overflow-hidden bg-gray-100">
        {data.lastPostImageUrl ? (
          <img
            src={data.lastPostImageUrl}
            alt="Last Post Banner"
            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent"></div>
      </div>

      {/* Profile & Header Section */}
      <div className="px-6 -mt-8 relative z-10">
        <div className="flex items-end justify-between mb-4 border-b border-gray-50 pb-5">
          <div className="flex items-end gap-4">
            {data.profilePicUrl ? (
              <img
                src={data.profilePicUrl}
                alt={data.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg bg-white"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-50 flex items-center justify-center text-black font-bold text-2xl tracking-wider border-4 border-white shadow-lg group-hover:bg-black group-hover:text-white transition-colors duration-300 rounded-full">
                {getInitials(data.name)}
              </div>
            )}
            <div className="overflow-hidden mb-1">
              <h3 className="font-bold text-xl leading-tight truncate pr-2">
                {data.name}
              </h3>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-black flex items-center gap-1 font-medium transition-colors mt-0.5"
              >
                {data.handle}
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4 py-3 border-y border-gray-50 group-hover:border-gray-100 transition-colors">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">Seguidores</p>
            <p className="text-sm font-bold font-mono text-gray-900">{data.followerCount}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">Views</p>
            <p className="text-sm font-bold font-mono text-gray-900">
              {typeof data.views_count === 'number' ? Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(data.views_count) : 'Oculto'}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">Curtidas</p>
            <p className="text-sm font-bold font-mono text-gray-900">
              {typeof data.likes_count === 'number' ? Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(data.likes_count) : 'Oculto'}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">Engaj.</p>
            <p className="text-sm font-bold font-mono text-gray-900">{data.engagementRate || 'Oculto'}</p>
          </div>
        </div>

        {/* Text Content */}
        <div>
          {data.location && (
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-2 font-medium uppercase tracking-wide">
              <MapPin size={10} />
              {data.location}
            </div>
          )}
          <p className="text-xs text-gray-600 leading-relaxed mb-4 line-clamp-3">
            {data.summary}
          </p>
        </div>
      </div>

      {/* Footer / Tags */}
      <div className="mt-auto p-6 pt-0">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {data.topics.slice(0, 3).map((topic, idx) => (
            <span key={idx} className="text-[9px] uppercase tracking-wide border border-gray-100 px-2 py-1 text-gray-600 bg-gray-50 rounded-sm">
              {topic}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
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
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-black hover:underline"
          >
            Ver <ArrowRightIcon className="w-3 h-3" />
          </a>
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
)
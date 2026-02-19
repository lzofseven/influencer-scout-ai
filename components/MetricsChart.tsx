import React, { useMemo, useState } from 'react';
import { Influencer } from '../types';
import { BarChart3 } from 'lucide-react';

interface MetricsChartProps {
  data: Influencer[];
}

export const MetricsChart: React.FC<MetricsChartProps> = ({ data }) => {
  const [metric, setMetric] = useState<'followers' | 'engagement' | 'views' | 'likes'>('followers');

  const parseValue = (valueStr: string | number, type: 'followers' | 'engagement' | 'views' | 'likes'): number => {
    if (typeof valueStr === 'number') return valueStr;
    if (!valueStr) return 0;
    const cleanStr = String(valueStr).toUpperCase().replace(/,/g, '.').replace(/%/g, '').trim();
    let multiplier = 1;
    if (cleanStr.includes('M')) multiplier = 1000000;
    else if (cleanStr.includes('K')) multiplier = 1000;
    const numValue = parseFloat(cleanStr.replace(/[MK]/g, ''));
    if (isNaN(numValue)) return 0;
    return numValue * multiplier;
  };

  // Sort and take top 30 for visualization to keep it dense but readable
  const chartData = useMemo(() => {
    return data
      .map(inf => {
        let val = 0;
        if (metric === 'followers') val = parseValue(inf.followerCount, metric);
        else if (metric === 'engagement') val = parseValue(inf.engagementRate, metric);
        else if (metric === 'views') val = parseValue(inf.views_count || 0, metric);
        else if (metric === 'likes') val = parseValue(inf.likes_count || 0, metric);

        return { ...inf, rawValue: val };
      })
      .sort((a, b) => b.rawValue - a.rawValue)
      .slice(0, 30);
  }, [data, metric]);

  const maxValue = Math.max(...chartData.map(d => d.rawValue), 1);

  return (
    <div className="w-full bg-white border border-gray-200 p-6 md:p-8 mb-12 animate-fade-in-up rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Distribuição de Métricas
          </h3>
        </div>

        <div className="flex bg-gray-50 p-1 rounded-md border border-gray-100 flex-wrap gap-1">
          <button
            onClick={() => setMetric('followers')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded ${metric === 'followers' ? 'bg-black text-white shadow-sm' : 'text-gray-400 hover:text-black'}`}
          >
            Seguidores
          </button>
          <button
            onClick={() => setMetric('views')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded ${metric === 'views' ? 'bg-black text-white shadow-sm' : 'text-gray-400 hover:text-black'}`}
          >
            Views
          </button>
          <button
            onClick={() => setMetric('likes')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded ${metric === 'likes' ? 'bg-black text-white shadow-sm' : 'text-gray-400 hover:text-black'}`}
          >
            Curtidas
          </button>
          <button
            onClick={() => setMetric('engagement')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded ${metric === 'engagement' ? 'bg-black text-white shadow-sm' : 'text-gray-400 hover:text-black'}`}
          >
            Engajamento
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto pb-4 custom-scrollbar">
        {/* Chart Container */}
        <div className="h-[250px] min-w-[900px] flex items-end gap-3 px-2 relative">

          {/* Horizontal Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0 opacity-50">
            <div className="w-full border-t border-dashed border-gray-100 h-0"></div>
            <div className="w-full border-t border-dashed border-gray-100 h-0"></div>
            <div className="w-full border-t border-dashed border-gray-100 h-0"></div>
            <div className="w-full border-t border-dashed border-gray-100 h-0"></div>
          </div>

          {chartData.map((item, idx) => {
            const heightPercentage = Math.max((item.rawValue / maxValue) * 100, 4); // Min 4% height

            return (
              <div key={idx} className="group relative flex-1 flex flex-col justify-end items-center h-full z-10">

                {/* Custom Tooltip */}
                <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-20 bg-gray-900 text-white text-[10px] py-1.5 px-3 rounded shadow-xl whitespace-nowrap pointer-events-none">
                  <div className="font-bold tracking-wide">{item.name}</div>
                  <div className="font-mono text-gray-300">
                    {metric === 'followers' ? item.followerCount : item.engagementRate}
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>

                {/* The Bar */}
                <div
                  className="w-full bg-gray-800 hover:bg-black transition-all duration-300 ease-out rounded-t-[2px] hover:shadow-lg relative overflow-hidden"
                  style={{ height: `${heightPercentage}%` }}
                >
                  {/* Shine effect on hover */}
                  <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 group-hover:animate-shine" />
                </div>

                {/* Label (Handle) */}
                <div className="h-6 w-full mt-3 relative">
                  <p className="absolute left-1/2 -translate-x-1/2 text-[9px] text-gray-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] text-center group-hover:text-black group-hover:font-bold transition-colors">
                    {item.handle.replace('@', '')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #d1d5db;
        }
      `}</style>
    </div>
  );
};
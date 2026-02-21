import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Activity } from 'lucide-react';

const AdminOverview: React.FC = () => {
    const [stats, setStats] = useState({ users: 0, searches: 0, mrr: 0, credits: 0 });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        const fetchOverview = async () => {
            // Conta usuários, créditos e historico
            const usersSnap = await getDocs(collection(db, 'users'));
            let totalCredits = 0;
            let activeTierCount = 0; // Ex: Pro/Scale assinantes pagantes

            usersSnap.forEach(doc => {
                const data = doc.data();
                if (data.credits) totalCredits += data.credits;
                if (data.tier && data.tier !== 'free') activeTierCount++;
            });

            // O MRR é figurativo, pode ser derivado de activeTierCount * valor_do_plano
            // Mas por enquanto somaremos tudo.
            const estimatedMRR = activeTierCount * 147; // R$147/mes por exemplo

            // Busca histórico global (buscas realizadas)
            const historySnap = await getDocs(collection(db, 'history'));
            const totalSearches = historySnap.size;

            setStats({
                users: usersSnap.size,
                searches: totalSearches,
                mrr: estimatedMRR,
                credits: totalCredits
            });

            // Atividade Recente (ex: join de usuários e buscas)
            // Para simplicidade, usamos logs recentes do history ou users se tivermos timestamps.
            // Aqui pegaremos os ultimos usuários e buscas simulando um feed.
            const recentHistoryQ = query(collection(db, 'history'), orderBy('timestamp', 'desc'), limit(5));
            const rhSnap = await getDocs(recentHistoryQ);

            const activities: any[] = [];
            rhSnap.forEach(doc => {
                activities.push({ id: doc.id, type: 'search', data: doc.data(), time: doc.data().timestamp?.toDate?.() || new Date() });
            });
            // O ideal seria pegar um collection combinado de 'logs' ou 'activities', mas mesclaremos aqui se necessário.

            setRecentActivity(activities);
        };

        fetchOverview();
    }, []);

    const METRICS = [
        { label: 'Total de Usuários', value: stats.users.toString(), change: 'Real-time' },
        { label: 'Buscas Realizadas', value: stats.searches.toString(), change: 'Real-time' },
        { label: 'MRR Estimado', value: `R$ ${stats.mrr}`, change: 'Baseado no Tier' },
        { label: 'Créditos em Circulação', value: stats.credits.toString(), change: 'Total System' },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {METRICS.map((metric, i) => (
                    <div key={i} className="p-6 rounded-xl bg-[#0a0a0a] border border-[#222] hover:border-[#444] transition-all duration-300 group flex flex-col justify-between h-36">
                        <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                        <div className="flex items-end justify-between mt-auto">
                            <h3 className="text-4xl font-bold tracking-tighter text-white">{metric.value}</h3>
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-mono px-2 py-1 rounded bg-[#111] border border-gray-600 text-gray-400">
                                    {metric.change}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-[#0a0a0a] rounded-xl border border-[#222] overflow-hidden transition-colors hover:border-[#333]">
                <div className="p-5 border-b border-[#222] flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-white">Atividade Recente</h3>
                    <button className="text-xs font-mono text-gray-500 hover:text-white transition-colors">Atualizar →</button>
                </div>
                <div className="p-6">
                    {recentActivity.length > 0 ? (
                        <ul className="space-y-4">
                            {recentActivity.map(act => (
                                <li key={act.id} className="flex justify-between items-center py-2 border-b border-[#111]">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white uppercase tracking-wider">{act.type}</span>
                                        <span className="text-xs text-gray-500 mt-1">{act.data.query || `Query ID: ${act.id}`}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-600 font-mono">{act.time.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-16 flex flex-col items-center justify-center text-center">
                            <Activity size={32} className="mb-4 text-gray-600" strokeWidth={1.5} />
                            <p className="text-gray-400 text-sm max-w-sm">Nenhuma atividade recente encontrada no histórico ainda.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;

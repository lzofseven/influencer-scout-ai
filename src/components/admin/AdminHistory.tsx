import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search } from 'lucide-react';

const AdminHistory: React.FC = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'history'), orderBy('timestamp', 'desc'), limit(50));
                const snap = await getDocs(q);
                const data: any[] = [];
                snap.forEach(doc => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                setHistory(data);
            } catch (err) {
                console.error("Erro fetch history:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const downloadCSV = () => {
        if (history.length === 0) return;
        const headers = ['ID', 'Timestamp', 'UserID', 'Query', 'ResultsCount'];
        const rows = history.map(item => [
            item.id,
            item.timestamp?.toDate ? item.timestamp.toDate().toISOString() : '',
            item.userId || 'Sistema',
            `"${item.query || ''}"`,
            item.resultsCount || 0
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `history_export_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tighter text-white">Histórico Global de Buscas</h3>
                    <p className="text-gray-500 text-sm">Auditoria "Omnisciente" do uso da plataforma pelos usuários.</p>
                </div>
                <button
                    onClick={downloadCSV}
                    className="text-xs font-mono px-4 py-2 bg-white text-black hover:bg-gray-200 transition-colors rounded-md font-bold shadow-sm"
                >
                    Baixar Relatório (CSV)
                </button>
            </div>

            <div className="bg-[#0a0a0a] rounded-xl border border-[#222] overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#111] text-xs uppercase text-gray-500 border-b border-[#222]">
                        <tr>
                            <th className="px-6 py-4 font-mono font-medium">Timestamp</th>
                            <th className="px-6 py-4 font-mono font-medium">Usuário (UID)</th>
                            <th className="px-6 py-4 font-mono font-medium">Termo de Busca</th>
                            <th className="px-6 py-4 font-mono font-medium text-right">Perfis Encontrados</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-600">Carregando auditoria...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-600">Nenhum termo de busca registrado ainda.</td></tr>
                        ) : (
                            history.map(item => (
                                <tr key={item.id} className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                                        {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Sem data'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-[10px] font-mono text-gray-500 truncate max-w-[150px]">{item.userId || 'Sistema'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-white bg-[#111] px-2 py-1 rounded font-mono border border-[#333]">"{item.query || 'Sem Termo'}"</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-white">
                                        {item.resultsCount || 0}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminHistory;

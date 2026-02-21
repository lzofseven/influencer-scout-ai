import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DollarSign, UploadCloud } from 'lucide-react';

const AdminFinance: React.FC = () => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFinanceData = async () => {
            setLoading(true);
            try {
                // Fetching from a hypothetical 'payments' or 'webhooks' collection
                const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(50));
                const snap = await getDocs(q);
                const data: any[] = [];
                snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
                setPayments(data);
            } catch (err) {
                console.error("Erro fetch finance:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFinanceData();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tighter text-white">Receita & Webhooks</h3>
                    <p className="text-gray-500 text-sm">Controle de pagamentos, faturamento e integração Stripe/Pagar.me.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 text-xs font-mono px-4 py-2 bg-[#111] border border-[#333] text-white hover:bg-[#222] transition-colors rounded-md font-bold shadow-sm">
                        <UploadCloud size={14} /> Exportar CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-[#222] flex flex-col justify-between h-32">
                    <p className="text-sm font-medium text-gray-500">Receita Bruta (Mês)</p>
                    <h3 className="text-3xl font-bold tracking-tighter text-emerald-400">R$ 0,00</h3>
                </div>
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-[#222] flex flex-col justify-between h-32">
                    <p className="text-sm font-medium text-gray-500">Planos Ativos</p>
                    <h3 className="text-3xl font-bold tracking-tighter text-white">0</h3>
                </div>
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-[#222] flex flex-col justify-between h-32">
                    <p className="text-sm font-medium text-gray-500">Taxa de Churn (%)</p>
                    <h3 className="text-3xl font-bold tracking-tighter text-white">0%</h3>
                </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-xl border border-[#222] overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#111] text-xs uppercase text-gray-500 border-b border-[#222]">
                        <tr>
                            <th className="px-6 py-4 font-mono font-medium">Transação (ID)</th>
                            <th className="px-6 py-4 font-mono font-medium">Cliente (UID)</th>
                            <th className="px-6 py-4 font-mono font-medium">Valor</th>
                            <th className="px-6 py-4 font-mono font-medium">Status / Plano</th>
                            <th className="px-6 py-4 font-mono font-medium text-right">Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-600">Aguardando logs do gateway...</td></tr>
                        ) : payments.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-600">Nenhum pagamento registrado ainda via webhook.</td></tr>
                        ) : (
                            payments.map(pay => (
                                <tr key={pay.id} className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs">{pay.id}</td>
                                    <td className="px-6 py-4 text-xs">{pay.userId}</td>
                                    <td className="px-6 py-4 text-white font-bold">R$ {pay.amount || '0,00'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${pay.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                            }`}>
                                            {pay.status || 'Pendente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-xs font-mono">{pay.createdAt?.toDate ? pay.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminFinance;

import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShieldAlert, Ban, Search, CheckCircle2 } from 'lucide-react';

interface AdminSecurityProps {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AdminSecurity: React.FC<AdminSecurityProps> = ({ showToast }) => {
    const [bannedUsers, setBannedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBanned = async () => {
            setLoading(true);
            try {
                // Procurar usuários com a flag isBanned == true
                const q = query(collection(db, 'users'), where('isBanned', '==', true));
                const snap = await getDocs(q);
                const data: any[] = [];
                snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
                setBannedUsers(data);
            } catch (err) {
                console.error("Erro fetch banned:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBanned();
    }, []);

    const handleUnban = async (userId: string) => {
        if (!confirm("Deseja restaurar o acesso deste usuário?")) return;
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                isBanned: false,
                banReason: null,
                updatedAt: serverTimestamp()
            });
            showToast("Acesso do usuário restaurado!", "success");
            // Update list
            setBannedUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            console.error("Erro ao remover ban:", err);
            showToast("Erro ao processar reversão de banimento.", "error");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tighter text-white">Segurança & Banimentos</h3>
                    <p className="text-gray-500 text-sm">Controle de acessos indevidos e blacklists.</p>
                </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-xl border border-[#222] overflow-hidden max-w-4xl">
                <div className="p-5 border-b border-[#222] flex justify-between items-center bg-[#111]">
                    <div className="flex gap-2 items-center text-white font-semibold">
                        <Ban size={18} className="text-red-500" />
                        Usuários Banidos
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input type="text" placeholder="Pesquisar..." className="pl-9 pr-3 py-1 bg-black border border-[#333] rounded text-xs text-white focus:outline-none" />
                    </div>
                </div>
                <div className="p-0">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase text-gray-500 border-b border-[#222]">
                            <tr>
                                <th className="px-6 py-3 font-mono font-medium">UID / Email</th>
                                <th className="px-6 py-3 font-mono font-medium">Motivo</th>
                                <th className="px-6 py-3 font-mono font-medium text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-600">Buscando blacklists...</td></tr>
                            ) : bannedUsers.length === 0 ? (
                                <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-600 flex flex-col items-center">
                                    <ShieldAlert size={32} className="mb-2 opacity-30 text-emerald-500" />
                                    Nenhum usuário banido. Sistema limpo.
                                </td></tr>
                            ) : (
                                bannedUsers.map(user => (
                                    <tr key={user.id} className="border-b last:border-0 border-[#1a1a1a] hover:bg-[#111]">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{user.email || 'N/A'}</div>
                                            <div className="text-[10px] font-mono text-gray-500">{user.id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs">{user.banReason || 'Violação dos Termos de Uso'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleUnban(user.id)}
                                                className="text-xs font-mono text-white bg-[#222] px-3 py-1.5 rounded hover:bg-white hover:text-black transition-colors"
                                            >
                                                Remover Ban
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminSecurity;

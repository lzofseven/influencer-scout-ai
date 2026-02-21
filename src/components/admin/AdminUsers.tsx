import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users as UsersIcon, Search, ShieldBan, ShieldCheck } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                // Em cenário real com milhoes de dados, deveriamos paginar com limit() e startAfter()
                // Mas vamos resgatar todos pra demonstração de tabela no dashboard de fase 3.
                const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
                const snap = await getDocs(q);
                const data: any[] = [];
                snap.forEach(doc => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                setUsers(data);
            } catch (err) {
                console.error("Erro fetch users:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleUpdateCredits = async (userId: string, currentCredits: number) => {
        const input = prompt(`Quantos créditos deseja definir para este usuário? (Atual: ${currentCredits})`, currentCredits.toString());
        if (input === null) return;

        const newCredits = parseInt(input);
        if (isNaN(newCredits)) {
            alert("Por favor, insira um número válido.");
            return;
        }

        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                credits: newCredits,
                updatedAt: serverTimestamp()
            });
            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, credits: newCredits } : u));
        } catch (err) {
            console.error("Erro ao atualizar créditos:", err);
            alert("Erro ao processar ação.");
        }
    };

    const handleToggleBan = async (userId: string, currentStatus: boolean) => {
        if (!confirm(`Deseja realmente ${currentStatus ? 'desbloquear' : 'banir'} este usuário?`)) return;

        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                isBanned: !currentStatus,
                banReason: !currentStatus ? 'Violação detectada pelo Administrador' : null,
                updatedAt: serverTimestamp()
            });
            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: !currentStatus } : u));
        } catch (err) {
            console.error("Erro ao alterar status de banimento:", err);
            alert("Erro ao processar ação.");
        }
    };

    const filteredUsers = users.filter(u =>
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tighter text-white">Gerenciar Usuários</h3>
                    <p className="text-gray-500 text-sm">Controle de saldo, tier e banimentos.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por Email ou UID..."
                        className="pl-10 pr-4 py-2 bg-[#111] border border-[#222] rounded-md text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-xl border border-[#222] overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-[#111] text-xs uppercase text-gray-500 border-b border-[#222]">
                        <tr>
                            <th className="px-6 py-4 font-mono font-medium">Usuário</th>
                            <th className="px-6 py-4 font-mono font-medium">Plano / Tier</th>
                            <th className="px-6 py-4 font-mono font-medium">Créditos</th>
                            <th className="px-6 py-4 font-mono font-medium">Data Criação</th>
                            <th className="px-6 py-4 font-mono font-medium">Último Acesso</th>
                            <th className="px-6 py-4 font-mono font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-600">Carregando usuários...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-600">Nenhum usuário encontrado.</td></tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user.id} className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white mb-0.5">{user.name || 'Sem Nome'}</div>
                                        <div className="text-[10px] text-gray-400 mb-0.5">{user.email || 'Usuário Google/Sem Email'}</div>
                                        <div className="text-[10px] font-mono text-gray-600 truncate max-w-[200px]">{user.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${user.tier === 'Admin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' :
                                                user.tier === 'Scale' ? 'bg-white text-black border-white' :
                                                    'bg-[#222] text-white border-gray-600'
                                            }`}>
                                            {user.tier || 'Starter'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-white">
                                        {user.credits !== undefined ? user.credits : 0}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                        {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'Desconhecido'}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                        {user.lastOnline?.toDate ? user.lastOnline.toDate().toLocaleString() : 'Desconhecido'}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-3 mt-1.5">
                                        <button
                                            onClick={() => handleUpdateCredits(user.id, user.credits || 0)}
                                            className="text-[10px] font-mono text-gray-400 border-b border-transparent hover:border-blue-500 hover:text-blue-500 transition-all pb-0.5"
                                        >
                                            CRÉDITOS
                                        </button>
                                        <button
                                            onClick={() => handleToggleBan(user.id, !!user.isBanned)}
                                            className={`flex items-center gap-1.5 text-[10px] font-mono transition-all pb-0.5 border-b border-transparent ${user.isBanned
                                                ? 'text-emerald-500 hover:border-emerald-500'
                                                : 'text-red-500 hover:border-red-500'
                                                }`}
                                        >
                                            {user.isBanned ? <ShieldCheck size={12} /> : <ShieldBan size={12} />}
                                            {user.isBanned ? 'DESBANIR' : 'BANIR'}
                                        </button>
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

export default AdminUsers;

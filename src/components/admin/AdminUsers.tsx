import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Users as UsersIcon, Search } from 'lucide-react';

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
                            <th className="px-6 py-4 font-mono font-medium">Usuário (UID)</th>
                            <th className="px-6 py-4 font-mono font-medium">Plano / Tier</th>
                            <th className="px-6 py-4 font-mono font-medium">Créditos</th>
                            <th className="px-6 py-4 font-mono font-medium">Data Ingresso</th>
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
                                        <div className="font-bold text-white mb-0.5">{user.email || 'Usuário Google/Sem Email'}</div>
                                        <div className="text-[10px] font-mono text-gray-600 truncate max-w-[200px]">{user.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${user.tier === 'Scale' ? 'bg-white text-black border-white' :
                                                user.tier === 'Starter' ? 'bg-[#222] text-white border-gray-600' : 'bg-transparent text-gray-500 border-gray-800'
                                            }`}>
                                            {user.tier || 'free'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono">
                                        {user.credits || 0}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                        {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'Desconhecido'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-xs font-mono text-gray-500 border-b border-transparent hover:border-white hover:text-white transition-all pb-0.5">
                                            Editar
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

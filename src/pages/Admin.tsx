import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Search, DollarSign, Activity, Settings, ShieldAlert, Database, BarChart3, Mail, RefreshCw, Terminal, Command } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

const AdminDashboard: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [activeMenu, setActiveMenu] = useState('overview');

    // Proteção da rota
    useEffect(() => {
        if (!loading && (!user || user.email !== 'loohansb@gmail.com')) {
            navigate('/dashboard'); // Redireciona usuários comuns ou não logados
        }
    }, [user, loading, navigate]);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono">Verificando Autorização...</div>;
    if (!user || user.email !== 'loohansb@gmail.com') return null; // Previne flash de conteúdo

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] font-sans flex overflow-hidden">
            {/* Sidebar de Admin */}
            <aside className="w-64 border-r border-[#1F1F1F] bg-[#0A0A0A] flex flex-col h-screen fixed">
                <div className="p-6 border-b border-[#1F1F1F] flex items-center gap-2">
                    <Terminal size={20} className="text-red-500" />
                    <h1 className="font-bold tracking-tighter">ADMIN GOD MODE</h1>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {[
                        { id: 'overview', label: 'Panorama (Overview)', icon: <BarChart3 size={18} /> },
                        { id: 'users', label: 'Gerenciar Usuários', icon: <Users size={18} /> },
                        { id: 'history', label: 'Histórico Global', icon: <Search size={18} /> },
                        { id: 'finance', label: 'Receita & Webhooks', icon: <DollarSign size={18} /> },
                        { id: 'system', label: 'Saúde & Logs (LLM)', icon: <Activity size={18} /> },
                        { id: 'marketing', label: 'Disparos Email/Promos', icon: <Mail size={18} /> },
                        { id: 'security', label: 'Segurança & Banimentos', icon: <ShieldAlert size={18} /> },
                        { id: 'settings', label: 'Parametrização IA', icon: <Settings size={18} /> },
                        { id: 'db', label: 'Console Firebase Oculto', icon: <Database size={18} /> },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveMenu(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeMenu === item.id
                                    ? 'bg-red-500/10 text-red-500 font-medium border border-red-500/20'
                                    : 'text-gray-400 hover:bg-[#1A1A1A] hover:text-white'
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-[#1F1F1F]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold">L</div>
                        <div className="text-xs">
                            <p className="font-bold text-white">Lohan Santos</p>
                            <p className="text-gray-500">Super Admin (Root)</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="w-full text-xs text-gray-400 hover:text-white flex items-center justify-center gap-2 py-2 bg-[#1a1a1a] rounded">
                        Voltar ao App Normal
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64 bg-[#0A0A0A] p-8 overflow-y-auto h-screen">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tighter">Painel de Controle</h2>
                        <p className="text-gray-400 text-sm mt-1">Sua visão onisciente do Influencer Scout.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-[#1A1A1A] border border-[#333] rounded-full flex items-center gap-2 text-xs font-mono text-gray-300">
                            <Command size={14} /> K
                            <span className="text-gray-500 pl-2">Omni-Search</span>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors">
                            <RefreshCw size={14} /> Atualizar Dados
                        </button>
                    </div>
                </header>

                {activeMenu === 'overview' && (
                    <div className="space-y-6">
                        {/* Metric Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Usuários Ativos (Hoje)', value: '142', change: '+12%', color: 'from-blue-500 to-blue-600' },
                                { label: 'Buscas Realizadas (Hoje)', value: '890', change: '+5%', color: 'from-purple-500 to-purple-600' },
                                { label: 'MRR Estimado', value: 'R$ 4.500', change: '+18%', color: 'from-emerald-500 to-emerald-600' },
                                { label: 'Créditos em Circulação', value: '15.4K', change: '-2%', color: 'from-orange-500 to-orange-600' },
                            ].map((metric, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-[#111] border border-[#222] relative overflow-hidden group">
                                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${metric.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                                    <p className="text-sm font-medium text-gray-400 mb-2">{metric.label}</p>
                                    <h3 className="text-4xl font-bold tracking-tighter text-white">{metric.value}</h3>
                                    <p className="text-xs font-mono text-emerald-400 mt-2">{metric.change} vs ontem</p>
                                </div>
                            ))}
                        </div>

                        {/* Recent Activity Table Placeholder */}
                        <div className="mt-8 bg-[#111] rounded-2xl border border-[#222] overflow-hidden">
                            <div className="p-6 border-b border-[#222]">
                                <h3 className="font-bold text-lg">Atividade Recente da Plataforma</h3>
                            </div>
                            <div className="p-12 flex flex-col items-center justify-center text-gray-500 text-sm">
                                <Activity size={32} className="mb-4 opacity-50 text-gray-400" />
                                A tabela real do Firestore será carregada aqui (Usuarios ingressando, Webhooks de Pagamento, etc).
                                <br />
                                Neste momento, a interface é apenas o esqueleto do Super Admin.
                            </div>
                        </div>
                    </div>
                )}

                {/* Other Menus logic placeholders */}
                {activeMenu !== 'overview' && (
                    <div className="flex flex-col items-center justify-center h-96 text-gray-500 space-y-4">
                        <ShieldAlert size={48} className="opacity-20" />
                        <p>O módulo <span className="text-white font-mono bg-[#222] px-2 py-1 rounded mx-1">{activeMenu}</span> está em desenvolvimento pela IA.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;

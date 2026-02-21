import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Search, DollarSign, Activity, Settings, ShieldAlert, Database, BarChart3, Mail, RefreshCw, Terminal } from 'lucide-react';

// Subcomponents
import AdminOverview from '../components/admin/AdminOverview';
import AdminUsers from '../components/admin/AdminUsers';
import AdminHistory from '../components/admin/AdminHistory';
import AdminFinance from '../components/admin/AdminFinance';
import AdminSystem from '../components/admin/AdminSystem';
import AdminMarketing from '../components/admin/AdminMarketing';
import AdminSecurity from '../components/admin/AdminSecurity';
import AdminSettings from '../components/admin/AdminSettings';
import AdminDB from '../components/admin/AdminDB';

const AdminDashboard: React.FC = () => {
    const { user, loading, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeMenu, setActiveMenu] = useState('overview');
    const [isMenuAnimating, setIsMenuAnimating] = useState(false);

    // Rota protegida
    useEffect(() => {
        if (!loading && !isAdmin) {
            navigate('/dashboard');
        }
    }, [isAdmin, loading, navigate]);

    // Animação de troca de aba
    useEffect(() => {
        setIsMenuAnimating(true);
        const timeout = setTimeout(() => setIsMenuAnimating(false), 300);
        return () => clearTimeout(timeout);
    }, [activeMenu]);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono">Verificando Autorização...</div>;
    if (!isAdmin) return null;

    const MENUS = [
        { id: 'overview', label: 'Panorama (Overview)', icon: <BarChart3 size={16} /> },
        { id: 'users', label: 'Gerenciar Usuários', icon: <Users size={16} /> },
        { id: 'history', label: 'Histórico Global', icon: <Search size={16} /> },
        { id: 'finance', label: 'Receita & Webhooks', icon: <DollarSign size={16} /> },
        { id: 'system', label: 'Saúde & Logs (LLM)', icon: <Activity size={16} /> },
        { id: 'marketing', label: 'Disparos Email/Promos', icon: <Mail size={16} /> },
        { id: 'security', label: 'Segurança & Banimentos', icon: <ShieldAlert size={16} /> },
        { id: 'settings', label: 'Parametrização IA', icon: <Settings size={16} /> },
        { id: 'db', label: 'Console Firebase Oculto', icon: <Database size={16} /> },
    ];

    const renderContent = () => {
        switch (activeMenu) {
            case 'overview': return <AdminOverview />;
            case 'users': return <AdminUsers />;
            case 'history': return <AdminHistory />;
            case 'finance': return <AdminFinance />;
            case 'system': return <AdminSystem />;
            case 'marketing': return <AdminMarketing />;
            case 'security': return <AdminSecurity />;
            case 'settings': return <AdminSettings />;
            case 'db': return <AdminDB />;
            default: return <AdminOverview />;
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans flex overflow-hidden selection:bg-white selection:text-black">
            {/* Sidebar minimalista */}
            <aside className="w-72 border-r border-[#1a1a1a] bg-black flex flex-col h-screen fixed z-10 transition-colors">
                <div className="p-6 border-b border-[#1a1a1a] flex items-center gap-3">
                    <Terminal size={22} className="text-white" />
                    <h1 className="font-bold tracking-tight text-xl">GOD MODE</h1>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    <div className="text-xs font-mono text-gray-500 mb-4 px-2 uppercase tracking-wider">Módulos</div>
                    {MENUS.map(item => {
                        const isActive = activeMenu === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveMenu(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ease-out border ${isActive
                                    ? 'bg-white text-black font-semibold border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                    : 'bg-transparent text-gray-400 border-transparent hover:bg-[#111] hover:text-white hover:border-[#222]'
                                    }`}
                            >
                                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[#1a1a1a] bg-[#050505]">
                    <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-[#111] border border-[#222]">
                        <div className="w-8 h-8 rounded bg-white text-black flex items-center justify-center font-bold font-mono">
                            {user?.email?.[0]?.toUpperCase() || 'L'}
                        </div>
                        <div className="text-xs flex-1 truncate">
                            <p className="font-bold text-white truncate">{user?.email || 'Admin'}</p>
                            <p className="text-gray-500 font-mono mt-0.5">Super Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full text-xs text-gray-400 hover:text-black hover:bg-white border border-[#222] flex items-center justify-center gap-2 py-2.5 rounded-md transition-all duration-200"
                    >
                        Voltar ao App Normal
                    </button>
                </div>
            </aside>

            {/* Conteúdo Central */}
            <main className="flex-1 ml-72 bg-black min-h-screen relative overflow-y-auto overflow-x-hidden">
                <div className="fixed top-0 left-72 right-0 h-64 bg-gradient-to-b from-[#111] to-transparent opacity-50 pointer-events-none z-0" />

                <div className="p-10 relative z-10 max-w-7xl mx-auto min-h-full pb-32">
                    <header className="flex justify-between items-end mb-12 border-b border-[#1a1a1a] pb-6 sticky top-0 bg-black/80 backdrop-blur-md pt-6 z-20">
                        <div>
                            <h2 className="text-4xl font-bold tracking-tighter text-white mb-2">
                                {MENUS.find(m => m.id === activeMenu)?.label || 'Painel de Controle'}
                            </h2>
                            <p className="text-gray-400 text-sm font-mono">Sua visão onisciente corporativa.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-[#0a0a0a] border border-[#222] rounded-md flex items-center gap-3 text-xs font-mono text-gray-400">
                                <Search size={14} className="text-gray-500" />
                                <span>Omni-Search</span>
                                <div className="border border-[#333] px-1.5 py-0.5 rounded text-[10px] text-gray-500">⌘K</div>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-bold rounded-md hover:bg-gray-200 transition-colors shadow-sm"
                            >
                                <RefreshCw size={14} /> Atualizar Dados
                            </button>
                        </div>
                    </header>

                    <div className={`transition-all duration-300 ease-in-out transform ${isMenuAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;

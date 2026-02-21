import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Search, DollarSign, Activity, Settings, ShieldAlert, Database, BarChart3, Mail, RefreshCw, Terminal, Menu, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' | 'info' }>({
        show: false,
        message: '',
        type: 'success'
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

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
        const props = { showToast };
        switch (activeMenu) {
            case 'overview': return <AdminOverview />;
            case 'users': return <AdminUsers {...props} />;
            case 'history': return <AdminHistory />;
            case 'finance': return <AdminFinance />;
            case 'system': return <AdminSystem />;
            case 'marketing': return <AdminMarketing {...props} />;
            case 'security': return <AdminSecurity {...props} />;
            case 'settings': return <AdminSettings {...props} />;
            case 'db': return <AdminDB />;
            default: return <AdminOverview />;
        }
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans flex overflow-hidden selection:bg-white selection:text-black">
            {/* Overlay para fechar menu no mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar minimalista */}
            <aside className={`w-72 border-r border-[#1a1a1a] bg-black flex flex-col h-screen fixed z-40 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}>
                <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Terminal size={22} className="text-white" />
                        <h1 className="font-bold tracking-tight text-xl">GOD MODE</h1>
                    </div>
                    <button
                        className="lg:hidden p-1 hover:bg-[#111] rounded"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    <div className="text-xs font-mono text-gray-500 mb-4 px-2 uppercase tracking-wider">Módulos</div>
                    {MENUS.map(item => {
                        const isActive = activeMenu === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveMenu(item.id);
                                    setIsSidebarOpen(false); // Fecha no mobile ao clicar
                                }}
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
            <main className="flex-1 lg:ml-72 bg-black min-h-screen relative overflow-y-auto overflow-x-hidden">
                <div className="fixed top-0 lg:left-72 left-0 right-0 h-64 bg-gradient-to-b from-[#111] to-transparent opacity-50 pointer-events-none z-0" />

                <div className="p-6 md:p-10 relative z-10 max-w-7xl mx-auto min-h-full pb-32">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-[#1a1a1a] pb-6 sticky top-0 bg-black/80 backdrop-blur-md pt-6 z-20 gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2 bg-[#111] border border-[#222] rounded-md"
                            >
                                <Menu size={20} />
                            </button>
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-white mb-1">
                                    {MENUS.find(m => m.id === activeMenu)?.label || 'Painel de Controle'}
                                </h2>
                                <p className="text-gray-400 text-xs md:text-sm font-mono">Sua visão onisciente corporativa.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="hidden sm:flex flex-1 md:flex-none px-4 py-2 bg-[#0a0a0a] border border-[#222] rounded-md items-center gap-3 text-xs font-mono text-gray-400">
                                <Search size={14} className="text-gray-500" />
                                <span>Omni-Search</span>
                                <div className="border border-[#333] px-1.5 py-0.5 rounded text-[10px] text-gray-500">⌘K</div>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-black text-xs md:text-sm font-bold rounded-md hover:bg-gray-200 transition-colors shadow-sm"
                            >
                                <RefreshCw size={14} /> Atualizar
                            </button>
                        </div>
                    </header>

                    <div className={`transition-all duration-300 ease-in-out transform ${isMenuAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                        {renderContent()}
                    </div>
                </div>
            </main>
            {/* Toast System */}
            <div className={`fixed bottom-8 right-8 z-[100] transition-all duration-300 transform ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                <div className={`flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-md shadow-2xl ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        'bg-white/10 border-white/20 text-white'
                    }`}>
                    {toast.type === 'success' && <CheckCircle2 size={20} />}
                    {toast.type === 'error' && <AlertCircle size={20} />}
                    {toast.type === 'info' && <Info size={20} />}
                    <span className="font-bold tracking-tight">{toast.message}</span>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

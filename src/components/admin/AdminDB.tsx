import React from 'react';
import { Database, ExternalLink, AlertOctagon } from 'lucide-react';

const AdminDB: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tighter text-white">Console Firebase Oculto</h3>
                    <p className="text-gray-500 text-sm">Acesso direto ao backend e banco de dados real-time (Aviso Crítico).</p>
                </div>
            </div>

            <div className="bg-[#050505] rounded-xl border border-red-900/40 p-10 max-w-3xl flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-red-900/10 flex items-center justify-center mb-6">
                    <Database size={40} className="text-red-500" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">Zona de Alto Risco</h2>

                <div className="bg-[#111] border border-[#222] p-4 rounded-md text-sm text-gray-400 mb-8 max-w-xl">
                    <AlertOctagon size={16} className="inline mr-2 text-red-500" />
                    As alterações feitas diretamente no Console do Firebase não passam por validação de negócios (Frontend)
                    podendo causar corrupção de dados da plataforma SaaS.
                </div>

                <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-md transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                >
                    Acessar Console do Firebase <ExternalLink size={16} />
                </a>
            </div>
        </div>
    );
};

export default AdminDB;

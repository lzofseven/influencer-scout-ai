import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Activity, Cpu, HardDrive, Wifi } from 'lucide-react';

const AdminSystem: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<any>({ gemini: 'loading', kimi: 'loading', latency: '0s', errors24h: 0 });

    useEffect(() => {
        const fetchSystemData = async () => {
            setLoading(true);
            try {
                // Fetch logs
                const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(30));
                const snap = await getDocs(q);
                const data: any[] = [];
                snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
                setLogs(data);

                // Fetch real system status from config/system_status
                const statusRef = doc(db, 'settings', 'system_status');
                const statusSnap = await getDoc(statusRef);
                if (statusSnap.exists()) {
                    setStatus(statusSnap.data());
                } else {
                    // Fallback baseline if doc doesn't exist yet
                    setStatus({ gemini: 'online', kimi: 'online', latency: '--', errors24h: 0 });
                }
            } catch (err) {
                console.error("Erro fetch system data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSystemData();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tighter text-white">Saúde & Logs (LLM)</h3>
                    <p className="text-gray-500 text-sm">Monitoramento em tempo real da infraestrutura e falhas nas APIs da IA.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-[#111] border border-[#222] flex flex-col justify-between items-center text-center">
                    <Wifi size={24} className={status.gemini === 'online' ? 'text-emerald-500 mb-2' : 'text-red-500 mb-2'} />
                    <p className="text-sm font-medium text-gray-500">Status Gemini</p>
                    <h3 className="text-lg font-bold text-white uppercase">{status.gemini}</h3>
                </div>
                <div className="p-4 rounded-xl bg-[#111] border border-[#222] flex flex-col justify-between items-center text-center">
                    <Wifi size={24} className={status.kimi === 'online' ? 'text-emerald-500 mb-2' : 'text-red-500 mb-2'} />
                    <p className="text-sm font-medium text-gray-500">Status Kimi (Fallback)</p>
                    <h3 className="text-lg font-bold text-white uppercase">{status.kimi}</h3>
                </div>
                <div className="p-4 rounded-xl bg-[#111] border border-[#222] flex flex-col justify-between items-center text-center">
                    <Cpu size={24} className="text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-500">Latência Média</p>
                    <h3 className="text-lg font-bold text-white">{status.latency}</h3>
                </div>
                <div className="p-4 rounded-xl bg-[#111] border border-[#222] flex flex-col justify-between items-center text-center">
                    <HardDrive size={24} className="text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-500">Erros (Últimas 24h)</p>
                    <h3 className="text-lg font-bold text-white">{status.errors24h}</h3>
                </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-xl border border-[#222] overflow-hidden">
                <div className="p-5 border-b border-[#222] flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-white">Console de Erros (Stack)</h3>
                </div>
                {loading ? (
                    <div className="p-12 text-center text-gray-600">Buscando rastros...</div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-gray-600 flex flex-col items-center">
                        <Activity size={32} className="mb-4 opacity-30" />
                        <p>Nenhuma anomalia detectada. Servidores operando 100%.</p>
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto p-4 space-y-2">
                        {logs.map(log => (
                            <div key={log.id} className="p-3 bg-[#111] border border-[#333] rounded font-mono text-xs flex justify-between">
                                <span className={log.level === 'error' ? 'text-red-400' : 'text-gray-400'}>
                                    [{log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : ''}] {log.message}
                                </span>
                                <span className="text-gray-600 bg-black px-2 py-0.5 rounded">{log.service}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSystem;

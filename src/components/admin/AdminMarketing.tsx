import { Mail, Send, Check } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AdminMarketingProps {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AdminMarketing: React.FC<AdminMarketingProps> = ({ showToast }) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [audience, setAudience] = useState('all'); // all, pro, active
    const [sending, setSending] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            await addDoc(collection(db, 'marketing_campaigns'), {
                subject,
                body,
                audience,
                status: 'queued',
                createdAt: serverTimestamp()
            });
            setShowSuccess(true);
            showToast('Campanha enfileirada com sucesso!', 'success');
            setSubject('');
            setBody('');
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error("Erro ao enfileirar campanha", err);
            showToast('Erro ao agendar disparos.', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tighter text-white">Disparos de E-mail / Promos</h3>
                    <p className="text-gray-500 text-sm">Comunicação em massa com a base de usuários do InfluencerPRO.</p>
                </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-8 max-w-3xl">
                <form onSubmit={handleSend} className="space-y-6">
                    <div className="relative group">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Público-Alvo</label>
                        <div className="relative">
                            <select
                                value={audience}
                                onChange={(e) => setAudience(e.target.value)}
                                className="w-full bg-[#111] border border-white/10 text-white rounded-xl px-4 py-4 appearance-none focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all cursor-pointer hover:bg-[#151515] font-medium"
                            >
                                <option value="all" className="bg-[#0a0a0a]">Todos os Usuários Cadastrados</option>
                                <option value="starter" className="bg-[#0a0a0a]">Apenas Plano Starter</option>
                                <option value="scale" className="bg-[#0a0a0a]">Assinantes Scale (VIP)</option>
                                <option value="inactive" className="bg-[#0a0a0a]">Usuários Inativos (+30 dias)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-white transition-colors">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Assunto do E-mail</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Nova funcionalidade de IA disponível!"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-[#111] border border-[#333] text-white rounded-md px-4 py-3 focus:outline-none focus:border-white transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Corpo do E-mail (Suporta Markdown/HTML básico)</label>
                        <textarea
                            required
                            rows={8}
                            placeholder="Olá {nome}, temos novidades na plataforma..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full bg-[#111] border border-[#333] text-white rounded-md px-4 py-3 focus:outline-none focus:border-white transition-colors resize-none font-mono text-sm"
                        />
                    </div>

                    <div className="pt-4 border-t border-[#222] flex justify-end">
                        <button
                            type="submit"
                            disabled={sending || showSuccess}
                            className={`px-6 py-3 rounded-md font-bold text-sm flex items-center gap-2 transition-all duration-300 disabled:opacity-50 ${showSuccess ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-gray-200'
                                }`}
                        >
                            {sending ? 'Disparando...' : showSuccess ? (
                                <>
                                    <Check size={16} /> Disparado!
                                </>
                            ) : (
                                <>
                                    <Send size={16} /> Enviar Campanha
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminMarketing;

import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const AdminMarketing: React.FC = () => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [audience, setAudience] = useState('all'); // all, pro, active
    const [sending, setSending] = useState(false);

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
            alert('Campanha inserida na fila de disparos (marketing_campaigns).');
            setSubject('');
            setBody('');
        } catch (err) {
            console.error("Erro ao enfileirar campanha", err);
            alert('Erro ao agendar disparos.');
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
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Público-Alvo</label>
                        <select
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                            className="w-full bg-[#111] border border-[#333] text-white rounded-md px-4 py-3 focus:outline-none focus:border-white transition-colors"
                        >
                            <option value="all">Todos os Usuários Cadastrados</option>
                            <option value="pro">Assinantes Ativos (Scale/Pro)</option>
                            <option value="inactive">Usuários Inativos (+30 dias)</option>
                        </select>
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
                            disabled={sending}
                            className="bg-white text-black px-6 py-3 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            {sending ? 'Disparando...' : (
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

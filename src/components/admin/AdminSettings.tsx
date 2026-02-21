import React, { useState, useEffect } from 'react';
import { Save, Settings2, Sliders, Check } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AdminSettingsProps {
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ showToast }) => {
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(true);

    const [settings, setSettings] = useState({
        primaryModel: 'gemini-2.0-flash',
        fallbackModel: 'moonshotai/kimi-k2.5',
        temperature: 0.1,
        maxTokens: 1500,
        enableFallback: true,
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'ai');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(prev => ({ ...prev, ...docSnap.data() }));
                }
            } catch (err) {
                console.error("Erro ao carregar configurações de IA", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const docRef = doc(db, 'settings', 'ai');
            await setDoc(docRef, settings, { merge: true });
            setShowSuccess(true);
            showToast('Configurações de IA salvas com sucesso!', 'success');
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            console.error("Erro ao salvar", err);
            showToast('Erro ao salvar as configurações.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold tracking-tighter text-white">Parametrização IA</h3>
                    <p className="text-gray-500 text-sm">Controle fino dos modelos de linguagem, fallbacks e prompts do sistema.</p>
                </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-8 max-w-3xl">
                <form onSubmit={handleSave} className="space-y-8">

                    {/* Model Config */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-white font-semibold pb-2 border-b border-[#222]">
                            <Settings2 size={18} /> Engine de Processamento principal
                        </h4>
                        <div className="relative group">
                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Modelo Primário (Gemini)</label>
                            <div className="relative">
                                <select
                                    value={settings.primaryModel}
                                    onChange={e => setSettings({ ...settings, primaryModel: e.target.value })}
                                    className="w-full bg-[#111] border border-white/10 text-white rounded-xl px-4 py-4 appearance-none focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all cursor-pointer hover:bg-[#151515] font-medium"
                                >
                                    <optgroup label="Nova Geração (V3)" className="bg-[#0a0a0a]">
                                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Preview)</option>
                                        <option value="gemini-3-flash-preview">Gemini 3 Flash (Preview)</option>
                                        <option value="gemini-3-deep-think-preview">Gemini 3 Deep Think (Reasoning)</option>
                                    </optgroup>
                                    <optgroup label="Série 2.5 (High Performance)" className="bg-[#0a0a0a]">
                                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (1M Context)</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra Fast)</option>
                                    </optgroup>
                                    <optgroup label="Série 2.0 (Estáveis)" className="bg-[#0a0a0a]">
                                        <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Default)</option>
                                        <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
                                    </optgroup>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-white transition-colors">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 border border-[#333] rounded-md bg-[#111]">
                            <div>
                                <p className="text-sm text-white font-medium">Ativar Fallback de Alta Disponibilidade</p>
                                <p className="text-xs text-gray-500 mt-1">Se a API do Gemini falhar, rotear para o provedor Kimi.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={settings.enableFallback} onChange={e => setSettings({ ...settings, enableFallback: e.target.checked })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-[#222] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-black after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
                            </label>
                        </div>
                    </div>

                    {/* Inference Config */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-white font-semibold pb-2 border-b border-[#222]">
                            <Sliders size={18} /> Ajuste Fino de Inferência
                        </h4>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
                                Temperatura (Criatividade) - Atual: {settings.temperature}
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.1"
                                value={settings.temperature}
                                onChange={e => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                                className="w-full accent-white"
                            />
                            <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                                <span>Mais Analítico (0.0)</span>
                                <span>Normal (0.5)</span>
                                <span>Mais Criativo (1.0)</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[#222] flex justify-end">
                        <button
                            type="submit"
                            disabled={saving || loading || showSuccess}
                            className={`px-6 py-3 rounded-md font-bold text-sm flex items-center gap-2 transition-all duration-300 disabled:opacity-50 ${showSuccess ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-gray-200'
                                }`}
                        >
                            {saving ? 'Gravando...' : loading ? 'Carregando...' : showSuccess ? (
                                <>
                                    <Check size={16} /> Salvo!
                                </>
                            ) : (
                                <>
                                    <Save size={16} /> Salvar Configurações Globais
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminSettings;

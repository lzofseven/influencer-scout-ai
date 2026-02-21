import React, { useState } from 'react';
import { Save, Settings2, Sliders } from 'lucide-react';

const AdminSettings: React.FC = () => {
    const [saving, setSaving] = useState(false);

    // Mock settings that would normally come from Firestore (e.g., config/ai_settings)
    const [settings, setSettings] = useState({
        primaryModel: 'gemini-2.0-flash',
        fallbackModel: 'moonshotai/kimi-k2.5',
        temperature: 0.1,
        maxTokens: 1500,
        enableFallback: true,
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        // Simulate save to Firestore
        setTimeout(() => {
            alert('Aviso simulado: Configurações salvas no Firestore.');
            setSaving(false);
        }, 1000);
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
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Modelo Primário (Gemini)</label>
                            <select
                                value={settings.primaryModel}
                                onChange={e => setSettings({ ...settings, primaryModel: e.target.value })}
                                className="w-full bg-[#111] border border-[#333] text-white rounded-md px-4 py-3 focus:outline-none focus:border-white transition-colors"
                            >
                                <option value="gemini-2.0-flash">gemini-2.0-flash (Recomendado)</option>
                                <option value="gemini-1.5-pro">gemini-1.5-pro (Mais Lento/Caro)</option>
                            </select>
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
                            disabled={saving}
                            className="bg-white text-black px-6 py-3 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Gravando...' : (
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

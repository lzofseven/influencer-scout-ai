import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2 } from 'lucide-react';
import { FAQ } from '../../components/FAQ';
import { Footer } from '../../components/Footer';

export default function Pricing() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isAnnual, setIsAnnual] = useState(false);

    // AIDA Copywriting Sections
    const plans = [
        {
            name: "Starter",
            desc: "Para marcas e criadores dando o próximo passo.",
            price: isAnnual ? "R$ 97/mês" : "R$ 147/mês",
            credits: 100,
            features: [
                "100 buscas premium com IA",
                "Métricas de engajamento verificadas",
                "Até 20 influenciadores por busca",
                "Busca por localização e nicho",
                "Suporte por e-mail"
            ],
            button: "Assinar Starter",
            action: () => alert("Integração com gateway Caktus/Stripe em breve."),
            highlight: false
        },
        {
            name: "Scale",
            desc: "Volume massivo para agências e grandes marcas.",
            price: isAnnual ? "R$ 297/mês" : "R$ 397/mês",
            credits: 500,
            features: [
                "500 buscas premium mensais",
                "Acesso antecipado a novos filtros",
                "Até 50 influenciadores por busca",
                "Extração de relatórios exportáveis",
                "Suporte VIP prioritário"
            ],
            button: "Assinar Scale",
            action: () => alert("Integração com gateway Caktus/Stripe em breve."),
            highlight: true
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] pt-24 font-sans flex flex-col">
            <div className="flex-grow max-w-7xl mx-auto px-6 pb-20">

                {/* Header - AIDA: Attention & Interest & Desire */}
                <div className="text-center max-w-4xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 dark:border-[#333] text-sm font-medium text-gray-800 dark:text-gray-200 mb-8 bg-white/50 dark:bg-black/50">
                        A ferramenta definitiva de Growth via Influenciadores
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1]">
                        Pare de jogar dinheiro fora com <span className="text-gray-400 dark:text-gray-500 font-serif italic">parcerias ruins.</span>
                    </h1>

                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-4 max-w-2xl mx-auto leading-relaxed">
                        Nossa Inteligência Artificial analisa <strong>engajamento real</strong> e a intenção de audiência para você não cair em fraudes de números inflados.
                    </p>
                    <p className="text-lg text-gray-500 dark:text-gray-500 mb-10 max-w-2xl mx-auto">
                        Transforme horas de pesquisa manual em um processo de 20 segundos que traz os criadores que realmente vão converter para o seu negócio.
                    </p>

                    {/* AIDA: Action */}
                    <div className="flex items-center justify-center gap-4">
                        <span className={`text-sm font-bold ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>Mensal</span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className="relative inline-flex h-7 w-12 items-center rounded-full bg-gray-900 dark:bg-white transition-colors focus:outline-none"
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className={`text-sm font-bold flex items-center gap-2 ${isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                            Anual
                            <span className="px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-[#1A1A1A] text-gray-900 dark:text-white text-xs font-black">
                                -20% OFF
                            </span>
                        </span>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-32">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={`relative rounded-3xl p-10 flex flex-col ${plan.highlight
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xl scale-105 z-10'
                                : 'bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] text-gray-900 dark:text-white shadow-xl shadow-gray-200/50 dark:shadow-none'
                                }`}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-full text-xs font-black text-gray-900 dark:text-white tracking-widest shadow-lg">
                                    MAIS POPULAR
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-3xl font-black mb-3">{plan.name}</h3>
                                <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>{plan.desc}</p>
                            </div>

                            <div className="mb-8 flex flex-col gap-1 border-b border-gray-200/20 dark:border-gray-800/20 pb-8">
                                <span className="text-5xl font-black tracking-tight">{plan.price}</span>
                                <span className={`text-sm font-medium ${plan.highlight ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400'}`}>cobrado {isAnnual ? 'anualmente' : 'mensalmente'}</span>
                            </div>

                            <div className="mb-auto">
                                <p className={`text-sm font-bold uppercase tracking-wider mb-6 ${plan.highlight ? 'text-gray-300 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>O que está incluso:</p>
                                <ul className="space-y-4">
                                    {plan.features.map((feat, j) => (
                                        <li key={j} className="flex gap-4 text-sm font-medium">
                                            <CheckCircle2 className={`w-5 h-5 shrink-0 ${plan.highlight ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-white'}`} />
                                            <span className={plan.highlight ? 'text-gray-100 dark:text-gray-800' : 'text-gray-600 dark:text-gray-300'}>{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button
                                onClick={plan.action}
                                className={`w-full py-4 px-6 mt-10 rounded-xl font-bold tracking-wide transition-all ${plan.highlight
                                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-black shadow-md'
                                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-xl'
                                    }`}
                            >
                                {plan.button}
                            </button>
                        </div>
                    ))}
                </div>

            </div>

            <FAQ />
            <Footer />
        </div>
    );
}

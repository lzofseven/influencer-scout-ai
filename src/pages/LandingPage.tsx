import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, CheckCircle2, TrendingUp, Users, Target } from 'lucide-react';
import { FAQ } from '../../components/FAQ';
import { Footer } from '../../components/Footer';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
    const navigate = useNavigate();
    const heroRef = useRef<HTMLDivElement>(null);
    const handRef = useRef<HTMLImageElement>(null);
    const pillsRef = useRef<HTMLDivElement[]>([]);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Hero text animation
            gsap.from(textRef.current?.children || [], {
                y: 50,
                opacity: 0,
                duration: 1,
                stagger: 0.2,
                ease: 'power3.out',
            });

            // Hand Parallax & Rotation on Scroll
            gsap.to(handRef.current, {
                scrollTrigger: {
                    trigger: heroRef.current,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1,
                },
                y: 200,
                rotation: 15,
                scale: 1.1,
                ease: 'none',
            });

            // Liquid Glass Pills floating animation
            pillsRef.current.forEach((pill, i) => {
                gsap.fromTo(pill,
                    { y: 0 },
                    {
                        y: -20,
                        duration: 2 + i * 0.5,
                        yoyo: true,
                        repeat: -1,
                        ease: 'sine.inOut',
                        delay: i * 0.2
                    }
                );
            });

            // Feature section scroll stagger
            gsap.from('.feature-card', {
                scrollTrigger: {
                    trigger: '.features-grid',
                    start: 'top 80%',
                },
                y: 50,
                opacity: 0,
                duration: 0.8,
                stagger: 0.2,
                ease: 'back.out(1.7)'
            });

        }, heroRef);

        return () => ctx.revert();
    }, []);

    const addToPills = (el: HTMLDivElement | null) => {
        if (el && !pillsRef.current.includes(el)) {
            pillsRef.current.push(el);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] overflow-hidden selection:bg-gray-200 dark:selection:bg-[#333]">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 liquid-glass-light dark:liquid-glass-dark px-6 py-4 flex items-center justify-between border-b-0">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-gray-900 dark:text-white" />
                    <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
                        Influencer<span className="text-gray-500 font-normal">Scout</span>
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Entrar
                    </button>
                    <button
                        onClick={() => navigate('/planos')}
                        className="text-sm font-medium px-4 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-full transition-colors shadow-lg"
                    >
                        Começar Grátis
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section ref={heroRef} className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between min-h-[90vh]">

                {/* Abstract Background Blurs Removidos para Estética P&B */}

                {/* Text Area */}
                <div ref={textRef} className="lg:w-1/2 z-10 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 dark:border-[#333] text-sm font-medium text-gray-800 dark:text-gray-200 mb-6 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-500 dark:bg-white"></span>
                        </span>
                        A IA que encontra os influenciadores perfeitos
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-6 leading-[1.1]">
                        Descubra Talentos.<br />
                        <span className="text-gray-400 dark:text-gray-500 font-serif italic">Escale suas Vendas.</span>
                    </h1>

                    <p className="text-lg lg:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                        Pare de buscar no Instagram manualmente. Nossa IA analisa milhares de perfis em segundos, trazendo nichos ultra-específicos, taxas de engajamento reais e contatos diretos.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                        <button
                            onClick={() => navigate('/register')}
                            className="w-full sm:w-auto px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-semibold flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                        >
                            Criar Conta Gratuita <ArrowRight className="ml-2 w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate('/planos')}
                            className="w-full sm:w-auto px-8 py-4 border border-gray-300 dark:border-[#333] text-gray-900 dark:text-white rounded-full font-semibold hover:bg-gray-50 dark:hover:bg-[#1A1A1A] transition-colors"
                        >
                            Ver Planos
                        </button>
                    </div>

                    <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 dark:text-gray-400 font-medium">
                        <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" /> Análise IA instantânea</div>
                        <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" /> Cancelamento a qualquer momento</div>
                    </div>
                </div>

                {/* Visual / Image Area */}
                <div className="lg:w-1/2 mt-20 lg:mt-0 relative h-[500px] lg:h-[700px] w-full flex items-center justify-center perspective-1000">
                    <img
                        ref={handRef}
                        src="/hand.png"
                        alt="Inteligência Artificial Glass Hand"
                        className="w-[80%] lg:w-[90%] max-w-lg object-contain z-10 drop-shadow-2xl opacity-90"
                    />

                    {/* Liquid Glass Floating Pills - Profile Card */}
                    <div ref={addToPills} className="absolute top-[18%] left-[7%] z-20 liquid-glass-light dark:liquid-glass-dark p-3.5 rounded-2xl flex flex-col gap-3 border border-gray-200 dark:border-[#333] shadow-xl w-56">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-gray-100 dark:border-white/10 bg-white dark:bg-black p-0.5 overflow-hidden flex-shrink-0">
                                <img src="https://i.pravatar.cc/150?img=5" alt="Avatar Influenciadora" className="w-full h-full rounded-full object-cover" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">@mariamaternal</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-widest mt-0.5">Maternidade</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2 text-center border border-gray-100 dark:border-white/5">
                                <p className="text-[10px] text-gray-400 font-medium mb-0.5">Seguidores</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">1.2M</p>
                            </div>
                            <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2 text-center border border-gray-100 dark:border-white/5">
                                <p className="text-[10px] text-gray-400 font-medium mb-0.5">Engajamento</p>
                                <p className="text-sm font-bold text-emerald-500">12.4%</p>
                            </div>
                        </div>
                    </div>

                    <div ref={addToPills} className="absolute bottom-[20%] right-[5%] z-20 liquid-glass-light dark:liquid-glass-dark p-4 rounded-2xl flex items-center gap-3 border border-gray-200 dark:border-[#333] shadow-xl max-w-[220px]">
                        <Target className="w-8 h-8 text-gray-900 dark:text-white" />
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Público Alvo Encontrado</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Tech Reviewers SP</p>
                        </div>
                    </div>

                    <div ref={addToPills} className="absolute top-[60%] left-[5%] z-20 liquid-glass-light dark:liquid-glass-dark p-3 rounded-xl flex items-center gap-2 border border-gray-200 dark:border-[#333] shadow-sm">
                        <Users className="w-5 h-5 text-gray-900 dark:text-white" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">+500k Alcançados</span>
                    </div>

                </div>
            </section>

            {/* Features Showcase */}
            <section className="py-24 bg-white dark:bg-[#111] relative z-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">Por que escolher o InfluencerPRO?</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">A ferramenta definitiva para agências de marketing e marcas que querem escalar suas parcerias com dados reais.</p>
                    </div>

                    <div className="features-grid grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: Target, title: "Precisão Cirúrgica", desc: "Digite nichos complexos e nossa IA decodifica a intenção exata da sua busca." },
                            { icon: TrendingUp, title: "Dados Oficiais do Instagram", desc: "Coletamos métricas reais, seguidores, likes e engajamento direto da fonte." },
                            { icon: Users, title: "Encontre Micro-Influenciadores", desc: "Descubra pedras preciosas com alto engajamento antes dos seus concorrentes." }
                        ].map((feat, i) => (
                            <div key={i} className="feature-card p-8 rounded-3xl bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] hover:border-gray-900 dark:hover:border-white transition-colors duration-300">
                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-[#333] flex items-center justify-center text-gray-900 dark:text-white mb-6">
                                    <feat.icon />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feat.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <FAQ />
            <Footer />
        </div>
    );
}

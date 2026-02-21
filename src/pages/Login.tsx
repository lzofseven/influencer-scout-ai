import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader2, Eye, EyeOff, Check, ShieldAlert, Sparkles, XCircle } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Turnstile } from '@marsidev/react-turnstile';

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
);

export default function Login() {
    const [view, setView] = useState<'login' | 'register'>('login');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [showPassword, setShowPassword] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isHuman, setIsHuman] = useState(false); // Cloudflare Turnstile

    // Form states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const { signInWithGoogle, user } = useAuth();
    const navigate = useNavigate();

    // Typing Effect
    const words = ["aqui.", "agora.", "com dados.", "com a IA.", "no InfluencerPRO."];
    const [wordIndex, setWordIndex] = useState(0);
    const [typedText, setTypedText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Redirect if logged in
    if (user && status !== 'success') {
        return <Navigate to="/dashboard" replace />;
    }

    // Effect for typing animation
    useEffect(() => {
        const typeSpeed = isDeleting ? 40 : 80;
        const currentWord = words[wordIndex];

        const timeout = setTimeout(() => {
            if (!isDeleting && typedText === currentWord) {
                setTimeout(() => setIsDeleting(true), 2500);
            } else if (isDeleting && typedText === "") {
                setIsDeleting(false);
                setWordIndex((prev) => (prev + 1) % words.length);
            } else {
                setTypedText(
                    currentWord.substring(0, typedText.length + (isDeleting ? -1 : 1))
                );
            }
        }, typeSpeed);

        return () => clearTimeout(timeout);
    }, [typedText, isDeleting, wordIndex]);

    const toggleView = (newView: 'login' | 'register') => {
        if (view === newView) return;
        setView(newView);
        setStatus('idle');
        setError('');
        setIsHuman(false);
    };

    const handleGoogleSignIn = async () => {
        try {
            setError('');
            setStatus('loading');
            await signInWithGoogle();
            setStatus('success');
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err: any) {
            setError(err.message || 'Falha no login com Google.');
            setStatus('idle');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validations specific for register flow
        if (view === 'register') {
            if (!isHuman) {
                setError('Por favor, confirme que você não é um robô no campo de verificação.');
                return;
            }
            if (password !== confirmPassword) {
                setError('As senhas não coincidem.');
                return;
            }
            if (name.trim() === '') {
                setError('O nome é obrigatório.');
                return;
            }
        }

        setStatus('loading');

        try {
            if (view === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
            }
            setStatus('success');
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setStatus('idle');
            switch (err.code) {
                case 'auth/invalid-credential':
                    setError('Email ou senha incorretos.');
                    break;
                case 'auth/email-already-in-use':
                    setError('Este email já está cadastrado. Que tal fazer login?');
                    break;
                case 'auth/weak-password':
                    setError('A senha deve ter pelo menos 6 caracteres.');
                    break;
                case 'auth/configuration-not-found':
                    setError('ERRO CRÍTICO: Firebase Authentication não habilitado no Console.');
                    break;
                default:
                    setError(err.message || 'Ocorreu um erro na autenticação.');
            }
        }
    };

    const isSubmitDisabled = status !== 'idle' || (view === 'register' && !isHuman);

    const customStyles = `
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes blink {
      0%, 100% { border-color: transparent; }
      50% { border-color: currentColor; }
    }
    .animate-slide-up-1 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
    .animate-slide-up-2 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; opacity: 0; }
    .animate-slide-up-3 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
    .animate-blink { animation: blink 1s step-end infinite; }
  `;

    // SUCCESS OVERLAY SCREEN
    if (status === 'success') {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-black dark:text-white font-sans flex flex-col md:flex-row selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black relative">
                <style>{customStyles}</style>

                <div className="hidden md:flex md:w-[45%] bg-black text-white p-12 lg:p-20 flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}>
                    </div>
                    <div className="relative z-10 flex items-center gap-2">
                        <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center">
                            <Sparkles size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-xl font-bold tracking-tight uppercase">InfluencerPRO</span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col px-6 py-12 sm:px-12 md:px-20 lg:px-32 relative animate-slide-up-1 justify-center">
                    <div className="m-auto w-full max-w-[400px] flex flex-col">
                        <h1 className="text-4xl font-semibold tracking-tight mb-4 text-black dark:text-white">
                            Acesso concedido.
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed mb-12">
                            Sua identidade foi confirmada. Redirecionando para o painel principal em instantes...
                        </p>

                        <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center rounded-[18px] shadow-xl">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // MAIN LOGIN/REGISTER SCREEN
    return (
        <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-black dark:text-white font-sans flex flex-col md:flex-row selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-300">
            <style>{customStyles}</style>

            {/* Left Panel - Branding */}
            <div className="hidden md:flex md:w-[45%] bg-black text-white p-12 lg:p-20 flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}>
                </div>

                <div className={`relative z-10 flex items-center gap-2 transition-all duration-1000 transform ${isMounted ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}>
                    <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center">
                        <Sparkles size={18} strokeWidth={2.5} />
                    </div>
                    <span className="text-xl font-bold tracking-tight uppercase">InfluencerPRO</span>
                </div>

                <div className={`relative z-10 transition-all duration-1000 delay-300 transform ${isMounted ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'}`}>
                    <h2 className="text-5xl lg:text-5xl xl:text-6xl font-light tracking-tight leading-[1.1] mb-8 h-[160px] lg:h-[200px]">
                        Sua jornada<br />
                        começa<br />
                        <span className="font-semibold inline-block border-r-[3px] border-white pr-2 mr-[-10px] animate-blink">
                            {typedText}
                        </span>
                    </h2>
                    <div className="h-[2px] bg-white transition-all duration-1000 delay-700 w-full max-w-[64px]"></div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 md:px-20 lg:px-32 relative">
                <div className="max-w-[400px] w-full mx-auto md:mx-0 mt-8 md:mt-0">

                    {/* Toggles Entrar / Criar */}
                    <div className="flex gap-8 mb-12 border-b border-gray-100 dark:border-[#222] animate-slide-up-1">
                        <button
                            type="button"
                            onClick={() => toggleView('login')}
                            className={`pb-4 text-sm font-medium transition-all relative ${view === 'login' ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        >
                            Entrar
                            {view === 'login' && (
                                <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-black dark:bg-white rounded-t-sm"></span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleView('register')}
                            className={`pb-4 text-sm font-medium transition-all relative ${view === 'register' ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        >
                            Criar conta
                            {view === 'register' && (
                                <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-black dark:bg-white rounded-t-sm"></span>
                            )}
                        </button>
                    </div>

                    {/* Header */}
                    <div className="animate-slide-up-2 mb-8">
                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                            {view === 'login' ? 'Bem-vindo de volta.' : 'Explore influenciadores.'}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
                            {view === 'login'
                                ? 'Insira seus dados para acessar o seu painel de controle.'
                                : 'Crie sua conta para começar a descobrir os melhores criadores.'}
                        </p>
                    </div>

                    {error && (
                        <div className="animate-slide-up-2 mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3 text-red-600 dark:text-red-400">
                            <XCircle size={18} className="mt-0.5 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="animate-slide-up-3">
                        <div className="space-y-6">

                            {view === 'register' && (
                                <div className="relative group">
                                    <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-1 block">Nome Completo</label>
                                    <input
                                        type="text"
                                        required={view === 'register'}
                                        disabled={status === 'loading'}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full h-12 text-lg font-light text-black dark:text-white bg-transparent border-b-[2px] border-gray-200 dark:border-[#333] focus:outline-none focus:border-black dark:focus:border-white transition-colors peer p-0 truncate"
                                        placeholder="Seu nome"
                                    />
                                    <div className="absolute bottom-[-0.5px] left-0 h-[2px] bg-black dark:bg-white w-0 peer-focus:w-full transition-all duration-300 ease-out"></div>
                                </div>
                            )}

                            <div className="relative group">
                                <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-1 block">E-mail</label>
                                <input
                                    type="email"
                                    required
                                    disabled={status === 'loading'}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-12 text-base sm:text-lg font-light text-black dark:text-white bg-transparent border-b-[2px] border-gray-200 dark:border-[#333] focus:outline-none focus:border-black dark:focus:border-white transition-colors peer p-0 truncate"
                                    placeholder="ola@exemplo.com"
                                />
                                <div className="absolute bottom-[-0.5px] left-0 h-[2px] bg-black dark:bg-white w-0 peer-focus:w-full transition-all duration-300 ease-out"></div>
                            </div>

                            <div className="relative group">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest block">Senha</label>
                                    {view === 'login' && (
                                        <button type="button" className="text-xs text-black dark:text-white font-medium hover:underline underline-offset-4 mb-0.5">
                                            Esqueceu?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        disabled={status === 'loading'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 text-lg font-light text-black dark:text-white bg-transparent border-b-[2px] border-gray-200 dark:border-[#333] focus:outline-none focus:border-black dark:focus:border-white transition-colors peer p-0 pr-10 truncate"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                    <div className="absolute bottom-[-0.5px] left-0 h-[2px] bg-black dark:bg-white w-0 peer-focus:w-full transition-all duration-300 ease-out"></div>
                                </div>
                            </div>

                            {view === 'register' && (
                                <div className="relative group">
                                    <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-1 block">Confirmar Senha</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required={view === 'register'}
                                            disabled={status === 'loading'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full h-12 text-lg font-light text-black dark:text-white bg-transparent border-b-[2px] border-gray-200 dark:border-[#333] focus:outline-none focus:border-black dark:focus:border-white transition-colors peer p-0 pr-10 truncate"
                                            placeholder="••••••••"
                                        />
                                        <div className="absolute bottom-[-0.5px] left-0 h-[2px] bg-black dark:bg-white w-0 peer-focus:w-full transition-all duration-300 ease-out"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cloudflare Turnstile */}
                        {view === 'register' && (
                            <div className="mt-8 flex flex-col items-center justify-center p-4 border border-gray-100 dark:border-[#222] rounded-lg bg-[#fafafa] dark:bg-[#111]">
                                <div className="flex items-center gap-2 mb-3 w-full">
                                    <ShieldAlert className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Segurança
                                    </span>
                                </div>
                                <div className="w-full overflow-hidden flex justify-center">
                                    <Turnstile
                                        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                                        onSuccess={() => setIsHuman(true)}
                                        onError={() => setIsHuman(false)}
                                        onExpire={() => setIsHuman(false)}
                                        options={{
                                            theme: 'auto'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className="w-full h-14 bg-black dark:bg-white text-white dark:text-black mt-8 flex items-center justify-center font-medium transition-all duration-300 hover:bg-gray-900 dark:hover:bg-gray-200 active:scale-[0.98] disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-[#222] dark:disabled:text-gray-600 group rounded-sm"
                        >
                            {status === 'loading' ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <span className="flex items-center gap-2">
                                    {view === 'login' ? 'Acessar agora' : 'Finalizar cadastro'}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="my-8 flex items-center justify-center relative">
                            <div className="absolute w-full h-[1px] bg-gray-100 dark:bg-[#333]"></div>
                            <span className="bg-white dark:bg-[#0A0A0A] px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest relative z-10 transition-colors">ou</span>
                        </div>

                        {/* Social Login */}
                        <div className="w-full">
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={status !== 'idle'}
                                className="w-full h-14 border border-gray-200 dark:border-[#333] text-black dark:text-white flex items-center justify-center gap-3 font-medium transition-all hover:bg-gray-50 dark:hover:bg-[#1A1A1A] active:scale-[0.98] rounded-sm disabled:opacity-50"
                            >
                                <div className="text-[#DB4437]"><GoogleIcon size={20} /></div>
                                Entrar com Google
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}

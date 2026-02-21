import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
);

export default function Login() {
    const navigate = useNavigate();
    const [view, setView] = useState<'login' | 'register'>('login');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [codeStatus, setCodeStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [showPassword, setShowPassword] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Turnstile
    const [captchaStatus, setCaptchaStatus] = useState<'idle' | 'verifying' | 'success'>('idle');
    const [turnstileToken, setTurnstileToken] = useState<string>('');

    // Formulário
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nome, setNome] = useState('');

    // OTP e Timer
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [otpStatus, setOtpStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
    const [timeLeft, setTimeLeft] = useState(0);
    const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Efeito de Digitação
    const words = ["aqui.", "agora.", "connosco.", "com design."];
    const [wordIndex, setWordIndex] = useState(0);
    const [typedText, setTypedText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timerId);
        }
    }, [timeLeft]);

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

    const handleSendCode = async () => {
        if (!email) return alert("Preencha o e-mail primeiro.");
        if (view === 'register' && !nome) return alert("Por favor, preencha o seu nome primeiro.");

        setCodeStatus('sending');
        try {
            const res = await fetch('http://localhost:3001/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, turnstileToken, nome })
            });
            const data = await res.json();
            if (res.ok) {
                setCodeStatus('sent');
                setTimeLeft(60);
                setOtpStatus('idle');
                setCode(['', '', '', '', '', '']);
                if (codeRefs.current[0]) codeRefs.current[0].focus();
            } else {
                setCodeStatus('idle');
                alert(data.error || "Erro ao enviar código.");
            }
        } catch (e) {
            setCodeStatus('idle');
            alert("Erro ao conectar com o servidor.");
        }
    };

    const verifyOtp = async (fullCode: string) => {
        setOtpStatus('verifying');
        try {
            const res = await fetch('http://localhost:3001/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: fullCode })
            });
            if (res.ok) {
                setOtpStatus('success');
            } else {
                setOtpStatus('error');
            }
        } catch (e) {
            setOtpStatus('error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (captchaStatus !== 'success') return;

        setStatus('loading');

        try {
            if (view === 'login') {
                const cred = await signInWithEmailAndPassword(auth, email, password);
                // Garantir que exista no Firestore
                await createUserDoc(cred.user);
            } else {
                if (otpStatus !== 'success') throw new Error("Verifique o e-mail primeiro.");
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                if (nome) {
                    await updateProfile(cred.user, { displayName: nome });
                }
                await createUserDoc(cred.user, nome);
            }

            setStatus('success');
            setTimeout(() => navigate('/dashboard'), 2500);
        } catch (error: any) {
            setStatus('idle');
            let errorMsg = error.message || "Tente novamente.";

            if (error.code === 'auth/email-already-in-use') {
                errorMsg = "Este e-mail já está cadastrado. Faça login.";
            } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMsg = "E-mail ou senha incorretos.";
            } else if (error.code === 'auth/weak-password') {
                errorMsg = "A senha deve ter pelo menos 6 caracteres.";
            }

            alert("Erro de autenticação: " + errorMsg);
        }
    };

    const createUserDoc = async (user: any, name?: string) => {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
            await setDoc(userRef, {
                email: user.email,
                name: name || user.displayName || 'Usuário',
                credits: 5,
                tier: 'Free Trial',
                createdAt: new Date()
            });
        }
    };

    const handleGoogleAuth = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const cred = await signInWithPopup(auth, provider);
            await createUserDoc(cred.user);
            setStatus('success');
            setTimeout(() => navigate('/dashboard'), 2500);
        } catch (error: any) {
            alert("Erro Google Auth: " + error.message);
        }
    };

    const toggleView = (newView: 'login' | 'register') => {
        if (view === newView) return;
        setView(newView);
        setStatus('idle');
        setCodeStatus('idle');
        setOtpStatus('idle');
        setTimeLeft(0);
        setCode(['', '', '', '', '', '']);
    };

    const handleCodeChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        if (otpStatus === 'error') setOtpStatus('idle');

        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        const fullCode = newCode.join('');

        if (value && index < 5) codeRefs.current[index + 1]?.focus();

        if (fullCode.length === 6) {
            verifyOtp(fullCode);
        }
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            codeRefs.current[index - 1]?.focus();
        }
    };

    const handleCodePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        if (otpStatus === 'success') return;

        const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
        if (pastedData) {
            setOtpStatus('idle');
            const newCode = [...code];
            for (let i = 0; i < pastedData.length; i++) {
                newCode[i] = pastedData[i];
            }
            setCode(newCode);
            const nextFocusIndex = pastedData.length < 6 ? pastedData.length : 5;
            if (codeRefs.current[nextFocusIndex]) codeRefs.current[nextFocusIndex]?.focus();

            if (pastedData.length === 6) {
                verifyOtp(pastedData);
            }
        }
    };

    const customStyles = `
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes blink {
      0%, 100% { border-color: transparent; }
      50% { border-color: white; }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
    .animate-slide-up-1 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
    .animate-slide-up-2 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; opacity: 0; }
    .animate-slide-up-3 { animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
    .animate-blink { animation: blink 1s step-end infinite; }
    .animate-shake { animation: shake 0.4s ease-in-out; }
  `;

    const isSubmitDisabled =
        status !== 'idle' ||
        (view === 'register' && otpStatus !== 'success') ||
        captchaStatus !== 'success' ||
        !email || !password || (view === 'register' && !nome);

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-white text-black font-sans flex flex-col md:flex-row selection:bg-black selection:text-white relative">
                <style>{customStyles}</style>

                <div className="hidden md:flex md:w-[45%] bg-black text-white p-12 lg:p-20 flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}>
                    </div>
                    <div className="relative z-10 flex items-center gap-2">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                        <span className="text-sm font-bold tracking-[0.2em] uppercase">INFLUENCERPRO</span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col px-6 py-12 sm:px-12 md:px-20 lg:px-32 relative animate-slide-up-1 bg-white dark:bg-zinc-950">
                    <div className="m-auto w-full max-w-[400px] flex flex-col">
                        <h1 className="text-4xl font-semibold tracking-tight mb-4 text-black dark:text-white">
                            Acesso concedido.
                        </h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-base leading-relaxed mb-12">
                            A tua identidade foi confirmada. A redirecionar-te para o painel principal em instantes...
                        </p>

                        <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center rounded-[18px] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-black dark:text-white font-sans flex flex-col md:flex-row selection:bg-black selection:text-white">
            <style>{customStyles}</style>

            {/* Painel Esquerdo - Branding */}
            <div className="hidden md:flex md:w-[45%] bg-black text-white p-12 lg:p-20 flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}>
                </div>

                <div className={`relative z-10 transition-all duration-1000 transform ${isMounted ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'} flex items-center gap-2`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                    <span className="text-sm font-bold tracking-[0.2em] uppercase">INFLUENCERPRO</span>
                </div>

                <div className={`relative z-10 transition-all duration-1000 delay-300 transform ${isMounted ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'}`}>
                    <h2 className="text-5xl lg:text-6xl font-light tracking-tight leading-[1.1] mb-8 h-[160px] lg:h-[200px]">
                        A tua jornada<br />
                        começa<br />
                        <span className="font-semibold inline-block border-r-[3px] border-white pr-2 mr-[-10px] animate-blink">
                            {typedText}
                        </span>
                    </h2>
                    <div className="w-16 h-[2px] bg-white transition-all duration-1000 delay-700 max-w-[64px]"></div>
                </div>
            </div>

            {/* Painel Direito - Formulário */}
            <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 md:px-20 lg:px-32 relative">

                <div className="max-w-[400px] w-full mx-auto md:mx-0 mt-8 md:mt-0">

                    <div className="flex gap-8 mb-12 border-b border-gray-100 dark:border-zinc-800 animate-slide-up-1">
                        <button
                            type="button"
                            onClick={() => toggleView('login')}
                            className={`pb-4 text-sm font-medium transition-all relative ${view === 'login' ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            Entrar
                            {view === 'login' && (
                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-black dark:bg-white rounded-t-sm"></span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleView('register')}
                            className={`pb-4 text-sm font-medium transition-all relative ${view === 'register' ? 'text-black dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            Criar conta
                            {view === 'register' && (
                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-black dark:bg-white rounded-t-sm"></span>
                            )}
                        </button>
                    </div>

                    <div className="animate-slide-up-2 mb-10">
                        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
                            {view === 'login' ? 'Bem-vindo de volta.' : 'Junta-te a nós.'}
                        </h1>
                        <p className="text-gray-500 text-base leading-relaxed">
                            {view === 'login'
                                ? 'Introduz os teus dados para acederes à tua conta.'
                                : 'Preenche os teus dados para começares a explorar.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="animate-slide-up-3">

                        <div className="space-y-6">

                            {view === 'register' && (
                                <div className="relative group animate-slide-up-1">
                                    <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-1 block">Nome Completo</label>
                                    <input
                                        type="text"
                                        required={view === 'register'}
                                        disabled={status !== 'idle'}
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        className="w-full h-12 text-lg font-light bg-transparent border-b-[2px] border-gray-200 dark:border-zinc-800 focus:outline-none focus:border-black dark:focus:border-white transition-colors peer p-0 truncate"
                                        placeholder="O teu nome"
                                    />
                                    <div className="absolute bottom-0 left-0 h-[2px] bg-black dark:bg-white w-0 peer-focus:w-full transition-all duration-300 ease-out"></div>
                                </div>
                            )}

                            <div className="relative group">
                                <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-1 block">E-mail</label>
                                <div className="flex gap-2 sm:gap-3 items-end w-full">
                                    <div className="relative flex-1 min-w-0">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={status !== 'idle' || codeStatus !== 'idle'}
                                            className="w-full h-12 text-base sm:text-lg font-light bg-transparent border-b-[2px] border-gray-200 dark:border-zinc-800 focus:outline-none focus:border-black dark:focus:border-white transition-colors peer p-0 truncate pr-2"
                                            placeholder="ola@exemplo.pt"
                                        />
                                        <div className="absolute bottom-0 left-0 h-[2px] bg-black dark:bg-white w-0 peer-focus:w-full transition-all duration-300 ease-out"></div>
                                    </div>

                                    {view === 'register' && (
                                        <button
                                            type="button"
                                            onClick={handleSendCode}
                                            disabled={codeStatus !== 'idle'}
                                            className="shrink-0 h-10 mb-1 px-3 sm:px-4 text-[10px] sm:text-xs font-semibold bg-black dark:bg-white text-white dark:text-black flex items-center justify-center min-w-[90px] transition-all duration-300 hover:bg-gray-800 disabled:bg-gray-100 disabled:dark:bg-zinc-800 disabled:text-gray-400 rounded-sm whitespace-nowrap"
                                        >
                                            {codeStatus === 'sending' ? (
                                                <Loader2 className="animate-spin" size={14} />
                                            ) : codeStatus === 'sent' ? (
                                                <span className="flex items-center gap-1.5"><Check size={14} /> Enviado</span>
                                            ) : (
                                                'Enviar código'
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {view === 'register' && (
                                <div className={`relative group transition-all duration-500 overflow-hidden ${codeStatus === 'sent' ? 'animate-slide-up-1 opacity-100 max-h-[160px]' : 'opacity-0 max-h-0 pointer-events-none m-0 p-0'}`}>
                                    <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-2 flex justify-between items-end">
                                        <span>Código de Verificação</span>
                                        {otpStatus === 'verifying' && <Loader2 className="animate-spin text-black dark:text-white" size={12} />}
                                    </label>

                                    <div className={`flex gap-2 sm:gap-3 justify-between ${otpStatus === 'error' ? 'animate-shake' : ''}`} onPaste={handleCodePaste}>
                                        {code.map((digit, index) => {
                                            const isError = otpStatus === 'error';
                                            const isSuccess = otpStatus === 'success';
                                            let borderColor = 'border-gray-200 dark:border-zinc-800 peer-focus:border-black dark:peer-focus:border-white';
                                            let textColor = 'text-black dark:text-white';

                                            if (isError) { borderColor = 'border-red-500 text-red-500'; textColor = 'text-red-500'; }
                                            else if (isSuccess) { borderColor = 'border-green-500'; textColor = 'text-green-500'; }

                                            return (
                                                <div key={index} className="relative flex-1">
                                                    <input
                                                        ref={(el) => (codeRefs.current[index] = el)}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={1}
                                                        value={digit}
                                                        disabled={status !== 'idle' || otpStatus === 'success' || otpStatus === 'verifying'}
                                                        onChange={(e) => handleCodeChange(index, e.target.value)}
                                                        onKeyDown={(e) => handleCodeKeyDown(index, e)}
                                                        className={`w-full h-12 text-center text-xl sm:text-2xl font-light bg-transparent border-b-[2px] transition-colors focus:outline-none p-0 peer disabled:opacity-50 ${borderColor} ${textColor}`}
                                                    />
                                                    {!isError && !isSuccess && (
                                                        <div className="absolute bottom-0 left-0 h-[2px] bg-black dark:bg-white w-0 peer-focus:w-full transition-all duration-300 ease-out"></div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex justify-between items-center mt-3 h-5 text-[11px] sm:text-xs">
                                        {otpStatus === 'error' ? (
                                            <span className="text-red-500 font-medium flex items-center gap-1"><X size={12} /> Código incorreto.</span>
                                        ) : otpStatus === 'success' ? (
                                            <span className="text-green-600 font-medium flex items-center gap-1"><Check size={12} /> E-mail verificado!</span>
                                        ) : (
                                            <span className="text-gray-400">Verifique a sua caixa de entrada.</span>
                                        )}

                                        {otpStatus !== 'success' && (
                                            timeLeft > 0 ? (
                                                <span className="text-gray-400 font-mono tracking-wide">
                                                    Reenviar em {timeLeft.toString().padStart(2, '0')}s
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleSendCode}
                                                    className="text-black dark:text-white font-semibold hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline underline-offset-2"
                                                >
                                                    Reenviar
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="relative group">
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest block">Palavra-passe</label>
                                    {view === 'login' && (
                                        <button type="button" className="text-xs text-black dark:text-white font-medium hover:underline underline-offset-4 mb-0.5">
                                            Esqueceste-te?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={status !== 'idle'}
                                        className="w-full h-12 text-lg font-light bg-transparent border-b-[2px] border-gray-200 dark:border-zinc-800 focus:outline-none focus:border-black dark:focus:border-white transition-colors peer p-0 pr-10 truncate"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                    <div className="absolute bottom-0 left-0 h-[2px] bg-black dark:bg-white w-0 peer-focus:w-full transition-all duration-300 ease-out"></div>
                                </div>
                            </div>

                        </div>

                        <div className="w-full mt-6 py-2 min-h-[65px] flex items-center justify-center border border-gray-100 dark:border-zinc-800 rounded bg-[#fafafa] dark:bg-zinc-900/50">
                            <Turnstile
                                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                                onSuccess={(token) => {
                                    setTurnstileToken(token);
                                    setCaptchaStatus('success');
                                }}
                                onError={() => setCaptchaStatus('idle')}
                                onExpire={() => setCaptchaStatus('idle')}
                                options={{
                                    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'auto'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className="w-full h-14 bg-black dark:bg-white text-white dark:text-black mt-6 flex items-center justify-center font-medium transition-all duration-300 hover:bg-gray-900 dark:hover:bg-gray-200 active:scale-[0.98] disabled:bg-gray-100 disabled:dark:bg-zinc-800 disabled:text-gray-400 group"
                        >
                            {status === 'loading' ? (
                                <Loader2 className="animate-spin text-gray-500" size={20} />
                            ) : (
                                <span className="flex items-center gap-2">
                                    {view === 'login' ? 'Entrar na conta' : 'Criar conta'}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>

                        <div className="my-8 flex items-center justify-center relative">
                            <div className="absolute w-full h-[1px] bg-gray-100 dark:bg-zinc-800"></div>
                            <span className="bg-white dark:bg-zinc-950 px-4 text-[10px] font-bold text-gray-300 dark:text-zinc-600 uppercase tracking-widest relative z-10">ou</span>
                        </div>

                        <div className="w-full">
                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                className="w-full h-14 border border-gray-200 dark:border-zinc-800 text-black dark:text-white flex items-center justify-center gap-3 font-medium transition-all hover:bg-gray-50 dark:hover:bg-zinc-900 active:scale-[0.98]"
                            >
                                <GoogleIcon size={20} />
                                Continuar com Google
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    credits: number;
    tier: string;
    loading: boolean;
    isAdmin: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refreshCredits: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [credits, setCredits] = useState<number>(0);
    const [tier, setTier] = useState<string>('free'); // 'free', 'Starter', 'Scale'
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const refreshCredits = async (userObj: User) => {
        try {
            const docRef = doc(db, 'users', userObj.uid);
            const docSnap = await getDoc(docRef);

            const baseData = {
                email: userObj.email || '',
                name: userObj.displayName || '',
                lastOnline: new Date(),
            };

            if (docSnap.exists()) {
                const data = docSnap.data();
                setCredits(data.credits || 0);
                setTier(data.tier || 'free');
                // Atualiza online status e profile info
                await setDoc(docRef, baseData, { merge: true });
            } else {
                // Novo usuário ganha 5 créditos brinde na primeira vez que loga
                const newData = { ...baseData, credits: 5, tier: 'free', createdAt: new Date() };
                await setDoc(docRef, newData);
                setCredits(5);
                setTier('free');
            }
        } catch (error) {
            console.error("Erro ao buscar créditos", error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setIsAdmin(currentUser?.email === 'loohansb@gmail.com');
            if (currentUser) {
                await refreshCredits(currentUser);
            } else {
                setCredits(0);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Erro no login com Google", error);
            throw error;
        }
    };

    const logout = () => signOut(auth);

    const value = {
        user,
        credits,
        tier,
        loading,
        isAdmin,
        signInWithGoogle,
        logout,
        refreshCredits: () => user ? refreshCredits(user) : Promise.resolve(),
        resetPassword: (email: string) => sendPasswordResetEmail(auth, email),
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    credits: number;
    tier: string;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [credits, setCredits] = useState<number>(0);
    const [tier, setTier] = useState<string>('free'); // 'free', 'Starter', 'Scale'
    const [loading, setLoading] = useState(true);

    const refreshCredits = async (uid: string) => {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCredits(data.credits || 0);
                setTier(data.tier || 'free');
            } else {
                // Novo usuário ganha 5 créditos brinde na primeira vez que loga
                await setDoc(docRef, { credits: 5, tier: 'free', createdAt: new Date() });
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
            if (currentUser) {
                await refreshCredits(currentUser.uid);
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
        signInWithGoogle,
        logout,
        refreshCredits: () => user ? refreshCredits(user.uid) : Promise.resolve(),
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

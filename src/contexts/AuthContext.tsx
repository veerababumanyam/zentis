import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { UserProfile } from '../types';
import { GoogleGenAI } from '@google/genai';
import { isValidUserRole } from '../utils/roleValidation';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateGeminiApiKey: (key: string) => Promise<void>;
    validateApiKey: (key: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (uid: string) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                // Validate role - if invalid (nurse/admin), treat as missing profile
                if (!isValidUserRole(data.role)) {
                    console.warn(`Invalid role detected: ${data.role}. Forcing re-onboarding.`);
                    setUserProfile(null);
                    return;
                }
                setUserProfile(data);
            } else {
                setUserProfile(null);
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await fetchUserProfile(currentUser.uid);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchUserProfile(user.uid);
        }
    };

    /** Persist a new Gemini API key to Firestore and refresh the profile */
    const updateGeminiApiKey = async (key: string) => {
        if (!user) throw new Error('Not authenticated');
        await updateDoc(doc(db, 'users', user.uid), { geminiApiKey: key });
        // Optimistically update local state so the key is available immediately
        setUserProfile(prev => prev ? { ...prev, geminiApiKey: key } : prev);
    };

    /** Lightweight validation: calls models.list() to check if the key works */
    const validateApiKey = async (key: string): Promise<boolean> => {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            // A very cheap call — just list available models
            await ai.models.list({ pageSize: 1 });
            return true;
        } catch {
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, logout, refreshProfile, updateGeminiApiKey, validateApiKey }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

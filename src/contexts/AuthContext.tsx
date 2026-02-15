import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { UserProfile } from '../types';
import { GoogleGenAI } from '@google/genai';
import { isValidUserRole } from '../utils/roleValidation';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    authError: string | null;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateGeminiApiKey: (key: string) => Promise<void>;
    validateApiKey: (key: string) => Promise<boolean>;
    clearAuthError: () => void;
    switchRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

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
        setAuthError(null); // Clear previous errors
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user profile exists
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                // Auto-create profile for new users
                const newProfile: UserProfile = {
                    uid: user.uid,
                    email: user.email || '',
                    displayName: user.displayName || 'User',
                    photoURL: user.photoURL || '',
                    role: 'doctor', // Default role as requested
                    createdAt: Date.now(),
                    geminiApiKey: ''
                };

                await setDoc(userDocRef, newProfile);
                setUserProfile(newProfile);
            } else {
                // Existing user - fetch profile
                await fetchUserProfile(user.uid);
            }

        } catch (error: any) {
            console.error("Error signing in with Google:", error);

            // Provide user-friendly error messages
            let errorMessage = 'Failed to sign in. Please try again.';

            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Sign-in was cancelled. Please try again.';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'Pop-up was blocked by your browser. Please allow pop-ups for this site.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/configuration-not-found') {
                errorMessage = 'Authentication configuration error. Please contact support.';
            } else if (error.message) {
                errorMessage = `Sign-in error: ${error.message}`;
            }

            setAuthError(errorMessage);
            throw error;
        }
    };

    const clearAuthError = () => {
        setAuthError(null);
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
            await ai.models.list();
            return true;
        } catch {
            return false;
        }
    };

    const switchRole = async () => {
        if (!user || !userProfile) return;
        const newRole = userProfile.role === 'doctor' ? 'patient' : 'doctor';
        await updateDoc(doc(db, 'users', user.uid), { role: newRole });
        setUserProfile(prev => prev ? { ...prev, role: newRole } : prev);
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, authError, signInWithGoogle, logout, refreshProfile, updateGeminiApiKey, validateApiKey, clearAuthError, switchRole }}>
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

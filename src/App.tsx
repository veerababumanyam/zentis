
import React, { Suspense, useState, useEffect } from 'react';
import { ThemeProvider } from './hooks/useTheme';
import { useAppContext } from './contexts/AppContext';

import { ModalLoader } from './components/ModalLoader';
import { LandingPage } from './components/LandingPage';
import { OnboardingPage } from './components/OnboardingPage';
import { ArchitectProfile } from './components/ArchitectProfile';
import { useAuth } from './contexts/AuthContext';

/** Simple hash-based route hook for public pages */
const useHashRoute = () => {
    const [hash, setHash] = useState(window.location.hash);
    useEffect(() => {
        const onHashChange = () => setHash(window.location.hash);
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);
    return hash;
};

// Lazy load the authenticated app to split it from the landing page bundle
const AuthenticatedApp = React.lazy(() => import('./AuthenticatedApp').then(module => ({ default: module.AuthenticatedApp })));

const App: React.FC = () => {
    const { user, userProfile, loading, signInWithGoogle } = useAuth();
    const hash = useHashRoute();

    // Public route: Architect Profile (no auth required)
    if (hash === '#architect') {
        return (
            <ThemeProvider>
                <div className="h-screen w-screen relative overflow-hidden font-sans text-gray-800 dark:text-gray-200 selection:bg-blue-500/30">
                    <ArchitectProfile onBack={() => { window.location.hash = ''; }} />
                </div>
            </ThemeProvider>
        );
    }

    if (loading) {
        return (
            <ThemeProvider>
                <div className="h-screen w-screen flex items-center justify-center bg-app">
                    <ModalLoader />
                </div>
            </ThemeProvider>
        );
    }

    if (!user) {
        return (
            <ThemeProvider>
                <div className="h-screen w-screen relative overflow-hidden font-sans text-gray-800 dark:text-gray-200 selection:bg-blue-500/30">
                    <LandingPage onEnter={signInWithGoogle} />
                </div>
            </ThemeProvider>
        );
    }

    if (user && !userProfile) {
        return (
            <ThemeProvider>
                <OnboardingPage />
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <Suspense fallback={
                <div className="h-screen w-screen flex items-center justify-center bg-app">
                    <ModalLoader />
                </div>
            }>
                <AuthenticatedApp />
            </Suspense>
        </ThemeProvider>
    );
};

export default App;

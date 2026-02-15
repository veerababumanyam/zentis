import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    NavBar,
    HeroSection,
    StatsBar,
    FeaturesGrid,
    SpecialtiesSection,
    BiomarkerSection,
    HowItWorks,
    TestimonialsSection,
    SecurityBadges,
    FinalCTA,
    Footer,
    type LandingPageProps
} from './landing';

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    const { authError, clearAuthError } = useAuth();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLDivElement;
            setScrolled(target.scrollTop > 50);
        };
        const scrollContainer = document.getElementById('landing-scroll');
        scrollContainer?.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollContainer?.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSignIn = async () => {
        try {
            await onEnter();
        } catch (error) {
            console.error('Sign-in failed:', error);
        }
    };

    return (
        <div
            id="landing-scroll"
            className="w-full h-full overflow-y-auto custom-scrollbar relative z-20 bg-[#030712] text-white font-sans selection:bg-blue-500/30 scroll-smooth"
        >
            {/* ─── Background Effects ───────────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
                {/* Grid pattern */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
                        backgroundSize: '64px 64px',
                    }}
                />

                {/* Aurora blobs: Enhanced with faster, smoother animations */}
                <div
                    className="landing-aurora-blob"
                    style={{
                        width: '800px',
                        height: '600px',
                        top: '-200px',
                        left: '-200px',
                        background: 'rgba(37,99,235,0.15)',
                    }}
                />
                <div
                    className="landing-aurora-blob animation-delay-2000"
                    style={{
                        width: '600px',
                        height: '600px',
                        top: '20%',
                        right: '-100px',
                        background: 'rgba(147,51,234,0.12)',
                    }}
                />
                <div
                    className="landing-aurora-blob animation-delay-4000"
                    style={{
                        width: '700px',
                        height: '500px',
                        bottom: '-150px',
                        left: '30%',
                        background: 'rgba(6,182,212,0.1)',
                    }}
                />
                <div
                    className="landing-aurora-blob"
                    style={{
                        width: '500px',
                        height: '400px',
                        top: '60%',
                        left: '-100px',
                        background: 'rgba(225,29,72,0.08)',
                        animationDelay: '6s',
                    }}
                />

                {/* Floating Glow Orbs (New effect) */}
                <div className="landing-glow-orb top-[15%] left-[10%] bg-blue-500/20 w-32 h-32 blur-[60px]" />
                <div className="landing-glow-orb top-[45%] right-[20%] bg-purple-500/20 w-48 h-48 blur-[80px] animation-delay-2000" />
                <div className="landing-glow-orb bottom-[15%] left-[30%] bg-cyan-500/20 w-40 h-40 blur-[70px] animation-delay-4000" />

                {/* Radial spotlight */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px]"
                    style={{
                        background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)',
                    }}
                />
            </div>

            {/* ─── Disclaimer Banner ────────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-[100] bg-red-900/90 backdrop-blur-md border-t border-red-500/30 p-3 md:p-4 text-center">
                <p className="text-white/90 text-xs md:text-sm font-medium tracking-wide max-w-5xl mx-auto leading-relaxed">
                    <span className="font-bold text-red-200 uppercase tracking-wider mr-2">
                        ⚠️ Research Prototype:
                    </span>
                    This application is for <u>demonstration and testing purposes only</u>. It is{' '}
                    <strong>not a medical device</strong> and does not provide medical advice, diagnosis, or treatment.
                    Outputs may be inaccurate. Use at your own risk.
                </p>
            </div>

            {/* ─── Auth Error Banner ────────────────────────────────── */}
            {authError && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] max-w-2xl w-full px-4 animate-slide-down">
                    <div className="landing-glass-card border border-red-500/30 bg-red-500/10 rounded-2xl p-4 shadow-xl shadow-red-500/20 backdrop-blur-xl">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                                <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-red-300 mb-1">Authentication Failed</h3>
                                <p className="text-sm text-red-200/80">{authError}</p>
                            </div>
                            <button
                                onClick={clearAuthError}
                                className="flex-shrink-0 p-1 rounded-lg hover:bg-red-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                aria-label="Dismiss error"
                            >
                                <svg
                                    className="w-4 h-4 text-red-300"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Main Content Structure ───────────────────────────── */}
            
            <NavBar onSignIn={handleSignIn} scrollToSection={scrollToSection} />

            <main>
                <div id="hero">
                    <HeroSection onEnter={handleSignIn} />
                </div>

                <div className="relative z-10">
                    <StatsBar />
                </div>

                <div id="features">
                    <FeaturesGrid />
                </div>

                <div id="specialties">
                    <SpecialtiesSection />
                </div>

                <div id="biomarkers">
                    <BiomarkerSection />
                </div>

                <div id="how-it-works">
                    <HowItWorks />
                </div>

                <div id="testimonials">
                    <TestimonialsSection />
                </div>

                <div id="security">
                    <SecurityBadges />
                </div>

                <div id="cta">
                    <FinalCTA onEnter={handleSignIn} />
                </div>
            </main>

            <Footer scrollToSection={scrollToSection} />
        </div>
    );
};

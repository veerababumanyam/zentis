import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { ChatBubbleLeftRightIcon } from '../icons/ChatBubbleLeftRightIcon';
import { RadioIcon } from '../icons/RadioIcon';
import { HeartPulseIcon } from '../icons/HeartPulseIcon';

/* ─── Hero Card Data ────────────────────────────────────────── */

interface HeroCard {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    gradient: string;
    glowColor: string;
}

const heroCards: HeroCard[] = [
    {
        icon: <UsersIcon className="w-8 h-8" />,
        title: 'Bio-AI Board',
        subtitle: 'Multi-specialist medical board simulation with AI consensus',
        gradient: 'from-blue-500 to-cyan-400',
        glowColor: 'rgba(59,130,246,0.4)',
    },
    {
        icon: <ChatBubbleLeftRightIcon className="w-8 h-8" />,
        title: 'Clinical Critics',
        subtitle: 'Adversarial AI agents debate diagnoses in real-time',
        gradient: 'from-purple-500 to-pink-400',
        glowColor: 'rgba(168,85,247,0.4)',
    },
    {
        icon: <RadioIcon className="w-8 h-8" />,
        title: 'Live Assistant',
        subtitle: 'Multimodal video & audio stream analysis with biomarker detection',
        gradient: 'from-emerald-500 to-teal-400',
        glowColor: 'rgba(16,185,129,0.4)',
    },
    {
        icon: <SparklesIcon className="w-8 h-8" />,
        title: 'Agentic AI',
        subtitle: 'Autonomous agents orchestrating complex clinical workflows',
        gradient: 'from-amber-500 to-orange-400',
        glowColor: 'rgba(245,158,11,0.4)',
    },
    {
        icon: <HeartPulseIcon className="w-8 h-8" />,
        title: 'Smart Biomarkers',
        subtitle: 'Voice & visual biomarker detection before clinical presentation',
        gradient: 'from-rose-500 to-red-400',
        glowColor: 'rgba(244,63,94,0.4)',
    },
];

/* ─── Rotating Cards Carousel ───────────────────────────────── */

const RotatingCards: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startAutoplay = useCallback(() => {
        intervalRef.current = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % heroCards.length);
        }, 3500);
    }, []);

    useEffect(() => {
        startAutoplay();
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [startAutoplay]);

    const handleDotClick = (index: number) => {
        setActiveIndex(index);
        if (intervalRef.current) clearInterval(intervalRef.current);
        startAutoplay();
    };

    return (
        <div className="relative w-full max-w-md mx-auto" role="region" aria-label="Feature showcase carousel" aria-roledescription="carousel">
            <div className="relative h-[280px] overflow-hidden" style={{ perspective: '1200px' }}>
                {heroCards.map((card, index) => {
                    const offset = (index - activeIndex + heroCards.length) % heroCards.length;
                    const isActive = offset === 0;
                    const isNext = offset === 1;
                    const isPrev = offset === heroCards.length - 1;

                    let transform = 'translateX(150%) scale(0.6) rotateY(-30deg)';
                    let opacity = '0';
                    let zIndex = 0;
                    let filter = 'blur(6px)';

                    if (isActive) {
                        transform = 'translateX(0) scale(1) rotateY(0deg)';
                        opacity = '1';
                        zIndex = 30;
                        filter = 'blur(0px)';
                    } else if (isNext) {
                        transform = 'translateX(70%) scale(0.78) rotateY(-15deg)';
                        opacity = '0.15';
                        zIndex = 10;
                        filter = 'blur(6px)';
                    } else if (isPrev) {
                        transform = 'translateX(-70%) scale(0.78) rotateY(15deg)';
                        opacity = '0.15';
                        zIndex = 10;
                        filter = 'blur(6px)';
                    }

                    return (
                        <div
                            key={card.title}
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`${index + 1} of ${heroCards.length}: ${card.title}`}
                            aria-hidden={!isActive}
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ transform, opacity, zIndex, filter, pointerEvents: isActive ? 'auto' : 'none', transition: 'all 700ms cubic-bezier(0.25,0.46,0.45,0.94)' }}
                        >
                            <div
                                className="w-full rounded-3xl p-8 border border-white/[0.12] relative overflow-hidden group"
                                style={{
                                    background: isActive ? 'rgba(255,255,255,0.05)' : 'rgba(3,7,18,0.95)',
                                    backdropFilter: isActive ? 'blur(24px) saturate(1.3)' : 'none',
                                    boxShadow: isActive ? `0 25px 60px -12px ${card.glowColor}, 0 0 50px ${card.glowColor}` : 'none',
                                }}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.08] group-hover:opacity-[0.14] transition-opacity duration-500`} />
                                {isActive && <div className="absolute inset-0 landing-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}

                                <div className="relative z-10">
                                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} text-white mb-5 shadow-lg`}>
                                        {card.icon}
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{card.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{card.subtitle}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Navigation Dots */}
            <div className="flex items-center justify-center gap-2.5 mt-8" role="tablist" aria-label="Carousel navigation">
                {heroCards.map((card, index) => (
                    <button
                        key={card.title}
                        role="tab"
                        aria-selected={index === activeIndex}
                        aria-label={`Go to ${card.title}`}
                        onClick={() => handleDotClick(index)}
                        className={`rounded-full transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${index === activeIndex
                            ? 'w-10 h-3 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 shadow-[0_0_14px_rgba(139,92,246,0.6)]'
                            : 'w-3 h-3 bg-white/20 hover:bg-white/40'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

/* ─── Hero Section ──────────────────────────────────────────── */

interface HeroSectionProps {
    onEnter: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onEnter }) => (
    <section className="relative pt-32 md:pt-40 pb-24 md:pb-32 px-5 md:px-8" aria-labelledby="hero-heading">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
                <div className="inline-flex items-center px-4 py-2 rounded-full border border-blue-400/20 bg-blue-500/[0.08] text-blue-300 text-xs font-bold uppercase tracking-[0.2em] mb-8 landing-fade-in shadow-[0_0_20px_rgba(59,130,246,0.15)] landing-pulse-glow">
                    <SparklesIcon className="w-3.5 h-3.5 mr-2.5 animate-pulse" />
                    AI-Powered Healthcare Platform
                </div>

                <h1
                    id="hero-heading"
                    className="text-[2.75rem] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight leading-[1.08] mb-8 landing-slide-up"
                >
                    <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-400">
                        The Future of
                    </span>
                    <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 landing-gradient-text">
                        Clinical Intelligence
                    </span>
                </h1>

                <p className="text-lg md:text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light landing-slide-up" style={{ animationDelay: '150ms' }}>
                    Transform complex patient data into actionable insights with
                    <strong className="text-blue-300 font-medium"> Live Bio-Signals</strong>,{' '}
                    <strong className="text-purple-300 font-medium">Multi-Agent Medical Boards</strong>,
                    and real-time clinical critics.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start landing-slide-up" style={{ animationDelay: '300ms' }}>
                    <button
                        onClick={onEnter}
                        className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white font-bold text-lg shadow-xl shadow-blue-600/25 hover:shadow-purple-500/50 hover:scale-[1.03] transition-all duration-300 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                        aria-label="Sign up and get started with Zentis AI for free"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            Get Started Free
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </button>
                    <button
                        onClick={onEnter}
                        className="px-8 py-4 rounded-2xl landing-glass-card border border-white/[0.1] text-white font-semibold text-lg hover:bg-white/[0.08] hover:border-white/[0.2] hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                        Sign In
                    </button>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-10 justify-center lg:justify-start text-gray-500 text-xs landing-slide-up" style={{ animationDelay: '450ms' }}>
                    {[
                        { label: 'HIPAA Compliant' },
                        { label: 'SOC 2 Type II' },
                        { label: '256-bit Encryption' },
                    ].map(badge => (
                        <div key={badge.label} className="flex items-center gap-1.5">
                            <ShieldCheckIcon className="w-4 h-4 text-green-400" />
                            <span>{badge.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Rotating Cards */}
            <div className="landing-slide-up" style={{ animationDelay: '200ms' }}>
                <RotatingCards />
            </div>
        </div>
    </section>
);

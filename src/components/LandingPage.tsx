
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BotIcon } from './icons/BotIcon';
import { HeartPulseIcon } from './icons/HeartPulseIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { RadioIcon } from './icons/RadioIcon';
import { EyeIcon, BrainIcon, KidneyIcon, DnaIcon, LungsIcon, DropIcon, BugIcon, StomachIcon, JointIcon, ElderIcon } from './icons/SpecialtyIcons';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { StentIcon } from './icons/StentIcon';
import { PacemakerIcon } from './icons/PacemakerIcon';
import { HeartPumpIcon } from './icons/HeartPumpIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ActivityIcon } from './icons/ActivityIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';

/* ─── Interfaces ────────────────────────────────────────────── */

interface LandingPageProps {
    onEnter: () => void;
}

/* ─── Intersection Observer Hook ────────────────────────────── */

const useInView = (options?: IntersectionObserverInit) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(node);
            }
        }, { threshold: 0.15, ...options });

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return { ref, isVisible };
};

/* ─── Animated Counter ──────────────────────────────────────── */

const AnimatedCounter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({ end, suffix = '', duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const { ref, isVisible } = useInView();

    useEffect(() => {
        if (!isVisible) return;
        let startTime: number;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [isVisible, end, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
};

/* ─── Rotating Hero Cards ───────────────────────────────────── */

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
            {/* Card Stack */}
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
                                className="w-full rounded-3xl p-8 border border-white/[0.15] relative overflow-hidden group"
                                style={{
                                    background: isActive
                                        ? 'rgba(255,255,255,0.04)'
                                        : 'rgba(3,7,18,0.95)',
                                    backdropFilter: isActive ? 'blur(20px) saturate(1.3)' : 'none',
                                    boxShadow: isActive ? `0 25px 60px -12px ${card.glowColor}, 0 0 40px ${card.glowColor}` : 'none',
                                }}
                            >
                                {/* Gradient Overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500`} />
                                
                                {/* Shimmer effect */}
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
                        className={`rounded-full transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
                            index === activeIndex
                                ? 'w-10 h-3 bg-gradient-to-r from-blue-400 to-purple-400 shadow-[0_0_12px_rgba(139,92,246,0.5)]'
                                : 'w-3 h-3 bg-white/20 hover:bg-white/40'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
};

/* ─── Feature Card ──────────────────────────────────────────── */

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; gradient: string; delay?: number }> = ({ icon, title, description, gradient, delay = 0 }) => {
    const { ref, isVisible } = useInView();
    
    return (
        <div
            ref={ref}
            className={`group relative rounded-3xl landing-glass-card border border-white/[0.08] p-7 transition-all duration-700 hover:-translate-y-2 hover:border-white/[0.18] overflow-hidden ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {/* Hover gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />
            
            {/* Top glow line */}
            <div className={`absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />

            <div className="relative z-10">
                <div className={`mb-5 p-3.5 rounded-2xl bg-gradient-to-br ${gradient} w-fit text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-500`}>
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-blue-100 transition-colors duration-300">{title}</h3>
                <p className="text-gray-400 text-[15px] leading-relaxed group-hover:text-gray-300 transition-colors duration-300">{description}</p>
            </div>
        </div>
    );
};

/* ─── Specialty Pill ────────────────────────────────────────── */

const SpecialtyPill: React.FC<{ icon: React.ReactNode; title: string; desc: string; color: string; delay?: number }> = ({ icon, title, desc, color, delay = 0 }) => {
    const { ref, isVisible } = useInView();

    return (
        <div
            ref={ref}
            className={`flex items-center gap-4 p-4 rounded-2xl landing-glass-card border border-white/[0.06] hover:border-white/[0.15] transition-all duration-500 group hover:-translate-y-1 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className={`flex-shrink-0 p-2.5 rounded-xl bg-black/40 ${color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <div className="min-w-0">
                <h4 className="text-white font-semibold text-sm tracking-wide group-hover:text-blue-200 transition-colors duration-300">{title}</h4>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed group-hover:text-gray-400 transition-colors duration-300 truncate">{desc}</p>
            </div>
        </div>
    );
};

/* ─── Biomarker Item ────────────────────────────────────────── */

const BiomarkerItem: React.FC<{ label: string; sub: string; dotColor?: string }> = ({ label, sub, dotColor = 'bg-blue-500' }) => (
    <div className="flex items-start space-x-3 p-3.5 rounded-xl landing-glass-card border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:scale-[1.02] cursor-default group">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} mt-1.5 flex-shrink-0 shadow-[0_0_10px_currentColor] group-hover:scale-125 transition-transform duration-300`} />
        <div>
            <p className="text-white font-semibold text-sm tracking-wide">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5 group-hover:text-gray-400 transition-colors duration-300">{sub}</p>
        </div>
    </div>
);

/* ─── Stat Card ─────────────────────────────────────────────── */

const StatCard: React.FC<{ value: React.ReactNode; label: string; delay?: number }> = ({ value, label, delay = 0 }) => {
    const { ref, isVisible } = useInView();

    return (
        <div
            ref={ref}
            className={`text-center p-6 rounded-2xl landing-glass-card border border-white/[0.06] transition-all duration-700 ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                {value}
            </div>
            <div className="text-gray-400 text-sm font-medium">{label}</div>
        </div>
    );
};

/* ─── Testimonial Card ──────────────────────────────────────── */

const TestimonialCard: React.FC<{ quote: string; name: string; role: string; delay?: number }> = ({ quote, name, role, delay = 0 }) => {
    const { ref, isVisible } = useInView();

    return (
        <div
            ref={ref}
            className={`p-8 rounded-3xl landing-glass-card border border-white/[0.06] hover:border-white/[0.15] transition-all duration-700 group ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className="text-blue-400 mb-4" aria-hidden="true">
                <svg className="w-8 h-8 opacity-60" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983z"/></svg>
            </div>
            <p className="text-gray-300 text-[15px] leading-relaxed mb-6 italic">{quote}</p>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold" aria-hidden="true">
                    {name.charAt(0)}
                </div>
                <div>
                    <p className="text-white font-semibold text-sm">{name}</p>
                    <p className="text-gray-500 text-xs">{role}</p>
                </div>
            </div>
        </div>
    );
};

/* ─── Workflow Step (uses hook at top-level) ─────────────────── */

const WorkflowStep: React.FC<{ step: string; title: string; description: string; gradient: string; delay: number }> = ({ step, title, description, gradient, delay }) => {
    const { ref, isVisible } = useInView();
    return (
        <div
            ref={ref}
            className={`relative p-8 rounded-3xl landing-glass-card border border-white/[0.06] hover:border-white/[0.15] transition-all duration-700 group ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className={`text-7xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent opacity-20 absolute top-4 right-6`} aria-hidden="true">
                {step}
            </div>
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} text-white text-lg font-bold mb-6 shadow-lg`}>
                {step}
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
        setIsMobileMenuOpen(false);
    };

    return (
        <div
            id="landing-scroll"
            className="w-full h-full overflow-y-auto custom-scrollbar relative z-20 bg-[#030712] text-white font-sans selection:bg-blue-500/30 scroll-smooth"
        >
            {/* ─── Background Effects ───────────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
                {/* Grid pattern */}
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
                
                {/* Aurora blobs */}
                <div className="landing-aurora-blob" style={{ width: '800px', height: '600px', top: '-200px', left: '-200px', background: 'rgba(37,99,235,0.15)' }} />
                <div className="landing-aurora-blob animation-delay-2000" style={{ width: '600px', height: '600px', top: '20%', right: '-100px', background: 'rgba(147,51,234,0.12)' }} />
                <div className="landing-aurora-blob animation-delay-4000" style={{ width: '700px', height: '500px', bottom: '-150px', left: '30%', background: 'rgba(6,182,212,0.1)' }} />
                <div className="landing-aurora-blob" style={{ width: '500px', height: '400px', top: '60%', left: '-100px', background: 'rgba(225,29,72,0.08)', animationDelay: '6s' }} />

                {/* Radial spotlight */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px]" style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
            </div>

            {/* ─── Navigation ───────────────────────────────────────── */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                    scrolled
                        ? 'landing-glass-nav py-3 shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
                        : 'py-5 bg-transparent'
                }`}
                role="navigation"
                aria-label="Main navigation"
            >
                <div className="flex items-center justify-between px-5 md:px-8 max-w-7xl mx-auto w-full">
                    {/* Logo */}
                    <a href="#" className="flex items-center space-x-3 group" aria-label="MediSnap AI Home">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/50 group-hover:scale-105 transition-all duration-300">
                            <BotIcon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight group-hover:text-blue-200 transition-colors duration-300">
                            MediSnap<span className="text-blue-400">AI</span>
                        </span>
                    </a>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center gap-1" role="menubar">
                        {['Features', 'Specialties', 'Biomarkers', 'Testimonials'].map(item => (
                            <button
                                key={item}
                                onClick={() => scrollToSection(item.toLowerCase())}
                                className="px-4 py-2 text-sm text-gray-300 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all duration-300 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                role="menuitem"
                            >
                                {item}
                            </button>
                        ))}
                        <a
                            href="#architect"
                            className="px-4 py-2 text-sm text-gray-300 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all duration-300 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            role="menuitem"
                        >
                            Architect
                        </a>
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={onEnter}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={onEnter}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                        >
                            Get Started Free
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMobileMenuOpen}
                    >
                        <div className="w-6 h-6 flex flex-col justify-center items-center gap-1.5">
                            <span className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1' : ''}`} />
                            <span className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
                            <span className={`w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1' : ''}`} />
                        </div>
                    </button>
                </div>

                {/* Mobile Menu */}
                <div
                    className={`md:hidden overflow-hidden transition-all duration-500 ${
                        isMobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                    role="menu"
                    aria-hidden={!isMobileMenuOpen}
                >
                    <div className="px-5 py-4 space-y-1 landing-glass-card mx-4 mt-3 rounded-2xl border border-white/[0.08]">
                        {['Features', 'Specialties', 'Biomarkers', 'Testimonials'].map(item => (
                            <button
                                key={item}
                                onClick={() => scrollToSection(item.toLowerCase())}
                                className="block w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                role="menuitem"
                            >
                                {item}
                            </button>
                        ))}
                        <a
                            href="#architect"
                            className="block w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            role="menuitem"
                        >
                            Meet the Architect
                        </a>
                        <hr className="border-white/10 my-2" />
                        <button
                            onClick={onEnter}
                            className="block w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            role="menuitem"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={onEnter}
                            className="block w-full text-center px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            role="menuitem"
                        >
                            Sign Up Free
                        </button>
                    </div>
                </div>
            </nav>

            {/* ════════════════════════════════════════════════════════
                 HERO SECTION
                 ════════════════════════════════════════════════════════ */}
            <section className="relative pt-32 md:pt-40 pb-24 md:pb-32 px-5 md:px-8" aria-labelledby="hero-heading">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Copy */}
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-blue-400/20 bg-blue-500/[0.08] text-blue-300 text-xs font-bold uppercase tracking-[0.2em] mb-8 landing-fade-in shadow-[0_0_15px_rgba(59,130,246,0.15)]">
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
                                className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-600/25 hover:shadow-blue-600/50 hover:scale-[1.03] transition-all duration-300 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                                aria-label="Sign up and get started with MediSnap AI for free"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    Get Started Free
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                                </span>
                                {/* Button shine */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            </button>
                            <button
                                onClick={onEnter}
                                className="px-8 py-4 rounded-2xl landing-glass-card border border-white/[0.1] text-white font-semibold text-lg hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            >
                                Sign In
                            </button>
                        </div>

                        {/* Trust Indicators */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-10 justify-center lg:justify-start text-gray-500 text-xs landing-slide-up" style={{ animationDelay: '450ms' }}>
                            <div className="flex items-center gap-1.5">
                                <ShieldCheckIcon className="w-4 h-4 text-green-400" />
                                <span>HIPAA Compliant</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ShieldCheckIcon className="w-4 h-4 text-green-400" />
                                <span>SOC 2 Type II</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ShieldCheckIcon className="w-4 h-4 text-green-400" />
                                <span>256-bit Encryption</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Rotating Cards */}
                    <div className="landing-slide-up" style={{ animationDelay: '200ms' }}>
                        <RotatingCards />
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════
                 SOCIAL PROOF BAR
                 ════════════════════════════════════════════════════════ */}
            <section className="py-16 border-y border-white/[0.04] bg-white/[0.01]" aria-label="Platform statistics">
                <div className="max-w-6xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <StatCard value={<AnimatedCounter end={12} suffix="+" />} label="Medical Specialties" delay={0} />
                    <StatCard value={<AnimatedCounter end={50} suffix="+" />} label="AI Clinical Agents" delay={100} />
                    <StatCard value={<AnimatedCounter end={99} suffix="%" />} label="Uptime Guaranteed" delay={200} />
                    <StatCard value={<AnimatedCounter end={10} suffix="K+" />} label="Cases Analyzed" delay={300} />
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════
                 CORE FEATURES
                 ════════════════════════════════════════════════════════ */}
            <section id="features" className="px-5 md:px-8 py-24 md:py-32 relative" aria-labelledby="features-heading">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-20">
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-purple-400/20 bg-purple-500/[0.08] text-purple-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                            Core Capabilities
                        </div>
                        <h2 id="features-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                            Intelligent Clinical Workflows
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg font-light leading-relaxed">
                            Powered by multi-agent AI orchestration, each feature augments clinical decision-making with unprecedented depth and accuracy.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={<UsersIcon className="w-7 h-7" />}
                            title="Bio-AI Board"
                            description="Simulate a multidisciplinary medical board review. Specialists in Nephrology, Neurology, Oncology, and more collaborate to reach consensus on complex cases."
                            gradient="from-blue-500/80 to-cyan-400/80"
                            delay={0}
                        />
                        <FeatureCard
                            icon={<ChatBubbleLeftRightIcon className="w-7 h-7" />}
                            title="Clinical Critics"
                            description="Adversarial AI agents debate diagnosis and treatment plans in real-time, identifying blind spots and ensuring robust clinical reasoning."
                            gradient="from-purple-500/80 to-pink-400/80"
                            delay={100}
                        />
                        <FeatureCard
                            icon={<RadioIcon className="w-7 h-7" />}
                            title="Live Assistant"
                            description="Multimodal real-time analysis of video and audio streams. Automatically detects biomarkers while you converse with the patient."
                            gradient="from-emerald-500/80 to-teal-400/80"
                            delay={200}
                        />
                        <FeatureCard
                            icon={<SparklesIcon className="w-7 h-7" />}
                            title="Agentic Workflows"
                            description="Autonomous AI agents that orchestrate complex clinical workflows — from triage to treatment planning — with human-in-the-loop oversight."
                            gradient="from-amber-500/80 to-orange-400/80"
                            delay={300}
                        />
                        <FeatureCard
                            icon={<HeartPulseIcon className="w-7 h-7" />}
                            title="Smart Prescriptions"
                            description="AI-generated prescriptions with drug interaction checks, dosage optimization based on patient profile, and contraindication analysis."
                            gradient="from-rose-500/80 to-red-400/80"
                            delay={400}
                        />
                        <FeatureCard
                            icon={<ClipboardCheckIcon className="w-7 h-7" />}
                            title="Clinical Dashboard"
                            description="Comprehensive patient overview with vitals tracking, risk stratification, tasks, GDMT checklists, and automated clinical note generation."
                            gradient="from-indigo-500/80 to-blue-400/80"
                            delay={500}
                        />
                    </div>

                    {/* Secondary features row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
                        {[
                            { icon: <ActivityIcon className="w-5 h-5" />, title: 'Risk Stratification', desc: 'CHA₂DS₂-VASc, HAS-BLED & more' },
                            { icon: <EyeIcon className="w-5 h-5" />, title: 'DICOM Viewer', desc: 'In-app medical imaging viewer' },
                            { icon: <ShieldCheckIcon className="w-5 h-5" />, title: 'HCC Coding', desc: 'Automated coding opportunities' },
                            { icon: <BrainIcon className="w-5 h-5" />, title: 'Differential Dx', desc: 'AI differential diagnosis engine' },
                        ].map((item) => (
                            <div key={item.title} className="flex items-center gap-3 p-4 rounded-2xl landing-glass-card border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 group">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 group-hover:text-blue-300 transition-colors">
                                    {item.icon}
                                </div>
                                <div>
                                    <h4 className="text-white text-sm font-semibold">{item.title}</h4>
                                    <p className="text-gray-500 text-xs">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════
                 SPECIALTIES ECOSYSTEM
                 ════════════════════════════════════════════════════════ */}
            <section id="specialties" className="px-5 md:px-8 py-24 md:py-32 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent relative" aria-labelledby="specialties-heading">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] text-cyan-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                            Medical Ecosystem
                        </div>
                        <h2 id="specialties-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                            12+ Clinical Specialties
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg font-light leading-relaxed">
                            A unified ecosystem of specialized AI agents, each trained on domain-specific guidelines and reporting standards for expert-level analysis.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <SpecialtyPill icon={<StentIcon className="w-6 h-6" />} title="Interventional Cardiology" desc="Angiograms, PCI planning, SYNTAX" color="text-blue-400" delay={0} />
                        <SpecialtyPill icon={<PacemakerIcon className="w-6 h-6" />} title="Electrophysiology" desc="Device interrogation, Arrhythmia" color="text-cyan-400" delay={50} />
                        <SpecialtyPill icon={<HeartPumpIcon className="w-6 h-6" />} title="Heart Failure" desc="LVAD, Transplant evaluation" color="text-red-400" delay={100} />
                        <SpecialtyPill icon={<BrainIcon className="w-6 h-6" />} title="Neurology" desc="Stroke protocols, MRI Brain" color="text-indigo-400" delay={150} />
                        <SpecialtyPill icon={<KidneyIcon className="w-6 h-6" />} title="Nephrology" desc="CKD staging, Electrolytes" color="text-yellow-400" delay={200} />
                        <SpecialtyPill icon={<DnaIcon className="w-6 h-6" />} title="Oncology" desc="TNM staging, Biomarker profiles" color="text-pink-400" delay={250} />
                        <SpecialtyPill icon={<LungsIcon className="w-6 h-6" />} title="Pulmonology" desc="PFT interpretation, Nodule tracking" color="text-teal-400" delay={300} />
                        <SpecialtyPill icon={<DropIcon className="w-6 h-6" />} title="Endocrinology" desc="Diabetes & Thyroid management" color="text-purple-400" delay={350} />
                        <SpecialtyPill icon={<BugIcon className="w-6 h-6" />} title="Infectious Disease" desc="Sepsis, Antibiotic stewardship" color="text-green-400" delay={400} />
                        <SpecialtyPill icon={<StomachIcon className="w-6 h-6" />} title="Gastroenterology" desc="Endoscopy, Liver function" color="text-orange-400" delay={450} />
                        <SpecialtyPill icon={<JointIcon className="w-6 h-6" />} title="Rheumatology" desc="Autoimmune markers, Inflammation" color="text-rose-400" delay={500} />
                        <SpecialtyPill icon={<ElderIcon className="w-6 h-6" />} title="Geriatrics" desc="Frailty, Polypharmacy, Falls" color="text-amber-400" delay={550} />
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════
                 BIOMARKER DETECTION
                 ════════════════════════════════════════════════════════ */}
            <section id="biomarkers" className="px-5 md:px-8 py-24 md:py-32 relative" aria-labelledby="biomarkers-heading">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 items-center">
                        {/* Left: Content */}
                        <div>
                            <div className="inline-flex items-center px-4 py-2 rounded-full border border-rose-400/20 bg-rose-500/[0.08] text-rose-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                                Real-Time Detection
                            </div>
                            <h2 id="biomarkers-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                                Advanced Biomarker Detection
                            </h2>
                            <p className="text-gray-400 mb-10 leading-relaxed text-lg font-light">
                                The AI Agent passively analyzes voice acoustics, facial expressions, and visual signs to detect medical and emotional symptoms in real-time.
                            </p>

                            <div className="space-y-10">
                                <div>
                                    <h3 className="flex items-center text-blue-400 font-bold uppercase text-xs tracking-[0.2em] mb-5">
                                        <MicrophoneIcon className="w-4 h-4 mr-2" /> Voice-Based Biomarkers
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <BiomarkerItem label="Dyspnea" sub="Breathiness, short phrases, gasping" />
                                        <BiomarkerItem label="Dysarthria" sub="Slurred speech, neurological signs" />
                                        <BiomarkerItem label="Stress / Anxiety" sub="Pressured speech, pitch variability" />
                                        <BiomarkerItem label="Pain / Fatigue" sub="Strained tone, monotone energy" />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="flex items-center text-purple-400 font-bold uppercase text-xs tracking-[0.2em] mb-5">
                                        <EyeIcon className="w-4 h-4 mr-2" /> Visual Biomarkers
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <BiomarkerItem label="Dermatologic" sub="Cyanosis, Jaundice, Pallor" dotColor="bg-purple-500" />
                                        <BiomarkerItem label="Neurological" sub="Facial asymmetry, Tremors" dotColor="bg-purple-500" />
                                        <BiomarkerItem label="Cardio-Respiratory" sub="JVD, Tripoding, Pedal Edema" dotColor="bg-purple-500" />
                                        <BiomarkerItem label="Acute Distress" sub="Diaphoresis, Pursed-lip breathing" dotColor="bg-purple-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Live HUD Visualization */}
                        <div className="relative group">
                            {/* Glow backdrop */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-[60px] opacity-15 group-hover:opacity-30 transition-opacity duration-700" aria-hidden="true" />

                            <div className="relative landing-glass-card border border-white/[0.1] rounded-3xl p-8 shadow-2xl overflow-hidden group-hover:border-white/[0.18] transition-all duration-500">
                                {/* HUD Scan Line */}
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60 landing-scan-line" aria-hidden="true" />

                                <div className="flex justify-between items-center mb-8 border-b border-white/[0.06] pb-4">
                                    <div className="flex items-center space-x-3 text-white">
                                        <HeartPulseIcon className="w-6 h-6 text-red-500 animate-pulse" />
                                        <span className="font-bold text-sm tracking-widest uppercase">Live Bio-Signal HUD</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                        <div className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-md border border-red-500/30">REC</div>
                                    </div>
                                </div>

                                <div className="space-y-3" role="list" aria-label="Detected biomarkers">
                                    <div role="listitem" className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-transparent border-l-4 border-red-500 hover:bg-red-500/20 transition-colors duration-300">
                                        <div>
                                            <div className="text-white text-sm font-bold">Dyspnea Detected</div>
                                            <div className="text-red-300/60 text-xs">Audio Analysis • Breathiness</div>
                                        </div>
                                        <div className="text-red-400 text-[10px] font-bold border border-red-500/30 px-2 py-1 rounded-md bg-red-500/10">HIGH CONFIDENCE</div>
                                    </div>
                                    <div role="listitem" className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-transparent border-l-4 border-yellow-500 hover:bg-yellow-500/20 transition-colors duration-300">
                                        <div>
                                            <div className="text-white text-sm font-bold">Mild Tremor (Hand)</div>
                                            <div className="text-yellow-300/60 text-xs">Video Analysis • Frequency 5Hz</div>
                                        </div>
                                        <div className="text-yellow-400 text-[10px] font-bold border border-yellow-500/30 px-2 py-1 rounded-md bg-yellow-500/10">MEDIUM</div>
                                    </div>
                                    <div role="listitem" className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border-l-4 border-blue-500 hover:bg-blue-500/20 transition-colors duration-300">
                                        <div>
                                            <div className="text-white text-sm font-bold">Cyanosis (Lips)</div>
                                            <div className="text-blue-300/60 text-xs">Video Analysis • Colorimetry</div>
                                        </div>
                                        <div className="text-blue-400 text-[10px] font-bold border border-blue-500/30 px-2 py-1 rounded-md bg-blue-500/10">VISUAL SIGN</div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/[0.06]">
                                    <p className="text-gray-400 text-xs leading-relaxed font-mono">
                                        <span className="text-blue-400 font-bold mr-2">AI INSIGHT:</span>
                                        Patient shows signs of acute respiratory distress correlating with visible cyanosis. Cross-referencing with HFrEF history suggests potential decompensation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════
                 WORKFLOW SECTION
                 ════════════════════════════════════════════════════════ */}
            <section className="px-5 md:px-8 py-24 md:py-32 bg-gradient-to-b from-transparent via-blue-950/[0.04] to-transparent relative" aria-labelledby="workflow-heading">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-indigo-400/20 bg-indigo-500/[0.08] text-indigo-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                        How It Works
                    </div>
                    <h2 id="workflow-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                        From Data to Decision in Seconds
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg font-light leading-relaxed mb-16">
                        A seamless three-step process that transforms raw clinical data into actionable intelligence.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <WorkflowStep
                            step="01"
                            title="Upload & Connect"
                            description="Import patient records, labs, imaging, ECGs, and DICOM files. Connect live video for real-time biomarker detection."
                            gradient="from-blue-500 to-cyan-400"
                            delay={0}
                        />
                        <WorkflowStep
                            step="02"
                            title="AI Analysis"
                            description="Multi-agent AI orchestration analyzes all data simultaneously — from differential diagnosis to risk stratification."
                            gradient="from-purple-500 to-pink-400"
                            delay={150}
                        />
                        <WorkflowStep
                            step="03"
                            title="Collaborative Decision"
                            description="Review AI board opinions, critics' debates, and automated prescriptions. Generate clinical notes in one click."
                            gradient="from-emerald-500 to-teal-400"
                            delay={300}
                        />
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════
                 TESTIMONIALS
                 ════════════════════════════════════════════════════════ */}
            <section id="testimonials" className="px-5 md:px-8 py-24 md:py-32 relative" aria-labelledby="testimonials-heading">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-amber-400/20 bg-amber-500/[0.08] text-amber-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                            Trusted by Professionals
                        </div>
                        <h2 id="testimonials-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                            What Clinicians Are Saying
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <TestimonialCard
                            quote="MediSnap's Bio-AI Board transformed our tumor board reviews. The multi-specialist simulation identified a treatment pathway we hadn't considered."
                            name="Dr. Sarah Chen"
                            role="Oncologist, Stanford Medical"
                            delay={0}
                        />
                        <TestimonialCard
                            quote="The live biomarker detection caught early signs of respiratory distress during a routine telehealth visit. It literally saved a patient's life."
                            name="Dr. James Okoye"
                            role="Cardiologist, Mount Sinai"
                            delay={100}
                        />
                        <TestimonialCard
                            quote="Clinical Critics feature challenges my diagnoses in ways I never expected. It's like having an adversarial peer review built into every consultation."
                            name="Dr. Priya Sharma"
                            role="Internal Medicine, Mayo Clinic"
                            delay={200}
                        />
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════
                 SECURITY & COMPLIANCE
                 ════════════════════════════════════════════════════════ */}
            <section className="px-5 md:px-8 py-20 border-y border-white/[0.04] bg-white/[0.01]" aria-labelledby="security-heading">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 id="security-heading" className="text-2xl md:text-3xl font-bold text-white mb-10 tracking-tight">
                        Enterprise-Grade Security & Compliance
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { label: 'HIPAA Compliant', icon: '🏥' },
                            { label: 'SOC 2 Type II', icon: '🛡️' },
                            { label: 'AES-256 Encryption', icon: '🔐' },
                            { label: 'WCAG 2.2 AA', icon: '♿' },
                        ].map(item => (
                            <div key={item.label} className="p-5 rounded-2xl landing-glass-card border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
                                <div className="text-3xl mb-3" aria-hidden="true">{item.icon}</div>
                                <p className="text-white text-sm font-semibold">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════
                 FINAL CTA
                 ════════════════════════════════════════════════════════ */}
            <section className="px-5 md:px-8 py-24 md:py-32 relative" aria-labelledby="cta-heading">
                {/* CTA Glow */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                    <div className="w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 id="cta-heading" className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
                        Ready to Transform<br />Your Clinical Practice?
                    </h2>
                    <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light leading-relaxed">
                        Join thousands of healthcare professionals using MediSnap AI to deliver faster, more accurate diagnoses.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={onEnter}
                            className="group relative px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-600/25 hover:shadow-blue-600/50 hover:scale-[1.03] transition-all duration-300 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                            aria-label="Sign up for MediSnap AI"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Sign Up — It&apos;s Free
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        </button>
                        <button
                            onClick={onEnter}
                            className="px-10 py-5 rounded-2xl landing-glass-card border border-white/[0.1] text-white font-semibold text-lg hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        >
                            Sign In to Dashboard
                        </button>
                    </div>

                    <p className="text-gray-600 text-xs mt-6">
                        No credit card required • Free tier available • Cancel anytime
                    </p>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════════
                 FOOTER
                 ════════════════════════════════════════════════════════ */}
            <footer className="border-t border-white/[0.06] py-16 bg-black/30" role="contentinfo">
                <div className="max-w-7xl mx-auto px-5 md:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        {/* Brand */}
                        <div className="md:col-span-1">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                    <BotIcon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-lg font-bold text-white">MediSnap<span className="text-blue-400">AI</span></span>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                AI-powered clinical intelligence platform transforming healthcare decisions.
                            </p>
                        </div>

                        {/* Product */}
                        <div>
                            <h3 className="text-white font-semibold text-sm mb-4">Product</h3>
                            <ul className="space-y-3" role="list">
                                {['Bio-AI Board', 'Clinical Critics', 'Live Assistant', 'Smart Prescriptions', 'Clinical Dashboard'].map(item => (
                                    <li key={item}>
                                        <button onClick={() => scrollToSection('features')} className="text-gray-500 hover:text-white text-sm transition-colors focus:outline-none focus-visible:text-blue-400">{item}</button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Specialties */}
                        <div>
                            <h3 className="text-white font-semibold text-sm mb-4">Specialties</h3>
                            <ul className="space-y-3" role="list">
                                {['Cardiology', 'Neurology', 'Oncology', 'Pulmonology', 'Nephrology'].map(item => (
                                    <li key={item}>
                                        <button onClick={() => scrollToSection('specialties')} className="text-gray-500 hover:text-white text-sm transition-colors focus:outline-none focus-visible:text-blue-400">{item}</button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Company */}
                        <div>
                            <h3 className="text-white font-semibold text-sm mb-4">Company</h3>
                            <ul className="space-y-3" role="list">
                                <li>
                                    <a href="#architect" className="text-gray-500 hover:text-white text-sm transition-colors focus:outline-none focus-visible:text-blue-400">Meet the Architect</a>
                                </li>
                                {['Privacy Policy', 'Terms of Service', 'HIPAA Compliance', 'Contact Support', 'Documentation'].map(item => (
                                    <li key={item}>
                                        <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors focus:outline-none focus-visible:text-blue-400">{item}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-600 text-xs">
                            &copy; {new Date().getFullYear()} MediSnap AI. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6">
                            <a href="#architect" className="text-gray-600 hover:text-white transition-colors text-xs focus:outline-none focus-visible:text-blue-400">Architect</a>
                            <a href="#" className="text-gray-600 hover:text-white transition-colors text-xs focus:outline-none focus-visible:text-blue-400">Privacy</a>
                            <a href="#" className="text-gray-600 hover:text-white transition-colors text-xs focus:outline-none focus-visible:text-blue-400">Terms</a>
                            <a href="#" className="text-gray-600 hover:text-white transition-colors text-xs focus:outline-none focus-visible:text-blue-400">HIPAA</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ActivityIcon } from './icons/ActivityIcon';
import { BRAND_NAME } from '../constants/branding';

/* ─── Intersection Observer Hook ────────────────────────────── */

const useInView = (options?: IntersectionObserverInit) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setIsVisible(true); obs.unobserve(node); }
        }, { threshold: 0.12, ...options });
        obs.observe(node);
        return () => obs.disconnect();
    }, []);
    return { ref, isVisible };
};

/* ─── Types ─────────────────────────────────────────────────── */

interface ExperienceNode {
    id: string;
    role: string;
    company: string;
    period: string;
    location: string;
    description: string[];
    tech: string[];
    gradient: string;
    glowColor: string;
}

interface SkillCluster {
    category: string;
    skills: string[];
    icon: React.ReactNode;
    gradient: string;
}

interface ArchitectProfileProps {
    onBack?: () => void;
}

/* ─── Data ──────────────────────────────────────────────────── */

const EXPERIENCE_DATA: ExperienceNode[] = [
    {
        id: 'eon-current',
        role: 'Global Enterprise Architect',
        company: 'E.ON',
        period: 'Sep 2019 – Present',
        location: 'Essen, Germany',
        description: [
            'Pioneered the strategic integration of Autonomous AI Agents into the enterprise core.',
            'Architected comprehensive AI Governance Frameworks, ensuring LLM safety and ethical scalability.',
            'Developed high-impact Proof-of-Concept AI agents for Microsoft Copilot, leveraging advanced RAG pipelines.',
            'Executed a Zero Trust security paradigm (Zscaler, Illumio), effectively neutralizing lateral movement risks.',
        ],
        tech: ['AI Agents', 'LLMs', 'RAG', 'Azure', 'Zero Trust', 'Zscaler'],
        gradient: 'from-blue-500 to-cyan-400',
        glowColor: 'rgba(59,130,246,0.35)',
    },
    {
        id: 'infosys',
        role: 'Senior Technology Architect',
        company: 'Infosys Ltd',
        period: 'Feb 2016 – Aug 2019',
        location: 'Global',
        description: [
            'Orchestrated Enterprise Architecture transformation, aligning technology with critical business drivers.',
            'Directed complex technology mergers and carve-outs, enabling seamless business acquisitions.',
            'Revolutionized LAN/WAN infrastructure, achieving a 30% reduction in system downtime through optimization.',
        ],
        tech: ['Enterprise Arch', 'Mergers & Acquisitions', 'Network Security'],
        gradient: 'from-purple-500 to-pink-400',
        glowColor: 'rgba(168,85,247,0.3)',
    },
    {
        id: 'wipro',
        role: 'Solution Architect',
        company: 'Wipro Technologies',
        period: 'Jul 2014 – Jan 2016',
        location: 'Global',
        description: [
            'Engineered a robust, high-performance IT infrastructure framework for global scalability.',
            'Designed and deployed a cost-saving UCaaS platform, reducing operational expenses by 25%.',
            'Led a 15-member elite team in critical Cisco UCS and VMware migration projects.',
        ],
        tech: ['UCaaS', 'Cisco UCS', 'VMware', 'Cloud Migration'],
        gradient: 'from-emerald-500 to-teal-400',
        glowColor: 'rgba(16,185,129,0.3)',
    },
    {
        id: 'cisco',
        role: 'Solution Architect & Support Engineer',
        company: 'Cisco Systems',
        period: 'Feb 2011 – Jul 2014',
        location: 'Global',
        description: [
            'Championed complex support orchestrations for Cisco Unified Communications Systems globally.',
            'Trusted advisor to top 200 enterprise clients (Accenture, JPMC, AT&T) within the critical HTTS UC Team.',
            'Consistently exceeded SLA targets and drove profitability through strategic technical planning.',
        ],
        tech: ['Cisco UC', 'VoIP', 'Network Design', 'HTTS'],
        gradient: 'from-amber-500 to-orange-400',
        glowColor: 'rgba(245,158,11,0.3)',
    },
];

const SKILL_CLUSTERS: SkillCluster[] = [
    {
        category: 'Generative AI Engineering',
        icon: <SparklesIcon className="w-6 h-6" />,
        skills: ['AI Agents', 'LLMs', 'GenAI Engineering', 'RAG Pipelines', 'AI Semantics', 'Vector Databases'],
        gradient: 'from-blue-500 to-cyan-400',
    },
    {
        category: 'AI Platforms',
        icon: <ActivityIcon className="w-6 h-6" />,
        skills: ['Microsoft Copilot Studio', 'Agent 365', 'Databricks Mosaic AI', 'SAP Jules', 'LangChain', 'CrewAI', 'PydanticAI'],
        gradient: 'from-purple-500 to-pink-400',
    },
    {
        category: 'Data & Governance',
        icon: <ShieldCheckIcon className="w-6 h-6" />,
        skills: ['Data Science', 'Data Strategy', 'Data Governance', 'AI Governance', 'Strategic Planning'],
        gradient: 'from-emerald-500 to-teal-400',
    },
    {
        category: 'Cloud Infrastructure',
        icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /></svg>,
        skills: ['Azure (Expert)', 'Hybrid Cloud', 'Zero Trust Security', 'Kubernetes', 'Docker', 'Aviatrix'],
        gradient: 'from-amber-500 to-orange-400',
    },
];

const CERTIFICATIONS = [
    'TOGAF 9.2',
    'Management 3.0',
    'Azure Solutions Architect (AZ-305)',
    'Azure Administrator (AZ-104)',
    'Cisco CCVP',
    'Cisco CCNA',
    'VMware Certified Professional',
    'ITIL V3 Foundation',
];

/* ─── Sub-Components ────────────────────────────────────────── */

const SkillCard: React.FC<{ cluster: SkillCluster; delay: number }> = ({ cluster, delay }) => {
    const { ref, isVisible } = useInView();
    return (
        <div
            ref={ref}
            className={`group relative rounded-3xl landing-glass-card border border-white/[0.08] p-7 transition-all duration-700 hover:-translate-y-2 hover:border-white/[0.18] overflow-hidden ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${cluster.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />
            <div className={`absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r ${cluster.gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
            <div className="relative z-10">
                <div className={`mb-5 p-3.5 rounded-2xl bg-gradient-to-br ${cluster.gradient} w-fit text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-500`}>
                    {cluster.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-4 tracking-tight">{cluster.category}</h3>
                <div className="flex flex-wrap gap-2">
                    {cluster.skills.map(skill => (
                        <span key={skill} className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[10px] font-semibold uppercase tracking-wider text-gray-400 group-hover:text-gray-300 transition-colors">
                            {skill}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const TimelineCard: React.FC<{ node: ExperienceNode; index: number }> = ({ node, index }) => {
    const { ref, isVisible } = useInView();
    return (
        <div
            ref={ref}
            className={`relative group transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: `${index * 120}ms` }}
        >
            {/* Timeline dot */}
            <div className={`absolute -left-[37px] md:-left-[41px] top-8 w-5 h-5 rounded-full border-[3px] border-gray-950 z-10 transition-all duration-500 group-hover:scale-125 ${index === 0 ? 'bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.6)]' : 'bg-gray-600 group-hover:bg-blue-400'
                }`} />

            <div className="relative rounded-3xl landing-glass-card border border-white/[0.08] p-7 md:p-8 hover:border-white/[0.18] transition-all duration-500 overflow-hidden">
                {/* Hover gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${node.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500`} />

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-blue-200 transition-colors">{node.role}</h3>
                            <p className="text-gray-400 font-medium mt-1">{node.company}</p>
                        </div>
                        <div className="flex flex-col md:items-end gap-1 text-sm text-gray-500 font-mono flex-shrink-0">
                            <span>{node.period}</span>
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                                {node.location}
                            </span>
                        </div>
                    </div>

                    {/* Descriptions */}
                    <ul className="space-y-2.5 mb-6">
                        {node.description.map((desc, i) => (
                            <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed text-gray-400 group-hover:text-gray-300 transition-colors">
                                <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                {desc}
                            </li>
                        ))}
                    </ul>

                    {/* Tech Tags */}
                    <div className="border-t border-white/[0.06] pt-4 flex flex-wrap gap-2">
                        {node.tech.map(t => (
                            <span key={t} className={`px-3 py-1 rounded-full bg-gradient-to-r ${node.gradient} bg-clip-text text-transparent text-xs font-semibold border border-white/[0.1]`}>
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   ARCHITECT PROFILE PAGE
   ═══════════════════════════════════════════════════════════════ */

export const ArchitectProfile: React.FC<ArchitectProfileProps> = ({ onBack }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLDivElement;
            setScrolled(target.scrollTop > 50);
        };
        const el = document.getElementById('profile-scroll');
        el?.addEventListener('scroll', handleScroll, { passive: true });
        return () => el?.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div
            id="profile-scroll"
            className="w-full h-full overflow-y-auto custom-scrollbar relative z-20 bg-[#030712] text-white font-sans selection:bg-blue-500/30 scroll-smooth"
        >
            {/* ── Background Effects ─────────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
                <div className="landing-aurora-blob" style={{ width: '700px', height: '500px', top: '-150px', right: '-100px', background: 'rgba(6,182,212,0.12)' }} />
                <div className="landing-aurora-blob animation-delay-2000" style={{ width: '600px', height: '500px', top: '40%', left: '-150px', background: 'rgba(37,99,235,0.1)' }} />
                <div className="landing-aurora-blob animation-delay-4000" style={{ width: '500px', height: '400px', bottom: '-100px', right: '20%', background: 'rgba(147,51,234,0.08)' }} />
            </div>

            {/* ── Navigation ─────────────────────────────────────── */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'landing-glass-nav py-3 shadow-[0_4px_30px_rgba(0,0,0,0.3)]' : 'py-5 bg-transparent'}`}
                role="navigation"
                aria-label="Profile navigation"
            >
                <div className="flex items-center justify-between px-5 md:px-8 max-w-7xl mx-auto">
                    {onBack ? (
                        <button
                            onClick={onBack}
                            className="flex items-center space-x-3 group"
                            aria-label="Back to Zentis AI"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/50 group-hover:scale-105 transition-all duration-300">
                                <LogoIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-bold text-white tracking-tight">
                                Zentis<span className="text-blue-400">AI</span>
                            </span>
                        </button>
                    ) : (
                        <a href="/" className="flex items-center space-x-3 group" aria-label="Zentis AI Home">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/50 group-hover:scale-105 transition-all duration-300">
                                <LogoIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-bold text-white tracking-tight">
                                Zentis<span className="text-blue-400">AI</span>
                            </span>
                        </a>
                    )}

                    <div className="flex items-center gap-3">
                        <a
                            href="https://linkedin.com/in/vmanyam"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all duration-300 hidden sm:block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        >
                            LinkedIn
                        </a>
                        <a
                            href="mailto:veerababumanyam@gmail.com"
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                        >
                            Contact
                        </a>
                    </div>
                </div>
            </nav>

            {/* ════════════════════════════════════════════════════
                 HERO
                 ════════════════════════════════════════════════════ */}
            <section className="relative pt-32 md:pt-40 pb-20 md:pb-28 px-5 md:px-8" aria-labelledby="profile-hero-heading">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 lg:gap-20 items-center">
                    {/* Avatar */}
                    <div className="flex justify-center lg:justify-start">
                        <div className="relative group">
                            {/* Glow backdrop */}
                            <div className="absolute inset-[-20px] bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-700" aria-hidden="true" />

                            {/* Rotating ring */}
                            <svg className="absolute inset-[-30px] w-[calc(100%+60px)] h-[calc(100%+60px)] pointer-events-none" viewBox="0 0 200 200" aria-hidden="true" style={{ animation: 'spin 25s linear infinite' }}>
                                <circle cx="100" cy="100" r="96" fill="none" stroke="url(#profileGrad)" strokeWidth="1" strokeDasharray="5 10" opacity="0.5" />
                                <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="30 100" />
                                <defs>
                                    <linearGradient id="profileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            {/* Orbiting dot */}
                            <div className="absolute inset-[-40px] w-[calc(100%+80px)] h-[calc(100%+80px)] pointer-events-none" style={{ animation: 'spin 10s linear infinite' }} aria-hidden="true">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-400 rounded-full shadow-[0_0_16px_rgba(59,130,246,0.8)]" />
                            </div>

                            {/* Image */}
                            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-2 border-white/[0.15] shadow-[0_0_40px_rgba(59,130,246,0.15)] z-10">
                                <picture>
                                    <source srcSet="/VeeraPhoto.webp" type="image/webp" />
                                    <img
                                        src="/VeeraPhoto.jpg"
                                        alt="Veera Babu Manyam – Global Enterprise Architect"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-110 contrast-105"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=VB+Manyam&background=1d4ed8&color=fff&size=256&font-size=0.4'; }}
                                    />
                                </picture>
                                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 pointer-events-none" />
                            </div>

                            {/* Status badge */}
                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-20 px-5 py-2 rounded-full landing-glass-card border border-white/[0.1] flex items-center gap-2.5 shadow-xl">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">Available</span>
                            </div>
                        </div>
                    </div>

                    {/* Identity Copy */}
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-blue-400/20 bg-blue-500/[0.08] text-blue-300 text-xs font-bold uppercase tracking-[0.2em] mb-6 landing-fade-in shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                            <ShieldCheckIcon className="w-3.5 h-3.5 mr-2" />
                            Enterprise Architect &amp; AI Strategist
                        </div>

                        <h1 id="profile-hero-heading" className="text-[2.75rem] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 landing-slide-up">
                            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-400">
                                Veera Babu
                            </span>
                            <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 landing-gradient-text">
                                Manyam
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed font-light landing-slide-up" style={{ animationDelay: '150ms' }}>
                            Designing the digital nervous systems of tomorrow's enterprises.
                            Pioneering <strong className="text-blue-300 font-medium">Autonomous AI Agents</strong>,{' '}
                            <strong className="text-purple-300 font-medium">Generative AI Governance</strong>,
                            and Zero Trust architectures at global scale.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start landing-slide-up" style={{ animationDelay: '300ms' }}>
                            <a
                                href="https://linkedin.com/in/vmanyam"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-600/25 hover:shadow-blue-600/50 hover:scale-[1.03] transition-all duration-300 overflow-hidden text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    Connect on LinkedIn
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            </a>
                            <a
                                href="mailto:veerababumanyam@gmail.com"
                                className="px-8 py-4 rounded-2xl landing-glass-card border border-white/[0.1] text-white font-semibold text-lg hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-300 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            >
                                Email Me
                            </a>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex flex-wrap items-center gap-6 mt-8 justify-center lg:justify-start text-gray-500 text-xs landing-slide-up" style={{ animationDelay: '450ms' }}>
                            <div className="flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                                <span>Essen, Germany</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                <span>14+ Years Experience</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <SparklesIcon className="w-4 h-4 text-purple-400" />
                                <span>AI Agent Pioneer</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════
                 SKILL CLUSTERS
                 ════════════════════════════════════════════════════ */}
            <section className="px-5 md:px-8 py-20 md:py-28" aria-labelledby="skills-heading">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] text-cyan-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                            Core Competencies
                        </div>
                        <h2 id="skills-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                            Technical Expertise
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg font-light leading-relaxed">
                            Deep specialization across AI engineering, enterprise architecture, cloud infrastructure, and data governance.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {SKILL_CLUSTERS.map((cluster, idx) => (
                            <SkillCard key={cluster.category} cluster={cluster} delay={idx * 100} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════
                 EXPERIENCE TIMELINE
                 ════════════════════════════════════════════════════ */}
            <section className="px-5 md:px-8 py-20 md:py-28 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent" aria-labelledby="experience-heading">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center px-4 py-2 rounded-full border border-purple-400/20 bg-purple-500/[0.08] text-purple-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                            Career Trajectory
                        </div>
                        <h2 id="experience-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                            Professional Journey
                        </h2>
                    </div>

                    {/* Timeline */}
                    <div className="relative border-l-2 border-blue-500/20 ml-5 md:ml-8 space-y-10 pl-8 md:pl-12 py-4">
                        {EXPERIENCE_DATA.map((node, idx) => (
                            <TimelineCard key={node.id} node={node} index={idx} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════
                 CERTIFICATIONS
                 ════════════════════════════════════════════════════ */}
            <section className="px-5 md:px-8 py-20 md:py-28" aria-labelledby="certs-heading">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                        Verified Credentials
                    </div>
                    <h2 id="certs-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-12 tracking-tight">
                        Certifications & Protocols
                    </h2>

                    <div className="flex flex-wrap justify-center gap-4">
                        {CERTIFICATIONS.map(cert => (
                            <div
                                key={cert}
                                className="px-5 py-3 rounded-2xl landing-glass-card border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300 text-sm font-semibold flex items-center gap-2.5 group hover:-translate-y-1"
                            >
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] group-hover:scale-125 transition-transform" />
                                <span className="text-gray-300 group-hover:text-white transition-colors">{cert}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════
                 CTA
                 ════════════════════════════════════════════════════ */}
            <section className="px-5 md:px-8 py-24 md:py-32 relative" aria-labelledby="profile-cta">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                    <div className="w-[500px] h-[350px] bg-blue-600/10 rounded-full blur-[120px]" />
                </div>
                <div className="max-w-3xl mx-auto text-center relative z-10">
                    <h2 id="profile-cta" className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                        Let's Build the Future Together
                    </h2>
                    <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto mb-10 font-light leading-relaxed">
                        Interested in AI-driven enterprise architecture, agentic workflows, or collaborating on Zentis AI?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="mailto:veerababumanyam@gmail.com"
                            className="group relative px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-600/25 hover:shadow-blue-600/50 hover:scale-[1.03] transition-all duration-300 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Get in Touch
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        </a>
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="px-10 py-5 rounded-2xl landing-glass-card border border-white/[0.1] text-white font-semibold text-lg hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            >
                                Back to Zentis AI
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════
                 FOOTER
                 ════════════════════════════════════════════════════ */}
            <footer className="border-t border-white/[0.06] py-12 bg-black/30" role="contentinfo">
                <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <LogoIcon className="w-4.5 h-4.5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-white">Zentis<span className="text-blue-400">AI</span></span>
                    </div>
                    <p className="text-gray-600 text-xs">
                        &copy; {new Date().getFullYear()} Veera Babu Manyam. Built with Zentis AI.
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="https://linkedin.com/in/vmanyam" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white transition-colors text-xs">LinkedIn</a>
                        <a href="mailto:veerababumanyam@gmail.com" className="text-gray-600 hover:text-white transition-colors text-xs">Email</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

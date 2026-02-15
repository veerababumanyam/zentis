import React from 'react';
import { useInView } from './LandingUtils';
import { UsersIcon } from '../icons/UsersIcon';
import { ChatBubbleLeftRightIcon } from '../icons/ChatBubbleLeftRightIcon';
import { RadioIcon } from '../icons/RadioIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { HeartPulseIcon } from '../icons/HeartPulseIcon';
import { ClipboardCheckIcon } from '../icons/ClipboardCheckIcon';
import { ActivityIcon } from '../icons/ActivityIcon';
import { EyeIcon, BrainIcon } from '../icons/SpecialtyIcons';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';

/* ─── Feature Card ──────────────────────────────────────────── */

const FeatureCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
    delay?: number;
}> = ({ icon, title, description, gradient, delay = 0 }) => {
    const { ref, isVisible } = useInView();

    return (
        <div
            ref={ref}
            className={`group relative rounded-3xl landing-glass-card border border-white/[0.08] p-7 transition-all duration-700 hover:-translate-y-2 hover:border-white/[0.18] hover:shadow-[0_8px_40px_rgba(139,92,246,0.12)] overflow-hidden ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {/* Hover gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />

            {/* Top glow line */}
            <div className={`absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />

            {/* Shimmer */}
            <div className="absolute inset-0 landing-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

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

/* ─── Features Grid Section ─────────────────────────────────── */

export const FeaturesGrid: React.FC = () => {
    const { ref: headerRef, isVisible: headerVisible } = useInView();

    return (
        <section id="features" className="px-5 md:px-8 py-24 md:py-32 relative" aria-labelledby="features-heading">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <div
                    ref={headerRef}
                    className={`text-center mb-20 transition-all duration-1000 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-purple-400/20 bg-purple-500/[0.08] text-purple-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                        Core Capabilities
                    </div>
                    <h2 id="features-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                        Intelligent Clinical{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Workflows</span>
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
                        <div key={item.title} className="flex items-center gap-3 p-4 rounded-2xl landing-glass-card border border-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_4px_20px_rgba(139,92,246,0.08)] transition-all duration-300 group">
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
    );
};

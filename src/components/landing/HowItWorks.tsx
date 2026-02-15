import React from 'react';
import { useInView } from './LandingUtils';

/* ─── Workflow Step ──────────────────────────────────────────── */

const WorkflowStep: React.FC<{
    step: string;
    title: string;
    description: string;
    gradient: string;
    delay: number;
}> = ({ step, title, description, gradient, delay }) => {
    const { ref, isVisible } = useInView();

    return (
        <div
            ref={ref}
            className={`relative p-8 rounded-3xl landing-glass-card border border-white/[0.06] hover:border-white/[0.15] transition-all duration-700 group hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(139,92,246,0.1)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {/* Giant watermark number */}
            <div className={`text-7xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent opacity-[0.12] absolute top-4 right-6 group-hover:opacity-[0.2] transition-opacity duration-500`} aria-hidden="true">
                {step}
            </div>

            {/* Shimmer on hover */}
            <div className="absolute inset-0 rounded-3xl landing-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} text-white text-lg font-bold mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {step}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    );
};

/* ─── How It Works Section ──────────────────────────────────── */

export const HowItWorks: React.FC = () => {
    const { ref: headerRef, isVisible: headerVisible } = useInView();

    return (
        <section className="px-5 md:px-8 py-24 md:py-32 bg-gradient-to-b from-transparent via-blue-950/[0.04] to-transparent relative" aria-labelledby="workflow-heading">
            <div className="max-w-5xl mx-auto text-center">
                <div
                    ref={headerRef}
                    className={`transition-all duration-1000 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-indigo-400/20 bg-indigo-500/[0.08] text-indigo-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                        How It Works
                    </div>
                    <h2 id="workflow-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                        From Data to{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Decision</span>{' '}
                        in Seconds
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg font-light leading-relaxed mb-16">
                        A seamless three-step process that transforms raw clinical data into actionable intelligence.
                    </p>
                </div>

                {/* Connecting glow line (hidden on mobile) */}
                <div className="relative">
                    <div className="hidden md:block absolute top-1/2 left-[16%] right-[16%] -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent z-0" aria-hidden="true">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent blur-sm" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
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
            </div>
        </section>
    );
};

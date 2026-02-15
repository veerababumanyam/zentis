import React from 'react';
import { AnimatedCounter, useInView } from './LandingUtils';

/* ─── Stat Card ─────────────────────────────────────────────── */

const StatCard: React.FC<{ value: React.ReactNode; label: string; delay?: number }> = ({ value, label, delay = 0 }) => {
    const { ref, isVisible } = useInView();

    return (
        <div
            ref={ref}
            className={`text-center p-6 rounded-2xl landing-glass-card border border-white/[0.06] hover:border-white/[0.12] transition-all duration-700 landing-pulse-glow ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                {value}
            </div>
            <div className="text-gray-400 text-sm font-medium">{label}</div>
        </div>
    );
};

/* ─── Stats Bar Section ─────────────────────────────────────── */

export const StatsBar: React.FC = () => (
    <section className="py-16 border-y border-white/[0.04] bg-white/[0.01]" aria-label="Platform statistics">
        <div className="max-w-6xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard value={<AnimatedCounter end={12} suffix="+" />} label="Medical Specialties" delay={0} />
            <StatCard value={<AnimatedCounter end={50} suffix="+" />} label="AI Clinical Agents" delay={100} />
            <StatCard value={<AnimatedCounter end={99} suffix="%" />} label="Uptime Guaranteed" delay={200} />
            <StatCard value={<AnimatedCounter end={10} suffix="K+" />} label="Cases Analyzed" delay={300} />
        </div>
    </section>
);

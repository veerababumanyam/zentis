import React from 'react';
import { useInView } from './LandingUtils';

/* ─── Security & Compliance Section ─────────────────────────── */

const badges = [
    { label: 'HIPAA Compliant', icon: '🏥', description: 'Full compliance with healthcare data regulations' },
    { label: 'SOC 2 Type II', icon: '🛡️', description: 'Audited security controls and processes' },
    { label: 'AES-256 Encryption', icon: '🔐', description: 'Military-grade data encryption at rest and in transit' },
    { label: 'WCAG 2.2 AA', icon: '♿', description: 'Accessible design for all users' },
] as const;

export const SecurityBadges: React.FC = () => {
    const { ref: headerRef, isVisible: headerVisible } = useInView();

    return (
        <section className="px-5 md:px-8 py-20 border-y border-white/[0.04] bg-white/[0.01]" aria-labelledby="security-heading">
            <div className="max-w-5xl mx-auto text-center">
                <h2
                    ref={headerRef}
                    id="security-heading"
                    className={`text-2xl md:text-3xl font-bold text-white mb-10 tracking-tight transition-all duration-1000 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                >
                    Enterprise-Grade{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">Security & Compliance</span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {badges.map(item => {
                        const { ref, isVisible } = useInView();
                        return (
                            <div
                                key={item.label}
                                ref={ref}
                                className={`p-5 rounded-2xl landing-glass-card border border-white/[0.06] hover:border-white/[0.15] transition-all duration-500 group hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(139,92,246,0.08)] ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                            >
                                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">{item.icon}</div>
                                <p className="text-white text-sm font-semibold">{item.label}</p>
                                <p className="text-gray-500 text-[11px] mt-1 leading-relaxed hidden md:block">{item.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

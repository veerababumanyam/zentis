import React from 'react';
import { useInView, type LandingPageProps } from './LandingUtils';

/* ─── Final Call-to-Action Section ──────────────────────────── */

export const FinalCTA: React.FC<LandingPageProps> = ({ onEnter }) => {
    const { ref, isVisible } = useInView();

    return (
        <section
            ref={ref}
            className="relative px-5 md:px-8 py-24 md:py-32 overflow-hidden"
            aria-labelledby="cta-final-heading"
        >
            {/* Radial glow accent */}
            <div
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
                style={{
                    background:
                        'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(37,99,235,0.12) 0%, transparent 70%)',
                }}
            />

            <div
                className={`max-w-2xl mx-auto text-center relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
                <h2
                    id="cta-final-heading"
                    className="text-3xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-5"
                >
                    Ready to Transform{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400">
                        Your Clinical Practice?
                    </span>
                </h2>

                <p className="text-gray-400 text-base md:text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                    Join thousands of clinicians leveraging AI-powered insights to improve patient outcomes.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {/* Primary CTA */}
                    <button
                        onClick={onEnter}
                        className="relative w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white text-sm
                                   bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-[length:200%_100%]
                                   hover:bg-right transition-all duration-500 shadow-[0_4px_24px_rgba(37,99,235,0.35)]
                                   hover:shadow-[0_4px_32px_rgba(37,99,235,0.5)] hover:-translate-y-0.5
                                   overflow-hidden group"
                    >
                        <span className="relative z-10">Sign Up with Google</span>
                        {/* Shine sweep */}
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </button>

                    {/* Secondary CTA */}
                    <button
                        onClick={onEnter}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm
                                   landing-glass-card border border-white/[0.1] text-gray-300
                                   hover:text-white hover:border-white/25 transition-all duration-300 hover:-translate-y-0.5"
                    >
                        Sign In
                    </button>
                </div>

                <p className="text-gray-600 text-xs mt-6">
                    No credit card required &nbsp;·&nbsp; Free tier available &nbsp;·&nbsp; Cancel anytime
                </p>
            </div>
        </section>
    );
};

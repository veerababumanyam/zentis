import React from 'react';
import { useInView } from './LandingUtils';

/* ─── Testimonial Card ──────────────────────────────────────── */

const TestimonialCard: React.FC<{
    quote: string;
    name: string;
    role: string;
    delay?: number;
}> = ({ quote, name, role, delay = 0 }) => {
    const { ref, isVisible } = useInView();

    return (
        <div
            ref={ref}
            className={`p-8 rounded-3xl landing-glass-card border border-white/[0.06] hover:border-white/[0.15] transition-all duration-700 group hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(139,92,246,0.08)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className="text-blue-400 mb-4" aria-hidden="true">
                <svg className="w-8 h-8 opacity-60" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983z" /></svg>
            </div>
            <p className="text-gray-300 text-[15px] leading-relaxed mb-6 italic">{quote}</p>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shadow-lg" aria-hidden="true">
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

/* ─── Testimonials Section ──────────────────────────────────── */

export const TestimonialsSection: React.FC = () => {
    const { ref: headerRef, isVisible: headerVisible } = useInView();

    return (
        <section id="testimonials" className="px-5 md:px-8 py-24 md:py-32 relative" aria-labelledby="testimonials-heading">
            <div className="max-w-7xl mx-auto">
                <div
                    ref={headerRef}
                    className={`text-center mb-16 transition-all duration-1000 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-amber-400/20 bg-amber-500/[0.08] text-amber-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                        Trusted by Professionals
                    </div>
                    <h2 id="testimonials-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                        What Clinicians Are{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Saying</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <TestimonialCard
                        quote="Zentis's Bio-AI Board transformed our tumor board reviews. The multi-specialist simulation identified a treatment pathway we hadn't considered."
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
    );
};

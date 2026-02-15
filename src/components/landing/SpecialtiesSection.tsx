import React from 'react';
import { useInView } from './LandingUtils';
import { StentIcon } from '../icons/StentIcon';
import { PacemakerIcon } from '../icons/PacemakerIcon';
import { HeartPumpIcon } from '../icons/HeartPumpIcon';
import { EyeIcon, BrainIcon, KidneyIcon, DnaIcon, LungsIcon, DropIcon, BugIcon, StomachIcon, JointIcon, ElderIcon } from '../icons/SpecialtyIcons';

/* ─── Specialty Pill ────────────────────────────────────────── */

const SpecialtyPill: React.FC<{
    icon: React.ReactNode;
    title: string;
    desc: string;
    color: string;
    delay?: number;
}> = ({ icon, title, desc, color, delay = 0 }) => {
    const { ref, isVisible } = useInView();

    return (
        <div
            ref={ref}
            className={`flex items-center gap-4 p-4 rounded-2xl landing-glass-card border border-white/[0.06] hover:border-white/[0.15] transition-all duration-500 group hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(139,92,246,0.08)] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
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

/* ─── Specialties Section ───────────────────────────────────── */

export const SpecialtiesSection: React.FC = () => {
    const { ref: headerRef, isVisible: headerVisible } = useInView();

    return (
        <section id="specialties" className="px-5 md:px-8 py-24 md:py-32 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent relative" aria-labelledby="specialties-heading">
            <div className="max-w-7xl mx-auto">
                <div
                    ref={headerRef}
                    className={`text-center mb-16 transition-all duration-1000 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] text-cyan-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                        Medical Ecosystem
                    </div>
                    <h2 id="specialties-heading" className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                        12+{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Clinical Specialties</span>
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
    );
};

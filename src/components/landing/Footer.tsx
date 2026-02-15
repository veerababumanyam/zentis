import React from 'react';

/* ─── Footer Section ────────────────────────────────────────── */

interface FooterProps {
    scrollToSection: (id: string) => void;
}

const productLinks = ['Features', 'Specialties', 'Biomarkers', 'How It Works'] as const;
const specialtyLinks = ['Cardiology', 'Oncology', 'Neurology', 'Pulmonology'] as const;
const companyLinks = ['About', 'Security', 'Privacy Policy', 'Terms'] as const;

export const Footer: React.FC<FooterProps> = ({ scrollToSection }) => (
    <footer className="px-5 md:px-8 pt-16 pb-8 border-t border-white/[0.04]" role="contentinfo">
        <div className="max-w-6xl mx-auto">
            {/* Columns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
                {/* Brand */}
                <div className="col-span-2 md:col-span-1">
                    <div className="flex items-center gap-2.5 mb-4">
                        <img src="/logo.png" alt="" className="h-7 w-7 rounded-lg" aria-hidden="true" />
                        <span className="text-white font-bold text-lg tracking-tight">
                            Zentis<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">AI</span>
                        </span>
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed max-w-[220px]">
                        AI-powered clinical intelligence platform for modern healthcare teams.
                    </p>
                </div>

                {/* Product */}
                <div>
                    <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Product</h4>
                    <ul className="space-y-2.5">
                        {productLinks.map(label => (
                            <li key={label}>
                                <button
                                    onClick={() => scrollToSection(label.toLowerCase().replace(/\s+/g, '-'))}
                                    className="text-gray-500 hover:text-white text-xs transition-colors duration-200"
                                >
                                    {label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Specialties */}
                <div>
                    <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Specialties</h4>
                    <ul className="space-y-2.5">
                        {specialtyLinks.map(label => (
                            <li key={label}>
                                <span className="text-gray-500 text-xs">{label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Company */}
                <div>
                    <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Company</h4>
                    <ul className="space-y-2.5">
                        {companyLinks.map(label => (
                            <li key={label}>
                                <span className="text-gray-500 hover:text-white text-xs cursor-pointer transition-colors duration-200">
                                    {label}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="pt-6 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-3">
                <p className="text-gray-600 text-[11px]">
                    &copy; {new Date().getFullYear()} ZentisAI &mdash; All rights reserved.
                </p>
                <p className="text-gray-700 text-[10px]">
                    Built with care for clinicians worldwide 🩺
                </p>
            </div>
        </div>
    </footer>
);

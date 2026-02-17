import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BRAND_NAME } from '../../constants/branding';

interface NavBarProps {
    onSignIn: () => void;
    scrollToSection: (id: string) => void;
}

const NAV_ITEMS = ['Features', 'Specialties', 'Biomarkers'] as const;

export const NavBar: React.FC<NavBarProps> = ({ onSignIn, scrollToSection }) => {
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

    const handleNav = useCallback((id: string) => {
        scrollToSection(id);
        setIsMobileMenuOpen(false);
    }, [scrollToSection]);

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                ? 'landing-glass-nav py-3 shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
                : 'py-5 bg-transparent'
                }`}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="flex items-center justify-between px-5 md:px-8 max-w-7xl mx-auto w-full">
                {/* Logo */}
                <a href="#" className="flex items-center space-x-3 group" aria-label={`${BRAND_NAME} Home`}>
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/50 group-hover:scale-105 transition-all duration-300">
                        <div className="w-full h-full rounded-[14px] bg-[#030712]/80 flex items-center justify-center overflow-hidden">
                            <img src="/logo.png" alt={`${BRAND_NAME} logo`} className="w-8 h-8 object-contain" />
                        </div>
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight group-hover:text-blue-200 transition-colors duration-300">
                        Zentis<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">AI</span>
                    </span>
                </a>

                {/* Desktop Nav Links */}
                <div className="hidden md:flex items-center gap-1" role="menubar">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item}
                            onClick={() => handleNav(item.toLowerCase())}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all duration-300 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            role="menuitem"
                        >
                            {item}
                        </button>
                    ))}
                    <a
                        href="#architect"
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all duration-300 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        role="menuitem"
                    >
                        Architect
                    </a>
                    <a
                        href="https://github.com/veerababumanyam/zentis"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        aria-label="View on GitHub"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.943 0-1.091.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.597 1.028 2.688 0 3.848-2.339 4.687-4.566 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                        </svg>
                    </a>
                </div>

                {/* Auth Buttons */}
                <div className="hidden md:flex items-center gap-3">
                    <button
                        onClick={onSignIn}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={onSignIn}
                        className="group relative px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                    >
                        <span className="relative z-10">Get Started Free</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    onClick={() => setIsMobileMenuOpen(prev => !prev)}
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
                className={`md:hidden overflow-hidden transition-all duration-500 ${isMobileMenuOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}
                role="menu"
                aria-hidden={!isMobileMenuOpen}
            >
                <div className="px-5 py-4 space-y-1 landing-glass-card mx-4 mt-3 rounded-2xl border border-white/[0.08]">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item}
                            onClick={() => handleNav(item.toLowerCase())}
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
                        onClick={onSignIn}
                        className="block w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        role="menuitem"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={onSignIn}
                        className="block w-full text-center px-4 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        role="menuitem"
                    >
                        Sign Up Free
                    </button>
                </div>
            </div>
        </nav>
    );
};

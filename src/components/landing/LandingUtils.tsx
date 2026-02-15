import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────── */

export interface LandingPageProps {
    onEnter: () => void;
}

/* ─── Intersection Observer Hook ────────────────────────────── */

export const useInView = (options?: IntersectionObserverInit) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(node);
            }
        }, { threshold: 0.15, ...options });

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return { ref, isVisible };
};

/* ─── Animated Counter ──────────────────────────────────────── */

export const AnimatedCounter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({ end, suffix = '', duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const { ref, isVisible } = useInView();

    useEffect(() => {
        if (!isVisible) return;
        let startTime: number;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease-out cubic for satisfying deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [isVisible, end, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
};

/* ─── Section Wrapper with fade-in ──────────────────────────── */

export const SectionReveal: React.FC<{
    children: React.ReactNode;
    className?: string;
    id?: string;
    ariaLabelledBy?: string;
    ariaLabel?: string;
}> = ({ children, className = '', id, ariaLabelledBy, ariaLabel }) => {
    const { ref, isVisible } = useInView({ threshold: 0.05 });

    return (
        <section
            ref={ref}
            id={id}
            className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
            aria-labelledby={ariaLabelledBy}
            aria-label={ariaLabel}
        >
            {children}
        </section>
    );
};

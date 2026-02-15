import React from 'react';

export const CtaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        <path d="M12 2a10 10 0 1 0 10 10" />
        <path d="M12 12a4 4 0 1 0 4-4" />
        <path d="M12 12a1 1 0 1 0 1-1" />
    </svg>
);

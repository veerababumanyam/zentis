
import React from 'react';

export const StentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        <path d="M22 12h-4.27"/>
        <path d="M12 2v4.27"/>
        <path d="M12 17.73V22"/>
        <path d="M2 12h4.27"/>
        <path d="m15.54 8.46-2.83 2.83-2.83-2.83"/>
        <path d="m8.46 15.54 2.83-2.83 2.83 2.83"/>
        <path d="M17.73 12a5.73 5.73 0 0 1-5.73 5.73A5.73 5.73 0 0 1 6.27 12a5.73 5.73 0 0 1 5.73-5.73A5.73 5.73 0 0 1 17.73 12z"/>
    </svg>
);

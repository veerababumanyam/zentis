
import React from 'react';

export const PacemakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        <path d="M16 3.1a1 1 0 0 1 1.4 1.4L3.8 18.1a1 1 0 0 1-1.4-1.4Z"/>
        <path d="M14 9a3 3 0 1 1-4-4"/>
        <path d="M20.2 13a1 1 0 0 1 1.4 1.4L8.1 20.9a1 1 0 0 1-1.4-1.4Z"/>
        <path d="M10 15a3 3 0 1 1-4-4"/>
    </svg>
);

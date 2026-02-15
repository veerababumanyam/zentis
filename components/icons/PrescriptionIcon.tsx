import React from 'react';

export const PrescriptionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/>
        <polyline points="13 2 13 9 20 9"/>
        <path d="m10.4 12.6-2.8 5.2"/>
        <path d="m13.2 17.8 2.8-5.2"/>
        <path d="M10.4 17.8h5.2"/>
    </svg>
);

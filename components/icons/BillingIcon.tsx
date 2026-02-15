import React from 'react';

export const BillingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        <path d="M16 3h5v5"></path>
        <path d="M4 20 21 3"></path>
        <path d="M21 16v5h-5"></path>
        <path d="M15 14c-1.2.8-2.5 1.1-4 1.1-2.8 0-5-1.3-5-3 0-1.2.9-2.2 2.1-2.7l5.1-2.1c.9-.4 1.8-.8 1.8-1.3 0-.4-.5-.8-1.4-.8-1.3 0-2.8.6-3.4 1"></path>
        <path d="M7 21v-3a1 1 0 0 0-1-1H4"></path>
    </svg>
);

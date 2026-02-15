import React from 'react';

export const PdfIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <path d="M9.26 12.03h.29c.2 0 .39.06.52.17.14.11.21.26.21.45 0 .18-.07.33-.21.44-.13.12-.32.17-.52.17h-.29v.88H8.34v-2.9h.92v.88z"></path>
    <path d="M12.08 15h-.9v-2.9h.9v2.9z"></path>
    <path d="M14.63 14.12h.32c.24 0 .44.05.58.14.14.09.22.23.22.41 0 .2-.08.36-.23.46-.15.11-.37.16-.64.16h-.25v.71h-.92v-2.9h.92v.9z"></path>
  </svg>
);

import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import type { SourceVerification } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface VerifySourceButtonProps {
    verification?: SourceVerification;
}

export const VerifySourceButton: React.FC<VerifySourceButtonProps> = ({ verification }) => {
    const { actions, state } = useAppContext();
    const { selectedPatient } = state;

    if (!verification || !selectedPatient) return null;

    const handleVerify = (e: React.MouseEvent) => {
        e.stopPropagation();
        actions.setViewingReport({ 
            patient: selectedPatient, 
            initialReportId: verification.reportId,
            highlightText: verification.quote 
        });
    };

    return (
        <button 
            onClick={handleVerify}
            className="group ml-2 inline-flex items-center justify-center p-1 rounded-full text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/30 dark:hover:bg-green-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            title={`Verify: "${verification.quote}"`}
            aria-label="Verify source in report"
        >
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-[10px] font-semibold ml-0 group-hover:ml-1 whitespace-nowrap">
                Verify
            </span>
        </button>
    );
};

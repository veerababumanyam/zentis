
import React from 'react';
import type { GdmtChecklistMessage, GdmtChecklistItem, GdmtStatus } from '../types';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from './icons/ChecklistIcons';
import { DocumentIcon } from './icons/DocumentIcon';
import { VerifySourceButton } from './VerifySourceButton';

const statusConfig: Record<GdmtStatus, { Icon: React.FC<any>, color: string, label: string }> = {
    prescribed: { Icon: CheckCircleIcon, color: 'text-green-600', label: 'Prescribed' },
    missing: { Icon: XCircleIcon, color: 'text-orange-600', label: 'Missing' },
    contraindicated: { Icon: ExclamationTriangleIcon, color: 'text-red-600', label: 'Contraindicated' },
};

const renderDetails = (text: string) => {
    const parts = text.split('**');
    return (
        <React.Fragment>
            {parts.map((part, index) =>
                index % 2 === 1 ? <strong key={index} className="font-bold text-gray-800 dark:text-gray-200">{part}</strong> : part
            )}
        </React.Fragment>
    );
}

const SuggestedActionButton: React.FC<{ action: GdmtChecklistMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
    if (!action || action.type !== 'view_report') return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
            <button
                onClick={() => onViewReport(action.reportId!)}
                title="View relevant medication report"
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
                <DocumentIcon className="w-4 h-4" />
                <span>{action.label}</span>
            </button>
        </div>
    );
};

export const GdmtChecklist: React.FC<{ message: GdmtChecklistMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    // Calculate adherence score
    const totalPillars = message.items.length;
    const prescribedPillars = message.items.filter(i => i.status === 'prescribed').length;
    const contraindicatedPillars = message.items.filter(i => i.status === 'contraindicated').length;
    
    // Adjusted score: Prescribed count vs (Total - Contraindicated)
    // If a drug is contraindicated, it is removed from the target count.
    const effectiveTarget = totalPillars - contraindicatedPillars;
    
    // Calculate percentage. 
    // Edge Case: If all pillars are contraindicated (effectiveTarget <= 0), 
    // and adherence is technically 100% relative to what is clinically possible.
    let percentage = 0;
    if (effectiveTarget <= 0) {
        percentage = 100;
    } else {
        percentage = Math.min(100, Math.round((prescribedPillars / effectiveTarget) * 100));
    }
    
    // Determine progress bar color
    let progressColor = 'bg-red-500';
    if (percentage >= 100) progressColor = 'bg-green-500';
    else if (percentage >= 50) progressColor = 'bg-yellow-500';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
                <div className="text-right">
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 block mb-1">
                        {effectiveTarget <= 0 ? 'Fully Adherent (Contraindications)' : `${prescribedPillars}/${effectiveTarget} Adherence`}
                    </span>
                    {contraindicatedPillars > 0 && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                            ({contraindicatedPillars} Excluded)
                        </span>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden shadow-inner">
                <div 
                    className={`h-2 rounded-full ${progressColor} transition-all duration-500`} 
                    style={{ width: `${percentage}%` }}
                    title={`Adherence Score: ${percentage}% (Excluding Contraindications)`}
                ></div>
            </div>

            <div className="space-y-2">
                {message.items.map((item, index) => {
                    const { Icon, color } = statusConfig[item.status];
                    return (
                        <div key={index} className="inner-glass flex items-start space-x-3 p-3 transition-colors relative group">
                            <Icon className={`${color} w-5 h-5 flex-shrink-0 mt-0.5`} />
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                                        {item.drugClass}
                                    </p>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <VerifySourceButton verification={item.verification} />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{renderDetails(item.details)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-white/20 dark:bg-gray-900/20 p-2 rounded border border-gray-100/10">
                <span className="font-semibold">Note:</span> {message.summary}
            </p>
            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});

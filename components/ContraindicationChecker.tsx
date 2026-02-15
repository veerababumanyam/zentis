
import React from 'react';
import type { ContraindicationMessage, ContraindicationSeverity } from '../types';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { VerifySourceButton } from './VerifySourceButton';

const severityConfig: Record<ContraindicationSeverity, { color: string, label: string }> = {
    Critical: { color: 'red', label: 'Critical' },
    High: { color: 'orange', label: 'High' },
    Moderate: { color: 'yellow', label: 'Moderate' },
};

const getSeverityClasses = (severity: ContraindicationSeverity) => {
    switch (severity) {
        case 'Critical': return {
            icon: 'text-red-600',
            bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
            badge: 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200',
        };
        case 'High': return {
            icon: 'text-orange-600',
            bg: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
            badge: 'bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200',
        };
        case 'Moderate': return {
            icon: 'text-yellow-600',
            bg: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
            badge: 'bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200',
        };
        default: return {
            icon: 'text-gray-600',
            bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
            badge: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
        };
    }
}


const SuggestedActionButton: React.FC<{ action: ContraindicationMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
    if (!action || action.type !== 'view_report') return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
                onClick={() => onViewReport(action.reportId!)}
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
                <DocumentIcon className="w-4 h-4" />
                <span>{action.label}</span>
            </button>
        </div>
    );
};

export const ContraindicationChecker: React.FC<{ message: ContraindicationMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    return (
        <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
            <div className="space-y-3">
                {message.items.map((item, index) => {
                    const classes = getSeverityClasses(item.severity);
                    return (
                        <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg border ${classes.bg} relative group`}>
                            <AlertTriangleIcon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${classes.icon}`} />
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-gray-800 dark:text-gray-200">{item.drug}</p>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <VerifySourceButton verification={item.verification} />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    <span className={`font-semibold px-2 py-0.5 rounded-md text-xs mr-2 ${classes.badge}`}>{item.severity} Risk</span>
                                    vs. {item.conflict}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-200 mt-2 bg-white/50 dark:bg-black/20 p-2 rounded-md border border-gray-200/50 dark:border-gray-700/50">
                                    <span className="font-semibold">Rationale:</span> {item.rationale}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">{message.summary}</p>
            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});

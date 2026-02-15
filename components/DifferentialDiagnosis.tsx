
import React from 'react';
import type { DifferentialDiagnosisMessage, DiagnosisConfidence } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { VerifySourceButton } from './VerifySourceButton';

const getConfidenceBadgeColor = (confidence: DiagnosisConfidence) => {
    switch (confidence) {
        case 'High': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700';
        case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700';
        case 'Low': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
}

const SuggestedActionButton: React.FC<{ action: DifferentialDiagnosisMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
    if (!action || action.type !== 'view_report') return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
            <button
                onClick={() => onViewReport(action.reportId!)}
                title={`Open report: ${action.label}`}
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
                <DocumentIcon className="w-4 h-4" />
                <span>{action.label}</span>
            </button>
        </div>
    );
};

export const DifferentialDiagnosis: React.FC<{ message: DifferentialDiagnosisMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    return (
        <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
            <div className="space-y-3">
                {message.diagnoses.map((item, index) => (
                    <div key={index} className="inner-glass flex items-start space-x-3 p-3 relative group hover:scale-[1.01] transition-transform">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getConfidenceBadgeColor(item.confidence)}`}>
                            {item.confidence}
                        </span>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="font-bold text-gray-800 dark:text-gray-200">{item.diagnosis}</p>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <VerifySourceButton verification={item.verification} />
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                <span className="font-semibold">Rationale:</span> {item.rationale}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 mt-3 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
                <h4 className="font-bold text-gray-800 dark:text-gray-200">AI Summary</h4>
                <p>{message.summary}</p>
            </div>
            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});

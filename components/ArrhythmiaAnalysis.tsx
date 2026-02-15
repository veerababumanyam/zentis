import React from 'react';
import type { ArrhythmiaAnalysisMessage, ArrhythmiaRiskLevel } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { EcgWaveformIcon } from './icons/EcgWaveformIcon';

const getRiskClasses = (risk: ArrhythmiaRiskLevel) => {
    switch (risk) {
        case 'High': return {
            bg: 'bg-red-50',
            text: 'text-red-800',
            badge: 'bg-red-100 text-red-800',
        };
        case 'Moderate': return {
            bg: 'bg-orange-50',
            text: 'text-orange-800',
            badge: 'bg-orange-100 text-orange-800',
        };
        case 'Low': return {
            bg: 'bg-gray-50',
            text: 'text-gray-800',
            badge: 'bg-gray-100 text-gray-800',
        };
        default: return {
            bg: 'bg-gray-50',
            text: 'text-gray-800',
            badge: 'bg-gray-100 text-gray-800',
        };
    }
}

const renderTextWithBold = (text: string) => {
    const parts = text.split('**');
    return (
        <React.Fragment>
            {parts.map((part, index) =>
                index % 2 === 1 ? <strong key={index} className="font-bold text-gray-900">{part}</strong> : part
            )}
        </React.Fragment>
    );
};

const SuggestedActionButton: React.FC<{ action: ArrhythmiaAnalysisMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
    if (!action || action.type !== 'view_report') return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-200">
            <button
                onClick={() => onViewReport(action.reportId)}
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
                <DocumentIcon className="w-4 h-4" />
                <span>{action.label}</span>
            </button>
        </div>
    );
};

export const ArrhythmiaAnalysis: React.FC<{ message: ArrhythmiaAnalysisMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                    <EcgWaveformIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-gray-800">{message.title}</h3>
            </div>
            
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-600">Key ECG Findings</h4>
                {message.findings.map((item, index) => {
                    const classes = getRiskClasses(item.risk);
                    return (
                        <div key={index} className={`p-3 rounded-lg border flex items-center justify-between ${classes.bg} border-gray-200`}>
                           <div>
                                <p className={`font-semibold ${classes.text}`}>{item.name}</p>
                                <p className="text-xs text-gray-500">{item.description}</p>
                           </div>
                           <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">{item.value}</p>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${classes.badge}`}>{item.risk} Risk</span>
                           </div>
                        </div>
                    );
                })}
            </div>

            <div>
                <h4 className="text-sm font-semibold text-gray-600">Recognized Pattern</h4>
                <p className="text-sm text-gray-800 p-2 bg-gray-50 rounded-md">{message.recognizedPattern}</p>
            </div>

            <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                <h4 className="font-bold text-blue-800">AI-Powered Risk Assessment</h4>
                <p className="text-sm text-blue-700 mt-1">{renderTextWithBold(message.riskAssessment)}</p>
            </div>

            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});

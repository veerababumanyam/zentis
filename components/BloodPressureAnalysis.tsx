import React from 'react';
import type { BloodPressureAnalysisMessage } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { AverageIcon, VariabilityIcon, SunriseIcon, MoonIcon } from './icons/BPAnalysisIcons';

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

const SuggestedActionButton: React.FC<{ action: BloodPressureAnalysisMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
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

const MetricCard: React.FC<{ finding: BloodPressureAnalysisMessage['findings'][0], icon: React.ReactNode }> = React.memo(({ finding, icon }) => (
    <div className="p-3 bg-gray-50 rounded-lg flex items-center space-x-3 border">
        <div className="w-8 h-8 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
            {icon}
        </div>
        <div>
            <p className="text-sm font-semibold text-gray-600">{finding.name}</p>
            <p className="text-xl font-bold text-gray-900">{finding.value}</p>
        </div>
    </div>
));

export const BloodPressureAnalysis: React.FC<{ message: BloodPressureAnalysisMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    const icons = [
        <AverageIcon className="w-5 h-5 text-blue-600" />,
        <VariabilityIcon className="w-5 h-5 text-blue-600" />,
        <SunriseIcon className="w-5 h-5 text-blue-600" />,
        <MoonIcon className="w-5 h-5 text-blue-600" />,
    ];
    
    return (
        <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-800">{message.title}</h3>
            
            <div className="grid grid-cols-2 gap-3">
                {message.findings.map((finding, index) => (
                    <MetricCard key={index} finding={finding} icon={icons[index]} />
                ))}
            </div>

            <div className="p-3 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
                <h4 className="font-bold text-orange-800">AI-Powered Risk Assessment</h4>
                <p className="text-sm text-orange-700 mt-1">{renderTextWithBold(message.riskAssessment)}</p>
            </div>

            <div>
                <h4 className="font-bold text-gray-800">Recommendations</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 mt-1">
                    {message.recommendations.map((rec, index) => (
                        <li key={index}>{renderTextWithBold(rec)}</li>
                    ))}
                </ul>
            </div>

            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});

import React from 'react';
import type { RiskStratificationMessage } from '../types';
import { RiskGauge } from './RiskGauge';
import { DocumentIcon } from './icons/DocumentIcon';

const renderSummary = (text: string) => {
    const parts = text.split('**');
    return (
        <React.Fragment>
            {parts.map((part, index) =>
                index % 2 === 1 ? <strong key={index} className="font-bold text-gray-800">{part}</strong> : part
            )}
        </React.Fragment>
    );
}

const SuggestedActionButton: React.FC<{ action: RiskStratificationMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
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

export const RiskStratificationCalculator: React.FC<{ message: RiskStratificationMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-800">{message.title}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {message.scores.map((scoreItem, index) => (
                    <RiskGauge key={index} scoreItem={scoreItem} />
                ))}
            </div>

            <div className="prose prose-sm max-w-none text-gray-700 mt-3 pt-3 border-t border-gray-200">
                 {message.summary.split('\n').map((line, i) => {
                    if (line.startsWith('###')) {
                        return <h4 key={i} className="font-bold text-gray-800">{line.replace('### ', '')}</h4>;
                    }
                    if (line.startsWith('-')) {
                        return <p key={i} className="my-1">{renderSummary(line)}</p>
                    }
                    return <p key={i} className="my-1">{renderSummary(line)}</p>
                })}
            </div>
            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});

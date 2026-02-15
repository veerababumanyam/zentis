

import React from 'react';
import type { InterventionalCardiologyMessage } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { StentIcon } from './icons/StentIcon';

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

const getStenosisClass = (stenosis: string): string => {
    const value = parseInt(stenosis, 10);
    if (isNaN(value)) return 'text-gray-900';
    if (value >= 90) return 'font-bold text-red-600';
    if (value >= 70) return 'font-semibold text-orange-600';
    return 'text-gray-900';
};


const SuggestedActionButton: React.FC<{ action: InterventionalCardiologyMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
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

export const InterventionalCardiologyReport: React.FC<{ message: InterventionalCardiologyMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    const getStrategyColor = (strategy: 'PCI' | 'CABG' | 'Medical Therapy') => {
        switch(strategy) {
            case 'PCI': return 'bg-blue-100 text-blue-800';
            case 'CABG': return 'bg-purple-100 text-purple-800';
            case 'Medical Therapy': return 'bg-green-100 text-green-800';
        }
    }
    
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                    <StentIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-gray-800">{message.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <h4 className="text-sm font-semibold text-gray-600 mb-1">Lesion Analysis</h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                                <tr>
                                    <th className="px-4 py-2">Vessel</th>
                                    <th className="px-4 py-2">Location</th>
                                    <th className="px-4 py-2">Stenosis</th>
                                    <th className="px-4 py-2">FFR/iFR</th>
                                    <th className="px-4 py-2">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {message.lesions.map((lesion, index) => (
                                    <tr key={index} className="border-b last:border-0">
                                        <td className="px-4 py-2 font-semibold">{lesion.vessel}</td>
                                        <td className="px-4 py-2">{lesion.location}</td>
                                        <td className={`px-4 py-2 ${getStenosisClass(lesion.stenosis)}`}>{lesion.stenosis}</td>
                                        <td className="px-4 py-2">{lesion.ffr_ifr}</td>
                                        <td className="px-4 py-2 text-xs">{lesion.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="md:col-span-1 p-4 bg-gray-50 rounded-lg border text-center">
                    <p className="text-sm font-semibold text-gray-500">Estimated SYNTAX Score</p>
                    <p className="text-4xl font-bold text-red-600 my-1">{message.estimatedSyntaxScore}</p>
                    <p className="text-xs text-gray-500">A high score indicates complex disease, often favoring CABG.</p>
                </div>
            </div>

            <div className={`p-3 border-l-4 ${getStrategyColor(message.recommendation.strategy).replace('text-', 'border-').replace(/bg-.*?\s/, '')} rounded-r-lg ${getStrategyColor(message.recommendation.strategy)}`}>
                <h4 className={`font-bold ${getStrategyColor(message.recommendation.strategy).replace('bg-', 'text-')}`}>
                    AI Recommendation: {message.recommendation.strategy}
                </h4>
                <p className={`text-sm mt-1`}>{renderTextWithBold(message.recommendation.rationale)}</p>
                <p className="text-xs italic text-gray-500 mt-2">Guideline: {message.recommendation.guideline}</p>
            </div>

            <div className="prose prose-sm max-w-none text-gray-700 mt-3 pt-3 border-t border-gray-200">
                <h4 className="font-bold">Summary</h4>
                <p>{renderTextWithBold(message.summary)}</p>
            </div>

            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});



import React from 'react';
import type { AdvancedHeartFailureMessage, AdvancedHeartFailureParameters } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { HeartPumpIcon } from './icons/HeartPumpIcon';

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

const getStatusClasses = (status: AdvancedHeartFailureParameters['status']) => {
    switch(status) {
        case 'Critical': return 'bg-red-100 text-red-800';
        case 'Concerning': return 'bg-yellow-100 text-yellow-800';
        case 'Normal': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

const getTrendIcon = (trend: AdvancedHeartFailureParameters['trend']) => {
    switch (trend) {
        case 'Increasing': return <span className="text-red-600">▲</span>;
        case 'Decreasing': return <span className="text-blue-600">▼</span>;
        case 'Stable': return <span className="text-gray-600">▬</span>;
    }
};

const SuggestedActionButton: React.FC<{ action: AdvancedHeartFailureMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
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

export const AdvancedHeartFailureReport: React.FC<{ message: AdvancedHeartFailureMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex-shrink-0 bg-red-100 rounded-full flex items-center justify-center">
                    <HeartPumpIcon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-gray-800">{message.title}</h3>
                    <p className="text-sm text-gray-500 -mt-1">Device: {message.deviceType}</p>
                </div>
            </div>

            <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-1">Key Device Parameters</h4>
                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                            <tr>
                                <th className="px-4 py-2">Parameter</th>
                                <th className="px-4 py-2">Value</th>
                                <th className="px-4 py-2">Trend</th>
                                <th className="px-4 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {message.parameters.map((param, index) => (
                                <tr key={index} className={`border-b last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                    <td className="px-4 py-2 font-semibold">{param.parameter}</td>
                                    <td className="px-4 py-2 font-mono">{param.value}</td>
                                    <td className="px-4 py-2">{getTrendIcon(param.trend)} {param.trend}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(param.status)}`}>
                                            {param.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                <h4 className="font-bold text-red-800">AI Assessment: {message.aiAssessment.concern}</h4>
                <p className="text-sm text-red-700 mt-1"><span className="font-semibold">Rationale:</span> {renderTextWithBold(message.aiAssessment.rationale)}</p>
                 <p className="text-sm text-red-700 mt-2"><span className="font-semibold">Recommendation:</span> {renderTextWithBold(message.aiAssessment.recommendation)}</p>
            </div>

            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});



import React from 'react';
import type { EpDeviceReportMessage } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { PacemakerIcon } from './icons/PacemakerIcon';

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

const SuggestedActionButton: React.FC<{ action: EpDeviceReportMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
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

const getRowStyle = (key: string, value: string): string => {
    const lowerValue = value.toLowerCase();
    const numericValue = parseInt(lowerValue, 10);

    if (isNaN(numericValue) && !lowerValue.includes('replace') && !lowerValue.includes('eri')) {
        return 'text-gray-800 font-semibold';
    }

    switch(key) {
        case 'shocksDelivered':
        case 'vfEpisodes':
            if (numericValue > 0) return 'text-red-600 font-bold';
            break;
        case 'vt_ns_Episodes':
            if (numericValue > 0) return 'text-orange-600 font-semibold';
            break;
        case 'battery':
            if (lowerValue.includes('replace') || lowerValue.includes('eri')) return 'text-red-600 font-bold';
            break;
        default:
            return 'text-gray-800 font-semibold';
    }
    return 'text-gray-800 font-semibold';
};

const InfoCard: React.FC<{ title: string, data: object }> = React.memo(({ title, data }) => (
    <div className="p-3 bg-gray-50 rounded-lg border">
        <h4 className="text-sm font-semibold text-gray-600 mb-2">{title}</h4>
        <div className="space-y-1">
            {Object.entries(data).map(([key, value]) => (
                 <div key={key} className="flex justify-between text-xs">
                    <span className="text-gray-500">{key.replace(/([A-Z])/g, ' $1').replace(/at af/i, 'AT/AF').replace(/vt ns/i, 'VT/NSVT').trim()}</span>
                    <span className={getRowStyle(key, String(value))}>{String(value)}</span>
                </div>
            ))}
        </div>
    </div>
));

export const EpDeviceReport: React.FC<{ message: EpDeviceReportMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                    <PacemakerIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-gray-800">{message.title}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <InfoCard title="Therapies Delivered" data={message.deviceSummary} />
                <InfoCard title="Arrhythmia Summary" data={message.arrhythmiaSummary} />
                <InfoCard title="Device Status" data={message.deviceStatus} />
            </div>

            <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                <h4 className="font-bold text-blue-800">AI Assessment</h4>
                <p className="text-sm text-blue-700 mt-1">{renderTextWithBold(message.aiAssessment)}</p>
            </div>

            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});

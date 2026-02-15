import React from 'react';
import type { CardiacBiomarkerMessage } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { HeartRateMonitorIcon } from './icons/HeartRateMonitorIcon';

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

const SuggestedActionButton: React.FC<{ action: CardiacBiomarkerMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
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

const Sparkline: React.FC<{ data: { value: number }[] }> = React.memo(({ data }) => {
    const width = 80;
    const height = 20;
    if (data.length < 2) return <div style={{width, height}} className="flex items-center justify-center text-gray-400 text-xs">No Trend</div>;

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min === 0 ? 1 : max - min;

    const points = values.map((val, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-20 h-5">
            <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.5"
                points={points}
            />
        </svg>
    );
});

export const CardiacBiomarkerInterpretation: React.FC<{ message: CardiacBiomarkerMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    const getStatusClasses = (status: 'Normal' | 'Elevated') => {
        return status === 'Elevated' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
    };

    const getTrendIcon = (trend: 'Rising' | 'Falling' | 'Stable') => {
        switch (trend) {
            case 'Rising': return <span className="text-red-600">▲</span>;
            case 'Falling': return <span className="text-green-600">▼</span>;
            case 'Stable': return <span className="text-gray-600">▬</span>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                    <HeartRateMonitorIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-base font-bold text-gray-800">{message.title}</h3>
            </div>
            
            <div className="space-y-3">
                {message.items.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-3 gap-2 items-center">
                            <div className="col-span-1">
                                <p className="font-bold text-gray-800">{item.name}</p>
                                <p className="text-2xl font-bold text-gray-900">{item.value}
                                    <span className="text-sm font-normal text-gray-500 ml-1">{item.unit}</span>
                                </p>
                            </div>
                            <div className="col-span-1 flex flex-col items-center justify-center">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(item.status)}`}>
                                    {item.status}
                                </span>
                                <div className="flex items-center space-x-1 mt-1">
                                    {getTrendIcon(item.trend)}
                                    <span className="text-xs font-medium text-gray-600">{item.trend}</span>
                                </div>
                            </div>
                            <div className="col-span-1 flex justify-end">
                                <Sparkline data={item.trendData} />
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200/50">
                             <p className="text-sm text-gray-600">{item.interpretation}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="prose prose-sm max-w-none text-gray-700 mt-3 pt-3 border-t border-gray-200">
                <h4 className="font-bold">Synthesized Summary</h4>
                <p>{renderTextWithBold(message.summary)}</p>
            </div>

            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});

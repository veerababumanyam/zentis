
import React from 'react';
import type { DosageOptimizationMessage, DosageSuggestionStatus } from '../types';
import { ArrowUpCircleIcon, ArrowDownCircleIcon, CheckCircleIcon, ExclamationCircleIcon } from './icons/DosageIcons';
import { DocumentIcon } from './icons/DocumentIcon';
import { PrescriptionIcon } from './icons/PrescriptionIcon';
import { BeakerIcon } from './icons/BeakerIcon';

const statusConfig: Record<DosageSuggestionStatus, { Icon: React.FC<any>, color: string, label: string }> = {
    'Continue': { Icon: CheckCircleIcon, color: 'text-green-600', label: 'Continue' },
    'Titrate Up': { Icon: ArrowUpCircleIcon, color: 'text-blue-600', label: 'Titrate Up' },
    'Titrate Down': { Icon: ArrowDownCircleIcon, color: 'text-orange-600', label: 'Titrate Down' },
    'Change Advised': { Icon: ExclamationCircleIcon, color: 'text-red-600', label: 'Change Advised' },
    'Labs Required': { Icon: BeakerIcon, color: 'text-purple-600', label: 'Labs Required' },
};

const SuggestedActionButton: React.FC<{ action: DosageOptimizationMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
    if (!action || action.type !== 'view_report' || !action.reportId) return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-200">
            <button
                onClick={() => onViewReport(action.reportId!)}
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
                <DocumentIcon className="w-4 h-4" />
                <span>{action.label}</span>
            </button>
        </div>
    );
};

const MonitoringPlan: React.FC<{ plan: string }> = React.memo(({ plan }) => {
    const sections = plan.split(/(High-Risk:|Moderate-Risk:|Low-Risk:)/).filter(Boolean);
    
    return (
        <div className="text-sm text-gray-700 mt-2 bg-white/50 p-2 rounded-md border border-gray-200/50 space-y-1">
             <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">Monitoring Plan</h4>
             {sections.map((section, index) => {
                 if (section.match(/High-Risk:|Moderate-Risk:|Low-Risk:/)) {
                     return <strong key={index} className="text-gray-800 block pt-1">{section.replace(':', '')}</strong>
                 }
                 return <p key={index} className="text-xs pl-2">{section.trim()}</p>
             })}
        </div>
    );
});

export const DosageOptimization: React.FC<{ message: DosageOptimizationMessage, onViewReport?: (reportId: string) => void; onGeneratePrescription?: (meds: Array<{ drug: string; suggestedDose: string; }>) => void; }> = React.memo(({ message, onViewReport, onGeneratePrescription }) => {
    return (
        <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-800">{message.title}</h3>
            <div className="space-y-3">
                {message.items.map((item, index) => {
                    const { Icon, color, label } = statusConfig[item.status];
                    return (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <Icon className={`${color} w-6 h-6 flex-shrink-0 mt-0.5`} />
                            <div className="flex-1">
                                <p className="font-bold text-gray-800">{item.drug}</p>
                                <div className="text-sm text-gray-600 mt-1 grid grid-cols-3 gap-x-2">
                                    <div className="font-semibold">Status: <span className={color}>{label}</span></div>
                                    <div>Current: {item.currentDose}</div>
                                    <div>Suggested: {item.suggestedDose}</div>
                                </div>
                                <p className="text-sm text-gray-700 mt-2 bg-white/50 p-2 rounded-md border border-gray-200/50">
                                    <span className="font-semibold">Rationale:</span> {item.rationale}
                                </p>
                                {item.monitoringPlan && <MonitoringPlan plan={item.monitoringPlan} />}
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-xs text-gray-500 italic mt-2">{message.summary}</p>
            
            {(message.suggestedAction || onGeneratePrescription) && (
                <div className="mt-4 pt-3 border-t border-gray-200 flex items-center space-x-2">
                    {message.suggestedAction?.type === 'view_report' && onViewReport && (
                        <button
                            onClick={() => onViewReport(message.suggestedAction!.reportId!)}
                            className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            <DocumentIcon className="w-4 h-4" />
                            <span>{message.suggestedAction.label}</span>
                        </button>
                    )}
                    {message.suggestedAction?.type === 'generate_prescription' && onGeneratePrescription && (
                         <button
                            onClick={() => onGeneratePrescription(message.items.map(item => ({ drug: item.drug, suggestedDose: item.suggestedDose })))}
                            className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                        >
                            <PrescriptionIcon className="w-4 h-4" />
                            <span>{message.suggestedAction.label}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});

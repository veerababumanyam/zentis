

import React from 'react';
import type { CtaAnalysisMessage, CtaLesion } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { CtaIcon } from './icons/CtaIcon';

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

const getSeverityClass = (severity: CtaLesion['stenosisSeverity']): string => {
    switch(severity) {
        case 'Severe': return 'font-bold text-red-600';
        case 'Moderate': return 'font-semibold text-orange-600';
        case 'Mild': return 'text-blue-600';
        default: return 'text-gray-900';
    }
}

const PlaqueTypeBadge: React.FC<{ type: CtaLesion['plaqueType']}> = React.memo(({ type }) => {
    const styles = {
        'Calcified': 'bg-gray-200 text-gray-800',
        'Mixed': 'bg-purple-100 text-purple-800',
        'Non-calcified': 'bg-yellow-100 text-yellow-800',
        'None': 'bg-green-100 text-green-800'
    }
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[type] || styles['None']}`}>{type}</span>
});

const SuggestedActionButton: React.FC<{ action: CtaAnalysisMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
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

export const CtaAnalysisReport: React.FC<{ message: CtaAnalysisMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                    <CtaIcon className="w-6 h-6 text-blue-600" />
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
                                    <th className="px-4 py-2">Segment</th>
                                    <th className="px-4 py-2">Plaque</th>
                                    <th className="px-4 py-2">Stenosis</th>
                                    <th className="px-4 py-2">CAD-RADS</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {message.lesionAnalysis.map((lesion, index) => (
                                    <tr key={index} className="border-b last:border-0">
                                        <td className="px-4 py-2 font-semibold">{lesion.vessel}</td>
                                        <td className="px-4 py-2">{lesion.segment}</td>
                                        <td className="px-4 py-2"><PlaqueTypeBadge type={lesion.plaqueType} /></td>
                                        <td className={`px-4 py-2 ${getSeverityClass(lesion.stenosisSeverity)}`}>{lesion.stenosisSeverity}</td>
                                        <td className="px-4 py-2 font-mono">{lesion.cadRads}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="md:col-span-1 p-4 bg-gray-50 rounded-lg border text-center">
                    <p className="text-sm font-semibold text-gray-500">Calcium Score</p>
                    <p className="text-4xl font-bold text-blue-600 my-1">{message.calciumScore.score.split(' ')[0]}</p>
                    <p className="text-xs text-gray-500">{message.calciumScore.interpretation}</p>
                </div>
            </div>

            {message.graftAnalysis && message.graftAnalysis.length > 0 && (
                 <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-1">Bypass Graft Analysis</h4>
                    <div className="space-y-2">
                        {message.graftAnalysis.map((graft, i) => (
                            <div key={i} className="p-2 bg-gray-50 rounded-md border text-sm">
                                <span className="font-bold">{graft.graftName}:</span> {graft.details} (<span className={graft.status === 'Patent' ? 'text-green-600' : 'text-red-600'}>{graft.status}</span>)
                            </div>
                        ))}
                    </div>
                 </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <h4 className="font-semibold text-gray-700">Other Cardiac Findings</h4>
                    <p className="p-2 bg-gray-50 rounded-md border mt-1">{message.otherCardiacFindings || 'None.'}</p>
                </div>
                 <div>
                    <h4 className="font-semibold text-gray-700">Extracardiac Findings</h4>
                    <p className="p-2 bg-gray-50 rounded-md border mt-1">{message.extracardiacFindings || 'None.'}</p>
                </div>
            </div>

            <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                <h4 className="font-bold text-blue-800">Overall Impression</h4>
                <p className="text-sm text-blue-700 mt-1">{renderTextWithBold(message.overallImpression)}</p>
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

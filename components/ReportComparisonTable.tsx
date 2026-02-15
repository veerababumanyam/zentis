
import React from 'react';
import type { ReportComparisonMessage, ReportComparisonRow } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getChangeBadgeColor = (change: ReportComparisonRow['change']) => {
    switch (change) {
        case 'Improved': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800';
        case 'Worsened (Critical)': return 'bg-red-100 text-red-800 border-red-200 font-bold dark:bg-red-900/50 dark:text-red-300 dark:border-red-800';
        case 'Worsened (Minor)': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
        case 'New Finding': return 'bg-indigo-100 text-indigo-800 border-indigo-200 font-semibold dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800';
        case 'Resolved': return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-800';
        case 'Unchanged': return 'bg-gray-100 text-gray-700 border-gray-200 opacity-80 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
        default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300';
    }
}

const SuggestedActionButton: React.FC<{ action: ReportComparisonMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
    if (!action || action.type !== 'view_report') return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
            <button
                onClick={() => onViewReport(action.reportId)}
                title={`View ${action.label}`}
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
                <DocumentIcon className="w-4 h-4" />
                <span>{action.label}</span>
            </button>
        </div>
    );
};

export const ReportComparisonTable: React.FC<{ message: ReportComparisonMessage, onViewReport?: (reportId: string) => void; }> = React.memo(({ message, onViewReport }) => {
    return (
        <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
            <div className="overflow-x-auto rounded-lg inner-glass">
                <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                    <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200/30 dark:border-gray-700/30">
                        <tr>
                            <th scope="col" className="px-4 py-2">Finding</th>
                            <th scope="col" className="px-4 py-2">Current ({formatDate(message.currentReportDate)})</th>
                            <th scope="col" className="px-4 py-2">Previous ({formatDate(message.previousReportDate)})</th>
                            <th scope="col" className="px-4 py-2">Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {message.table.map((row, index) => (
                            <tr key={index} className="border-b border-gray-100/10 last:border-0 hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
                                <th scope="row" className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                    {row.finding}
                                </th>
                                <td className="px-4 py-2">{row.current}</td>
                                <td className="px-4 py-2">{row.previous}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-0.5 text-xs rounded-full border ${getChangeBadgeColor(row.change)} whitespace-nowrap`}>
                                        {row.change}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 mt-2">
                <h4 className="font-bold">AI Summary</h4>
                <p>{message.summary.replace('### AI Summary\n', '')}</p>
            </div>
            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});

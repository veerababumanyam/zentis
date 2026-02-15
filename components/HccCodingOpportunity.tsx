import React from 'react';
import type { HccCodingMessage, HccCodingItem } from '../types';
import { BillingIcon } from './icons/BillingIcon';

const getConfidenceBadgeColor = (confidence: HccCodingItem['confidence']) => {
    switch (confidence) {
        case 'High': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
        case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700';
        case 'Low': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
}

export const HccCodingOpportunity: React.FC<{ message: HccCodingMessage }> = React.memo(({ message }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                    <BillingIcon className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
            </div>
            
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-2">HCC Code</th>
                            <th className="px-4 py-2">Description</th>
                            <th className="px-4 py-2">Supporting Evidence</th>
                            <th className="px-4 py-2">Confidence</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {message.items.map((item, index) => (
                            <tr key={index}>
                                <td className="px-4 py-2 font-mono font-semibold text-gray-800 dark:text-gray-200">{item.hccCode}</td>
                                <td className="px-4 py-2 text-gray-800 dark:text-gray-300">{item.description}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs italic">"{item.evidence}"</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getConfidenceBadgeColor(item.confidence)}`}>
                                        {item.confidence}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400 mt-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-bold text-gray-800 dark:text-gray-200">AI Summary</h4>
                <p>{message.summary}</p>
            </div>
        </div>
    );
});

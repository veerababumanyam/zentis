
import React, { useState } from 'react';
import type { SmartSummaryMessage } from '../types';
import { HighlightIcon } from './HighlightIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { VerifySourceButton } from './VerifySourceButton';

interface SmartSummaryProps {
  message: SmartSummaryMessage;
}

const TrendIndicator: React.FC<{ trend?: 'up' | 'down' | 'stable' }> = React.memo(({ trend }) => {
    if (!trend) return null;
    if (trend === 'up') return <span className="text-red-500" title="Trending Up">▲</span>;
    if (trend === 'down') return <span className="text-green-500" title="Trending Down">▼</span>;
    return <span className="text-gray-500" title="Stable">▬</span>;
});

export const SmartSummary: React.FC<SmartSummaryProps> = React.memo(({ message }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const renderNarrative = () => {
        const paragraphs = message.narrativeSummary.split('\n').filter(p => p.trim() !== '');
        return paragraphs.map((p, i) => <p key={i} className="mb-2 last:mb-0">{p}</p>);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>

            {/* Highlights */}
            <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Key Highlights</h4>
                {message.highlights.map((highlight, index) => (
                    <div key={index} className="inner-glass flex items-start space-x-3 p-3">
                        <div className="flex-shrink-0 pt-0.5">
                           <HighlightIcon iconType={highlight.icon} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{highlight.text}</p>
                    </div>
                ))}
            </div>

            {/* Data Tables */}
            {message.tables.map((table, index) => (
                <div key={index}>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">{table.title}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {table.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="inner-glass p-3 text-center relative group hover:scale-[1.02] transition-transform duration-200">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate uppercase tracking-wider">{item.metric}</p>
                                <div className="flex items-center justify-center space-x-1 mt-1">
                                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.value}</span>
                                    <TrendIndicator trend={item.trend} />
                                </div>
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <VerifySourceButton verification={item.verification} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            
            {/* Collapsible Narrative */}
            <div className="inner-glass overflow-hidden">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex justify-between items-center p-3 text-left focus:outline-none hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
                    title={isExpanded ? "Collapse Summary" : "Expand Summary"}
                >
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Full Narrative Summary</h4>
                    <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                {isExpanded && (
                    <div className="p-4 border-t border-gray-200/20 dark:border-gray-700/30 prose prose-sm max-w-none text-gray-700 dark:text-gray-300 dark:prose-invert">
                        {renderNarrative()}
                    </div>
                )}
            </div>
        </div>
    );
});

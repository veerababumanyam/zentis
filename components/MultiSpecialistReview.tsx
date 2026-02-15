
import React, { useState, useEffect } from 'react';
import type { MultiSpecialistReviewMessage } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { DocumentIcon } from './icons/DocumentIcon';

interface MultiSpecialistReviewProps {
    message: MultiSpecialistReviewMessage;
}

export const MultiSpecialistReview: React.FC<MultiSpecialistReviewProps> = React.memo(({ message }) => {
    const [activeTab, setActiveTab] = useState(0);

    // Auto-switch tab to the newest report if streaming live
    useEffect(() => {
        if (message.isLive && message.specialistReports.length > 0) {
            setActiveTab(message.specialistReports.length - 1);
        }
    }, [message.specialistReports.length, message.isLive]);

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center relative">
                    <UsersIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
                    {message.isLive && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
                    )}
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center">
                    {message.title}
                    {message.isLive && <span className="ml-2 text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">Live</span>}
                </h3>
            </div>

            {/* CMO Summary (Consolidated) - Render placeholder if missing */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg min-h-[120px] transition-all">
                <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-2 flex justify-between items-center">
                    CMO Consolidated Report
                    {message.isLive && !message.consolidatedReport && (
                        <span className="text-xs font-normal normal-case flex items-center animate-pulse">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
                            Waiting for board consensus...
                        </span>
                    )}
                </h4>
                
                {message.consolidatedReport ? (
                    <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200 animate-fadeIn">
                        <p><strong>Executive Summary:</strong> {message.consolidatedReport.summary}</p>
                        <p className="p-2 bg-white/50 dark:bg-black/20 rounded border border-indigo-200/50"><strong>Strategic Conflicts & Trade-offs:</strong> {message.consolidatedReport.conflicts}</p>
                        <p><strong>Final Unified Plan:</strong> {message.consolidatedReport.finalPlan}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-20 text-indigo-300 dark:text-indigo-700 space-y-2">
                        {message.specialistReports.length > 0 ? (
                            <p className="text-xs">Synthesizing {message.specialistReports.length} specialist inputs...</p>
                        ) : (
                            <p className="text-xs">Initializing Medical Board...</p>
                        )}
                        <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce delay-200"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Specialist Tabs */}
            {message.specialistReports.length > 0 && (
                <>
                    <div className="border-b border-gray-200 dark:border-gray-700 overflow-hidden">
                        <nav className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
                            {message.specialistReports.map((report, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveTab(index)}
                                    className={`whitespace-nowrap px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex-shrink-0 animate-slideUpFade ${
                                        activeTab === index
                                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-gray-700 border-b-transparent shadow-sm'
                                            : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {report.specialty}
                                </button>
                            ))}
                            {message.isLive && (
                                <div className="px-3 py-2 text-xs text-gray-400 italic flex items-center">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1 animate-ping"></span>
                                    Analzying...
                                </div>
                            )}
                        </nav>
                    </div>

                    {/* Specialist Content */}
                    <div className="p-4 bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-lg shadow-sm min-h-[200px]">
                        {message.specialistReports[activeTab] && (
                            <div className="animate-fadeIn">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{message.specialistReports[activeTab].specialty}</h4>
                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                        Focus: {message.specialistReports[activeTab].focus}
                                    </span>
                                </div>
                                
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Findings</h5>
                                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{message.specialistReports[activeTab].findings}</p>
                                    </div>
                                    
                                    <div>
                                        <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Recommendations</h5>
                                        <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
                                            {message.specialistReports[activeTab].recommendations.map((rec, i) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
});

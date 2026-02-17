
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { RadioIcon } from './icons/RadioIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { SummarizeIcon } from './icons/SummarizeIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';

interface ChatHeaderStitchProps {
    onOpenSettings?: () => void;
}

export const ChatHeaderStitch: React.FC<ChatHeaderStitchProps> = ({ onOpenSettings }) => {
    const { state, actions } = useAppContext();
    const { isChatLoading, activeOperation } = state;
    const {
        toggleLiveMode,
        handleRunMultiSpecialistReview,
        handleRunClinicalDebate,
        handleSendMessage,
        handleGenerateClinicalNote,
        cancelActiveOperation
    } = actions;

    return (
        <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-stitch-accent-dark/70 border-b border-gray-200/50 dark:border-white/10 px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img
                        src="/logo.png"
                        alt="Zentis AI"
                        className="w-10 h-10 object-contain bg-white/10 rounded-full p-1 border border-white/20"
                    />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-stitch-bg-dark rounded-full ${isChatLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
                </div>
                <div>
                    <h1 className="text-lg font-bold leading-none tracking-tight text-gray-900 dark:text-white font-display">
                        Zentis <span className="text-blue-500">AI</span>
                    </h1>
                    <span className="text-[10px] uppercase tracking-widest text-blue-500 font-bold block mt-0.5">
                        {isChatLoading ? 'Processing...' : 'Online Assistant'}
                    </span>
                </div>
            </div>

            {/* Action Buttons - Visible on Desktop/Tablet */}
            <div className="hidden md:flex items-center gap-1">
                <button
                    onClick={toggleLiveMode}
                    className="flex flex-col items-center justify-center p-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors gap-0.5"
                    title="Live Audio/Video Assistant"
                    disabled={isChatLoading}
                >
                    <div className="p-1 w-7 h-7 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                        <RadioIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wide">Live</span>
                </button>

                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                <button
                    onClick={handleRunMultiSpecialistReview}
                    className="flex flex-col items-center justify-center p-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all hover:scale-105 gap-0.5"
                    title="Medical Board: Get a simulated multi-specialist review"
                    disabled={isChatLoading}
                >
                    <UsersIcon className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Board</span>
                </button>

                <button
                    onClick={handleRunClinicalDebate}
                    className="flex flex-col items-center justify-center p-2 rounded-xl text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all hover:scale-105 gap-0.5"
                    title="Clinical Critics: Start a multi-agent debate"
                    disabled={isChatLoading}
                >
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Critics</span>
                </button>

                <button
                    onClick={() => handleSendMessage('Generate a summary of my current conditions, vitals, and critical alerts')}
                    className="flex flex-col items-center justify-center p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hover:scale-105 gap-0.5"
                    title="Summarize My Health"
                    disabled={isChatLoading}
                >
                    <SummarizeIcon className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Brief</span>
                </button>

                <button
                    onClick={handleGenerateClinicalNote}
                    className="flex flex-col items-center justify-center p-2 rounded-xl text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all hover:scale-105 gap-0.5"
                    title="Generate Summary Note / Report"
                    disabled={isChatLoading}
                >
                    <ClipboardCheckIcon className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase tracking-wide">Report</span>
                </button>

                {/* Stop button — visible only during active operations */}
                {activeOperation && (
                    <>
                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                        <button
                            onClick={cancelActiveOperation}
                            className="flex flex-col items-center justify-center p-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors gap-0.5 animate-pulse"
                            title="Stop current operation"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                            <span className="text-[9px] font-bold uppercase tracking-wide">Stop</span>
                        </button>
                    </>
                )}
            </div>

            <button
                onClick={onOpenSettings}
                className="w-10 h-10 flex md:hidden items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-600 dark:text-gray-300"
                aria-label="Settings"
            >
                <span className="material-symbols-outlined">settings</span>
            </button>
        </header>
    );
};

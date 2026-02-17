
import React from 'react';
import { useAppContext } from '../contexts/AppContext';

interface ChatHeaderStitchProps {
    onOpenSettings?: () => void;
}

export const ChatHeaderStitch: React.FC<ChatHeaderStitchProps> = ({ onOpenSettings }) => {
    const { state } = useAppContext();
    const { isChatLoading } = state;

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

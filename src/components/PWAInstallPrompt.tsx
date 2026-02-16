import React from 'react';
import { usePWA } from '../hooks/usePWA';
import { UploadIcon } from './icons/UploadIcon'; // Reusing an icon for now, or create a specific DownloadIcon

export const PWAInstallPrompt: React.FC = () => {
    const { isInstallable, installPWA } = usePWA();

    if (!isInstallable) return null;

    return (
        <div className="fixed bottom-4 left-4 z-50 animate-slideUpFade">
            <button
                onClick={installPWA}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl shadow-xl transition-all transform hover:scale-105"
                title="Install Application"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="font-medium text-sm">Install App</span>
            </button>
        </div>
    );
};

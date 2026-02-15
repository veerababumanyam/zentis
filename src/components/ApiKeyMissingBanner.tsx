import React from 'react';

interface ApiKeyMissingBannerProps {
  onOpenSettings: () => void;
}

export const ApiKeyMissingBanner: React.FC<ApiKeyMissingBannerProps> = ({ onOpenSettings }) => {
  return (
    <div className="mx-4 mt-2 mb-0 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 flex items-center justify-between gap-3 animate-fadeIn">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg flex-shrink-0">🔑</span>
        <p className="text-sm text-amber-800 dark:text-amber-200 truncate">
          <strong>API Key Missing</strong> — Add your Gemini API Key to enable AI features.
        </p>
      </div>
      <button
        onClick={onOpenSettings}
        className="flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
      >
        Add Key
      </button>
    </div>
  );
};

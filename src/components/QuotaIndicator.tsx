import React, { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import type { QuotaSummary } from '../types';

interface QuotaIndicatorProps {
    className?: string;
    showLabel?: boolean;
    showTooltip?: boolean;
}

/**
 * Visual indicator for API quota usage.
 * Color-coded based on usage percentage:
 * - Green: 0-50%
 * - Yellow: 50-75%
 * - Orange: 75-90%
 * - Red: 90%+ (pulsing)
 */
export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({
    className = '',
    showLabel = false,
    showTooltip = true
}) => {
    const { state, actions } = useAppContext();
    const [quota, setQuota] = useState<QuotaSummary | null>(state.apiQuota);

    // Update quota from state changes
    useEffect(() => {
        setQuota(state.apiQuota);
    }, [state.apiQuota]);

    // Initialize quota on mount if not set
    useEffect(() => {
        if (!quota) {
            import('../services/apiManager').then(api => {
                const summary = api.getQuotaSummary();
                // Dispatch update to context would be handled by calling code
                setQuota(summary);
            });
        }
    }, [quota]);

    if (!quota) {
        return (
            <div className={`flex items-center gap-1.5 ${className}`}>
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-400 animate-pulse w-1/3"></div>
                </div>
                {showLabel && <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Loading</span>}
            </div>
        );
    }

    const { percentage, callsRemaining, callsUsed } = quota;

    // Determine color based on percentage
    const getColor = () => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 75) return 'bg-orange-500';
        if (percentage >= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getTextColor = () => {
        if (percentage >= 90) return 'text-red-500';
        if (percentage >= 75) return 'text-orange-500';
        if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-green-500';
    };

    const isPulsing = percentage >= 90;

    // Format reset time
    const resetTime = new Date(quota.resetsAt);
    const resetHours = resetTime.getHours();
    const resetMinutes = String(resetTime.getMinutes()).padStart(2, '0');
    const resetTimeString = `${resetHours}:${resetMinutes}`;

    return (
        <div
            className={`flex items-center gap-1.5 ${className}`}
            title={showTooltip ? `API Quota: ${callsUsed} calls used today. Resets at ${resetTimeString}.` : undefined}
        >
            {/* Progress bar */}
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getColor()} transition-all duration-500 ${isPulsing ? 'animate-pulse' : ''}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>

            {/* Percentage label */}
            {showLabel && (
                <span className={`text-[9px] font-bold uppercase tracking-wide ${getTextColor()}`}>
                    {percentage}%
                </span>
            )}

            {/* Warning icon for high usage */}
            {percentage >= 75 && (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-3 h-3 ${getTextColor()} ${percentage >= 90 ? 'animate-pulse' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                    />
                </svg>
            )}
        </div>
    );
};

export default QuotaIndicator;

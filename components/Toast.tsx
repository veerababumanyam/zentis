import React, { useEffect } from 'react';
import type { ToastNotification } from '../types';
import { AlertCircleIcon } from './icons/AlertCircleIcon';
import { XIcon } from './icons/XIcon';
// FIX: Imported CheckCircleIcon to be used for success toasts.
import { CheckCircleIcon } from './icons/ChecklistIcons';

interface ToastProps {
  toast: ToastNotification;
  onDismiss: (id: number) => void;
}

const toastConfig = {
    error: {
        icon: AlertCircleIcon,
        iconClass: 'text-red-500',
        bgClass: 'bg-red-50 dark:bg-red-900/50',
        borderClass: 'border-red-200 dark:border-red-700'
    },
    // FIX: Populated success toast configuration to prevent runtime errors.
    success: {
        icon: CheckCircleIcon,
        iconClass: 'text-green-500',
        bgClass: 'bg-green-50 dark:bg-green-900/50',
        borderClass: 'border-green-200 dark:border-green-700',
    },
    // FIX: Populated info toast configuration to prevent runtime errors.
    info: {
        icon: AlertCircleIcon,
        iconClass: 'text-blue-500',
        bgClass: 'bg-blue-50 dark:bg-blue-900/50',
        borderClass: 'border-blue-200 dark:border-blue-700',
    },
};

export const Toast: React.FC<ToastProps> = React.memo(({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 5000); // Auto-dismiss after 5 seconds

        return () => {
            clearTimeout(timer);
        };
    }, [toast.id, onDismiss]);
    
    const config = toastConfig[toast.type] || toastConfig.info;
    const Icon = config.icon;

    return (
        <div className={`w-full max-w-sm p-4 rounded-lg shadow-lg border flex items-start space-x-3 ${config.bgClass} ${config.borderClass}`}>
            <div className="flex-shrink-0 pt-0.5">
                <Icon className={`w-6 h-6 ${config.iconClass}`} />
            </div>
            <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {toast.type === 'error' ? 'An Error Occurred' : (toast.type === 'success' ? 'Success' : 'Notification')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{toast.message}</p>
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
                <XIcon className="w-4 h-4" />
            </button>
        </div>
    );
});
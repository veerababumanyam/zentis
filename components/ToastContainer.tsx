import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Toast } from './Toast';

export const ToastContainer: React.FC = () => {
    const { state, actions } = useAppContext();
    const { toasts } = state;
    const { removeToast } = actions;

    return (
        <div className="fixed top-4 right-4 z-[100] w-full max-w-sm space-y-2">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
            ))}
        </div>
    );
};

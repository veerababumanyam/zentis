
import React, { useState, useMemo, useRef } from 'react';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { ThumbsDownIcon } from './icons/ThumbsDownIcon';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchPatients, exportAllData, importData } from '../services/ehrService';
import { UploadIcon } from './icons/UploadIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { deleteAccount } from '../services/accountService';
import { clearAllStorage } from '../utils/storageCleaner';

type Tab = 'performance' | 'personalization' | 'data';

const RadioPill: React.FC<{ label: string, value: string, name: string, checked: boolean, onChange: (value: string) => void }> = ({ label, value, name, checked, onChange }) => (
    <label className="cursor-pointer">
        <input type="radio" name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.value)} className="sr-only" />
        <span className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${checked ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>
            {label}
        </span>
    </label>
);

/** Show last 4 characters of the key, rest masked */
function apiSettings_maskedDisplay(key?: string): string {
    if (!key || key.length < 8) return key ? '••••••••' : '';
    return '••••••••' + key.slice(-4);
}

export const FeedbackModal: React.FC = () => {
    const { state, actions } = useAppContext();
    const { isPerformanceModalOpen, feedbackHistory, aiSettings } = state;
    const { togglePerformanceModal, updateAiSettings, showToast } = actions;
    const { validateApiKey, switchRole, userProfile } = useAuth();

    const [activeTab, setActiveTab] = useState<Tab>('performance');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // API Key management state
    const [apiKeyInput, setApiKeyInput] = useState(aiSettings.apiKey || '');
    const [isTestingKey, setIsTestingKey] = useState(false);
    const [isSavingKey, setIsSavingKey] = useState(false);
    const [keyTestResult, setKeyTestResult] = useState<'success' | 'error' | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    
    // Deletion Modal State
    const [isDeleteKeyModalOpen, setIsDeleteKeyModalOpen] = useState(false);
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // Sync input when modal opens with latest aiSettings
    React.useEffect(() => {
        if (isPerformanceModalOpen) {
            setApiKeyInput(aiSettings.apiKey || '');
            setKeyTestResult(null);
            // Default to settings if no key
            if (!aiSettings.apiKey) {
                setActiveTab('personalization');
            }
        }
    }, [isPerformanceModalOpen, aiSettings.apiKey]);

    const handleTestApiKey = async () => {
        if (!apiKeyInput.trim()) {
            showToast('Please enter an API key first.', 'error');
            return;
        }
        setIsTestingKey(true);
        setKeyTestResult(null);
        try {
            const valid = await validateApiKey(apiKeyInput.trim());
            setKeyTestResult(valid ? 'success' : 'error');
            showToast(valid ? 'API key is valid!' : 'Invalid API key. Please check and try again.', valid ? 'success' : 'error');
        } catch {
            setKeyTestResult('error');
            showToast('Failed to validate key. Check your network connection.', 'error');
        } finally {
            setIsTestingKey(false);
        }
    };

    const handleSaveApiKey = async () => {
        if (!apiKeyInput.trim()) {
            showToast('Please enter an API key.', 'error');
            return;
        }
        setIsSavingKey(true);
        try {
            updateAiSettings({ apiKey: apiKeyInput.trim() });
            showToast('API key saved successfully!', 'success');
        } catch {
            showToast('Failed to save API key.', 'error');
        } finally {
            setIsSavingKey(false);
        }
    };

    const confirmRemoveApiKey = () => {
        setApiKeyInput('');
        updateAiSettings({ apiKey: '' });
        setKeyTestResult(null);
        showToast('API key removed.', 'info');
        setIsDeleteKeyModalOpen(false);
    };

    const handleRemoveApiKey = () => {
        setIsDeleteKeyModalOpen(true);
    };

    const maskedKey = apiSettings_maskedDisplay(aiSettings.apiKey);

    const performanceStats = useMemo(() => {
        const total = feedbackHistory.length;
        if (total === 0) return { total: 0, good: 0, bad: 0, accuracy: 100 };
        const good = feedbackHistory.filter(f => f.rating === 'good').length;
        const bad = total - good;
        const accuracy = Math.round((good / total) * 100);
        return { total, good, bad, accuracy };
    }, [feedbackHistory]);

    const handleExport = async () => {
        try {
            const jsonString = await exportAllData();
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `zentis_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Patient data exported successfully.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to export data.', 'error');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonString = event.target?.result as string;
                await importData(jsonString);
                showToast('Data imported successfully. Refreshing...', 'success');
                // Reload page to reflect new DB state (simplest way to reset context)
                setTimeout(() => window.location.reload(), 1000);
            } catch (err) {
                console.error(err);
                showToast('Failed to import data. Invalid file format.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    if (!isPerformanceModalOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
            onClick={togglePerformanceModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
        >
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900 flex-shrink-0">
                    <h2 id="feedback-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">Settings & Performance</h2>
                    <button onClick={togglePerformanceModal} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
                    <nav className="flex space-x-2 px-4">
                        <button onClick={() => setActiveTab('performance')} className={`px-3 py-2 text-sm font-semibold ${activeTab === 'performance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                            Performance
                        </button>
                        <button onClick={() => setActiveTab('personalization')} className={`px-3 py-2 text-sm font-semibold ${activeTab === 'personalization' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                            App Settings
                        </button>
                        <button onClick={() => setActiveTab('data')} className={`px-3 py-2 text-sm font-semibold ${activeTab === 'data' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                            Data Management
                        </button>
                    </nav>
                </div>

                <main className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'performance' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Performance Overview</h3>
                                <div className="mt-2 grid grid-cols-3 gap-4 text-center">
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{performanceStats.accuracy}%</p>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Overall Accuracy</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{performanceStats.good}</p>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Helpful Responses</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">{performanceStats.bad}</p>
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Needs Improvement</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Recent Feedback</h3>
                                <div className="mt-2 space-y-3">
                                    {feedbackHistory.length > 0 ? feedbackHistory.slice(0, 10).map(fb => (
                                        <div key={fb.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                                            <div className="flex items-start space-x-3">
                                                {fb.rating === 'good' ? <ThumbsUpIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> : <ThumbsDownIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-400">For patient {fb.patientId} on {new Date(fb.timestamp).toLocaleDateString()}</p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">"{fb.originalText}"</p>
                                                    {fb.correction && <p className="text-sm mt-1"><strong className="text-gray-700 dark:text-gray-300">Correction:</strong> {fb.correction}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No feedback provided yet.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'personalization' && (
                        <div className="space-y-6">
                            {/* API Key Management */}
                            <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100 flex items-center text-lg">
                                            <span className="mr-2">🔑</span> Gemini API Key
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                                            Required for AI features. Your key is stored securely on your device.
                                        </p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${aiSettings.apiKey ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'}`}>
                                        {aiSettings.apiKey ? 'Active' : 'Not Configured'}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative group">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                                            {aiSettings.apiKey ? 'Update API Key' : 'Enter API Key'}
                                        </label>
                                        <input
                                            type={showApiKey ? 'text' : 'password'}
                                            value={apiKeyInput}
                                            onChange={(e) => { setApiKeyInput(e.target.value); setKeyTestResult(null); }}
                                            placeholder={aiSettings.apiKey ? "Enter new key to update..." : "Enter your Gemini API Key..."}
                                            className={`w-full px-4 py-2.5 pr-20 text-sm rounded-xl border bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${keyTestResult === 'success' ? 'border-green-400 focus:ring-green-400' :
                                                keyTestResult === 'error' ? 'border-red-400 focus:ring-red-400' :
                                                    'border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="absolute right-3 top-[2.2rem] text-xs font-medium text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            {showApiKey ? 'Hide' : 'Show'}
                                        </button>
                                    </div>

                                    {/* Validation Status */}
                                    {keyTestResult === 'success' && (
                                        <div className="flex items-center text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 p-2 rounded-lg border border-green-100 dark:border-green-800">
                                            <span className="mr-2">✓</span> Key verified and ready to use.
                                        </div>
                                    )}
                                    {keyTestResult === 'error' && (
                                        <div className="flex items-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-800">
                                            <span className="mr-2">✗</span> Validation failed. Please checking the key.
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                        <button
                                            onClick={handleTestApiKey}
                                            disabled={isTestingKey || !apiKeyInput.trim()}
                                            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                                        >
                                            {isTestingKey ? <span className="animate-spin mr-2">⟳</span> : <span className="mr-2">⚡</span>}
                                            {isTestingKey ? 'Testing...' : 'Test Connection'}
                                        </button>
                                        
                                        <button
                                            onClick={handleSaveApiKey}
                                            disabled={isSavingKey || !apiKeyInput.trim()}
                                            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center ml-auto"
                                        >
                                            {isSavingKey ? 'Saving...' : (aiSettings.apiKey ? 'Update Key' : 'Save Key')}
                                        </button>
                                        
                                        {aiSettings.apiKey && (
                                            <button
                                                onClick={handleRemoveApiKey}
                                                className="px-4 py-2 text-sm font-medium rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                                                title="Remove this API key"
                                            >
                                                Delete Key
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                                    <span className="text-xs text-gray-400">
                                        Don't have a key?
                                    </span>
                                    <a
                                        href="https://aistudio.google.com/app/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline flex items-center"
                                    >
                                        Get API key from Google AI Studio <span className="ml-1">↗</span>
                                    </a>
                                </div>
                            </div>
                            
                            {/* Danger Zone Placeholder (Will be populated in next step) */}
                            <div className="mt-8 border-t dark:border-gray-700 pt-8">
                                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
                                <div className="p-4 border border-red-200 dark:border-red-900/30 rounded-lg bg-red-50 dark:bg-red-900/10">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-semibold text-red-800 dark:text-red-300">Delete Account</h4>
                                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                                Permanently delete your account and all associated data.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setIsDeleteAccountModalOpen(true)}
                                            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">AI Response Style</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Adjust how the AI communicates to better fit your preferences.</p>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 space-y-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200">Verbosity</h4>
                                <div className="flex items-center space-x-3">
                                    <RadioPill label="Concise" value="concise" name="verbosity" checked={aiSettings.verbosity === 'concise'} onChange={(v) => updateAiSettings({ verbosity: v as any })} />
                                    <RadioPill label="Default" value="default" name="verbosity" checked={aiSettings.verbosity === 'default'} onChange={(v) => updateAiSettings({ verbosity: v as any })} />
                                    <RadioPill label="Detailed" value="detailed" name="verbosity" checked={aiSettings.verbosity === 'detailed'} onChange={(v) => updateAiSettings({ verbosity: v as any })} />
                                </div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 space-y-3">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200">Tone</h4>
                                <div className="flex items-center space-x-3">
                                    <RadioPill label="Formal" value="formal" name="tone" checked={aiSettings.tone === 'formal'} onChange={(v) => updateAiSettings({ tone: v as any })} />
                                    <RadioPill label="Default" value="default" name="tone" checked={aiSettings.tone === 'default'} onChange={(v) => updateAiSettings({ tone: v as any })} />
                                    <RadioPill label="Collaborative" value="collaborative" name="tone" checked={aiSettings.tone === 'collaborative'} onChange={(v) => updateAiSettings({ tone: v as any })} />
                                </div>
                            </div>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-200">Current View</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Switch between medical professional and patient dashboards.</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${userProfile?.role === 'doctor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                                            {userProfile?.role}
                                        </span>
                                        <button
                                            onClick={switchRole}
                                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Switch to {userProfile?.role === 'doctor' ? 'Patient' : 'Doctor'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Data Persistence</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Patient data is stored locally in your browser. Use these options to backup your data or transfer it to another device.
                                </p>
                            </div>

                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200">Export All Data</h4>
                                        <p className="text-xs text-gray-500">Download a JSON backup of all patients and reports.</p>
                                    </div>
                                    <button
                                        onClick={handleExport}
                                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <DocumentIcon className="w-4 h-4 mr-2" />
                                        Export JSON
                                    </button>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200">Import Data</h4>
                                        <p className="text-xs text-gray-500">Restore patients from a previous backup file.</p>
                                    </div>
                                    <div>
                                        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                        <button
                                            onClick={handleImportClick}
                                            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            <UploadIcon className="w-4 h-4 mr-2" />
                                            Import JSON
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                    <strong>Note:</strong> Importing data will merge or replace existing patient records. Please ensure you have a backup of your current data before importing.
                                </p>
                            </div>
                        </div>
                    )}
                </main>

                <DeleteConfirmationModal
                    isOpen={isDeleteKeyModalOpen}
                    onClose={() => setIsDeleteKeyModalOpen(false)}
                    onConfirm={confirmRemoveApiKey}
                    title="Remove API Key"
                    message="Are you sure you want to remove your Gemini API Key? AI features will no longer work until you add a valid key again."
                    confirmText="Remove Key"
                    cancelText="Keep Key"
                />
                
                <DeleteConfirmationModal
                    isOpen={isDeleteAccountModalOpen}
                    onClose={() => !isDeletingAccount && setIsDeleteAccountModalOpen(false)}
                    onConfirm={async () => {
                        setIsDeletingAccount(true);
                        try {
                            await deleteAccount();
                            // Clear all local browser data (localStorage, sessionStorage, caches, IndexedDB)
                            await clearAllStorage();
                            showToast('Account deleted successfully. Redirecting...', 'success');
                            setTimeout(() => { window.location.href = '/'; }, 1500);
                        } catch (e) {
                            console.error(e);
                            setIsDeletingAccount(false);
                            setIsDeleteAccountModalOpen(false);
                            showToast('Failed to delete account. Please try again.', 'error');
                        }
                    }}
                    title="Delete Account & Data"
                    message="WARNING: This action is permanent. It will delete your account profile and all your uploaded files. Usage data and patients created by you will be preserved but anonymized where applicable."
                    confirmText={isDeletingAccount ? "Deleting..." : "Delete My Account"}
                    cancelText="Cancel"
                />
            </div>
        </div>
    );
};
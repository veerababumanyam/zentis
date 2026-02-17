
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { updatePatient } from '../services/ehrService';
import { clearBriefing } from '../services/cacheService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { deleteAccount } from '../services/accountService';
import { clearAllStorage } from '../utils/storageCleaner';
import { exportAllData, importData } from '../services/ehrService';

export const MobileSettingsStitch: React.FC = () => {
    const { state, actions } = useAppContext();
    const { isPerformanceModalOpen, selectedPatient, aiSettings } = state;
    const { togglePerformanceModal, showToast, updateAiSettings } = actions;
    const { userProfile, logout, user, validateApiKey } = useAuth();

    const [name, setName] = useState('');
    const [age, setAge] = useState<number | ''>('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync state
    useEffect(() => {
        if (isPerformanceModalOpen) {
            if (selectedPatient) {
                setName(selectedPatient.name);
                setAge(selectedPatient.age);
                setGender(selectedPatient.gender);
            }
            setApiKey(aiSettings.apiKey || '');
        }
    }, [isPerformanceModalOpen, selectedPatient, aiSettings]);

    const handleSaveProfile = async () => {
        if (!selectedPatient) return;
        setIsSaving(true);
        try {
            const updated = { ...selectedPatient, name, age: Number(age), gender };
            await updatePatient(updated);

            if (user && selectedPatient.id === user.uid) {
                await setDoc(doc(db, 'users', user.uid), {
                    displayName: name,
                    age: Number(age),
                    gender: gender,
                }, { merge: true });
            }

            if (selectedPatient?.id) {
                clearBriefing(selectedPatient.id);
                try {
                    const savedChats = localStorage.getItem('chatHistories');
                    if (savedChats) {
                        const chats = JSON.parse(savedChats);
                        delete chats[selectedPatient.id];
                        localStorage.setItem('chatHistories', JSON.stringify(chats));
                    }
                } catch (e) {
                    console.error("Failed to clear chat history", e);
                }
            }

            showToast('Profile updated successfully', 'success');
            setTimeout(() => window.location.reload(), 500);
        } catch (e) {
            showToast('Failed to update profile', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveKey = async () => {
        if (!apiKey.trim()) return;
        try {
            const valid = await validateApiKey(apiKey.trim());
            if (valid) {
                updateAiSettings({ apiKey: apiKey.trim() });
                showToast('API Key saved', 'success');
            } else {
                showToast('Invalid API Key', 'error');
            }
        } catch {
            showToast('Validation failed', 'error');
        }
    };

    const handleExport = async () => {
        try {
            const data = await exportAllData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zentis_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Data exported', 'success');
        } catch {
            showToast('Export failed', 'error');
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                await importData(event.target?.result as string);
                showToast('Import successful. Reloading...', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } catch {
                showToast('Import failed', 'error');
            }
        };
        reader.readAsText(file);
    };

    const handleDeleteAccount = async () => {
        if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            try {
                await deleteAccount();
                await clearAllStorage();
                window.location.href = '/';
            } catch {
                showToast('Delete failed', 'error');
            }
        }
    };

    if (!isPerformanceModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-gray-900 text-white overflow-y-auto font-sans">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
                <h2 className="text-xl font-bold font-display tracking-tight text-white">Settings</h2>
                <button onClick={togglePerformanceModal} className="p-2 rounded-full hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <div className="p-5 space-y-8 pb-20">
                {/* Profile Section */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider">Profile</h3>
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400">
                            {userProfile?.photoURL ? (
                                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-3xl">person</span>
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-lg">{userProfile?.displayName || 'User'}</p>
                            <p className="text-sm text-gray-400">{userProfile?.email}</p>
                        </div>
                    </div>

                    <div className="space-y-3 bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Display Name</label>
                            <input
                                value={name} onChange={e => setName(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Age</label>
                                <input
                                    type="number" value={age} onChange={e => setAge(Number(e.target.value))}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Gender</label>
                                <select
                                    value={gender} onChange={e => setGender(e.target.value as any)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all appearance-none"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-teal-900/20 disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Update Profile'}
                        </button>
                    </div>
                </section>

                {/* App Settings */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider">App Settings</h3>
                    <div className="space-y-4 bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Gemini API Key</label>
                            <div className="relative">
                                <input
                                    type={showKey ? "text" : "password"}
                                    value={apiKey} onChange={e => setApiKey(e.target.value)}
                                    placeholder="Enter API Key"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 pr-12 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                />
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-3 text-gray-500 hover:text-white"
                                >
                                    <span className="material-symbols-outlined text-lg">{showKey ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                            <button
                                onClick={handleSaveKey}
                                className="mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300"
                            >
                                Validate & Save Key
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-2">AI Persona</label>
                            <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-700">
                                {['concise', 'default', 'detailed'].map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => updateAiSettings({ verbosity: option as any })}
                                        className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${aiSettings.verbosity === option ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Data Management */}
                <section className="space-y-4">
                    <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider">Data Management</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleExport} className="p-4 bg-gray-800 border border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gray-750 transition-colors">
                            <span className="material-symbols-outlined text-blue-400">download</span>
                            <span className="text-xs font-medium">Export Data</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-gray-800 border border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gray-750 transition-colors">
                            <span className="material-symbols-outlined text-green-400">upload</span>
                            <span className="text-xs font-medium">Import Data</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-800">
                        <button
                            onClick={handleDeleteAccount}
                            className="w-full py-3 bg-red-900/20 border border-red-900/50 text-red-500 font-semibold rounded-xl hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">delete_forever</span>
                            Delete Account
                        </button>
                        <p className="text-[10px] text-gray-600 text-center mt-2">
                            This action is permanent and cannot be undone.
                        </p>
                    </div>
                </section>

                {/* Footer */}
                <div className="pt-8 text-center space-y-4">
                    <button
                        onClick={() => logout()}
                        className="text-gray-400 hover:text-white font-medium text-sm flex items-center justify-center gap-2 mx-auto"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        Log Out
                    </button>
                    <p className="text-xs text-gray-600">Version 1.2.0 • Build 2026.02.17</p>
                </div>
            </div>
        </div>
    );
};

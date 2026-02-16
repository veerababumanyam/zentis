import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { XIcon } from './icons/XIcon';
import { UserIcon } from './icons/UserIcon';
import { updatePatient } from '../services/ehrService';
import { clearBriefing } from '../services/cacheService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const PatientSettingsModal: React.FC = () => {
    const { state, actions } = useAppContext();
    const { isSettingsOpen, selectedPatient } = state;
    const { toggleSettings, showToast, selectPatient, togglePerformanceModal } = actions;
    const { userProfile, logout, user } = useAuth();

    const [name, setName] = useState('');
    const [age, setAge] = useState<number | ''>('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Sync state when modal opens or patient changes
    useEffect(() => {
        if (isSettingsOpen && selectedPatient) {
            setName(selectedPatient.name);
            setAge(selectedPatient.age);
            setGender(selectedPatient.gender);
            setNotes(selectedPatient.notes || '');
            // Initialize avatar if available (Placeholder for now as Patient type doesn't support avatar URL yet directly)
            // If we add avatar support to Patient type, we see it here.
            // For now, we can use userProfile photoURL if this patient IS the user
            if (selectedPatient.id === user?.uid && userProfile?.photoURL) {
                setAvatarPreview(userProfile.photoURL);
            }
        }
    }, [isSettingsOpen, selectedPatient, user, userProfile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;

        setIsSaving(true);
        try {
            const updatedPatient = {
                ...selectedPatient,
                name,
                age: Number(age),
                gender,
                notes
                // Avatar update logic would go here once supported in backend
            };

            await updatePatient(updatedPatient);

            // DUAL-WRITE: Update 'users' collection too if this is the current user
            // This ensures the profile data remains consistent for auth/profile checks
            if (user && selectedPatient.id === user.uid) {
                await setDoc(doc(db, 'users', user.uid), {
                    displayName: name,
                    age: Number(age),
                    gender: gender,
                    // Preserve other fields
                }, { merge: true });
            }

            showToast('Patient profile updated.', 'success');

            // Clear cached briefing so the chat updates with new details (name, age, gender)
            if (selectedPatient?.id) {
                clearBriefing(selectedPatient.id);
                // Also clear chat history to force a fresh "Welcome" message
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
            setTimeout(() => window.location.reload(), 500); // Simple reload to refresh all data

        } catch (error) {
            console.error(error);
            showToast('Failed to update profile.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            toggleSettings();
            // App will redirect to LandingPage automatically via AuthContext/App.tsx logic
        } catch (error) {
            showToast('Failed to log out.', 'error');
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            // In a real app, we'd upload this file to Storage here or on Save
        }
    };

    if (!isSettingsOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={toggleSettings}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 m-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Patient Settings</h2>
                    <button
                        onClick={toggleSettings}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center space-y-3">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-700 shadow-md">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                                        <UserIcon className="w-12 h-12" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                <span className="text-xs font-semibold">Change</span>
                                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Click to upload new photo</p>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                Patient Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-800 dark:text-gray-200"
                                placeholder="Enter full name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Age
                                </label>
                                <input
                                    type="number"
                                    value={age}
                                    onChange={e => setAge(Number(e.target.value))}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-800 dark:text-gray-200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Gender
                                </label>
                                <select
                                    value={gender}
                                    onChange={e => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-800 dark:text-gray-200 appearance-none"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                Patient ID / Key
                            </label>
                            <div className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 font-mono text-xs select-all">
                                {selectedPatient?.id}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                Additional Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-800 dark:text-gray-200 resize-none"
                                placeholder="Medical history notes, allergies, etc."
                            />
                        </div>

                        {/* App Settings Shortcut */}
                        <div className="pt-2">
                             <div 
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                                onClick={() => { toggleSettings(); togglePerformanceModal(); }}
                             >
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Application Settings</h4>
                                        <p className="text-xs text-gray-500">Manage API Keys, AI preferences & Account</p>
                                    </div>
                                </div>
                                <span className="text-gray-400 group-hover:text-blue-500 transition-colors">→</span>
                             </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            Log Out
                        </button>
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={toggleSettings}
                                className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

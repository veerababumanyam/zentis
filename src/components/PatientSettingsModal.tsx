import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { XIcon } from './icons/XIcon';
import { UserIcon } from './icons/UserIcon';
import { updatePatient, savePatientProfile, addImmunization, addFamilyHistoryEntry, addSocialHistoryEntry } from '../services/ehrService';
import { clearBriefing } from '../services/cacheService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type {
    EmergencyContact,
    InsuranceInfo,
    PrimaryCarePhysician,
    AdvancedDirectives,
    PrivacyConsent,
    ClinicalGoals,
} from '../types';

/* ------------------------------------------------------------------ */
/*  Shared UI primitives                                               */
/* ------------------------------------------------------------------ */

const inputClass = 'w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-800 dark:text-gray-200 text-sm min-h-[44px]';
const labelClass = 'block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1';
const sectionTitle = 'text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3';
const cardClass = 'p-4 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 rounded-xl space-y-3';

type SettingsTab = 'profile' | 'admin' | 'history' | 'legal' | 'goals';

const TABS: { id: SettingsTab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'admin', label: 'Admin' },
    { id: 'history', label: 'History' },
    { id: 'legal', label: 'Legal' },
    { id: 'goals', label: 'Goals' },
];

/* ------------------------------------------------------------------ */
/*  Validation helpers                                                 */
/* ------------------------------------------------------------------ */

const validateEmergencyContact = (c: Partial<EmergencyContact>): string | null => {
    if (!c.name?.trim()) return 'Contact name is required.';
    if (!c.phonePrimary?.trim()) return 'Primary phone is required.';
    return null;
};

const validateClinicalGoals = (g: ClinicalGoals): string | null => {
    if (g.targetSystolicBp !== undefined && (g.targetSystolicBp < 60 || g.targetSystolicBp > 250)) {
        return 'Target systolic BP must be between 60 and 250.';
    }
    if (g.targetDiastolicBp !== undefined && (g.targetDiastolicBp < 30 || g.targetDiastolicBp > 160)) {
        return 'Target diastolic BP must be between 30 and 160.';
    }
    if (g.targetHba1c !== undefined && (g.targetHba1c < 3 || g.targetHba1c > 20)) {
        return 'Target HbA1c must be between 3 and 20.';
    }
    if (g.targetLdl !== undefined && (g.targetLdl < 10 || g.targetLdl > 400)) {
        return 'Target LDL must be between 10 and 400.';
    }
    if (g.targetWeightKg !== undefined && (g.targetWeightKg < 10 || g.targetWeightKg > 400)) {
        return 'Target weight must be between 10 and 400 kg.';
    }
    return null;
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const PatientSettingsModal: React.FC = () => {
    const { state, actions } = useAppContext();
    const { isSettingsOpen, selectedPatient } = state;
    const { toggleSettings, showToast, togglePerformanceModal } = actions;
    const { userProfile, logout, user } = useAuth();

    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [fieldError, setFieldError] = useState<string | null>(null);

    // --- Profile tab state ---
    const [name, setName] = useState('');
    const [age, setAge] = useState<number | ''>('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
    const [notes, setNotes] = useState('');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // --- Admin tab state ---
    const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
    const [insurance, setInsurance] = useState<InsuranceInfo>({ providerName: '' });
    const [pcp, setPcp] = useState<PrimaryCarePhysician>({ name: '' });

    // --- Legal tab state ---
    const [directives, setDirectives] = useState<AdvancedDirectives>({});
    const [privacyConsent, setPrivacyConsent] = useState<PrivacyConsent>({
        consentGiven: false,
        consentType: 'HIPAA',
        consentDate: new Date().toISOString().split('T')[0],
    });

    // --- Goals tab state ---
    const [clinicalGoals, setClinicalGoals] = useState<ClinicalGoals>({});

    // --- History tab inline-add state ---
    const [newImmunization, setNewImmunization] = useState({ vaccineName: '', date: '' });
    const [newFamilyEntry, setNewFamilyEntry] = useState({ relativeType: '', condition: '' });
    const [newSocialEntry, setNewSocialEntry] = useState({ domain: '', value: '' });

    /* Sync state when modal opens or patient changes */
    useEffect(() => {
        if (isSettingsOpen && selectedPatient) {
            setActiveTab('profile');
            setFieldError(null);
            // Profile
            setName(selectedPatient.name);
            setAge(selectedPatient.age);
            setGender(selectedPatient.gender);
            setNotes(selectedPatient.notes || '');
            if (selectedPatient.id === user?.uid && userProfile?.photoURL) {
                setAvatarPreview(userProfile.photoURL);
            }
            // Admin
            setEmergencyContacts(selectedPatient.emergencyContacts || []);
            setInsurance(selectedPatient.insurance || { providerName: '' });
            setPcp(selectedPatient.primaryCarePhysician || { name: '' });
            // Legal
            setDirectives(selectedPatient.advancedDirectives || {});
            setPrivacyConsent(selectedPatient.privacyConsent || {
                consentGiven: false,
                consentType: 'HIPAA',
                consentDate: new Date().toISOString().split('T')[0],
            });
            // Goals
            setClinicalGoals(selectedPatient.clinicalGoals || {});
        }
    }, [isSettingsOpen, selectedPatient, user, userProfile]);

    /* ------------------------------------------------------------------ */
    /*  Save handler                                                       */
    /* ------------------------------------------------------------------ */

    const handleSave = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;
        setFieldError(null);

        // Tab-specific validation
        if (activeTab === 'goals') {
            const goalsErr = validateClinicalGoals(clinicalGoals);
            if (goalsErr) { setFieldError(goalsErr); return; }
        }

        setIsSaving(true);
        try {
            // Build payload based on active tab to keep writes efficient
            if (activeTab === 'profile') {
                const updatedPatient = {
                    ...selectedPatient,
                    name,
                    age: Number(age),
                    gender,
                    notes,
                };
                await updatePatient(updatedPatient);
                if (user && selectedPatient.id === user.uid) {
                    await setDoc(doc(db, 'users', user.uid), {
                        displayName: name,
                        age: Number(age),
                        gender,
                    }, { merge: true });
                }
            } else if (activeTab === 'admin') {
                await savePatientProfile(selectedPatient.id, {
                    emergencyContacts,
                    insurance: insurance.providerName ? insurance : undefined,
                    primaryCarePhysician: pcp.name ? pcp : undefined,
                } as any);
            } else if (activeTab === 'legal') {
                await savePatientProfile(selectedPatient.id, {
                    advancedDirectives: directives,
                    privacyConsent,
                } as any);
            } else if (activeTab === 'goals') {
                await savePatientProfile(selectedPatient.id, {
                    clinicalGoals,
                } as any);
            }

            showToast('Patient profile updated.', 'success');
            if (selectedPatient?.id) {
                clearBriefing(selectedPatient.id);
                try {
                    const savedChats = localStorage.getItem('chatHistories');
                    if (savedChats) {
                        const chats = JSON.parse(savedChats);
                        delete chats[selectedPatient.id];
                        localStorage.setItem('chatHistories', JSON.stringify(chats));
                    }
                } catch (_e) { /* ignore */ }
            }
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            console.error(error);
            showToast('Failed to update profile.', 'error');
        } finally {
            setIsSaving(false);
        }
    }, [activeTab, selectedPatient, name, age, gender, notes, emergencyContacts, insurance, pcp, directives, privacyConsent, clinicalGoals, user, showToast]);

    /* ------------------------------------------------------------------ */
    /*  History sub-collection inline add handlers                         */
    /* ------------------------------------------------------------------ */

    const handleAddImmunization = async () => {
        if (!selectedPatient || !newImmunization.vaccineName.trim()) {
            setFieldError('Vaccine name is required.'); return;
        }
        try {
            await addImmunization(selectedPatient.id, {
                vaccineName: newImmunization.vaccineName,
                date: newImmunization.date || new Date().toISOString().split('T')[0],
            });
            setNewImmunization({ vaccineName: '', date: '' });
            showToast('Immunization added.', 'success');
        } catch { showToast('Failed to add immunization.', 'error'); }
    };

    const handleAddFamilyEntry = async () => {
        if (!selectedPatient || !newFamilyEntry.relativeType.trim() || !newFamilyEntry.condition.trim()) {
            setFieldError('Relative and condition are required.'); return;
        }
        try {
            await addFamilyHistoryEntry(selectedPatient.id, {
                relativeType: newFamilyEntry.relativeType,
                condition: newFamilyEntry.condition,
            });
            setNewFamilyEntry({ relativeType: '', condition: '' });
            showToast('Family history entry added.', 'success');
        } catch { showToast('Failed to add family history.', 'error'); }
    };

    const handleAddSocialEntry = async () => {
        if (!selectedPatient || !newSocialEntry.domain.trim() || !newSocialEntry.value.trim()) {
            setFieldError('Domain and value are required.'); return;
        }
        try {
            await addSocialHistoryEntry(selectedPatient.id, {
                domain: newSocialEntry.domain,
                value: newSocialEntry.value,
            });
            setNewSocialEntry({ domain: '', value: '' });
            showToast('Social history entry added.', 'success');
        } catch { showToast('Failed to add social history.', 'error'); }
    };

    /* ------------------------------------------------------------------ */
    /*  Emergency contact helpers                                          */
    /* ------------------------------------------------------------------ */

    const addEmergencyContact = () => {
        setEmergencyContacts(prev => [...prev, { name: '', phonePrimary: '', isPrimary: prev.length === 0 }]);
    };

    const updateContact = (idx: number, field: keyof EmergencyContact, value: string | boolean) => {
        setEmergencyContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    };

    const removeContact = (idx: number) => {
        setEmergencyContacts(prev => prev.filter((_, i) => i !== idx));
    };

    /* ------------------------------------------------------------------ */
    /*  Avatar handler                                                     */
    /* ------------------------------------------------------------------ */

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleLogout = async () => {
        try { await logout(); toggleSettings(); }
        catch { showToast('Failed to log out.', 'error'); }
    };

    if (!isSettingsOpen) return null;

    /* ================================================================== */
    /*  RENDER                                                             */
    /* ================================================================== */

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={toggleSettings}
            role="dialog"
            aria-modal="true"
            aria-label="Patient Settings"
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 m-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Patient Settings</h2>
                    <button
                        onClick={toggleSettings}
                        aria-label="Close settings"
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab bar */}
                <nav className="flex border-b border-gray-100 dark:border-gray-800 px-2 shrink-0 overflow-x-auto" aria-label="Settings sections">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => { setActiveTab(tab.id); setFieldError(null); }}
                            className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors min-h-[44px] border-b-2 ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Scrollable body */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Field-level error */}
                    {fieldError && (
                        <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                            {fieldError}
                        </div>
                    )}

                    {/* ============ PROFILE TAB ============ */}
                    {activeTab === 'profile' && (
                        <>
                            {/* Avatar */}
                            <div className="flex flex-col items-center space-y-3">
                                <div className="relative group">
                                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-700 shadow-md">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Patient avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                                                <UserIcon className="w-10 h-10" />
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                                        <span className="text-xs font-semibold">Change</span>
                                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" aria-label="Upload patient photo" />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="patientName" className={labelClass}>Patient Name</label>
                                <input id="patientName" type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Enter full name" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="patientAge" className={labelClass}>Age</label>
                                    <input id="patientAge" type="number" value={age} onChange={e => setAge(Number(e.target.value))} className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="patientGender" className={labelClass}>Gender</label>
                                    <select id="patientGender" value={gender} onChange={e => setGender(e.target.value as 'Male' | 'Female' | 'Other')} className={inputClass + ' appearance-none'}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Patient ID</label>
                                <div className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 font-mono text-xs select-all">
                                    {selectedPatient?.id}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="patientNotes" className={labelClass}>Additional Notes</label>
                                <textarea id="patientNotes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass + ' resize-none'} placeholder="Medical history notes, allergies, etc." />
                            </div>

                            {/* App Settings shortcut */}
                            <div
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group min-h-[44px]"
                                onClick={() => { toggleSettings(); togglePerformanceModal(); }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { toggleSettings(); togglePerformanceModal(); } }}
                                aria-label="Open application settings"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Application Settings</h4>
                                        <p className="text-xs text-gray-500">API Keys, AI preferences &amp; Account</p>
                                    </div>
                                </div>
                                <span className="text-gray-400 group-hover:text-blue-500 transition-colors">&rarr;</span>
                            </div>
                        </>
                    )}

                    {/* ============ ADMIN TAB ============ */}
                    {activeTab === 'admin' && (
                        <>
                            {/* Emergency Contacts */}
                            <section aria-labelledby="ec-heading">
                                <h3 id="ec-heading" className={sectionTitle}>Emergency Contacts</h3>
                                {emergencyContacts.map((c, idx) => (
                                    <div key={idx} className={cardClass + ' mb-3'}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Contact {idx + 1}</span>
                                            <button type="button" onClick={() => removeContact(idx)} className="text-xs text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={`Remove contact ${idx + 1}`}>&times; Remove</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label htmlFor={`ec-name-${idx}`} className={labelClass}>Name</label>
                                                <input id={`ec-name-${idx}`} type="text" value={c.name} onChange={e => updateContact(idx, 'name', e.target.value)} className={inputClass} placeholder="Full name" />
                                            </div>
                                            <div>
                                                <label htmlFor={`ec-rel-${idx}`} className={labelClass}>Relationship</label>
                                                <input id={`ec-rel-${idx}`} type="text" value={c.relationship || ''} onChange={e => updateContact(idx, 'relationship', e.target.value)} className={inputClass} placeholder="e.g. Spouse" />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor={`ec-phone-${idx}`} className={labelClass}>Primary Phone</label>
                                            <input id={`ec-phone-${idx}`} type="tel" value={c.phonePrimary} onChange={e => updateContact(idx, 'phonePrimary', e.target.value)} className={inputClass} placeholder="(555) 555-5555" />
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={addEmergencyContact} className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[44px]">
                                    + Add Emergency Contact
                                </button>
                            </section>

                            {/* Insurance */}
                            <section aria-labelledby="ins-heading">
                                <h3 id="ins-heading" className={sectionTitle}>Insurance Information</h3>
                                <div className={cardClass}>
                                    <div>
                                        <label htmlFor="ins-provider" className={labelClass}>Provider Name</label>
                                        <input id="ins-provider" type="text" value={insurance.providerName} onChange={e => setInsurance(p => ({ ...p, providerName: e.target.value }))} className={inputClass} placeholder="e.g. Blue Cross" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="ins-plan" className={labelClass}>Plan Name</label>
                                            <input id="ins-plan" type="text" value={insurance.planName || ''} onChange={e => setInsurance(p => ({ ...p, planName: e.target.value }))} className={inputClass} placeholder="PPO Gold" />
                                        </div>
                                        <div>
                                            <label htmlFor="ins-policy" className={labelClass}>Policy #</label>
                                            <input id="ins-policy" type="text" value={insurance.policyNumber || ''} onChange={e => setInsurance(p => ({ ...p, policyNumber: e.target.value }))} className={inputClass} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="ins-group" className={labelClass}>Group #</label>
                                            <input id="ins-group" type="text" value={insurance.groupNumber || ''} onChange={e => setInsurance(p => ({ ...p, groupNumber: e.target.value }))} className={inputClass} />
                                        </div>
                                        <div>
                                            <label htmlFor="ins-phone" className={labelClass}>Phone</label>
                                            <input id="ins-phone" type="tel" value={insurance.phone || ''} onChange={e => setInsurance(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* PCP */}
                            <section aria-labelledby="pcp-heading">
                                <h3 id="pcp-heading" className={sectionTitle}>Primary Care Physician</h3>
                                <div className={cardClass}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="pcp-name" className={labelClass}>Name</label>
                                            <input id="pcp-name" type="text" value={pcp.name} onChange={e => setPcp(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="Dr. Smith" />
                                        </div>
                                        <div>
                                            <label htmlFor="pcp-clinic" className={labelClass}>Clinic</label>
                                            <input id="pcp-clinic" type="text" value={pcp.clinicName || ''} onChange={e => setPcp(p => ({ ...p, clinicName: e.target.value }))} className={inputClass} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="pcp-phone" className={labelClass}>Phone</label>
                                            <input id="pcp-phone" type="tel" value={pcp.phone || ''} onChange={e => setPcp(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
                                        </div>
                                        <div>
                                            <label htmlFor="pcp-email" className={labelClass}>Email</label>
                                            <input id="pcp-email" type="email" value={pcp.email || ''} onChange={e => setPcp(p => ({ ...p, email: e.target.value }))} className={inputClass} />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </>
                    )}

                    {/* ============ HISTORY TAB ============ */}
                    {activeTab === 'history' && (
                        <>
                            {/* Immunizations */}
                            <section aria-labelledby="imm-heading">
                                <h3 id="imm-heading" className={sectionTitle}>Immunizations</h3>
                                {(selectedPatient?.immunizations || []).length > 0 && (
                                    <ul className="space-y-1 mb-3">
                                        {selectedPatient!.immunizations!.map((imm, i) => (
                                            <li key={imm.id || i} className="flex justify-between text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                                                <span className="font-medium text-gray-700 dark:text-gray-200">{imm.vaccineName}</span>
                                                <span className="text-gray-400 text-xs">{imm.date}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className={cardClass}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="imm-name" className={labelClass}>Vaccine Name</label>
                                            <input id="imm-name" type="text" value={newImmunization.vaccineName} onChange={e => setNewImmunization(p => ({ ...p, vaccineName: e.target.value }))} className={inputClass} placeholder="e.g. Influenza" />
                                        </div>
                                        <div>
                                            <label htmlFor="imm-date" className={labelClass}>Date</label>
                                            <input id="imm-date" type="date" value={newImmunization.date} onChange={e => setNewImmunization(p => ({ ...p, date: e.target.value }))} className={inputClass} />
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleAddImmunization} className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors min-h-[44px]">+ Add Immunization</button>
                                </div>
                            </section>

                            {/* Family History */}
                            <section aria-labelledby="fh-heading">
                                <h3 id="fh-heading" className={sectionTitle}>Family History</h3>
                                {(selectedPatient?.familyHistory || []).length > 0 && (
                                    <ul className="space-y-1 mb-3">
                                        {selectedPatient!.familyHistory!.map((fh, i) => (
                                            <li key={fh.id || i} className="flex justify-between text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                                                <span className="font-medium text-gray-700 dark:text-gray-200">{fh.condition}</span>
                                                <span className="text-gray-400 text-xs">{fh.relativeType}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className={cardClass}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="fh-relative" className={labelClass}>Relative</label>
                                            <input id="fh-relative" type="text" value={newFamilyEntry.relativeType} onChange={e => setNewFamilyEntry(p => ({ ...p, relativeType: e.target.value }))} className={inputClass} placeholder="e.g. Mother" />
                                        </div>
                                        <div>
                                            <label htmlFor="fh-condition" className={labelClass}>Condition</label>
                                            <input id="fh-condition" type="text" value={newFamilyEntry.condition} onChange={e => setNewFamilyEntry(p => ({ ...p, condition: e.target.value }))} className={inputClass} placeholder="e.g. Diabetes" />
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleAddFamilyEntry} className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors min-h-[44px]">+ Add Family History</button>
                                </div>
                            </section>

                            {/* Social History */}
                            <section aria-labelledby="sh-heading">
                                <h3 id="sh-heading" className={sectionTitle}>Social History</h3>
                                {(selectedPatient?.socialHistory || []).length > 0 && (
                                    <ul className="space-y-1 mb-3">
                                        {selectedPatient!.socialHistory!.map((sh, i) => (
                                            <li key={sh.id || i} className="flex justify-between text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                                                <span className="font-medium text-gray-700 dark:text-gray-200">{sh.domain}</span>
                                                <span className="text-gray-400 text-xs">{sh.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className={cardClass}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="sh-domain" className={labelClass}>Category</label>
                                            <select id="sh-domain" value={newSocialEntry.domain} onChange={e => setNewSocialEntry(p => ({ ...p, domain: e.target.value }))} className={inputClass + ' appearance-none'}>
                                                <option value="">Select...</option>
                                                <option value="Smoking">Smoking</option>
                                                <option value="Alcohol">Alcohol</option>
                                                <option value="Substance Use">Substance Use</option>
                                                <option value="Occupation">Occupation</option>
                                                <option value="Exercise">Exercise</option>
                                                <option value="Living Situation">Living Situation</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="sh-value" className={labelClass}>Details</label>
                                            <input id="sh-value" type="text" value={newSocialEntry.value} onChange={e => setNewSocialEntry(p => ({ ...p, value: e.target.value }))} className={inputClass} placeholder="e.g. Never smoker" />
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleAddSocialEntry} className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors min-h-[44px]">+ Add Social History</button>
                                </div>
                            </section>
                        </>
                    )}

                    {/* ============ LEGAL TAB ============ */}
                    {activeTab === 'legal' && (
                        <>
                            <section aria-labelledby="ad-heading">
                                <h3 id="ad-heading" className={sectionTitle}>Advanced Directives</h3>
                                <div className={cardClass}>
                                    <div className="flex items-center space-x-6">
                                        <label className="flex items-center space-x-2 cursor-pointer min-h-[44px]">
                                            <input
                                                type="checkbox"
                                                checked={directives.dnr ?? false}
                                                onChange={e => setDirectives(d => ({ ...d, dnr: e.target.checked }))}
                                                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">DNR</span>
                                        </label>
                                        <label className="flex items-center space-x-2 cursor-pointer min-h-[44px]">
                                            <input
                                                type="checkbox"
                                                checked={directives.dni ?? false}
                                                onChange={e => setDirectives(d => ({ ...d, dni: e.target.checked }))}
                                                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">DNI</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label htmlFor="ad-polst" className={labelClass}>POLST Summary</label>
                                        <textarea id="ad-polst" value={directives.polstSummary || ''} onChange={e => setDirectives(d => ({ ...d, polstSummary: e.target.value }))} rows={2} className={inputClass + ' resize-none'} placeholder="Brief description of POLST orders..." />
                                    </div>
                                    <div>
                                        <label htmlFor="ad-review" className={labelClass}>Last Reviewed</label>
                                        <input id="ad-review" type="date" value={directives.lastReviewDate || ''} onChange={e => setDirectives(d => ({ ...d, lastReviewDate: e.target.value }))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="ad-notes" className={labelClass}>Notes</label>
                                        <textarea id="ad-notes" value={directives.notes || ''} onChange={e => setDirectives(d => ({ ...d, notes: e.target.value }))} rows={2} className={inputClass + ' resize-none'} placeholder="Additional directive details..." />
                                    </div>
                                </div>
                            </section>

                            <section aria-labelledby="pc-heading">
                                <h3 id="pc-heading" className={sectionTitle}>HIPAA / Privacy Consent</h3>
                                <div className={cardClass}>
                                    <label className="flex items-center space-x-2 cursor-pointer min-h-[44px]">
                                        <input
                                            type="checkbox"
                                            checked={privacyConsent.consentGiven}
                                            onChange={e => setPrivacyConsent(p => ({
                                                ...p,
                                                consentGiven: e.target.checked,
                                                consentDate: e.target.checked ? new Date().toISOString().split('T')[0] : p.consentDate,
                                            }))}
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Consent Given</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="pc-type" className={labelClass}>Consent Type</label>
                                            <select id="pc-type" value={privacyConsent.consentType} onChange={e => setPrivacyConsent(p => ({ ...p, consentType: e.target.value as PrivacyConsent['consentType'] }))} className={inputClass + ' appearance-none'}>
                                                <option value="HIPAA">HIPAA</option>
                                                <option value="Marketing">Marketing</option>
                                                <option value="Research">Research</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="pc-date" className={labelClass}>Consent Date</label>
                                            <input id="pc-date" type="date" value={privacyConsent.consentDate} onChange={e => setPrivacyConsent(p => ({ ...p, consentDate: e.target.value }))} className={inputClass} />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="pc-withdrawn" className={labelClass}>Withdrawn Date (if applicable)</label>
                                        <input id="pc-withdrawn" type="date" value={privacyConsent.withdrawnDate || ''} onChange={e => setPrivacyConsent(p => ({ ...p, withdrawnDate: e.target.value || undefined }))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="pc-notes" className={labelClass}>Notes</label>
                                        <textarea id="pc-notes" value={privacyConsent.notes || ''} onChange={e => setPrivacyConsent(p => ({ ...p, notes: e.target.value }))} rows={2} className={inputClass + ' resize-none'} />
                                    </div>
                                </div>
                            </section>
                        </>
                    )}

                    {/* ============ GOALS TAB ============ */}
                    {activeTab === 'goals' && (
                        <section aria-labelledby="cg-heading">
                            <h3 id="cg-heading" className={sectionTitle}>Clinical Target Goals</h3>
                            <div className={cardClass}>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="cg-weight" className={labelClass}>Target Weight (kg)</label>
                                        <input id="cg-weight" type="number" step="0.1" value={clinicalGoals.targetWeightKg ?? ''} onChange={e => setClinicalGoals(g => ({ ...g, targetWeightKg: e.target.value ? Number(e.target.value) : undefined }))} className={inputClass} placeholder="e.g. 75" aria-describedby="cg-weight-hint" />
                                        <p id="cg-weight-hint" className="text-xs text-gray-400 mt-0.5">10 &ndash; 400 kg</p>
                                    </div>
                                    <div>
                                        <label htmlFor="cg-hba1c" className={labelClass}>Target HbA1c (%)</label>
                                        <input id="cg-hba1c" type="number" step="0.1" value={clinicalGoals.targetHba1c ?? ''} onChange={e => setClinicalGoals(g => ({ ...g, targetHba1c: e.target.value ? Number(e.target.value) : undefined }))} className={inputClass} placeholder="e.g. 7.0" aria-describedby="cg-hba1c-hint" />
                                        <p id="cg-hba1c-hint" className="text-xs text-gray-400 mt-0.5">3.0 &ndash; 20.0</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="cg-sbp" className={labelClass}>Target Systolic BP</label>
                                        <input id="cg-sbp" type="number" value={clinicalGoals.targetSystolicBp ?? ''} onChange={e => setClinicalGoals(g => ({ ...g, targetSystolicBp: e.target.value ? Number(e.target.value) : undefined }))} className={inputClass} placeholder="e.g. 130" aria-describedby="cg-sbp-hint" />
                                        <p id="cg-sbp-hint" className="text-xs text-gray-400 mt-0.5">60 &ndash; 250 mmHg</p>
                                    </div>
                                    <div>
                                        <label htmlFor="cg-dbp" className={labelClass}>Target Diastolic BP</label>
                                        <input id="cg-dbp" type="number" value={clinicalGoals.targetDiastolicBp ?? ''} onChange={e => setClinicalGoals(g => ({ ...g, targetDiastolicBp: e.target.value ? Number(e.target.value) : undefined }))} className={inputClass} placeholder="e.g. 80" aria-describedby="cg-dbp-hint" />
                                        <p id="cg-dbp-hint" className="text-xs text-gray-400 mt-0.5">30 &ndash; 160 mmHg</p>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="cg-ldl" className={labelClass}>Target LDL (mg/dL)</label>
                                    <input id="cg-ldl" type="number" value={clinicalGoals.targetLdl ?? ''} onChange={e => setClinicalGoals(g => ({ ...g, targetLdl: e.target.value ? Number(e.target.value) : undefined }))} className={inputClass} placeholder="e.g. 70" aria-describedby="cg-ldl-hint" />
                                    <p id="cg-ldl-hint" className="text-xs text-gray-400 mt-0.5">10 &ndash; 400 mg/dL</p>
                                </div>
                            </div>
                        </section>
                    )}
                </form>

                {/* Fixed footer */}
                <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 shrink-0">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-h-[44px]"
                    >
                        Log Out
                    </button>
                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            onClick={toggleSettings}
                            className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[44px]"
                        >
                            Cancel
                        </button>
                        {activeTab !== 'history' && (
                            <button
                                type="button"
                                onClick={handleSave as any}
                                disabled={isSaving}
                                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

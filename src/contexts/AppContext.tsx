
import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import type { AppState, Action } from './reducer';
import type { ActiveOperation, OperationKind } from './reducer';
import type { Patient, Message, TextMessage, Report, UploadableFile, Feedback, AiModel, ToastNotification, ClinicalDebateMessage, MultiSpecialistReviewMessage, ClinicalTask, SpecialistReport } from '../types';
import { appReducer, initialState } from './reducer';
import { fetchPatients, updatePatient, addReportMetadata, saveExtractedData, createPatient, fetchExtractedData, getPatient, softDeleteReport, restoreReport, permanentlyDeleteReport } from '../services/ehrService';
import * as apiManager from '../services/apiManager';
import { uploadReportAttachment, uploadChatAttachment } from '../services/storageService'; // NEW
import { runExtractionPipeline, type ExtractionProgress, type ExtractedPatientData } from '../services/documentExtractionPipeline';
import { generateThumbnail, stripBase64FromHistories, wouldFitInStorage, pruneToFit } from '../utils/chatStorageOptimizer';
import { getNextQuestions } from '../services/clinicalPathwaysService';
import { getFileTypeFromFile, getLinkMetadata } from '../utils';
import { getBriefing, setBriefing } from '../services/cacheService';
import { clearCacheStorage } from '../utils/storageCleaner';
import { MissingApiKeyError } from '../errors';
import * as boardCacheService from '../services/boardCacheService';

import { useAuth } from './AuthContext'; // NEW

declare const dwv: any;

const renderDicomToJpegForUpload = (file: File): Promise<UploadableFile> => {
    return new Promise((resolve, reject) => {
        try {
            const app = new dwv.App();
            app.init({ containerDivId: 'dwv-hidden' });
            app.addEventListener('loadend', () => {
                const view = app.getViewController();
                const canvas = view.getCanvas();
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                const base64Data = dataUrl.split(',')[1];
                app.reset();
                resolve({ name: file.name, mimeType: 'image/jpeg', base64Data, previewUrl: dataUrl });
            });
            app.addEventListener('error', (event: any) => { reject(new Error("Failed to render DICOM file.")); });
            const url = URL.createObjectURL(file);
            app.loadURLs([url]);
        } catch (error) { reject(error); }
    });
};

interface AppContextType {
    state: AppState & {
        selectedPatient: Patient | null;
        messages: Message[];
    };
    actions: {
        enterApp: () => void;
        selectPatient: (patientId: string) => void;
        setSearchQuery: (query: string) => void;
        // ...
        handleUpdateTasks: (patientId: string, tasks: ClinicalTask[]) => Promise<void>;
        handleSaveNotes: (patientId: string, notes: string) => Promise<void>;
        handleAddReport: (patientId: string, reportData: Omit<Report, 'id'>, file?: File) => Promise<void>;
        handleDeleteReport: (patientId: string, reportId: string) => Promise<void>;
        handleRestoreReport: (patientId: string, reportId: string) => Promise<void>;
        handlePermanentDeleteReport: (patientId: string, reportId: string) => Promise<void>;
        loadExtractedData: (patientId: string) => Promise<ExtractedPatientData>;
        extractedData: ExtractedPatientData | null;
        extractionProgress: ExtractionProgress | null;
        handleCreateAndAnalyze: (data: any) => Promise<void>;
        toggleHuddleModal: () => void;
        selectPatientFromHuddle: (patientId: string) => void;
        togglePerformanceModal: () => void;
        toggleConsultationModal: () => void;
        setViewingReport: (payload: { patient: Patient; initialReportId: string; highlightText?: string } | null) => void;
        openFeedbackForm: (message: Message) => void;
        closeFeedbackForm: () => void;
        addFeedback: (feedback: Omit<Feedback, 'id' | 'timestamp'>) => void;
        updateAiSettings: (settings: Partial<AppState['aiSettings']>) => void;
        handleSendMessage: (query: string, files?: File[], targetPatientId?: string) => void;
        handleAnalyzeReports: (reportIds: string[]) => void;
        handleAnalyzeSingleReport: (reportId: string) => void;
        handleCompareReports: (reportIds: string[]) => void;
        handleGeneratePrescription: (medications: { drug: string; suggestedDose: string }[]) => void;
        handleGenerateClinicalNote: (transcript?: string) => void;
        handleRunMultiSpecialistReview: () => void;
        handleRunClinicalDebate: () => void;
        toggleNoteModal: () => void;
        showToast: (message: string, type: ToastNotification['type']) => void;
        removeToast: (id: number) => void;
        setMobileView: (view: 'list' | 'chat') => void;
        togglePatientList: () => void;
        toggleDashboard: () => void;
        toggleLiveMode: () => void;
        toggleSettings: () => void; // NEW
        cancelActiveOperation: () => void;
        updateQuota: (quota: import('../types').QuotaSummary) => void;
    }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Removed hardcoded USER_PROFILE_ID

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, userProfile, updateGeminiApiKey } = useAuth(); // NEW
    const [state, dispatch] = useReducer(appReducer, initialState, (init) => {
        try {
            const savedChats = localStorage.getItem('chatHistories');
            const savedQs = localStorage.getItem('questionHistories');
            const savedFeedback = localStorage.getItem('zentis_feedbackHistory');
            const savedSettings = localStorage.getItem('zentis_aiSettings');
            return {
                ...init,
                chatHistories: savedChats ? JSON.parse(savedChats) : {},
                questionHistories: savedQs ? JSON.parse(savedQs) : {},
                feedbackHistory: savedFeedback ? JSON.parse(savedFeedback) : [],
                aiSettings: savedSettings ? JSON.parse(savedSettings) : init.aiSettings,
            }
        } catch {
            return init;
        }
    });

    const { selectedPatientId, allPatients, chatHistories, questionHistories, aiSettings, feedbackHistory } = state;

    // Extraction state
    const [extractedData, setExtractedData] = React.useState<ExtractedPatientData | null>(null);
    const [extractionProgress, setExtractionProgress] = React.useState<ExtractionProgress | null>(null);

    const showToast = useCallback((message: string, type: ToastNotification['type'] = 'info') => {
        const newToast: ToastNotification = { id: Date.now(), message, type };
        dispatch({ type: 'ADD_TOAST', payload: newToast });
    }, []);
    const removeToast = useCallback((id: number) => {
        dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, []);

    useEffect(() => {
        const loadPatients = async () => {
            if (!user || !userProfile) {
                dispatch({ type: 'SET_PATIENTS', payload: [] });
                return;
            }

            dispatch({ type: 'SET_APP_LOADING', payload: true });
            try {
                let patients = await fetchPatients(user.uid);

                // If user is a patient, inject themselves into the list and select
                if (userProfile?.role === 'patient') {
                    // Try to fetch full patient profile (including reports/meds) from Firestore service
                    let selfAsPatient: Patient | null = null;
                    try {
                        selfAsPatient = await getPatient(user.uid);
                    } catch (err) {
                        console.warn('Failed to fetch self-patient data:', err);
                    }

                    // Fallback: If no patient data found (new user), construct skeleton from user profile
                    if (!selfAsPatient) {
                        selfAsPatient = {
                            id: user.uid,
                            name: userProfile.displayName || 'Me',
                            age: userProfile.age ?? 0,
                            gender: userProfile.gender || 'Female',
                            weight: 70,
                            allergies: (userProfile as any).allergies || [],
                            medicalHistory: (userProfile as any).medicalHistory || [],
                            appointmentTime: '09:00',
                            currentStatus: (userProfile as any).currentStatus || {
                                condition: 'Wellness Check',
                                vitals: '',
                                medications: []
                            },
                            reports: []
                        };
                    }

                    if (!patients.find(p => p.id === user.uid)) {
                        patients = [selfAsPatient, ...patients];
                    }

                    dispatch({ type: 'SET_PATIENTS', payload: patients });
                    dispatch({ type: 'SELECT_PATIENT', payload: user.uid });
                } else if (patients.length > 0) {
                    dispatch({ type: 'SET_PATIENTS', payload: patients });
                    if (!selectedPatientId || !patients.find(p => p.id === selectedPatientId)) {
                        dispatch({ type: 'SELECT_PATIENT', payload: patients[0].id });
                    }
                } else {
                    dispatch({ type: 'SET_PATIENTS', payload: [] });
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
                showToast("Failed to load health profile.", 'error');
            } finally {
                dispatch({ type: 'SET_APP_LOADING', payload: false });
            }
        };
        loadPatients();
    }, [user, userProfile, showToast]);

    useEffect(() => {
        if (userProfile?.geminiApiKey && userProfile.geminiApiKey !== aiSettings.apiKey) {
            dispatch({ type: 'UPDATE_AI_SETTINGS', payload: { apiKey: userProfile.geminiApiKey } });
        }
    }, [userProfile, aiSettings.apiKey]);

    // Bidirectional sync: when aiSettings.apiKey changes from the Settings UI, persist to Firestore
    const updateAiSettings = useCallback((settings: Partial<AppState['aiSettings']>) => {
        dispatch({ type: 'UPDATE_AI_SETTINGS', payload: settings });
        // If the API key changed, persist it to Firestore
        if (settings.apiKey !== undefined && user) {
            updateGeminiApiKey(settings.apiKey).catch(err =>
                console.error('Failed to persist API key to Firestore:', err)
            );
        }
    }, [user, updateGeminiApiKey]);

    // -------------------------------------------------------------------------
    // Safe LocalStorage Management (Prevents Quota Crashes)
    // -------------------------------------------------------------------------

    /**
     * Proactively strips base64 data and limits message count before saving chat histories.
     * This prevents QuotaExceededError by ensuring heavy image payloads never reach localStorage.
     */
    const prepareChatHistoriesForStorage = useCallback((history: Record<string, Message[]>): Record<string, Message[]> => {
        // Always strip base64 first (images are in Firebase Storage via storageUrl)
        let cleaned = stripBase64FromHistories(history);

        // Check if it fits; if not, prune more aggressively
        if (!wouldFitInStorage(cleaned)) {
            cleaned = pruneToFit(history);
        }

        return cleaned;
    }, []);

    const safeSetItem = useCallback((key: string, value: any, preProcessor?: (val: any) => any) => {
        try {
            const processedValue = preProcessor ? preProcessor(value) : value;
            localStorage.setItem(key, JSON.stringify(processedValue));
        } catch (error: any) {
            // Check for QuotaExceededError
            if (error.name === 'QuotaExceededError' || error.code === 22 || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn(`[safeSetItem] Quota exceeded saving '${key}'. Running cache eviction…`);
                showToast('Storage limit reached. Optimizing space…', 'warning');

                // 1. Evict temporary caches via the centralized utility
                const evicted = clearCacheStorage();

                if (evicted > 0) {
                    try {
                        const processedValue = preProcessor ? preProcessor(value) : value;
                        localStorage.setItem(key, JSON.stringify(processedValue));
                        return;
                    } catch {
                        console.warn('[safeSetItem] Retry after cache eviction still failed.');
                    }
                }

                // 2. Last resort: aggressively prune chat histories
                if (key === 'chatHistories') {
                    try {
                        console.warn(`[safeSetItem] Aggressively pruning '${key}'…`);
                        const aggressivelyPruned = pruneToFit(value, 20);
                        localStorage.setItem(key, JSON.stringify(aggressivelyPruned));
                    } catch (pruneError) {
                        console.error(`[safeSetItem] Failed to save '${key}' even after aggressive pruning.`, pruneError);
                    }
                }
            } else {
                console.error(`[safeSetItem] Failed to save '${key}':`, error);
            }
        }
    }, [showToast]);

    useEffect(() => {
        safeSetItem('chatHistories', chatHistories, prepareChatHistoriesForStorage);
    }, [chatHistories, safeSetItem, prepareChatHistoriesForStorage]);

    useEffect(() => {
        safeSetItem('questionHistories', questionHistories);
    }, [questionHistories, safeSetItem]);

    useEffect(() => {
        safeSetItem('zentis_feedbackHistory', feedbackHistory);
    }, [feedbackHistory, safeSetItem]);

    useEffect(() => {
        safeSetItem('zentis_aiSettings', aiSettings);
    }, [aiSettings, safeSetItem]);

    const selectedPatient = useMemo(() => allPatients.find(p => p.id === selectedPatientId) || null, [allPatients, selectedPatientId]);
    const messages = useMemo(() => selectedPatientId ? (chatHistories[selectedPatientId] || []) : [], [chatHistories, selectedPatientId]);

    useEffect(() => {
        if (!selectedPatient) return;
        const patientId = selectedPatient.id;

        const loadChat = async () => {
            const existingHistory = chatHistories[patientId];
            if (!existingHistory || existingHistory.length === 0) {
                dispatch({ type: 'SET_CHAT_LOADING', payload: true });
                try {
                    const cachedBriefing = getBriefing(patientId);
                    let briefing: Message;

                    if (cachedBriefing) {
                        briefing = JSON.parse(cachedBriefing);
                    } else {
                        briefing = await apiManager.getPreVisitBriefing(selectedPatient, aiSettings);
                        setBriefing(patientId, JSON.stringify(briefing));
                    }

                    briefing.id = Date.now();
                    const hasRecords = selectedPatient.reports && selectedPatient.reports.length > 0;
                    const welcomeMsg: TextMessage = {
                        id: Date.now() - 100,
                        sender: 'ai',
                        type: 'text',
                        text: hasRecords
                            ? `**Welcome back, ${selectedPatient.name}.**\nI've analyzed your medical records. Here is your current health summary.`
                            : `**Welcome, ${selectedPatient.name}!** 👋\nI'm your **Personal Health Assistant**. You can ask me any medical or health questions, and I'll do my best to help.\n\n📎 **Tip:** Upload health documents (lab results, imaging, prescriptions) using the sidebar for personalized analysis and insights.`
                    }
                    dispatch({ type: 'SET_MESSAGES', payload: { patientId, messages: [welcomeMsg, briefing] } });
                } catch (error: any) {
                    console.error("Failed to get briefing:", error);
                    const errorMsg: TextMessage = { id: Date.now(), sender: 'ai', type: 'text', text: `**Welcome, ${selectedPatient.name}!** 👋\nI'm your **Personal Health Assistant**. Ask me any health or medical question, or upload documents for personalized analysis.` };
                    dispatch({ type: 'SET_MESSAGES', payload: { patientId, messages: [errorMsg] } });
                } finally {
                    dispatch({ type: 'SET_CHAT_LOADING', payload: false });
                }
            } else {
                dispatch({ type: 'SET_CHAT_LOADING', payload: false });
            }
        };
        loadChat();
    }, [selectedPatient, aiSettings, chatHistories, showToast]);

    useEffect(() => {
        if (!selectedPatient) return;
        const userHistory = questionHistories[selectedPatient.id] || [];
        const questions = getNextQuestions(selectedPatient, userHistory);
        dispatch({ type: 'SET_RECOMMENDED_QUESTIONS', payload: questions });
    }, [selectedPatient, questionHistories]);

    const enterApp = useCallback(() => dispatch({ type: 'ENTER_APP' }), []); // NEW
    const selectPatient = useCallback((patientId: string) => dispatch({ type: 'SELECT_PATIENT', payload: patientId }), []);
    const setSearchQuery = useCallback((query: string) => dispatch({ type: 'SET_SEARCH_QUERY', payload: query }), []);
    const toggleHuddleModal = useCallback(async () => {
        if (!state.isHuddleModalOpen && !state.dailyHuddleData) {
            dispatch({ type: 'SET_HUDDLE_DATA', payload: { data: null, isLoading: true, error: null } });
            try {
                const data = await apiManager.getDailyHuddle(allPatients, state.aiSettings);
                dispatch({ type: 'SET_HUDDLE_DATA', payload: { data, isLoading: false, error: null } });
            } catch (error: any) {
                const errorMessage = error.message || "Failed to generate Brief.";
                showToast(errorMessage, 'error');
                dispatch({ type: 'SET_HUDDLE_DATA', payload: { data: null, isLoading: false, error: errorMessage } });
            }
        }
        dispatch({ type: 'TOGGLE_HUDDLE_MODAL' });
    }, [state.isHuddleModalOpen, state.dailyHuddleData, allPatients, showToast]);

    const selectPatientFromHuddle = useCallback((patientId: string) => {
        selectPatient(patientId);
        dispatch({ type: 'TOGGLE_HUDDLE_MODAL' });
    }, [selectPatient]);

    const setViewingReport = useCallback((payload: { patient: Patient; initialReportId: string; highlightText?: string } | null) => dispatch({ type: 'SET_VIEWING_REPORT', payload }), []);
    const toggleConsultationModal = useCallback(() => dispatch({ type: 'TOGGLE_CONSULTATION_MODAL' }), []);
    const togglePerformanceModal = useCallback(() => dispatch({ type: 'TOGGLE_PERFORMANCE_MODAL' }), []);
    const openFeedbackForm = useCallback((message: Message) => dispatch({ type: 'OPEN_FEEDBACK_FORM', payload: message }), []);
    const closeFeedbackForm = useCallback(() => dispatch({ type: 'CLOSE_FEEDBACK_FORM' }), []);
    const addFeedback = useCallback((feedbackData: Omit<Feedback, 'id' | 'timestamp'>) => {
        const newFeedback: Feedback = { ...feedbackData, id: Date.now(), timestamp: Date.now() };
        dispatch({ type: 'ADD_FEEDBACK', payload: newFeedback });
        showToast('Feedback submitted.', 'success');
    }, [showToast]);
    // updateAiSettings is defined earlier with bidirectional Firestore sync
    const setMobileView = useCallback((view: 'list' | 'chat') => dispatch({ type: 'SET_MOBILE_VIEW', payload: view }), []);
    const togglePatientList = useCallback(() => dispatch({ type: 'TOGGLE_PATIENT_LIST' }), []);
    const toggleDashboard = useCallback(() => dispatch({ type: 'TOGGLE_DASHBOARD' }), []);
    const toggleLiveMode = useCallback(() => dispatch({ type: 'TOGGLE_LIVE_MODE' }), []);
    const toggleSettings = useCallback(() => dispatch({ type: 'TOGGLE_SETTINGS' }), []); // NEW
    const toggleNoteModal = useCallback(() => dispatch({ type: 'TOGGLE_NOTE_MODAL' }), []);

    const updateQuota = useCallback((quota: import('../types').QuotaSummary) => {
        dispatch({ type: 'UPDATE_QUOTA', payload: quota });
    }, []);

    // Operation tracking ref — keeps current opId accessible in async closures
    const activeOpRef = React.useRef<number>(0);

    const startOperation = useCallback((kind: OperationKind): number => {
        const opId = Date.now();
        activeOpRef.current = opId;
        dispatch({ type: 'SET_ACTIVE_OPERATION', payload: { id: opId, kind, cancelRequested: false } });
        dispatch({ type: 'SET_CHAT_STATUS', payload: null });
        return opId;
    }, []);

    const isOpCancelled = useCallback((opId: number): boolean => {
        return activeOpRef.current !== opId;
    }, []);

    const finishOperation = useCallback((opId: number) => {
        // Only clear if this op is still the active one
        if (activeOpRef.current === opId) {
            dispatch({ type: 'SET_ACTIVE_OPERATION', payload: null });
            dispatch({ type: 'SET_CHAT_STATUS', payload: null });
        }
    }, []);

    const cancelActiveOperation = useCallback(() => {
        activeOpRef.current = 0; // invalidate any in-flight op
        dispatch({ type: 'REQUEST_CANCEL_OPERATION' });
        // Clear the "Stopped" text after a short delay
        setTimeout(() => {
            dispatch({ type: 'SET_CHAT_STATUS', payload: null });
            dispatch({ type: 'SET_ACTIVE_OPERATION', payload: null });
        }, 1500);
    }, []);

    const handleSaveNotes = useCallback(async (patientId: string, notes: string) => {
        const patient = allPatients.find(p => p.id === patientId);
        if (!patient) return;
        const updated = { ...patient, notes };
        await updatePatient(updated);
        dispatch({ type: 'UPDATE_PATIENT_DATA', payload: updated });
    }, [allPatients]);

    const handleUpdateTasks = useCallback(async (patientId: string, tasks: ClinicalTask[]) => {
        const patient = allPatients.find(p => p.id === patientId);
        if (!patient) return;
        const updated = { ...patient, tasks };
        await updatePatient(updated);
        dispatch({ type: 'UPDATE_PATIENT_DATA', payload: updated });
    }, [allPatients]);

    const handleAddReport = useCallback(async (patientId: string, reportData: Omit<Report, 'id'>, file?: File) => {
        const patient = allPatients.find(p => p.id === patientId);
        if (!patient) return;

        let finalReport = { ...reportData, id: `rep_${Date.now()}` };

        if (file) {
            try {
                const downloadUrl = await uploadReportAttachment(file, patientId);
                // Update the content url if it exists
                if (typeof finalReport.content === 'object' && finalReport.content !== null && 'url' in finalReport.content) {
                    finalReport.content = { ...finalReport.content, url: downloadUrl };
                }
            } catch (error) {
                console.error("Failed to upload report file:", error);
                showToast("Failed to upload file, saving report without attachment.", "error");
            }
        }

        const newReport = finalReport as Report;

        // 1. Save metadata to sub-collection FIRST — must complete before extraction
        // so the Firestore document exists when the pipeline tries to update it.
        try {
            await addReportMetadata(patientId, newReport);
        } catch (error) {
            console.error("Failed to save report metadata:", error);
        }

        // 2. Trigger AI Extraction Pipeline AFTER metadata is persisted
        if (aiSettings.apiKey) {
            showToast("AI is extracting clinical data from this document...", "info");
            (async () => {
                try {
                    const result = await runExtractionPipeline(
                        patientId,
                        newReport as Report & { id: string },
                        aiSettings.apiKey!,
                        file,
                        (progress) => {
                            setExtractionProgress(progress);
                            if (progress.status === 'completed') {
                                showToast(progress.message, 'success');
                                // Refresh extracted data cache
                                loadExtractedDataFn(patientId);
                            } else if (progress.status === 'failed') {
                                showToast(progress.message, 'error');
                            }
                        }
                    );

                    // Persist OCR-extracted text back to state and Firestore so future analysis can use it
                    if (result.rawExtractedText && !newReport.rawTextForAnalysis) {
                        dispatch({
                            type: 'UPDATE_REPORT_EXTRACTED_TEXT',
                            payload: { patientId, reportId: newReport.id, rawTextForAnalysis: result.rawExtractedText }
                        });
                        // Also persist to Firestore via patient update
                        try {
                            const latestPatient = allPatients.find(p => p.id === patientId);
                            if (latestPatient) {
                                const updatedReports = latestPatient.reports.map(r =>
                                    r.id === newReport.id ? { ...r, rawTextForAnalysis: result.rawExtractedText } : r
                                );
                                // Include newly added report if not yet in latestPatient
                                const hasNewReport = latestPatient.reports.some(r => r.id === newReport.id);
                                const finalReports = hasNewReport ? updatedReports : [...updatedReports, { ...newReport, rawTextForAnalysis: result.rawExtractedText }];
                                await updatePatient({ ...latestPatient, reports: finalReports });
                            }
                        } catch (persistErr) {
                            console.warn("Failed to persist extracted text to Firestore:", persistErr);
                        }
                    }
                } catch (err) {
                    console.error("Background extraction failed:", err);
                }
            })();
        }

        const updated = { ...patient, reports: [...patient.reports, newReport] };
        await updatePatient(updated);
        dispatch({ type: 'UPDATE_PATIENT_DATA', payload: updated });
    }, [allPatients, showToast, aiSettings.apiKey]);

    const handleDeleteReport = useCallback(async (patientId: string, reportId: string) => {
        try {
            await softDeleteReport(patientId, reportId);
            dispatch({ type: 'DELETE_REPORT', payload: { patientId, reportId } });
            showToast("Report moved to trash.", 'success');
        } catch (error) {
            console.error("Failed to delete report:", error);
            showToast("Failed to delete report.", 'error');
        }
    }, [showToast]);

    const handleRestoreReport = useCallback(async (patientId: string, reportId: string) => {
        try {
            await restoreReport(patientId, reportId);
            dispatch({ type: 'RESTORE_REPORT', payload: { patientId, reportId } });
            showToast("Report restored.", 'success');
        } catch (error) {
            console.error("Failed to restore report:", error);
            showToast("Failed to restore report.", 'error');
        }
    }, [showToast]);

    const handlePermanentDeleteReport = useCallback(async (patientId: string, reportId: string) => {
        try {
            const patient = allPatients.find(p => p.id === patientId);
            const report = patient?.reports.find(r => r.id === reportId);

            // Get download URL if it exists to delete from storage
            let downloadUrl;
            if (report && typeof report.content === 'object' && report.content !== null && 'url' in report.content) {
                downloadUrl = (report.content as any).url;
            }

            await permanentlyDeleteReport(patientId, reportId, downloadUrl);
            dispatch({ type: 'PERMANENTLY_DELETE_REPORT', payload: { patientId, reportId } });
            showToast("Report deleted permanently.", 'success');
        } catch (error) {
            console.error("Failed to permanently delete report:", error);
            showToast("Failed to delete report permanently.", 'error');
        }
    }, [allPatients, showToast]);

    // Load extracted data from Firestore
    const loadExtractedDataFn = useCallback(async (patientId: string): Promise<ExtractedPatientData> => {
        try {
            const data = await fetchExtractedData(patientId);
            setExtractedData(data);
            return data;
        } catch (error) {
            console.error('Failed to load extracted data:', error);
            return { medications: [], labs: [], vitals: [], diagnoses: [] };
        }
    }, []);

    // Auto-load extracted data when patient changes
    useEffect(() => {
        if (selectedPatientId) {
            loadExtractedDataFn(selectedPatientId);
        } else {
            setExtractedData(null);
        }
    }, [selectedPatientId, loadExtractedDataFn]);



    const handleSendMessage = useCallback(async (query: string, files: File[] = [], targetPatientId?: string) => {
        const patientIdToUse = targetPatientId || selectedPatientId;
        if (!patientIdToUse) return;

        const patient = allPatients.find(p => p.id === patientIdToUse);
        if (!patient) return;

        const opId = startOperation('chat');

        dispatch({ type: 'UPDATE_QUESTION_HISTORY', payload: { patientId: patientIdToUse, question: query } });
        dispatch({ type: 'SET_CHAT_LOADING', payload: true });

        try {
            if (files.length > 0) {
                // Step 1: Read raw file data for the API call
                dispatch({ type: 'SET_CHAT_STATUS', payload: 'Reading files…' });
                const processedFiles: UploadableFile[] = await Promise.all(files.map(async file => {
                    const isDicom = file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom';
                    if (isDicom) return renderDicomToJpegForUpload(file);
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    return { name: file.name, mimeType: file.type, base64Data: dataUrl.split(',')[1], previewUrl: dataUrl };
                }));

                if (isOpCancelled(opId)) return;

                // Step 2: Upload to Firebase Storage & generate thumbnails
                dispatch({ type: 'SET_CHAT_STATUS', payload: 'Uploading attachments…' });
                const storageEnhancedFiles: UploadableFile[] = await Promise.all(processedFiles.map(async (pf, i) => {
                    let storageUrl = '';
                    let thumbnailBase64 = '';
                    try {
                        const blob = await fetch(`data:${pf.mimeType};base64,${pf.base64Data}`).then(r => r.blob());
                        const fileObj = new File([blob], pf.name || `upload_${i}`, { type: pf.mimeType });
                        storageUrl = await uploadChatAttachment(fileObj, patientIdToUse);
                    } catch (uploadErr) {
                        console.warn(`[Chat] Failed to upload file ${pf.name} to storage:`, uploadErr);
                    }
                    try {
                        if (pf.mimeType.startsWith('image/')) {
                            thumbnailBase64 = await generateThumbnail(pf.base64Data, pf.mimeType);
                        }
                    } catch (thumbErr) {
                        console.warn(`[Chat] Thumbnail generation failed for ${pf.name}:`, thumbErr);
                    }
                    return { ...pf, storageUrl, thumbnailBase64 };
                }));

                if (isOpCancelled(opId)) return;

                // Step 3: Add user message to chat
                const userMsg = { id: Date.now(), sender: 'user' as const, type: 'multi_file' as const, text: query, files: storageEnhancedFiles };
                dispatch({ type: 'ADD_MESSAGE', payload: { patientId: patientIdToUse, message: userMsg } });

                // Step 4: Call Gemini API
                dispatch({ type: 'SET_CHAT_STATUS', payload: 'Analyzing documents…' });
                const aiMsg = await apiManager.runMultiModalAnalysisAgent(query, processedFiles, patient, aiSettings);

                if (isOpCancelled(opId)) return;

                aiMsg.id = Date.now() + 1;
                dispatch({ type: 'ADD_MESSAGE', payload: { patientId: patientIdToUse, message: aiMsg } });
            } else {
                const userMsg = { id: Date.now(), sender: 'user' as const, type: 'text' as const, text: query };
                dispatch({ type: 'ADD_MESSAGE', payload: { patientId: patientIdToUse, message: userMsg } });

                dispatch({ type: 'SET_CHAT_STATUS', payload: 'Thinking…' });

                let aiMsg;
                if (query.toLowerCase().startsWith('(thinking...)')) {
                    const cleanQuery = query.replace('(Thinking...)', '').trim();
                    aiMsg = await apiManager.runDeepReasoning(patient, cleanQuery, aiSettings);
                } else {
                    aiMsg = await apiManager.getAiResponse(query, patient, aiSettings);
                }

                if (isOpCancelled(opId)) return;

                aiMsg.id = Date.now() + 1;
                dispatch({ type: 'ADD_MESSAGE', payload: { patientId: patientIdToUse, message: aiMsg } });
            }
        } catch (error: any) {
            if (isOpCancelled(opId)) return;
            console.error("Send message error:", error);
            const isMissingKey = error instanceof MissingApiKeyError || error?.name === 'MissingApiKeyError';
            const errorStr = String(error.message || error);
            const isServiceOverloaded = errorStr.includes('503') || errorStr.includes('UNAVAILABLE') || errorStr.includes('high demand');
            const errorMessage = isMissingKey
                ? 'Please add your Gemini API Key in Settings → Personalization to use AI features.'
                : isServiceOverloaded
                    ? 'The AI service is temporarily at capacity. Please try again in a moment.'
                    : (error.message || 'Failed to get AI response.');
            showToast(errorMessage, 'error');
            const errorMsg: TextMessage = {
                id: Date.now() + 1,
                sender: 'ai',
                type: 'text',
                text: isMissingKey
                    ? '🔑 **API Key Required**\n\nTo use AI-powered features, please add your Gemini API Key:\n1. Click the ⚙️ **Settings** icon\n2. Go to the **Personalization** tab\n3. Enter your key and click **Save**\n\n[Get a free key from Google AI Studio](https://aistudio.google.com/app/apikey)'
                    : `Sorry, an error occurred: ${errorMessage}`
            };
            dispatch({ type: 'ADD_MESSAGE', payload: { patientId: patientIdToUse, message: errorMsg } });
        } finally {
            dispatch({ type: 'SET_CHAT_LOADING', payload: false });
            finishOperation(opId);
        }
    }, [selectedPatientId, allPatients, aiSettings, showToast, startOperation, isOpCancelled, finishOperation]);

    const handleCreateAndAnalyze = useCallback(async (data: any) => {
        if (!user) return;

        try {
            dispatch({ type: 'TOGGLE_CONSULTATION_MODAL' });
            showToast("Creating patient profile...", "info");

            // 1. Create Patient
            const newPatientData: Partial<Patient> = {
                name: data.patientName,
                age: data.age,
                gender: data.gender,
                currentStatus: {
                    condition: 'New Consultation',
                    vitals: '',
                    medications: []
                },
                reports: [],
                notes: data.prompt
            };

            const newPatientId = await createPatient(user.uid, newPatientData);

            // 2. Refresh Patient List
            const updatedPatients = await fetchPatients(user.uid);
            dispatch({ type: 'SET_PATIENTS', payload: updatedPatients });
            dispatch({ type: 'SELECT_PATIENT', payload: newPatientId });

            // 3. Handle Files and Analysis
            if (data.files && data.files.length > 0) {
                // Trigger message sending with files
                // We need to wait a bit for the state to update or pass the patient object directly
                const newPatient = updatedPatients.find(p => p.id === newPatientId);
                if (newPatient) {
                    // We use a slight delay to ensure UI transition is smooth
                    setTimeout(() => {
                        handleSendMessage(data.prompt || "Analyze these documents.", data.files, newPatientId);
                    }, 500);
                }
            } else if (data.prompt) {
                setTimeout(() => {
                    handleSendMessage(data.prompt, [], newPatientId);
                }, 500);
            }

            showToast("Patient created successfully.", "success");

        } catch (error) {
            console.error("Error creating patient:", error);
            showToast("Failed to create patient.", "error");
        }
    }, [user, showToast, dispatch, handleSendMessage]);

    const handleAnalyzeReports = useCallback(async (reportIds: string[]) => {
        if (!selectedPatient) return;
        const reports = selectedPatient.reports.filter(r => reportIds.includes(r.id));
        const userQuery = `Analyze ${reportIds.length} selected report(s)`;
        const userMsg: TextMessage = { id: Date.now(), sender: 'user', type: 'text', text: userQuery };
        dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: userMsg } });
        dispatch({ type: 'SET_CHAT_LOADING', payload: true });
        try {
            let aiMsg: Message;
            if (reports.length === 1) aiMsg = await apiManager.getAiSingleReportAnalysis(reports[0], selectedPatient, aiSettings);
            else aiMsg = await apiManager.getAiMultiReportAnalysis(reports, selectedPatient, aiSettings);
            aiMsg.id = Date.now() + 1;
            dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: aiMsg } });
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to analyze reports.';
            showToast(errorMessage, 'error');
            const errorMsg: TextMessage = { id: Date.now() + 1, sender: 'ai', type: 'text', text: `Sorry, I was unable to analyze the selected reports. ${errorMessage}` };
            dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: errorMsg } });
        } finally {
            dispatch({ type: 'SET_CHAT_LOADING', payload: false });
        }
    }, [selectedPatient, aiSettings, showToast]);

    const handleCompareReports = useCallback(async (reportIds: string[]) => {
        if (!selectedPatient || reportIds.length !== 2) return;
        const reports = selectedPatient.reports.filter(r => reportIds.includes(r.id)).sort((a, b) => b.date.localeCompare(a.date));
        if (reports.length !== 2) return;
        const userQuery = `Compare ${reports[0].title} and ${reports[1].title}`;
        const userMsg: TextMessage = { id: Date.now(), sender: 'user', type: 'text', text: userQuery };
        dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: userMsg } });
        dispatch({ type: 'SET_CHAT_LOADING', payload: true });
        try {
            const aiMsg = await apiManager.getAiReportComparison(reports[0], reports[1], selectedPatient, aiSettings);
            aiMsg.id = Date.now() + 1;
            dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: aiMsg } });
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to compare reports.';
            showToast(errorMessage, 'error');
            const errorMsg: TextMessage = { id: Date.now() + 1, sender: 'ai', type: 'text', text: `Sorry, I was unable to compare reports. ${errorMessage}` };
            dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: errorMsg } });
        } finally {
            dispatch({ type: 'SET_CHAT_LOADING', payload: false });
        }
    }, [selectedPatient, showToast]);

    const handleGeneratePrescription = useCallback(async (meds: { drug: string; suggestedDose: string }[]) => {
        if (!selectedPatient) return;
        const userMsg: TextMessage = { id: Date.now(), sender: 'user', type: 'text', text: "Generate prescription." };
        dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: userMsg } });
        dispatch({ type: 'SET_CHAT_LOADING', payload: true });
        try {
            const aiMsg = await apiManager.runPrescriptionGeneratorAgent(selectedPatient, meds, aiSettings);
            aiMsg.id = Date.now() + 1;
            dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: aiMsg } });
        } catch (error: any) {
            const errorMessage = error.message || 'Failed to generate prescription.';
            showToast(errorMessage, 'error');
            const errorMsg: TextMessage = { id: Date.now() + 1, sender: 'ai', type: 'text', text: `Sorry, error generating prescription. ${errorMessage}` };
            dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: errorMsg } });
        } finally {
            dispatch({ type: 'SET_CHAT_LOADING', payload: false });
        }
    }, [selectedPatient, aiSettings, showToast]);

    const handleGenerateClinicalNote = useCallback(async (transcript?: string) => {
        if (!selectedPatient) return;
        dispatch({ type: 'TOGGLE_NOTE_MODAL' });
        dispatch({ type: 'SET_NOTE_GENERATING', payload: true });

        try {
            const note = await apiManager.generateClinicalNote(selectedPatient, messages, aiSettings, transcript);
            dispatch({ type: 'SET_DRAFT_NOTE', payload: note });
        } catch (error: any) {
            console.error("Error generating note:", error);
            showToast('Failed to generate summary report.', 'error');
        } finally {
            dispatch({ type: 'SET_NOTE_GENERATING', payload: false });
        }
    }, [selectedPatient, messages, aiSettings, showToast]);

    const handleRunMultiSpecialistReview = useCallback(async () => {
        if (!selectedPatient) return;

        const opId = startOperation('board');
        dispatch({ type: 'SET_CHAT_LOADING', payload: true });

        const userMsg: TextMessage = { id: Date.now(), sender: 'user', type: 'text', text: "Run a full Multi-Specialist Review board on my case." };
        dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: userMsg } });

        const msgId = Date.now() + 1;
        let currentMessage: MultiSpecialistReviewMessage = {
            id: msgId,
            sender: 'ai',
            type: 'multi_specialist_review',
            title: `Medical Board Review: ${selectedPatient.name}`,
            isLive: true,
            specialistReports: [],
        };
        dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: currentMessage } });

        try {
            // Get board settings from state
            const { boardSettings } = state;
            const maxSpecialties = boardSettings.maxSpecialties;

            dispatch({ type: 'SET_CHAT_STATUS', payload: 'Identifying specialists…' });
            const specialties = await (await import('../services/agents/multiAgentSimulation'))
                .identifyBoardParticipants(selectedPatient, new (await import('@google/genai')).GoogleGenAI({ apiKey: aiSettings.apiKey }), false, maxSpecialties);

            // Check cache for existing opinions
            const cachedReports = boardCacheService.getCachedOpinions(selectedPatient, specialties);
            const uncachedSpecialties = specialties.filter(s => !cachedReports.has(s));

            // Start with cached reports
            let reports = Array.from(cachedReports.values());
            for (const report of reports) {
                currentMessage = { ...currentMessage, specialistReports: [...currentMessage.specialistReports, report] };
                dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentMessage } });
            }

            // Fetch only uncached specialties
            for (let i = 0; i < uncachedSpecialties.length; i++) {
                if (isOpCancelled(opId)) {
                    currentMessage = { ...currentMessage, isLive: false, title: `${currentMessage.title} (Stopped)` };
                    dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentMessage } });
                    return;
                }
                const specialty = uncachedSpecialties[i];
                dispatch({ type: 'SET_CHAT_STATUS', payload: `Consulting ${specialty}… (${i + 1 + reports.length}/${specialties.length})` });
                const report = await apiManager.generateSpecialistReport(selectedPatient, specialty, aiSettings);

                // Cache the result
                if (boardSettings.enableCache) {
                    boardCacheService.setCachedOpinion(selectedPatient, specialty, report);
                }

                currentMessage = { ...currentMessage, specialistReports: [...currentMessage.specialistReports, report] };
                dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentMessage } });
                await new Promise(resolve => setTimeout(resolve, 400)); // Reduced from 800ms since throttle handles rate limiting
            }

            // Sort reports by original specialties order
            const sortedReports = specialties
                .map(s => currentMessage.specialistReports.find(r => r.specialty === s))
                .filter((r): r is SpecialistReport => r !== undefined);

            if (isOpCancelled(opId)) {
                currentMessage = { ...currentMessage, isLive: false, title: `${currentMessage.title} (Stopped)` };
                dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentMessage } });
                return;
            }

            dispatch({ type: 'SET_CHAT_STATUS', payload: 'Synthesizing consensus…' });
            const consensus = await apiManager.consolidateBoardReports(selectedPatient, sortedReports, aiSettings);
            currentMessage = { ...currentMessage, specialistReports: sortedReports, isLive: false, consolidatedReport: consensus };
            dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentMessage } });

        } catch (error: any) {
            if (isOpCancelled(opId)) return;
            const errorMessage = error.message || 'Failed to run review.';
            showToast(errorMessage, 'error');
            const errorMsg: TextMessage = { id: Date.now() + 2, sender: 'ai', type: 'text', text: `Sorry, unable to complete the review. ${errorMessage}` };
            dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: errorMsg } });
        } finally {
            dispatch({ type: 'SET_CHAT_LOADING', payload: false });
            finishOperation(opId);
        }
    }, [selectedPatient, showToast, startOperation, isOpCancelled, finishOperation, state, aiSettings]);

    const handleRunClinicalDebate = useCallback(async () => {
        if (!selectedPatient) return;

        const opId = startOperation('critics');
        dispatch({ type: 'SET_CHAT_LOADING', payload: true });

        const userMsg: TextMessage = { id: Date.now(), sender: 'user', type: 'text', text: "Start a Grand Rounds debate for this case." };
        dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: userMsg } });

        const debateMsgId = Date.now() + 1;
        const placeholderDebate: ClinicalDebateMessage = {
            id: debateMsgId,
            sender: 'ai',
            type: 'clinical_debate',
            title: 'Initializing Grand Rounds...',
            topic: 'Pending...',
            participants: [],
            transcript: [],
            consensus: null,
            isLive: true
        };
        dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: placeholderDebate } });

        try {
            dispatch({ type: 'SET_CHAT_STATUS', payload: 'Initializing debate…' });
            const { boardSettings } = state;
            const initData = await apiManager.initializeClinicalDebate(selectedPatient, aiSettings, 6); // Limit to 6 participants for debate
            let currentDebateState: ClinicalDebateMessage = {
                ...placeholderDebate,
                title: `Grand Rounds: ${initData.topic}`,
                topic: initData.topic,
                participants: initData.participants,
                transcript: [],
            };
            dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentDebateState } });

            let turns = 0;
            const MAX_TURNS = boardSettings.maxDebateTurns; // Use configurable max turns (default 6)
            let consensusReached = false;

            while (!consensusReached && turns < MAX_TURNS) {
                if (isOpCancelled(opId)) {
                    currentDebateState = { ...currentDebateState, isLive: false, consensus: 'Debate stopped by user.' };
                    dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentDebateState } });
                    return;
                }
                turns++;
                dispatch({ type: 'SET_CHAT_STATUS', payload: `Running debate turn ${turns}…` });
                const result = await apiManager.runNextDebateTurn(selectedPatient, currentDebateState.transcript, currentDebateState.participants, currentDebateState.topic, aiSettings);
                currentDebateState = {
                    ...currentDebateState,
                    transcript: [...currentDebateState.transcript, result.nextTurn],
                    consensus: result.consensusStatement,
                    isLive: !result.consensusReached
                };
                dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentDebateState } });
                consensusReached = result.consensusReached;
                if (!consensusReached) { await new Promise(resolve => setTimeout(resolve, 1500)); }
            }

            if (!consensusReached) {
                currentDebateState = { ...currentDebateState, isLive: false, consensus: "Debate concluded without full consensus." };
                dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentDebateState } });
            }

        } catch (error: any) {
            if (isOpCancelled(opId)) return;
            const errorMessage = error.message || 'Failed to run debate.';
            showToast(errorMessage, 'error');
            dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: { ...placeholderDebate, title: 'Debate Error', isLive: false, topic: errorMessage } } });
        } finally {
            dispatch({ type: 'SET_CHAT_LOADING', payload: false });
            finishOperation(opId);
        }
    }, [selectedPatient, showToast, startOperation, isOpCancelled, finishOperation]);

    const handleAnalyzeSingleReport = useCallback((reportId: string) => handleAnalyzeReports([reportId]), [handleAnalyzeReports]);

    const value = useMemo(() => ({
        state: { ...state, selectedPatient, messages },
        actions: {
            enterApp,
            selectPatient, setSearchQuery, handleSaveNotes, handleAddReport, handleDeleteReport, handleCreateAndAnalyze,
            toggleHuddleModal, selectPatientFromHuddle, togglePerformanceModal, toggleConsultationModal,
            setViewingReport, openFeedbackForm, closeFeedbackForm, addFeedback, updateAiSettings,
            handleSendMessage, handleAnalyzeReports, handleAnalyzeSingleReport, handleCompareReports,
            handleGeneratePrescription, showToast, removeToast, setMobileView, togglePatientList,
            toggleDashboard, toggleLiveMode, toggleSettings, handleGenerateClinicalNote, toggleNoteModal,
            handleRunMultiSpecialistReview, handleRunClinicalDebate, handleUpdateTasks,
            loadExtractedData: loadExtractedDataFn,
            extractedData,
            extractionProgress,
            cancelActiveOperation,
            updateQuota,
            handleRestoreReport,
            handlePermanentDeleteReport,
        }
    }), [state, selectedPatient, messages, enterApp, selectPatient, setSearchQuery, handleSaveNotes, handleAddReport, handleCreateAndAnalyze, toggleHuddleModal, selectPatientFromHuddle, togglePerformanceModal, toggleConsultationModal, setViewingReport, openFeedbackForm, closeFeedbackForm, addFeedback, updateAiSettings, handleSendMessage, handleAnalyzeReports, handleAnalyzeSingleReport, handleCompareReports, handleGeneratePrescription, showToast, removeToast, setMobileView, togglePatientList, toggleDashboard, toggleLiveMode, handleGenerateClinicalNote, toggleNoteModal, handleRunMultiSpecialistReview, handleRunClinicalDebate, handleUpdateTasks, loadExtractedDataFn, extractedData, extractionProgress, cancelActiveOperation]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};


import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import type { AppState, Action } from './reducer';
import type { Patient, Message, TextMessage, Report, UploadableFile, Feedback, AiModel, ToastNotification, ClinicalDebateMessage, MultiSpecialistReviewMessage, ClinicalTask } from '../types';
import { appReducer, initialState } from './reducer';
import { fetchPatients, updatePatient, addReportMetadata, saveExtractedData } from '../services/ehrService';
import * as apiManager from '../services/apiManager';
import { uploadReportAttachment } from '../services/storageService'; // NEW
import { getNextQuestions } from '../services/clinicalPathwaysService';
import { getFileTypeFromFile, getLinkMetadata } from '../utils';
import { getBriefing, setBriefing } from '../services/cacheService';
import { MissingApiKeyError } from '../errors';

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
            const savedFeedback = localStorage.getItem('cardioSnap_feedbackHistory');
            const savedSettings = localStorage.getItem('cardioSnap_aiSettings');
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

    const showToast = useCallback((message: string, type: ToastNotification['type'] = 'info') => {
        const newToast: ToastNotification = { id: Date.now(), message, type };
        dispatch({ type: 'ADD_TOAST', payload: newToast });
    }, []);
    const removeToast = useCallback((id: number) => {
        dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, []);

    useEffect(() => {
        const loadPatients = async () => {
            if (!user) {
                dispatch({ type: 'SET_PATIENTS', payload: [] });
                return;
            }

            try {
                const patients = await fetchPatients(user.uid);
                // If patients found, select the first one OR if the user IS the patient, select them.
                if (patients.length > 0) {
                    dispatch({ type: 'SET_PATIENTS', payload: patients });
                    // Default selection:
                    // If we have a selectedPatientId in state that is valid, keep it? 
                    // For now, just select the first one to be safe on load.
                    if (!selectedPatientId || !patients.find(p => p.id === selectedPatientId)) {
                        dispatch({ type: 'SELECT_PATIENT', payload: patients[0].id });
                    }
                } else {
                    dispatch({ type: 'SET_PATIENTS', payload: [] });
                }
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
                showToast("Failed to load health profile.", 'error');
                dispatch({ type: 'SET_APP_LOADING', payload: false });
            }
        };
        loadPatients();
    }, [user, showToast]);

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

    useEffect(() => {
        localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
    }, [chatHistories]);

    useEffect(() => {
        localStorage.setItem('questionHistories', JSON.stringify(questionHistories));
    }, [questionHistories]);

    useEffect(() => {
        localStorage.setItem('cardioSnap_feedbackHistory', JSON.stringify(feedbackHistory));
    }, [feedbackHistory]);

    useEffect(() => {
        localStorage.setItem('cardioSnap_aiSettings', JSON.stringify(aiSettings));
    }, [aiSettings]);

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
                    const welcomeMsg: TextMessage = {
                        id: Date.now() - 100,
                        sender: 'ai',
                        type: 'text',
                        text: `**Welcome back, ${selectedPatient.name}.**\nI've analyzed your medical records. Here is your current health summary.`
                    }
                    dispatch({ type: 'SET_MESSAGES', payload: { patientId, messages: [welcomeMsg, briefing] } });
                } catch (error: any) {
                    console.error("Failed to get briefing:", error);
                    const errorMsg: TextMessage = { id: Date.now(), sender: 'ai', type: 'text', text: `Welcome. I'm ready to assist you with your health records.` };
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
    const toggleNoteModal = useCallback(() => dispatch({ type: 'TOGGLE_NOTE_MODAL' }), []);

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

        const newReport = finalReport;

        // 1. Save metadata to sub-collection (New Schema)
        try {
            await addReportMetadata(patientId, newReport);
        } catch (error) {
            console.error("Failed to save report metadata:", error);
        }

        // 2. Trigger AI Extraction in Background
        if (newReport.content && (newReport.type === 'Lab' || newReport.type === 'Meds' || newReport.type === 'PDF')) {
            showToast("AI is extracting clinical data from this report...", "info");
            (async () => {
                try {
                    const contentForAnalysis = typeof newReport.content === 'string' ? newReport.content : (newReport as any).rawTextForAnalysis || '';
                    if (!contentForAnalysis) return;

                    const extraction = await apiManager.getAiStructuredExtraction(contentForAnalysis, newReport.type, aiSettings);
                    await saveExtractedData(patientId, newReport.id, extraction);
                    showToast("Clinical data extracted and saved.", "success");

                    // Refresh patient data to show new meds/labs?
                    // Ideally we should re-fetch or update state. 
                    // For now, let's just toast.
                } catch (err) {
                    console.error("Background extraction failed:", err);
                }
            })();
        }

        const updated = { ...patient, reports: [...patient.reports, newReport] };
        await updatePatient(updated);
        dispatch({ type: 'UPDATE_PATIENT_DATA', payload: updated });
    }, [allPatients, showToast]);

    const handleCreateAndAnalyze = useCallback(async (data: any) => {
        dispatch({ type: 'TOGGLE_CONSULTATION_MODAL' });
        showToast("New profile created.", "success");
    }, [showToast]);

    const handleSendMessage = useCallback(async (query: string, files: File[] = [], targetPatientId?: string) => {
        const patientIdToUse = targetPatientId || selectedPatientId;
        if (!patientIdToUse) return;

        const patient = allPatients.find(p => p.id === patientIdToUse);
        if (!patient) return;

        dispatch({ type: 'UPDATE_QUESTION_HISTORY', payload: { patientId: patientIdToUse, question: query } });
        dispatch({ type: 'SET_CHAT_LOADING', payload: true });

        try {
            if (files.length > 0) {
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
                const userMsg = { id: Date.now(), sender: 'user' as const, type: 'multi_file' as const, text: query, files: processedFiles };
                dispatch({ type: 'ADD_MESSAGE', payload: { patientId: patientIdToUse, message: userMsg } });
                const aiMsg = await apiManager.runMultiModalAnalysisAgent(query, processedFiles, patient, aiSettings);
                aiMsg.id = Date.now() + 1;
                dispatch({ type: 'ADD_MESSAGE', payload: { patientId: patientIdToUse, message: aiMsg } });
            } else {
                const userMsg = { id: Date.now(), sender: 'user' as const, type: 'text' as const, text: query };
                dispatch({ type: 'ADD_MESSAGE', payload: { patientId: patientIdToUse, message: userMsg } });

                // --- DEEP THINKING CHECK ---
                let aiMsg;
                if (query.toLowerCase().startsWith('(thinking...)')) {
                    const cleanQuery = query.replace('(Thinking...)', '').trim();
                    aiMsg = await apiManager.runDeepReasoning(patient, cleanQuery, aiSettings);
                } else {
                    aiMsg = await apiManager.getAiResponse(query, patient, aiSettings);
                }

                aiMsg.id = Date.now() + 1;
                dispatch({ type: 'ADD_MESSAGE', payload: { patientId: patientIdToUse, message: aiMsg } });
            }
        } catch (error: any) {
            console.error("Send message error:", error);
            const isMissingKey = error instanceof MissingApiKeyError || error?.name === 'MissingApiKeyError';
            const errorMessage = isMissingKey
                ? 'Please add your Gemini API Key in Settings → Personalization to use AI features.'
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
        }
    }, [selectedPatientId, allPatients, aiSettings, showToast]);

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
            const specialties = await apiManager.identifyBoardParticipants(selectedPatient, aiSettings);
            for (const specialty of specialties) {
                const report = await apiManager.generateSpecialistReport(selectedPatient, specialty, aiSettings);
                currentMessage = { ...currentMessage, specialistReports: [...currentMessage.specialistReports, report] };
                dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentMessage } });
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            const consensus = await apiManager.consolidateBoardReports(selectedPatient, currentMessage.specialistReports, aiSettings);
            currentMessage = { ...currentMessage, isLive: false, consolidatedReport: consensus };
            dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentMessage } });

        } catch (error: any) {
            const errorMessage = error.message || 'Failed to run review.';
            showToast(errorMessage, 'error');
            const errorMsg: TextMessage = { id: Date.now() + 2, sender: 'ai', type: 'text', text: `Sorry, unable to complete the review. ${errorMessage}` };
            dispatch({ type: 'ADD_MESSAGE', payload: { patientId: selectedPatient.id, message: errorMsg } });
        }
    }, [selectedPatient, showToast]);

    const handleRunClinicalDebate = useCallback(async () => {
        if (!selectedPatient) return;
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
            const initData = await apiManager.initializeClinicalDebate(selectedPatient, aiSettings);
            let currentDebateState: ClinicalDebateMessage = {
                ...placeholderDebate,
                title: `Grand Rounds: ${initData.topic}`,
                topic: initData.topic,
                participants: initData.participants,
                transcript: [],
            };
            dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: currentDebateState } });

            let turns = 0;
            const MAX_TURNS = 12;
            let consensusReached = false;

            while (!consensusReached && turns < MAX_TURNS) {
                turns++;
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
            const errorMessage = error.message || 'Failed to run debate.';
            showToast(errorMessage, 'error');
            dispatch({ type: 'UPDATE_MESSAGE', payload: { patientId: selectedPatient.id, message: { ...placeholderDebate, title: 'Debate Error', isLive: false, topic: errorMessage } } });
        }
    }, [selectedPatient, showToast]);

    const handleAnalyzeSingleReport = useCallback((reportId: string) => handleAnalyzeReports([reportId]), [handleAnalyzeReports]);

    const value = useMemo(() => ({
        state: { ...state, selectedPatient, messages },
        actions: {
            enterApp,
            selectPatient, setSearchQuery, handleSaveNotes, handleAddReport, handleCreateAndAnalyze,
            toggleHuddleModal, selectPatientFromHuddle, togglePerformanceModal, toggleConsultationModal,
            setViewingReport, openFeedbackForm, closeFeedbackForm, addFeedback, updateAiSettings,
            handleSendMessage, handleAnalyzeReports, handleAnalyzeSingleReport, handleCompareReports,
            handleGeneratePrescription, showToast, removeToast, setMobileView, togglePatientList,
            toggleDashboard, toggleLiveMode, handleGenerateClinicalNote, toggleNoteModal,
            handleRunMultiSpecialistReview, handleRunClinicalDebate, handleUpdateTasks
        }
    }), [state, selectedPatient, messages, enterApp, selectPatient, setSearchQuery, handleSaveNotes, handleAddReport, handleCreateAndAnalyze, toggleHuddleModal, selectPatientFromHuddle, togglePerformanceModal, toggleConsultationModal, setViewingReport, openFeedbackForm, closeFeedbackForm, addFeedback, updateAiSettings, handleSendMessage, handleAnalyzeReports, handleAnalyzeSingleReport, handleCompareReports, handleGeneratePrescription, showToast, removeToast, setMobileView, togglePatientList, toggleDashboard, toggleLiveMode, handleGenerateClinicalNote, toggleNoteModal, handleRunMultiSpecialistReview, handleRunClinicalDebate, handleUpdateTasks]);

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


import type { Patient, Message, Feedback, AiPersonalizationSettings, DailyHuddle, Report, ToastNotification, ClinicalNote } from '../types';

export interface AppState {
  isAppLoading: boolean;
  allPatients: Patient[];
  selectedPatientId: string | null;
  searchQuery: string;
  
  chatHistories: Record<string, Message[]>;
  questionHistories: Record<string, string[]>;
  isChatLoading: boolean;
  recommendedQuestions: string[];
  
  feedbackHistory: Feedback[];
  aiSettings: AiPersonalizationSettings;
  
  isHuddleModalOpen: boolean;
  dailyHuddleData: DailyHuddle | null;
  isHuddleLoading: boolean;
  huddleError: string | null;
  
  viewingReport: { patient: Patient; initialReportId: string; highlightText?: string } | null;
  isConsultationModalOpen: boolean;
  isPerformanceModalOpen: boolean;
  isFeedbackFormOpen: boolean;
  messageToReview: Message | null;

  isNoteModalOpen: boolean;
  draftNote: ClinicalNote | null;
  isNoteGenerating: boolean;

  toasts: ToastNotification[];
  mobileView: 'list' | 'chat';
  isPatientListCollapsed: boolean;
  isDashboardOpen: boolean;
  isLiveModeOpen: boolean;
  isLandingPage: boolean; // NEW
}

export type Action =
  | { type: 'SET_APP_LOADING'; payload: boolean }
  | { type: 'SET_PATIENTS'; payload: Patient[] }
  | { type: 'SELECT_PATIENT'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'UPDATE_PATIENT_DATA'; payload: Patient }
  | { type: 'SET_CHAT_LOADING'; payload: boolean }
  | { type: 'SET_MESSAGES'; payload: { patientId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: { patientId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { patientId: string; message: Message } }
  | { type: 'SET_RECOMMENDED_QUESTIONS'; payload: string[] }
  | { type: 'UPDATE_QUESTION_HISTORY'; payload: { patientId: string; question: string } }
  | { type: 'ADD_FEEDBACK'; payload: Feedback }
  | { type: 'UPDATE_AI_SETTINGS'; payload: Partial<AiPersonalizationSettings> }
  | { type: 'SET_FEEDBACK_HISTORY'; payload: Feedback[] }
  | { type: 'TOGGLE_HUDDLE_MODAL' }
  | { type: 'SET_HUDDLE_DATA'; payload: { data: DailyHuddle | null; isLoading: boolean; error: string | null } }
  | { type: 'SET_VIEWING_REPORT'; payload: { patient: Patient; initialReportId: string; highlightText?: string } | null }
  | { type: 'TOGGLE_CONSULTATION_MODAL' }
  | { type: 'TOGGLE_PERFORMANCE_MODAL' }
  | { type: 'OPEN_FEEDBACK_FORM'; payload: Message }
  | { type: 'CLOSE_FEEDBACK_FORM' }
  | { type: 'ADD_TOAST'; payload: ToastNotification }
  | { type: 'REMOVE_TOAST'; payload: number }
  | { type: 'SET_MOBILE_VIEW'; payload: 'list' | 'chat' }
  | { type: 'TOGGLE_PATIENT_LIST' }
  | { type: 'TOGGLE_DASHBOARD' }
  | { type: 'TOGGLE_LIVE_MODE' }
  | { type: 'TOGGLE_NOTE_MODAL' }
  | { type: 'SET_DRAFT_NOTE'; payload: ClinicalNote | null }
  | { type: 'SET_NOTE_GENERATING'; payload: boolean }
  | { type: 'ENTER_APP' }; // NEW

export const initialState: AppState = {
  isAppLoading: true,
  allPatients: [],
  selectedPatientId: null,
  searchQuery: '',
  chatHistories: {},
  questionHistories: {},
  isChatLoading: true,
  recommendedQuestions: [],
  feedbackHistory: [],
  aiSettings: { verbosity: 'default', tone: 'default' },
  isHuddleModalOpen: false,
  dailyHuddleData: null,
  isHuddleLoading: false,
  huddleError: null,
  viewingReport: null,
  isConsultationModalOpen: false,
  isPerformanceModalOpen: false,
  isFeedbackFormOpen: false,
  messageToReview: null,
  isNoteModalOpen: false,
  draftNote: null,
  isNoteGenerating: false,
  toasts: [],
  mobileView: 'list',
  isPatientListCollapsed: false,
  isDashboardOpen: true,
  isLiveModeOpen: false,
  isLandingPage: true, // Default to true
};

export const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_APP_LOADING':
      return { ...state, isAppLoading: action.payload };
    case 'SET_PATIENTS':
      return { ...state, allPatients: action.payload, isAppLoading: false };
    case 'SELECT_PATIENT':
      return { ...state, selectedPatientId: action.payload, isChatLoading: true, recommendedQuestions: [], mobileView: 'chat', isLiveModeOpen: false };
    case 'SET_SEARCH_QUERY':
        return { ...state, searchQuery: action.payload };
    case 'UPDATE_PATIENT_DATA':
        return {
            ...state,
            allPatients: state.allPatients.map(p => p.id === action.payload.id ? action.payload : p),
        };
    case 'SET_CHAT_LOADING':
        return { ...state, isChatLoading: action.payload };
    case 'SET_MESSAGES':
        return {
            ...state,
            chatHistories: { ...state.chatHistories, [action.payload.patientId]: action.payload.messages },
        };
    case 'ADD_MESSAGE': {
        const currentHistory = state.chatHistories[action.payload.patientId] || [];
        return {
            ...state,
            chatHistories: {
                ...state.chatHistories,
                [action.payload.patientId]: [...currentHistory, action.payload.message]
            }
        };
    }
    case 'UPDATE_MESSAGE': {
        const history = state.chatHistories[action.payload.patientId] || [];
        const updatedHistory = history.map(msg => 
            msg.id === action.payload.message.id ? action.payload.message : msg
        );
        return {
            ...state,
            chatHistories: {
                ...state.chatHistories,
                [action.payload.patientId]: updatedHistory
            }
        };
    }
    case 'SET_RECOMMENDED_QUESTIONS':
        return { ...state, recommendedQuestions: action.payload };
    case 'UPDATE_QUESTION_HISTORY':
        const currentQHistory = state.questionHistories[action.payload.patientId] || [];
        if (currentQHistory.includes(action.payload.question)) return state;
        return {
            ...state,
            questionHistories: {
                ...state.questionHistories,
                [action.payload.patientId]: [...currentQHistory, action.payload.question]
            }
        };
    case 'ADD_FEEDBACK':
        const newHistory = [action.payload, ...state.feedbackHistory].slice(0, 100);
        return { ...state, feedbackHistory: newHistory, isFeedbackFormOpen: false, messageToReview: null };
    case 'SET_FEEDBACK_HISTORY':
        return { ...state, feedbackHistory: action.payload };
    case 'UPDATE_AI_SETTINGS':
        return { ...state, aiSettings: { ...state.aiSettings, ...action.payload }};
    case 'TOGGLE_HUDDLE_MODAL':
        return { ...state, isHuddleModalOpen: !state.isHuddleModalOpen };
    case 'SET_HUDDLE_DATA':
        return { ...state, dailyHuddleData: action.payload.data, isHuddleLoading: action.payload.isLoading, huddleError: action.payload.error };
    case 'SET_VIEWING_REPORT':
        return { ...state, viewingReport: action.payload };
    case 'TOGGLE_CONSULTATION_MODAL':
        return { ...state, isConsultationModalOpen: !state.isConsultationModalOpen };
    case 'TOGGLE_PERFORMANCE_MODAL':
        return { ...state, isPerformanceModalOpen: !state.isPerformanceModalOpen };
    case 'OPEN_FEEDBACK_FORM':
        return { ...state, isFeedbackFormOpen: true, messageToReview: action.payload };
    case 'CLOSE_FEEDBACK_FORM':
        return { ...state, isFeedbackFormOpen: false, messageToReview: null };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SET_MOBILE_VIEW':
        return { ...state, mobileView: action.payload };
    case 'TOGGLE_PATIENT_LIST':
        return { ...state, isPatientListCollapsed: !state.isPatientListCollapsed };
    case 'TOGGLE_DASHBOARD':
        return { ...state, isDashboardOpen: !state.isDashboardOpen };
    case 'TOGGLE_LIVE_MODE':
        return { ...state, isLiveModeOpen: !state.isLiveModeOpen };
    case 'TOGGLE_NOTE_MODAL':
        return { ...state, isNoteModalOpen: !state.isNoteModalOpen };
    case 'SET_DRAFT_NOTE':
        return { ...state, draftNote: action.payload };
    case 'SET_NOTE_GENERATING':
        return { ...state, isNoteGenerating: action.payload };
    case 'ENTER_APP':
        return { ...state, isLandingPage: false };
    default:
      return state;
  }
};

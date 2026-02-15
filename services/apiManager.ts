
import type { Message, Patient, AiPersonalizationSettings, DailyHuddle, Report, TextMessage, UploadableFile, ClinicalNote, MultiSpecialistReviewMessage, ClinicalDebateMessage, DebateTurn, DebateParticipant, SpecialistReport } from '../types';
import * as geminiService from './geminiService';
import * as utilityAgents from './agents/utilityAgents';
import * as multiAgentSimulation from './agents/multiAgentSimulation';
import { GoogleGenAI } from "@google/genai";

// --- Rate Limiting State ---
let isRateLimited = false;
let retryAfterTimestamp = 0;
const BACKOFF_DURATION_MS = 60 * 1000; // 60 seconds

const RATE_LIMIT_ERROR_MESSAGE = 'You have exceeded the API rate limit. Please wait a moment and try again.';

/**
 * A generic wrapper for API calls to handle rate limiting with exponential backoff.
 * It blocks new requests if the app is currently rate-limited and sets a backoff period
 * when a 429 error is detected.
 * @param apiCall The async function to execute.
 * @returns The result of the apiCall.
 * @throws An error if the call is blocked or if the underlying API call fails.
 */
async function handleRateLimiting<T>(apiCall: () => Promise<T>): Promise<T> {
  if (isRateLimited && Date.now() < retryAfterTimestamp) {
    console.warn(`[ApiManager] Call blocked due to rate limiting. Retry after ${new Date(retryAfterTimestamp).toLocaleTimeString()}`);
    throw new Error(RATE_LIMIT_ERROR_MESSAGE);
  }

  // If the backoff period has passed, reset the rate limit state.
  isRateLimited = false; 

  try {
    return await apiCall();
  } catch (error: any) {
    const errorString = String(error.message || error);
    // Check for the specific 429 status code or message from Gemini API
    if (errorString.includes('429') || errorString.toLowerCase().includes('resource_exhausted')) {
      console.error('[ApiManager] Rate limit exceeded. Activating backoff.');
      isRateLimited = true;
      retryAfterTimestamp = Date.now() + BACKOFF_DURATION_MS;
      // Throw a standardized error message for the UI to catch.
      throw new Error(RATE_LIMIT_ERROR_MESSAGE);
    }
    // Re-throw other types of errors
    throw error;
  }
}

// --- Wrapped Service Exports ---
// Re-export the functions from geminiService, wrapped in the rate-limiting handler.

export const getPreVisitBriefing = (patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => 
  handleRateLimiting(() => geminiService.getPreVisitBriefing(patient, aiSettings));

export const getDailyHuddle = (patients: Patient[]): Promise<DailyHuddle> =>
  handleRateLimiting(() => geminiService.getDailyHuddle(patients));
  
export const getAiResponse = (query: string, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> =>
  handleRateLimiting(() => geminiService.getAiResponse(query, patient, aiSettings));

export const runMultiModalAnalysisAgent = (prompt: string, files: UploadableFile[], patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> =>
  handleRateLimiting(() => geminiService.runMultiModalAnalysisAgent(prompt, files, patient, aiSettings));

export const getAiSingleReportAnalysis = (report: Report, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<TextMessage> =>
  handleRateLimiting(() => geminiService.getAiSingleReportAnalysis(report, patient, aiSettings));

export const getAiMultiReportAnalysis = (reports: Report[], patient: Patient, aiSettings: AiPersonalizationSettings): Promise<TextMessage> =>
  handleRateLimiting(() => geminiService.getAiMultiReportAnalysis(reports, patient, aiSettings));
  
export const getAiReportComparison = (currentReport: Report, previousReport: Report, patient: Patient): Promise<Message> =>
  handleRateLimiting(() => geminiService.getAiReportComparison(currentReport, previousReport, patient));

export const runPrescriptionGeneratorAgent = (patient: Patient, medications: { drug: string; suggestedDose: string }[], aiSettings: AiPersonalizationSettings): Promise<Message> =>
  handleRateLimiting(() => geminiService.runPrescriptionGeneratorAgent(patient, medications, aiSettings));
  
export const getAiSmartReportAnalysis = async (reportContent: string, reportType: Report['type']): Promise<{ suggestedTitle: string; extractedDate: string; summary: string; keyFindings: string[] }> => {
    return handleRateLimiting(() => geminiService.getAiSmartReportAnalysis(reportContent, reportType));
};

export const generateClinicalNote = async (patient: Patient, chatHistory: Message[], aiSettings: AiPersonalizationSettings, transcript?: string): Promise<ClinicalNote> => {
    return handleRateLimiting(() => geminiService.generateClinicalNote(patient, chatHistory, aiSettings, transcript));
};

export const analyzeReasonForConsult = async (files: File[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return handleRateLimiting(() => utilityAgents.runConsultReasonAgent(files, ai));
};

// New Multi-Agent Functions (Granular)
export const identifyBoardParticipants = async (patient: Patient): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return handleRateLimiting(() => multiAgentSimulation.identifyBoardParticipants(patient, ai));
};

export const generateSpecialistReport = async (patient: Patient, specialty: string): Promise<SpecialistReport> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return handleRateLimiting(() => multiAgentSimulation.generateSpecialistOpinion(patient, specialty, ai));
};

export const consolidateBoardReports = async (patient: Patient, reports: SpecialistReport[]): Promise<{ summary: string; conflicts: string; finalPlan: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return handleRateLimiting(() => multiAgentSimulation.generateBoardConsensus(patient, reports, ai));
};

// Legacy single-shot
export const runMultiSpecialistReview = async (patient: Patient): Promise<MultiSpecialistReviewMessage> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return handleRateLimiting(() => multiAgentSimulation.runMultiSpecialistReviewAgent(patient, ai));
};

export const initializeClinicalDebate = async (patient: Patient): Promise<{ topic: string, participants: DebateParticipant[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return handleRateLimiting(() => multiAgentSimulation.initializeDebateAgent(patient, ai));
};

export const runNextDebateTurn = async (patient: Patient, transcript: DebateTurn[], participants: DebateParticipant[], topic: string): Promise<{ nextTurn: DebateTurn, consensusReached: boolean, consensusStatement: string | null }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return handleRateLimiting(() => multiAgentSimulation.runNextDebateTurnAgent(patient, transcript, participants, topic, ai));
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return handleRateLimiting(() => utilityAgents.runAudioTranscriptionAgent(audioBlob, ai));
};

export const generateSpeech = async (text: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return handleRateLimiting(() => utilityAgents.generateSpeechAgent(text, ai));
};

export const runDeepReasoning = async (patient: Patient, query: string): Promise<TextMessage> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return handleRateLimiting(() => utilityAgents.runDeepThinkingAgent(patient, query, ai));
};

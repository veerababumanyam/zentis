
import type { Message, Patient, AiPersonalizationSettings, DailyHuddle, Report, TextMessage, UploadableFile, ClinicalNote, MultiSpecialistReviewMessage, ClinicalDebateMessage, DebateTurn, DebateParticipant, SpecialistReport } from '../types';
import type { MedicationDocument, LabResultDocument, VitalSignDocument, DiagnosisDocument } from './databaseSchema';
import * as geminiService from './geminiService';
import * as utilityAgents from './agents/utilityAgents';
import * as multiAgentSimulation from './agents/multiAgentSimulation';
import { GoogleGenAI } from "@google/genai";
import { MissingApiKeyError } from '../errors';

// Helper to get an AI instance — requires a user-provided key
const getAiClient = (apiKey?: string) => {
    if (!apiKey) throw new MissingApiKeyError();
    return new GoogleGenAI({ apiKey });
};

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

export const getDailyHuddle = (patients: Patient[], aiSettings: AiPersonalizationSettings): Promise<DailyHuddle> =>
  handleRateLimiting(() => geminiService.getDailyHuddle(patients, aiSettings));

export const getAiResponse = async (query: string, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => {
  return handleRateLimiting(async () => {
    // Construct the context-aware prompt on the client or let backend handle it.
    // Ideally, we pass the query and let the backend agent handle the context.
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Patient-Context': btoa(JSON.stringify(patient)) // Pass context
      },
      body: JSON.stringify({ prompt: query })
    });

    if (!response.ok) {
      throw new Error(`Backend API Error: ${response.statusText}`);
    }

    const data = await response.json();
    // Transform backend response to Message type needed by frontend
    return {
      id: Date.now(),
      sender: 'ai',
      type: 'text',
      text: data.text
    };
  });
};

export const runMultiModalAnalysisAgent = (prompt: string, files: UploadableFile[], patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> =>
  handleRateLimiting(() => geminiService.runMultiModalAnalysisAgent(prompt, files, patient, aiSettings));

export const getAiSingleReportAnalysis = (report: Report, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<TextMessage> =>
  handleRateLimiting(() => geminiService.getAiSingleReportAnalysis(report, patient, aiSettings));

export const getAiMultiReportAnalysis = (reports: Report[], patient: Patient, aiSettings: AiPersonalizationSettings): Promise<TextMessage> =>
  handleRateLimiting(() => geminiService.getAiMultiReportAnalysis(reports, patient, aiSettings));

export const getAiReportComparison = (currentReport: Report, previousReport: Report, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> =>
  handleRateLimiting(() => geminiService.getAiReportComparison(currentReport, previousReport, patient, aiSettings));

export const runPrescriptionGeneratorAgent = (patient: Patient, medications: { drug: string; suggestedDose: string }[], aiSettings: AiPersonalizationSettings): Promise<Message> =>
  handleRateLimiting(() => geminiService.runPrescriptionGeneratorAgent(patient, medications, aiSettings));

export const getAiSmartReportAnalysis = async (reportContent: string, reportType: Report['type'], aiSettings: AiPersonalizationSettings): Promise<{ suggestedTitle: string; extractedDate: string; summary: string; keyFindings: string[] }> => {
  return handleRateLimiting(() => geminiService.getAiSmartReportAnalysis(reportContent, reportType, aiSettings));
};

export const getAiStructuredExtraction = async (reportContent: string, reportType: string, aiSettings: AiPersonalizationSettings): Promise<{
  medications: Omit<MedicationDocument, 'createdAt'>[],
  labs: Omit<LabResultDocument, 'createdAt'>[],
  vitals: Omit<VitalSignDocument, 'createdAt'>[],
  diagnoses: Omit<DiagnosisDocument, 'createdAt'>[]
}> => {
  return handleRateLimiting(() => geminiService.getAiStructuredExtraction(reportContent, reportType, aiSettings));
};

export const generateClinicalNote = async (patient: Patient, chatHistory: Message[], aiSettings: AiPersonalizationSettings, transcript?: string): Promise<ClinicalNote> => {
  return handleRateLimiting(() => geminiService.generateClinicalNote(patient, chatHistory, aiSettings, transcript));
};

export const analyzeReasonForConsult = async (files: File[], aiSettings: AiPersonalizationSettings): Promise<string> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => utilityAgents.runConsultReasonAgent(files, ai));
};

// New Multi-Agent Functions (Granular)
export const identifyBoardParticipants = async (patient: Patient, aiSettings: AiPersonalizationSettings): Promise<string[]> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => multiAgentSimulation.identifyBoardParticipants(patient, ai));
};

export const generateSpecialistReport = async (patient: Patient, specialty: string, aiSettings: AiPersonalizationSettings): Promise<SpecialistReport> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => multiAgentSimulation.generateSpecialistOpinion(patient, specialty, ai));
};

export const consolidateBoardReports = async (patient: Patient, reports: SpecialistReport[], aiSettings: AiPersonalizationSettings): Promise<{ summary: string; conflicts: string; finalPlan: string }> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => multiAgentSimulation.generateBoardConsensus(patient, reports, ai));
};

// Legacy single-shot
export const runMultiSpecialistReview = async (patient: Patient, aiSettings: AiPersonalizationSettings): Promise<MultiSpecialistReviewMessage> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => multiAgentSimulation.runMultiSpecialistReviewAgent(patient, ai));
};

export const initializeClinicalDebate = async (patient: Patient, aiSettings: AiPersonalizationSettings): Promise<{ topic: string, participants: DebateParticipant[] }> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => multiAgentSimulation.initializeDebateAgent(patient, ai));
};

export const runNextDebateTurn = async (patient: Patient, transcript: DebateTurn[], participants: DebateParticipant[], topic: string, aiSettings: AiPersonalizationSettings): Promise<{ nextTurn: DebateTurn, consensusReached: boolean, consensusStatement: string | null }> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => multiAgentSimulation.runNextDebateTurnAgent(patient, transcript, participants, topic, ai));
};

export const transcribeAudio = async (audioBlob: Blob, aiSettings: AiPersonalizationSettings): Promise<string> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => utilityAgents.runAudioTranscriptionAgent(audioBlob, ai));
};

export const generateSpeech = async (text: string, aiSettings: AiPersonalizationSettings): Promise<string | null> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => utilityAgents.generateSpeechAgent(text, ai));
};

export const runDeepReasoning = async (patient: Patient, query: string, aiSettings: AiPersonalizationSettings): Promise<TextMessage> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => utilityAgents.runDeepThinkingAgent(patient, query, ai));
};

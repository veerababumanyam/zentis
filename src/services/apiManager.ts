
import type { Message, Patient, AiPersonalizationSettings, DailyHuddle, Report, TextMessage, UploadableFile, ClinicalNote, MultiSpecialistReviewMessage, ClinicalDebateMessage, DebateTurn, DebateParticipant, SpecialistReport } from '../types';
import type { MedicationDocument, LabResultDocument, VitalSignDocument, DiagnosisDocument } from './databaseSchema';
import * as geminiService from './geminiService';
import * as utilityAgents from './agents/utilityAgents';
import * as multiAgentSimulation from './agents/multiAgentSimulation';
import { GoogleGenAI } from "@google/genai";
import { MissingApiKeyError } from '../errors';
import * as quotaService from './quotaService';

// Helper to get an AI instance — requires a user-provided key
const getAiClient = (apiKey?: string) => {
    if (!apiKey) throw new MissingApiKeyError();
    return new GoogleGenAI({ apiKey });
};

// --- Rate Limiting State ---
let isRateLimited = false;
let retryAfterTimestamp = 0;
const BACKOFF_DURATION_MS = 60 * 1000; // 60 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000; // 2s base for 429 retries

const RATE_LIMIT_ERROR_MESSAGE = 'You have exceeded the API rate limit. Please wait a moment and try again.';
const SERVICE_OVERLOADED_MESSAGE = 'The AI service is temporarily at capacity. Please try again in a moment.';

/** Returns true if the error indicates a 429 / RESOURCE_EXHAUSTED rate limit. */
const isRateLimitError = (errorString: string): boolean =>
    errorString.includes('429') || errorString.toLowerCase().includes('resource_exhausted');

/** Returns true if the error indicates a 503 / UNAVAILABLE / high-demand condition. */
const isServiceOverloaded = (errorString: string): boolean =>
    errorString.includes('503') ||
    errorString.toLowerCase().includes('unavailable') ||
    errorString.toLowerCase().includes('high demand');

/** Sleeps for the given milliseconds. */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Adds ±25% jitter to a delay to avoid thundering-herd retries. */
const jitter = (ms: number) => ms * (0.75 + Math.random() * 0.5);

// --- Request Throttle ---
// Ensures a minimum gap between consecutive API calls to avoid bursting rate limits.
let lastRequestTimestamp = 0;
const MIN_REQUEST_GAP_MS = 350; // 350ms minimum between calls

/**
 * Waits if necessary to enforce the minimum gap between API requests.
 */
async function throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTimestamp;
    if (elapsed < MIN_REQUEST_GAP_MS) {
        await sleep(MIN_REQUEST_GAP_MS - elapsed);
    }
    lastRequestTimestamp = Date.now();
}

/**
 * A generic wrapper for API calls to handle rate limiting with exponential backoff.
 * Retries on both 429 (rate limit) and 503 (service overloaded) with exponential backoff.
 * Also enforces a minimum gap between requests to prevent bursting.
 * @param apiCall The async function to execute.
 * @returns The result of the apiCall.
 * @throws An error if the call is blocked or if the underlying API call fails after all retries.
 */
async function handleRateLimiting<T>(apiCall: () => Promise<T>): Promise<T> {
  // Check quota before attempting the call
  const quotaCheck = quotaService.checkQuotaBeforeCall();
  if (!quotaCheck.allowed) {
    console.error('[ApiManager] Quota exceeded:', quotaCheck.reason);
    throw new Error(quotaCheck.reason);
  }
  if (quotaCheck.warning) {
    console.warn('[ApiManager] Quota warning:', quotaCheck.warning);
  }

  // If we're in a global cooldown period, wait it out (but don't throw immediately)
  if (isRateLimited && Date.now() < retryAfterTimestamp) {
    const waitTime = retryAfterTimestamp - Date.now();
    console.warn(`[ApiManager] In rate-limit cooldown. Waiting ${Math.ceil(waitTime / 1000)}s before retrying...`);
    await sleep(waitTime);
  }

  // Reset the rate limit state now that we've waited
  isRateLimited = false;

  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await throttle();
      const result = await apiCall();
      // Record successful API call
      quotaService.recordApiCall();
      return result;
    } catch (error: any) {
      lastError = error;
      const errorString = String(error.message || error);

      // Check for 429 / RESOURCE_EXHAUSTED — retry with exponential backoff
      if (isRateLimitError(errorString)) {
        if (attempt < MAX_RETRIES) {
          const delay = jitter(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)); // ~2s, ~4s, ~8s with jitter
          console.warn(`[ApiManager] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${Math.round(delay)}ms...`);
          await sleep(delay);
          continue;
        }
        // All retries exhausted — set global cooldown and throw
        console.error('[ApiManager] Rate limit exceeded after all retries. Activating cooldown.');
        isRateLimited = true;
        retryAfterTimestamp = Date.now() + BACKOFF_DURATION_MS;
        throw new Error(RATE_LIMIT_ERROR_MESSAGE);
      }

      // Check for 503 / UNAVAILABLE — retry with exponential backoff
      if (isServiceOverloaded(errorString) && attempt < MAX_RETRIES) {
        const delay = jitter(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)); // ~2s, ~4s, ~8s with jitter
        console.warn(`[ApiManager] Service overloaded (attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
        continue;
      }

      // Non-retryable or exhausted retries — re-throw
      if (isServiceOverloaded(errorString)) {
        throw new Error(SERVICE_OVERLOADED_MESSAGE);
      }
      throw error;
    }
  }

  // Should not reach here, but just in case:
  throw lastError;
}

// --- Wrapped Service Exports ---
// Re-export the functions from geminiService, wrapped in the rate-limiting handler.

export const getPreVisitBriefing = (patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> =>
  handleRateLimiting(() => geminiService.getPreVisitBriefing(patient, aiSettings));

export const getDailyHuddle = (patients: Patient[], aiSettings: AiPersonalizationSettings): Promise<DailyHuddle> =>
  handleRateLimiting(() => geminiService.getDailyHuddle(patients, aiSettings));

export const getAiResponse = (query: string, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> =>
  handleRateLimiting(() => geminiService.getAiResponse(query, patient, aiSettings));

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

export const initializeClinicalDebate = async (patient: Patient, aiSettings: AiPersonalizationSettings, maxParticipants?: number): Promise<{ topic: string, participants: DebateParticipant[] }> => {
  const ai = getAiClient(aiSettings.apiKey);
  return handleRateLimiting(() => multiAgentSimulation.initializeDebateAgent(patient, ai, maxParticipants));
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

// Export quota-related functions for use in components
export const getQuotaSummary = quotaService.getQuotaSummary;
export const checkQuotaBeforeCall = quotaService.checkQuotaBeforeCall;
export const clearQuotaData = quotaService.clearQuotaData;

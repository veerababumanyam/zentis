
import { GoogleGenAI } from "@google/genai";
import { agentRouter } from './agentRouter';
import * as agents from './agents';
import type { Patient, Message, TextMessage, Report, ConsultationPayload, DailyHuddle, AiPersonalizationSettings, UploadableFile, ClinicalNote } from '../types';
import type { MedicationDocument, LabResultDocument, VitalSignDocument, DiagnosisDocument } from './databaseSchema';
import { MissingApiKeyError } from '../errors';

// Helper to get an AI instance — requires a user-provided key
const getAiClient = (apiKey?: string) => {
    if (!apiKey) throw new MissingApiKeyError();
    return new GoogleGenAI({ apiKey });
};

export const getAiResponse = async (query: string, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => {
    // Note: agentRouter might need updates too, but it likely calls these services
    return agentRouter(query, patient, aiSettings);
};

// --- UI-FACING SERVICE FUNCTIONS (WRAPPERS FOR AGENTS) ---
// These functions are called directly by specific UI components (modals, etc.)

export const getPreVisitBriefing = async (patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => {
    const ai = getAiClient(aiSettings.apiKey);
    return agents.runSmartSummaryAgent(patient, ai, aiSettings);
};

export const getDailyHuddle = async (patients: Patient[], aiSettings: AiPersonalizationSettings): Promise<DailyHuddle> => {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `daily_huddle_${today}`;

    try {
        const cachedHuddle = localStorage.getItem(cacheKey);
        if (cachedHuddle) {
            console.log("Loading Daily Huddle from cache.");
            return JSON.parse(cachedHuddle);
        }
    } catch (error) {
        console.error("Failed to read Daily Huddle from cache:", error);
    }

    console.log("Generating new Daily Huddle via AI.");
    const ai = getAiClient(aiSettings.apiKey);
    const huddleData = await agents.runDailyHuddleAgent(patients, ai);

    try {
        localStorage.setItem(cacheKey, JSON.stringify(huddleData));
    } catch (error) {
        console.error("Failed to save Daily Huddle to cache:", error);
    }

    return huddleData;
};

export const runMultiModalAnalysisAgent = async (prompt: string, files: UploadableFile[], patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => {
    const ai = getAiClient(aiSettings.apiKey);
    return agents.runMultiModalAnalysisAgent(prompt, files, patient, ai, aiSettings);
};

export const getAiSingleReportAnalysis = async (report: Report, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<TextMessage> => {
    const ai = getAiClient(aiSettings.apiKey);
    return agents.runSingleReportAnalysisAgent(report, patient, ai, aiSettings);
};

export const getAiMultiReportAnalysis = async (reports: Report[], patient: Patient, aiSettings: AiPersonalizationSettings): Promise<TextMessage> => {
    const ai = getAiClient(aiSettings.apiKey);
    return agents.runMultiReportAnalysisAgent(reports, patient, ai, aiSettings);
};

export const getAiReportComparison = async (currentReport: Report, previousReport: Report, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => {
    const ai = getAiClient(aiSettings.apiKey);
    return agents.runReportComparisonAgent(currentReport, previousReport, patient, ai);
};

export const getAiSmartReportAnalysis = async (reportContent: string, reportType: Report['type'], aiSettings: AiPersonalizationSettings): Promise<{ suggestedTitle: string; extractedDate: string; summary: string; keyFindings: string[] }> => {
    const ai = getAiClient(aiSettings.apiKey);
    return agents.runSmartReportAnalysisAgent(reportContent, reportType, ai);
};

export const getAiStructuredExtraction = async (reportContent: string, reportType: string, aiSettings: AiPersonalizationSettings): Promise<{
    medications: Omit<MedicationDocument, 'createdAt'>[],
    labs: Omit<LabResultDocument, 'createdAt'>[],
    vitals: Omit<VitalSignDocument, 'createdAt'>[],
    diagnoses: Omit<DiagnosisDocument, 'createdAt'>[]
}> => {
    const ai = getAiClient(aiSettings.apiKey);
    return agents.runStructuredExtractionAgent(reportContent, reportType, ai);
};

export const runPrescriptionGeneratorAgent = (patient: Patient, medications: { drug: string; suggestedDose: string }[], aiSettings: AiPersonalizationSettings): Promise<Message> => {
    const ai = getAiClient(aiSettings.apiKey);
    return agents.runPrescriptionGeneratorAgent(patient, medications, ai, aiSettings);
};

export const generateClinicalNote = async (patient: Patient, chatHistory: Message[], aiSettings: AiPersonalizationSettings, transcript?: string): Promise<ClinicalNote> => {
    const ai = getAiClient(aiSettings.apiKey);
    return agents.runClinicalNoteGeneratorAgent(patient, chatHistory, ai, aiSettings, transcript);
};

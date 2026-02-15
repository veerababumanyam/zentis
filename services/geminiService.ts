
import { GoogleGenAI } from "@google/genai";
import { agentRouter } from './agentRouter';
import * as agents from './agents';
import type { Patient, Message, TextMessage, Report, ConsultationPayload, DailyHuddle, AiPersonalizationSettings, UploadableFile, ClinicalNote } from '../types';

// Helper to get an AI instance - useful for files that need to pass it around
export const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * The main entry point for AI responses, acting as a Chat Coordinator.
 * It uses the agentRouter to route the user's query to the appropriate AI agent.
 */
export const getAiResponse = async (query: string, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => {
    return agentRouter(query, patient, aiSettings);
};

// --- UI-FACING SERVICE FUNCTIONS (WRAPPERS FOR AGENTS) ---
// These functions are called directly by specific UI components (modals, etc.)

export const getPreVisitBriefing = async (patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return agents.runSmartSummaryAgent(patient, ai, aiSettings);
};

export const getDailyHuddle = async (patients: Patient[]): Promise<DailyHuddle> => {
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const huddleData = await agents.runDailyHuddleAgent(patients, ai);

    try {
        localStorage.setItem(cacheKey, JSON.stringify(huddleData));
    } catch (error) {
        console.error("Failed to save Daily Huddle to cache:", error);
    }

    return huddleData;
};

export const runMultiModalAnalysisAgent = async (prompt: string, files: UploadableFile[], patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return agents.runMultiModalAnalysisAgent(prompt, files, patient, ai, aiSettings);
};

export const getAiSingleReportAnalysis = async (report: Report, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<TextMessage> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return agents.runSingleReportAnalysisAgent(report, patient, ai, aiSettings);
};

export const getAiMultiReportAnalysis = async (reports: Report[], patient: Patient, aiSettings: AiPersonalizationSettings): Promise<TextMessage> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return agents.runMultiReportAnalysisAgent(reports, patient, ai, aiSettings);
};

export const getAiReportComparison = async (currentReport: Report, previousReport: Report, patient: Patient): Promise<Message> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return agents.runReportComparisonAgent(currentReport, previousReport, patient, ai);
};

export const getAiSmartReportAnalysis = async (reportContent: string, reportType: Report['type']): Promise<{ suggestedTitle: string; extractedDate: string; summary: string; keyFindings: string[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return agents.runSmartReportAnalysisAgent(reportContent, reportType, ai);
};

export const runPrescriptionGeneratorAgent = (patient: Patient, medications: { drug: string; suggestedDose: string }[], aiSettings: AiPersonalizationSettings): Promise<Message> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return agents.runPrescriptionGeneratorAgent(patient, medications, ai, aiSettings);
};

export const generateClinicalNote = async (patient: Patient, chatHistory: Message[], aiSettings: AiPersonalizationSettings, transcript?: string): Promise<ClinicalNote> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return agents.runClinicalNoteGeneratorAgent(patient, chatHistory, ai, aiSettings, transcript);
};

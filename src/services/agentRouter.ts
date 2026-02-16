
import { GoogleGenAI, Type } from "@google/genai";
import * as agents from './agents';
import type { Patient, Message, AiPersonalizationSettings, Report, UploadableFile } from '../types';

// Regex for immediate/obvious lookups (Optimization: prevents API call for simple actions)
const reportQueryRegex = /\b(show|view|display|pull up|find|get)\b.*\b(report|ecg|ekg|echo|lab|x-ray|angiogram|interrogation|log|cath|device|imaging|meds|medication|pathology|mri|biopsy|eye|ophthalmology)\b/i;

// Regex for analysis-intent queries about reports
const reportAnalysisRegex = /\b(analyze|analyse|summarize|summarise|explain|interpret|read|extract|review|what does|tell me about)\b.*\b(report|ecg|ekg|echo|lab|x-ray|angiogram|interrogation|log|cath|device|imaging|meds|medication|pathology|mri|biopsy|eye|ophthalmology|document|scan|image|photo|picture|file|result)\b/i;

// --- DOMAIN CLASSIFIER ---
import { ALL_SPECIALTIES, SPECIALTY_DESCRIPTIONS } from '../config/medicalSpecialties';
import { AI_MODELS } from '../config/aiModels';

const determineSpecialty = async (query: string, ai: GoogleGenAI): Promise<string> => {
    // If query is very short or generic, default to General
    if (query.length < 5) return 'General';

    const specialtyOptions = ALL_SPECIALTIES.map(s => `- ${s} (for ${SPECIALTY_DESCRIPTIONS[s] || s})`).join('\n    ');

    const prompt = `Classify this medical query into a Domain/Specialty.
    Query: "${query}"
    
    Options:
    ${specialtyOptions}
    - DeepReasoning (for complex diagnostic dilemmas, 'think', 'reason', 'analyze complex case')
    - General (for vitals, labs, history, summary, medications)
    
    Return ONLY the Option Name within the list above.`;

    try {
        const response = await ai.models.generateContent({
            model: AI_MODELS.FLASH, // Low latency for routing
            contents: prompt
        });
        return response.text.trim();
    } catch (e) {
        console.warn("Classifier failed, defaulting to General");
        return 'General';
    }
};

/**
 * Finds the most relevant report for a user query using AI classification.
 */
const findReportByQuery = async (query: string, reports: Report[], ai: GoogleGenAI): Promise<Report | null> => {
    if (reports.length === 0) return null;

    // Quick heuristic match: check if query mentions a report by name/type
    const queryLower = query.toLowerCase();
    for (const report of reports) {
        const titleLower = report.title.toLowerCase();
        const typeLower = report.type.toLowerCase();
        if (queryLower.includes(titleLower) || queryLower.includes(typeLower)) {
            return report;
        }
        // Check for common partial matches (e.g. "eye report" matches "eye_report.jpg")
        const titleWords = titleLower.replace(/[_\-.]/g, ' ').split(/\s+/);
        if (titleWords.some(w => w.length > 2 && queryLower.includes(w))) {
            return report;
        }
    }

    // Fall back to AI classification if heuristic fails
    try {
        const reportList = reports.map(r => ({ id: r.id, type: r.type, date: r.date, title: r.title }));
        const prompt = `Identify the single most relevant report ID for this analysis query: "${query}".\nReports: ${JSON.stringify(reportList)}\nReturn JSON: { "reportId": "string | null" }`;
        const response = await ai.models.generateContent({
            model: AI_MODELS.FLASH,
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { reportId: { type: Type.STRING } }, required: ['reportId'] } }
        });
        const result = JSON.parse(response.text.trim());
        if (result.reportId && result.reportId !== 'null') {
            return reports.find(r => r.id === result.reportId) || null;
        }
    } catch (e) {
        console.warn('[AgentRouter] Report matching via AI failed:', e);
    }
    return null;
};

/**
 * Routes a user query to the appropriate AI agent.
 */
import { runMultiSpecialistReviewAgent } from './agents/multiAgentSimulation';

export const agentRouter = async (query: string, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => {
    // Client-Side Routing (Serverless Mode)

    if (!aiSettings.apiKey) {
        return {
            id: Date.now(),
            sender: 'ai',
            type: 'text',
            text: "Please provide your Gemini API Key in the settings to use the AI features."
        };
    }

    // Initialize client correctly
    const ai = new GoogleGenAI({ apiKey: aiSettings.apiKey });

    // Check for "Board Review" or complex queries to trigger the Multi-Agent System
    if (query.toLowerCase().includes('board') || query.toLowerCase().includes('consult') || query.toLowerCase().includes('review') || query.toLowerCase().includes('grand rounds')) {
        console.log(`[AgentRouter] Triggering Multi-Agent Board Review`);
        const forceGrandRounds = query.toLowerCase().includes('grand rounds');
        return await runMultiSpecialistReviewAgent(patient, ai, forceGrandRounds);
    }

    // Check for report-lookup queries (only useful if patient has reports)
    if (reportQueryRegex.test(query) && patient.reports && patient.reports.length > 0) {
        try {
            return await agents.runReportDisplayAgent(patient, query, ai);
        } catch (e) {
            console.warn('[AgentRouter] Report display agent failed, falling through to general:', e);
        }
    }

    // Check for analysis-intent queries that reference a specific report (including image reports)
    if (reportAnalysisRegex.test(query) && patient.reports && patient.reports.length > 0) {
        try {
            const matchedReport = await findReportByQuery(query, patient.reports, ai);
            if (matchedReport) {
                console.log(`[AgentRouter] Matched report for analysis: ${matchedReport.title}`);
                return await agents.runSingleReportAnalysisAgent(matchedReport, patient, ai, aiSettings);
            }
        } catch (e) {
            console.warn('[AgentRouter] Report analysis routing failed, falling through:', e);
        }
    }

    // --- Classify the query domain for better routing ---
    let specialty = 'General';
    try {
        specialty = await determineSpecialty(query, ai);
        console.log(`[AgentRouter] Classified query as: ${specialty}`);
    } catch (e) {
        console.warn('[AgentRouter] Classification failed, using General');
    }

    // --- Build a context-aware prompt ---
    const hasReports = patient.reports && patient.reports.length > 0;
    const hasMedHistory = patient.medicalHistory && patient.medicalHistory.length > 0;
    const hasMedications = patient.currentStatus?.medications && patient.currentStatus.medications.length > 0;

    let patientContext = `Patient: ${patient.name}, ${patient.age}y/o ${patient.gender || ''}.\n`;
    patientContext += `Current Status: ${patient.currentStatus?.condition || 'Not specified'}.\n`;

    if (patient.currentStatus?.vitals) {
        patientContext += `Vitals: ${patient.currentStatus.vitals}.\n`;
    }
    if (hasMedications) {
        patientContext += `Current Medications: ${patient.currentStatus.medications.join(', ')}.\n`;
    }
    if (hasMedHistory) {
        patientContext += `Medical History: ${patient.medicalHistory.map(h => h.description).join('; ')}.\n`;
    }
    if (hasReports) {
        const recentReports = patient.reports.slice(-3).map(r => {
            let summary = `${r.type} (${r.date}): ${r.title || 'Untitled'}`;
            // Include extracted text content or AI summary if available
            const textContent = r.rawTextForAnalysis || r.aiSummary;
            if (textContent) {
                summary += `\n  Content: ${textContent.substring(0, 300)}...`;
            }
            return summary;
        }).join('\n');
        patientContext += `Recent Reports:\n${recentReports}\n`;
    }

    const systemPrompt = `You are a knowledgeable, empathetic medical health assistant powered by AI. Your role is to help users understand health topics, answer medical questions, and provide evidence-based health information.

**Guidelines:**
- Provide accurate, helpful medical information based on current clinical knowledge.
- When the user has health records available, reference their specific data in your answers.
- When NO health records are available, act as a general medical knowledge assistant — answer questions about symptoms, conditions, medications, lifestyle, prevention, etc.
- Always recommend consulting a healthcare professional for diagnosis and treatment decisions.
- Be clear about the limitations of AI-based medical advice.
- Use plain language while being medically accurate.
- Detected medical specialty for this query: ${specialty}.

**Patient Context:**
${patientContext}
${!hasReports ? '\nNote: This patient has not uploaded any health documents yet. Answer based on general medical knowledge and the basic profile above.\n' : ''}`;

    try {
        const response = await ai.models.generateContent({
            model: AI_MODELS.FLASH,
            contents: `${systemPrompt}\n\nUser Question: ${query}`
        });

        return {
            id: Date.now(),
            sender: 'ai',
            type: 'text',
            text: response.text ? response.text : "No response generated."
        };
    } catch (error) {
        console.error("AI Error:", error);
        return {
            id: Date.now(),
            sender: 'ai',
            type: 'text',
            text: "I'm having trouble connecting to the AI. Please check your API key and connection."
        };
    }
};

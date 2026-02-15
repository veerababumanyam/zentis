
import { GoogleGenAI, Type } from "@google/genai";
import * as agents from './agents';
import type { Patient, Message, AiPersonalizationSettings } from '../types';

// Regex for immediate/obvious lookups (Optimization: prevents API call for simple actions)
const reportQueryRegex = /\b(show|view|display|pull up|find|get)\b.*\b(report|ecg|ekg|echo|lab|x-ray|angiogram|interrogation|log|cath|device|imaging|meds|medication|pathology|mri|biopsy)\b/i;

// --- DOMAIN CLASSIFIER ---
const determineSpecialty = async (query: string, ai: GoogleGenAI): Promise<string> => {
    // If query is very short or generic, default to General
    if (query.length < 5) return 'General';

    const prompt = `Classify this medical query into a Domain/Specialty.
    Query: "${query}"
    
    Options:
    - Cardiology (for heart, BP, ECG, Cath, HFrEF, Arrhythmia)
    - Neurology (for brain, stroke, seizure, headache, EEG, MRI Brain)
    - Oncology (for cancer, tumor, biopsy, chemo, staging)
    - Gastroenterology (for stomach, liver, GI, colonoscopy, endoscopy, abdominal pain)
    - Pulmonology (for lungs, breathing, asthma, copd, pneumonia, chest x-ray)
    - Endocrinology (for diabetes, thyroid, hormones, metabolism)
    - Orthopedics (for bones, joints, fractures, spine, pain)
    - Dermatology (for skin, rash, lesions)
    - Nephrology (for kidney, renal, creatinine, dialysis)
    - Hematology (for blood, anemia, platelets, clotting)
    - Rheumatology (for joints, autoimmune, lupus, arthritis)
    - Infectious Disease (for infection, fever, antibiotics, sepsis, culture)
    - Psychiatry (for depression, anxiety, mood, mental health)
    - Urology (for prostate, bladder, uti, kidney stone)
    - Ophthalmology (for eye, vision, retina, cataract)
    - Geriatrics (for elderly, frailty, falls, dementia)
    - DeepReasoning (for complex diagnostic dilemmas, 'think', 'reason', 'analyze complex case')
    - General (for vitals, labs, history, summary, medications)
    
    Return ONLY the Option Name.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite-preview-02-05', // Low latency for routing
            contents: prompt
        });
        return response.text.trim();
    } catch (e) {
        console.warn("Classifier failed, defaulting to General");
        return 'General';
    }
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
    if (query.toLowerCase().includes('board') || query.toLowerCase().includes('consult') || query.toLowerCase().includes('review')) {
        console.log(`[AgentRouter] Triggering Multi-Agent Board Review`);
        return await runMultiSpecialistReviewAgent(patient, ai);
    }

    // Check for report-lookup queries (only useful if patient has reports)
    if (reportQueryRegex.test(query) && patient.reports && patient.reports.length > 0) {
        try {
            return await agents.runReportDisplayAgent(patient, query, ai);
        } catch (e) {
            console.warn('[AgentRouter] Report display agent failed, falling through to general:', e);
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
        const recentReports = patient.reports.slice(-3).map(r => `${r.type} (${r.date}): ${r.title || 'Untitled'}`).join('; ');
        patientContext += `Recent Reports: ${recentReports}.\n`;
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
            model: 'gemini-2.5-flash',
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

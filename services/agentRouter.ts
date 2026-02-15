
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
export const agentRouter = async (query: string, patient: Patient, aiSettings: AiPersonalizationSettings): Promise<Message> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const lowerQuery = query.toLowerCase();

    // 1. FAST PATH: Report Display (Regex)
    if (reportQueryRegex.test(lowerQuery)) {
        console.log(`[AgentRouter] Routing to Report Display Agent (Fast Path)`);
        return await agents.runReportDisplayAgent(patient, query, ai);
    }

    // 2. KEYWORD PATH: Specific High-Confidence Agents
    if (lowerQuery.includes('medical board') || lowerQuery.includes('specialist review')) return await agents.runMultiSpecialistReviewAgent(patient, ai);
    if (lowerQuery.includes('debate') || lowerQuery.includes('grand rounds')) return await agents.runClinicalDebateAgent(patient, ai);
    if (lowerQuery.includes('hcc') || lowerQuery.includes('coding')) return await agents.runHccCodingAgent(patient, query, ai);
    if (lowerQuery.includes('compare')) return await agents.runReportComparisonAgentFromHistory(patient, query, ai);
    if (lowerQuery.includes('trend') || lowerQuery.includes('plot')) return await agents.runTrendAnalysisAgent(patient, query, ai);
    if (lowerQuery.includes('summarize') || lowerQuery.includes('briefing')) return await agents.runSmartSummaryAgent(patient, ai, aiSettings);

    // 3. CLASSIFIER PATH: The "Brain" of the Multi-Specialty System
    console.log(`[AgentRouter] Classifying intent for: "${query}"`);
    const specialty = await determineSpecialty(query, ai);
    console.log(`[AgentRouter] Detected Specialty: ${specialty}`);

    switch (specialty) {
        case 'Cardiology':
            // Route to sub-agents if specific keywords match, else general cardio
            if (lowerQuery.includes('cath') || lowerQuery.includes('angiogram')) return await agents.runInterventionalCardiologyAgent(patient, query, ai);
            if (lowerQuery.includes('device') || lowerQuery.includes('icd') || lowerQuery.includes('pacemaker')) return await agents.runEpAgent(patient, query, ai);
            if (lowerQuery.includes('lvad')) return await agents.runAdvancedHfAgent(patient, query, ai);
            if (lowerQuery.includes('cta')) return await agents.runCtaAnalysisAgent(patient, query, ai, aiSettings);
            if (lowerQuery.includes('ecg') || lowerQuery.includes('ekg')) return await agents.runEcgAnalysisAgent(patient, query, ai);
            if (lowerQuery.includes('echo')) return await agents.runEjectionFractionTrendAgent(patient, query, ai);
            return await agents.runGeneralCardiologyQueryAgent(patient, query, ai, aiSettings);

        case 'Neurology':
            return await agents.runNeurologyAgent(patient, query, ai);

        case 'Oncology':
            return await agents.runOncologyAgent(patient, query, ai);

        case 'Gastroenterology':
            return await agents.runGastroenterologyAgent(patient, query, ai);

        case 'Pulmonology':
            return await agents.runPulmonologyAgent(patient, query, ai);

        case 'Endocrinology':
            return await agents.runEndocrinologyAgent(patient, query, ai);

        case 'Orthopedics':
            return await agents.runOrthopedicsAgent(patient, query, ai);

        case 'Dermatology':
            return await agents.runDermatologyAgent(patient, query, ai);

        case 'Nephrology':
            return await agents.runNephrologyAgent(patient, query, ai);

        case 'Hematology':
            return await agents.runHematologyAgent(patient, query, ai);

        case 'Rheumatology':
            return await agents.runRheumatologyAgent(patient, query, ai);

        case 'Infectious Disease':
            return await agents.runInfectiousDiseaseAgent(patient, query, ai);

        case 'Psychiatry':
            return await agents.runPsychiatryAgent(patient, query, ai);

        case 'Urology':
            return await agents.runUrologyAgent(patient, query, ai);

        case 'Ophthalmology':
            return await agents.runOphthalmologyAgent(patient, query, ai);

        case 'Geriatrics':
            return await agents.runGeriatricsAgent(patient, query, ai);
            
        case 'DeepReasoning':
            return await agents.runDeepThinkingAgent(patient, query, ai);

        case 'General':
            // Use the general agent logic
            if (lowerQuery.includes('drug') || lowerQuery.includes('medication')) return await agents.runGeneralQueryAgent(query, patient, ai, aiSettings);
            return await agents.runGeneralCardiologyQueryAgent(patient, query, ai, aiSettings); // Fallback to main clinical agent

        default:
            // For any other rare specialty, use the Universal Agent dynamically
            console.log(`[AgentRouter] Routing to Universal Specialist Agent for ${specialty}`);
            return await agents.runUniversalSpecialistAgent(patient, query, specialty, ai);
    }
};

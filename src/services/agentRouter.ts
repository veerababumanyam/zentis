
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

    try {
        // Use the new @google/genai SDK syntax consistently
        const prompt = `System: You are a helpful medical assistant. Context: Patient ${patient.name}, ${patient.age}y/o.\nUser: ${query}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt
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

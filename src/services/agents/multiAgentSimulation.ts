
import { GoogleGenAI, Type } from "@google/genai";
import type { Patient, MultiSpecialistReviewMessage, ClinicalDebateMessage, DebateParticipant, DebateTurn, SpecialistReport, UniversalSpecialistMessage } from '../../types';
import * as expandedAgents from './expandedSpecialties';
import * as subSpecialtyAgents from './subspecialtyAgents';
import { runPsychiatryAgent } from './psychiatristAgent';
import { runPharmacistAgent } from './pharmacistAgent';
import { runNutritionistAgent } from './nutritionistAgent';
import { AI_MODELS } from '../../config/aiModels';

// Helper to prepare patient context
const getPatientContext = (patient: Patient) => {
    const history = patient.medicalHistory.map(h => h.description).join(', ');
    const meds = patient.currentStatus.medications.join(', ');
    const labs = patient.reports.filter(r => r.type === 'Lab').slice(0, 3).map(r => `${r.date}: ${typeof r.content === 'string' ? r.content.substring(0, 200) : 'See PDF'}`).join('\n');
    const echoes = patient.reports.filter(r => r.type === 'Echo').slice(0, 2).map(r => `${r.date}: ${typeof r.content === 'string' ? r.content : 'See PDF'}`).join('\n');

    return `
    Patient: ${patient.name}, ${patient.age} ${patient.gender}.
    History: ${history}
    Current Meds: ${meds}
    Vitals: ${patient.currentStatus.vitals}
    Condition: ${patient.currentStatus.condition}
    Recent Labs: \n${labs}
    Recent Imaging: \n${echoes}
    `;
};

import { ALL_SPECIALTIES } from '../../config/medicalSpecialties';

// --- 1. Identify Participants ---
export const identifyBoardParticipants = async (patient: Patient, ai: GoogleGenAI, forceGrandRounds: boolean = false, maxSpecialties: number = 16): Promise<string[]> => {
    if (forceGrandRounds) {
        return ALL_SPECIALTIES.slice(0, maxSpecialties);
    }

    const context = getPatientContext(patient);

    const prompt = `Review the patient data and assemble a high-fidelity Medical Board.
    Identify the most relevant medical specialties required for a comprehensive review.

    **Available Specialized Agents:** ${ALL_SPECIALTIES.join(', ')}, Pharmacist, Nutritionist.
    (You may also request others if strictly necessary, e.g., 'Surgery').

    **Rules:**
    1. Always include 'Cardiology' as the lead.
    2. Select specialists based on specific comorbidities (e.g., CKD -> Nephrology, Diabetes -> Endocrinology).
    3. Select ONLY the most essential specialists (maximum ${maxSpecialties}). Focus on quality over quantity.
    4. Prioritize specialists whose expertise is directly relevant to this patient's condition.
    5. If the case is complex/undefined, include 'Internal Medicine' or 'DeepReasoning'.

    **Patient Context:** ${context}

    Return ONLY a JSON object with a single property 'specialties' which is an array of strings (maximum ${maxSpecialties} items).`;

    const response = await ai.models.generateContent({
        model: AI_MODELS.FLASH,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    specialties: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['specialties']
            }
        }
    });

    const result = JSON.parse(response.text.trim());
    // Ensure we don't exceed max
    return result.specialties.slice(0, maxSpecialties);
};

// --- 2. Generate Individual Specialist Report ---

// Adapter to convert specific agent output to SpecialistReport format
const adaptSpecificAgentOutput = (specialty: string, agentOutput: any): SpecialistReport => {
    // Most agents return UniversalSpecialistMessage structure or similar
    let findings = "";
    let recs: string[] = [];
    let focus = "General Consult";

    if (agentOutput.keyFindings) {
        findings += agentOutput.keyFindings.map((f: any) => `${f.label}: ${f.value} (${f.status})`).join('; ');
    }
    if (agentOutput.clinicalAssessment) {
        findings += `\nAssessment: ${agentOutput.clinicalAssessment}`;
    }
    if (agentOutput.impression) { // Neurology style
        findings += `\nImpression: ${agentOutput.impression}`;
    }

    if (agentOutput.plan) {
        recs = agentOutput.plan;
    } else if (agentOutput.recommendations) {
        recs = agentOutput.recommendations;
    } else if (agentOutput.treatmentPlan) {
        recs = [agentOutput.treatmentPlan];
    }

    if (agentOutput.title) focus = agentOutput.title;

    // Fallback if specific fields are missing
    if (!findings) findings = JSON.stringify(agentOutput).substring(0, 200);

    return {
        specialty,
        focus,
        findings,
        recommendations: recs
    };
};

export const generateSpecialistOpinion = async (patient: Patient, specialty: string, ai: GoogleGenAI): Promise<SpecialistReport> => {
    const s = specialty.toLowerCase();

    // --- ROUTER TO SPECIFIC AGENTS ---
    // This ensures the "Board" uses the highly-tuned prompt logic for each domain
    let specificAgentResponse: any = null;

    try {
        if (s.includes('gastro') || s.includes('gi') || s.includes('liver')) {
            specificAgentResponse = await expandedAgents.runGastroenterologyAgent(patient, "Board Review", ai);
        } else if (s.includes('pulm') || s.includes('lung') || s.includes('respiratory')) {
            specificAgentResponse = await expandedAgents.runPulmonologyAgent(patient, "Board Review", ai);
        } else if (s.includes('endo') || s.includes('diabetes') || s.includes('thyroid')) {
            specificAgentResponse = await expandedAgents.runEndocrinologyAgent(patient, "Board Review", ai);
        } else if (s.includes('ortho') || s.includes('bone') || s.includes('joint')) {
            specificAgentResponse = await expandedAgents.runOrthopedicsAgent(patient, "Board Review", ai);
        } else if (s.includes('derm') || s.includes('skin')) {
            specificAgentResponse = await expandedAgents.runDermatologyAgent(patient, "Board Review", ai);
        } else if (s.includes('nephro') || s.includes('kidney') || s.includes('renal')) {
            specificAgentResponse = await expandedAgents.runNephrologyAgent(patient, "Board Review", ai);
        } else if (s.includes('hema') || s.includes('blood') || s.includes('oncology')) {
            // Check if oncology specific or hematology
            if (s.includes('oncology')) specificAgentResponse = await subSpecialtyAgents.runOncologyAgent(patient, "Board Review", ai);
            else specificAgentResponse = await expandedAgents.runHematologyAgent(patient, "Board Review", ai);
        } else if (s.includes('rheum') || s.includes('lupus')) {
            specificAgentResponse = await expandedAgents.runRheumatologyAgent(patient, "Board Review", ai);
        } else if (s.includes('infect') || s.includes('id') || s.includes('sepsis')) {
            specificAgentResponse = await expandedAgents.runInfectiousDiseaseAgent(patient, "Board Review", ai);
        } else if (s.includes('psych') || s.includes('mental')) {
            specificAgentResponse = await runPsychiatryAgent(patient, "Board Review", ai);
        } else if (s.includes('urol') || s.includes('prostate') || s.includes('bladder')) {
            specificAgentResponse = await expandedAgents.runUrologyAgent(patient, "Board Review", ai);
        } else if (s.includes('ophth') || s.includes('eye')) {
            specificAgentResponse = await expandedAgents.runOphthalmologyAgent(patient, "Board Review", ai);
        } else if (s.includes('geria') || s.includes('elderly')) {
            specificAgentResponse = await expandedAgents.runGeriatricsAgent(patient, "Board Review", ai);
        } else if (s.includes('neuro')) {
            specificAgentResponse = await subSpecialtyAgents.runNeurologyAgent(patient, "Board Review", ai);
        } else if (s.includes('pharm') || s.includes('drug') || s.includes('medication')) {
            specificAgentResponse = await runPharmacistAgent(patient, "Board Review", ai);
        } else if (s.includes('nutrition') || s.includes('diet') || s.includes('food')) {
            specificAgentResponse = await runNutritionistAgent(patient, "Board Review", ai);
        }

        // If a specific agent was found and returned a valid object (not a text error message)
        if (specificAgentResponse && typeof specificAgentResponse !== 'string' && specificAgentResponse.type !== 'text') {
            return adaptSpecificAgentOutput(specialty, specificAgentResponse);
        }
    } catch (err) {
        console.warn(`Specific agent for ${specialty} failed, falling back to generic.`, err);
    }

    // --- GENERIC FALLBACK ---
    const context = getPatientContext(patient);
    const prompt = `You are a world-class ${specialty} specialist. Analyze the patient data from your specific domain perspective.
    
    **Patient Context:** ${context}
    
    **Instructions:**
    1. Identify key findings relevant to ${specialty}.
    2. Provide specific recommendations.
    3. Be concise but thorough.
    
    Return JSON.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            specialty: { type: Type.STRING },
            focus: { type: Type.STRING, description: "Main area of concern" },
            findings: { type: Type.STRING, description: "Key findings" },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["specialty", "focus", "findings", "recommendations"]
    };

    const response = await ai.models.generateContent({
        model: AI_MODELS.FLASH,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.3
        }
    });

    return JSON.parse(response.text.trim()) as SpecialistReport;
};

// --- 3. Generate Consolidated Report (CMO) ---
export const generateBoardConsensus = async (patient: Patient, reports: SpecialistReport[], ai: GoogleGenAI): Promise<{ summary: string; conflicts: string; finalPlan: string }> => {
    const context = getPatientContext(patient);
    const reportsText = reports.map(r => `[${r.specialty}]: ${r.findings} Recs: ${r.recommendations.join('; ')}`).join('\n\n');

    const prompt = `You are the Chief Medical Officer (CMO). Synthesize the findings from the specialized medical board.
    
    **Patient Context:** ${context}
    
    **Specialist Reports:**
    ${reportsText}
    
    **Instructions:**
    1. Create an Executive Summary.
    2. Identify any strategic conflicts or trade-offs between specialists (e.g. Nephrology limiting fluid vs Cardiology requesting diuresis).
    3. Develop a Final Unified Plan.
    
    Return JSON.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING },
            conflicts: { type: Type.STRING },
            finalPlan: { type: Type.STRING }
        },
        required: ["summary", "conflicts", "finalPlan"]
    };

    const response = await ai.models.generateContent({
        model: AI_MODELS.PRO, // Use Pro for synthesis
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.3
        }
    });

    return JSON.parse(response.text.trim());
};

// --- Legacy Wrapper for backwards compatibility ---
export const runMultiSpecialistReviewAgent = async (patient: Patient, ai: GoogleGenAI, forceGrandRounds: boolean = false): Promise<MultiSpecialistReviewMessage> => {
    const specialties = await identifyBoardParticipants(patient, ai, forceGrandRounds);
    const reports = await Promise.all(specialties.map(s => generateSpecialistOpinion(patient, s, ai)));
    const consensus = await generateBoardConsensus(patient, reports, ai);

    return {
        id: Date.now(),
        sender: 'ai',
        type: 'multi_specialist_review',
        title: `Medical Board Review: ${patient.name}`,
        specialistReports: reports,
        consolidatedReport: consensus
    };
};

// --- NEW: Rate-Limit-Aware Sequential Functions ---

/**
 * Configuration for board review execution
 */
export interface BoardReviewConfig {
    maxSpecialties?: number;
    forceGrandRounds?: boolean;
    enableCache?: boolean;
    progressCallback?: (current: number, total: number, specialist: string) => void;
}

/**
 * Configuration for debate execution
 */
export interface DebateConfig {
    maxParticipants?: number;
    maxTurns?: number;
    progressCallback?: (turn: number, total: number, speaker: string) => void;
}

/**
 * Sleep utility for sequential execution
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Run multi-specialist review with sequential execution to avoid rate limiting
 * @param patient Patient data
 * @param ai GoogleGenAI instance
 * @param config Configuration options
 */
export const runMultiSpecialistReviewSequential = async (
    patient: Patient,
    ai: GoogleGenAI,
    config: BoardReviewConfig = {}
): Promise<MultiSpecialistReviewMessage> => {
    const {
        maxSpecialties = 8,
        forceGrandRounds = false,
        progressCallback
    } = config;

    // Identify participants
    let specialties = await identifyBoardParticipants(patient, ai, forceGrandRounds);

    // Apply cap if not grand rounds
    if (!forceGrandRounds && specialties.length > maxSpecialties) {
        console.log(`[Board] Limiting specialists from ${specialties.length} to ${maxSpecialties}`);
        // Always keep Cardiology first if present, then take next most relevant
        const cardiologyIndex = specialties.indexOf('Cardiology');
        if (cardiologyIndex > 0) {
            specialties = ['Cardiology', ...specialties.filter((_, i) => i !== cardiologyIndex).slice(0, maxSpecialties - 1)];
        } else {
            specialties = specialties.slice(0, maxSpecialties);
        }
    }

    // Generate specialist opinions sequentially (not parallel)
    const reports: SpecialistReport[] = [];
    for (let i = 0; i < specialties.length; i++) {
        const specialty = specialties[i];
        if (progressCallback) {
            progressCallback(i + 1, specialties.length, specialty);
        }
        const report = await generateSpecialistOpinion(patient, specialty, ai);
        reports.push(report);

        // Add small delay between calls to stay within rate limits
        if (i < specialties.length - 1) {
            await sleep(400); // Slightly above MIN_REQUEST_GAP_MS
        }
    }

    // Generate consensus
    const consensus = await generateBoardConsensus(patient, reports, ai);

    return {
        id: Date.now(),
        sender: 'ai',
        type: 'multi_specialist_review',
        title: `Medical Board Review: ${patient.name}`,
        specialistReports: reports,
        consolidatedReport: consensus
    };
};

/**
 * Initialize debate with participant limit
 */
export const initializeDebateAgentLimited = async (
    patient: Patient,
    ai: GoogleGenAI,
    maxParticipants: number = 8
): Promise<{ topic: string, participants: DebateParticipant[] }> => {
    const context = getPatientContext(patient);

    const prompt = `You are a Medical Simulation Director organizing a Grand Rounds debate.
    **Patient Context:** ${context}

    **Task:**
    1. Identify the most controversial, complex, or high-stakes clinical dilemma for this patient.
    2. Assemble a multidisciplinary board of specialists to debate this.
       - Choose from the following roles if relevant: ${ALL_SPECIALTIES.join(', ')}.
       - Select exactly ${maxParticipants} participants (including 1 Moderator).
       - Always include a "Moderator" (Chief of Medicine) to guide the discussion.
       - Prioritize specialties most relevant to the clinical dilemma.

    **Output:** JSON with 'topic' and a list of 'participants' (role, name, specialty).`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING },
            participants: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        role: { type: Type.STRING, description: "Specialty (e.g., Nephrologist)" },
                        name: { type: Type.STRING, description: "Name (e.g., Dr. Smith)" },
                        specialty: { type: Type.STRING }
                    },
                    required: ["role", "name", "specialty"]
                }
            }
        },
        required: ["topic", "participants"]
    };

    const response = await ai.models.generateContent({
        model: AI_MODELS.PRO,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema }
    });

    const result = JSON.parse(response.text.trim());

    // Ensure we don't exceed max participants
    if (result.participants.length > maxParticipants) {
        result.participants = result.participants.slice(0, maxParticipants);
    }

    return result;
};

// --- INTERACTIVE CLINICAL DEBATE AGENTS ---

/**
 * Step 1: Initialize the debate - identify topic and participants.
 */
export const initializeDebateAgent = async (patient: Patient, ai: GoogleGenAI, maxParticipants: number = 8): Promise<{ topic: string, participants: DebateParticipant[] }> => {
    const context = getPatientContext(patient);

    const prompt = `You are a Medical Simulation Director organizing a Grand Rounds debate.
    **Patient Context:** ${context}

    **Task:**
    1. Identify the most controversial, complex, or high-stakes clinical dilemma for this patient.
    2. Assemble a multidisciplinary board of specialists to debate this.
       - Choose from the following roles if relevant: ${ALL_SPECIALTIES.join(', ')}.
       - Select exactly ${maxParticipants} participants (including 1 Moderator) for focused discussion.
       - Always include a "Moderator" (Chief of Medicine) to guide the discussion.
       - Prioritize specialties most relevant to the clinical dilemma.

    **Output:** JSON with 'topic' and a list of 'participants' (role, name, specialty).`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING },
            participants: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        role: { type: Type.STRING, description: "Specialty (e.g., Nephrologist)" },
                        name: { type: Type.STRING, description: "Name (e.g., Dr. Smith)" },
                        specialty: { type: Type.STRING }
                    },
                    required: ["role", "name", "specialty"]
                }
            }
        },
        required: ["topic", "participants"]
    };

    const response = await ai.models.generateContent({
        model: AI_MODELS.PRO,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema }
    });

    const result = JSON.parse(response.text.trim());

    // Ensure we don't exceed max participants
    if (result.participants.length > maxParticipants) {
        result.participants = result.participants.slice(0, maxParticipants);
    }

    return result;
};

/**
 * Step 2: Generate the next turn in the debate loop.
 */
export const runNextDebateTurnAgent = async (
    patient: Patient,
    transcript: DebateTurn[],
    participants: DebateParticipant[],
    topic: string,
    ai: GoogleGenAI
): Promise<{ nextTurn: DebateTurn, consensusReached: boolean, consensusStatement: string | null }> => {

    const context = getPatientContext(patient);
    const transcriptText = transcript.map(t => `${t.speaker} (${t.role}): ${t.text}`).join('\n');
    const participantList = participants.map(p => `${p.name} (${p.specialty})`).join(', ');

    const prompt = `You are simulating a live medical round table debate.
    **Topic:** ${topic}
    **Participants:** ${participantList}
    **Patient Data:** ${context}
    
    **Current Transcript:**
    ${transcriptText}

    **Task:**
    1. Determine who should speak next to advance the discussion effectively.
       - **Ensure broad participation:** Do not let the debate be dominated by just two people.
       - Participants should debate vigorously but professionally, citing guidelines and patient data.
       - If a specific specialty (e.g. Nephrology) hasn't spoken but the topic touches their domain (e.g. fluids/contrast), they MUST interject now.
    2. Generate their response text. Keep it concise (2-3 sentences) and impactful.
    3. Evaluate if **Full Consensus** has been reached. 
       - Consensus means all relevant specialists have voiced their opinion and agreed on a final unified plan.
       - If YES: Set consensusReached = true, and provide a detailed 'consensusStatement'.
       - If NO: Set consensusReached = false, consensusStatement = null.

    **Output:** JSON.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            nextSpeakerName: { type: Type.STRING },
            nextSpeakerRole: { type: Type.STRING },
            responseText: { type: Type.STRING },
            consensusReached: { type: Type.BOOLEAN },
            consensusStatement: { type: Type.STRING }
        },
        required: ["nextSpeakerName", "nextSpeakerRole", "responseText", "consensusReached"]
    };

    const response = await ai.models.generateContent({
        model: AI_MODELS.FLASH, // Use Flash for speed in the loop
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema, temperature: 0.7 }
    });

    const result = JSON.parse(response.text.trim());

    return {
        nextTurn: {
            speaker: result.nextSpeakerName,
            role: result.nextSpeakerRole,
            text: result.responseText
        },
        consensusReached: result.consensusReached,
        consensusStatement: result.consensusStatement || null
    };
};

/**
 * Deprecated single-shot agent (kept for fallback or if user switches back logic)
 */
export const runClinicalDebateAgent = async (patient: Patient, ai: GoogleGenAI): Promise<ClinicalDebateMessage> => {
    const init = await initializeDebateAgent(patient, ai);
    return {
        id: Date.now(),
        sender: 'ai',
        type: 'clinical_debate',
        title: `Grand Rounds Debate: ${patient.name}`,
        topic: init.topic,
        participants: init.participants,
        transcript: [{ speaker: "System", role: "Moderator", text: "Initializing debate..." }],
        consensus: null,
        isLive: true
    };
};

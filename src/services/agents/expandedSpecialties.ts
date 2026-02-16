
import { GoogleGenAI, Type } from "@google/genai";
import type { Patient, TextMessage, UniversalSpecialistMessage, Report } from '../../types';
import { AI_MODELS } from '../../config/aiModels';

// Helper to filter reports and get text context
const getSpecialtyContext = (patient: Patient, keywords: string[]): string => {
    const relevantReports = patient.reports.filter(r =>
        keywords.some(k =>
            r.title.toLowerCase().includes(k) ||
            r.type.toLowerCase().includes(k) ||
            (typeof r.content === 'string' && r.content.toLowerCase().includes(k))
        )
    ).slice(0, 8);

    if (relevantReports.length === 0) {
        return patient.reports.filter(r => r.type === 'Lab').slice(0, 3)
            .map(r => `[${r.date}] ${r.title}: ${typeof r.content === 'string' ? r.content.substring(0, 300) : 'See PDF'}`).join('\n');
    }

    return relevantReports.map(r => {
        let text = '';
        if (typeof r.content === 'string') text = r.content;
        else if (r.content.type === 'pdf') text = r.content.rawText;
        else if (r.content.type === 'link') text = r.content.metadata?.simulatedContent || 'External Link';
        return `[${r.date}] ${r.title} (${r.type}):\n${text.substring(0, 500)}...`;
    }).join('\n\n');
};

const runSpecialtyAgentBase = async (
    patient: Patient,
    query: string,
    specialtyName: string,
    keywords: string[],
    roleDefinition: string,
    ai: GoogleGenAI
): Promise<UniversalSpecialistMessage | TextMessage> => {

    const context = getSpecialtyContext(patient, keywords);

    try {
        const prompt = `${roleDefinition}
        
        **Patient:** ${patient.name}, ${patient.age}y ${patient.gender}.
        **Condition:** ${patient.currentStatus.condition}.
        **User Query:** "${query}"
        
        **Relevant Clinical Data (filtered for ${specialtyName}):**
        ${context || "No specific reports found for this specialty. Reviewing general history and labs."}
        
        **Task:**
        1. Analyze the data strictly from the perspective of a ${specialtyName} specialist.
        2. Identify key findings. If data is missing (e.g. no colonoscopy for GI), note that as a finding/gap.
        3. Provide a clinical assessment and a specific plan.
        4. Return structured JSON.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: `Title of the consult, e.g. '${specialtyName} Consult'` },
                keyFindings: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            label: { type: Type.STRING },
                            value: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ['normal', 'abnormal', 'critical'] }
                        },
                        required: ["label", "value", "status"]
                    }
                },
                clinicalAssessment: { type: Type.STRING },
                plan: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "keyFindings", "clinicalAssessment", "plan"]
        };

        const response = await ai.models.generateContent({
            model: AI_MODELS.FLASH, // Upgraded from 2.5-flash for better clinical reasoning
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema }
        });

        const result = JSON.parse(response.text.trim());

        return {
            id: 0,
            sender: 'ai',
            type: 'universal_specialist',
            specialty: specialtyName,
            title: result.title,
            keyFindings: result.keyFindings,
            clinicalAssessment: result.clinicalAssessment,
            plan: result.plan
        };

    } catch (e) {
        console.error(e);
        return { id: 0, sender: 'ai', type: 'text', text: `I attempted to consult as a ${specialtyName} specialist but encountered an error processing the data.` };
    }
};

// --- EXPORTED SPECIALTY AGENTS ---

export const runGastroenterologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['colonoscopy', 'egd', 'endoscopy', 'liver', 'abdomen', 'hepatic', 'gi', 'stomach', 'bowel', 'stool'];
    const role = "You are an expert Gastroenterologist AI. Focus on digestive health, liver function, and endoscopic findings.";
    return runSpecialtyAgentBase(patient, query, 'Gastroenterology', keywords, role, ai);
};

export const runPulmonologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['pft', 'spirometry', 'chest', 'lung', 'pulmonary', 'bronchoscopy', 'x-ray', 'ct chest', 'respiratory'];
    const role = "You are an expert Pulmonologist AI. Focus on lung function, respiratory symptoms, and thoracic imaging.";
    return runSpecialtyAgentBase(patient, query, 'Pulmonology', keywords, role, ai);
};

export const runEndocrinologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['a1c', 'glucose', 'thyroid', 'tsh', 't4', 'lipid', 'cholesterol', 'endocrine', 'diabetes', 'hormone'];
    const role = "You are an expert Endocrinologist AI. Focus on hormonal balance, diabetes management, and metabolic health.";
    return runSpecialtyAgentBase(patient, query, 'Endocrinology', keywords, role, ai);
};

export const runOrthopedicsAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['fracture', 'bone', 'joint', 'knee', 'hip', 'shoulder', 'spine', 'x-ray', 'mri', 'ortho', 'pain'];
    const role = "You are an expert Orthopedic Surgeon AI. Focus on musculoskeletal health, fractures, and joint mobility.";
    return runSpecialtyAgentBase(patient, query, 'Orthopedics', keywords, role, ai);
};

export const runDermatologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['skin', 'rash', 'lesion', 'derm', 'biopsy', 'mole', 'melanoma'];
    const role = "You are an expert Dermatologist AI. Focus on skin conditions, lesions, and rashes.";
    return runSpecialtyAgentBase(patient, query, 'Dermatology', keywords, role, ai);
};

export const runNephrologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['kidney', 'renal', 'creatinine', 'egfr', 'bun', 'urine', 'dialysis', 'nephrology', 'albumin'];
    const role = "You are an expert Nephrologist AI. Focus on renal function, electrolytes, and CKD management.";
    return runSpecialtyAgentBase(patient, query, 'Nephrology', keywords, role, ai);
};

export const runHematologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['blood', 'anemia', 'hemoglobin', 'platelet', 'wbc', 'iron', 'ferritin', 'inr', 'coagulation', 'heme', 'oncology'];
    const role = "You are an expert Hematologist AI. Focus on blood counts, coagulation, anemia, and hematologic malignancies.";
    return runSpecialtyAgentBase(patient, query, 'Hematology', keywords, role, ai);
};

export const runRheumatologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['joint', 'arthritis', 'autoimmune', 'lupus', 'ra', 'ana', 'esr', 'crp', 'rheum', 'inflammation'];
    const role = "You are an expert Rheumatologist AI. Focus on autoimmune conditions, inflammatory markers, and joint pathology.";
    return runSpecialtyAgentBase(patient, query, 'Rheumatology', keywords, role, ai);
};

export const runInfectiousDiseaseAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['infection', 'sepsis', 'fever', 'antibiotic', 'culture', 'wbc', 'crp', 'bacteria', 'viral', 'fungal', 'id', 'microbiology'];
    const role = "You are an expert Infectious Disease Specialist AI. Focus on pathogen identification, antimicrobial stewardship, and infection control.";
    return runSpecialtyAgentBase(patient, query, 'Infectious Disease', keywords, role, ai);
};

export const runPsychiatryAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['depression', 'anxiety', 'mood', 'psych', 'suicide', 'mental', 'hallucination', 'delusion', 'cognitive', 'behavioral', 'sertraline', 'fluoxetine'];
    const role = "You are an expert Psychiatrist AI. Focus on mental health, mood disorders, cognitive function, and psychopharmacology.";
    return runSpecialtyAgentBase(patient, query, 'Psychiatry', keywords, role, ai);
};

export const runUrologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['urine', 'prostate', 'bladder', 'psa', 'hematuria', 'incontinence', 'urology', 'kidney stone', 'utis', 'foley'];
    const role = "You are an expert Urologist AI. Focus on the urinary tract, prostate health, and urologic procedures.";
    return runSpecialtyAgentBase(patient, query, 'Urology', keywords, role, ai);
};

export const runOphthalmologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['eye', 'vision', 'retina', 'glaucoma', 'cataract', 'lens', 'optic', 'ophthalmology', 'visual'];
    const role = "You are an expert Ophthalmologist AI. Focus on eye health, vision preservation, and ocular pathology.";
    return runSpecialtyAgentBase(patient, query, 'Ophthalmology', keywords, role, ai);
};

export const runGeriatricsAgent = async (patient: Patient, query: string, ai: GoogleGenAI) => {
    const keywords = ['frailty', 'fall', 'dementia', 'delirium', 'polypharmacy', 'elderly', 'aging', 'functional status', 'adls', 'geriatrics'];
    const role = "You are an expert Geriatrician AI. Focus on optimizing quality of life, functional independence, and medication rationalization for older adults.";
    return runSpecialtyAgentBase(patient, query, 'Geriatrics', keywords, role, ai);
};

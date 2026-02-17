import { GoogleGenAI, Type } from "@google/genai";
import { AI_MODELS } from '../../config/aiModels';
import type { Patient, PharmacistMessage, TextMessage, Report, SuggestedAction } from '../../types';

// Helper to get text from reports
const getReportText = (report: Report): string | null => {
    if (typeof report.content === 'string') {
        return report.content;
    }
    if (typeof report.content === 'object' && report.content.type === 'pdf') {
        return report.content.rawText;
    }
    if (typeof report.content === 'object' && report.content.type === 'link' && report.content.metadata?.simulatedContent) {
        return report.content.metadata.simulatedContent;
    }
    return null;
}

export const runPharmacistAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<PharmacistMessage | TextMessage> => {
    // 1. Context Gathering
    const meds = patient.currentStatus.medications.join(', ');
    const history = patient.medicalHistory.map(h => h.description).join(', ');
    const allergies = patient.allergies.join(', ');

    // Get latest Lab for Renal/Hepatic function
    const labs = patient.reports
        .filter(r => r.type === 'Lab')
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3)
        .map(r => `${r.date}: ${getReportText(r)?.substring(0, 500)}`)
        .join('\n\n');

    const prompt = `You are an expert Clinical Pharmacist specializing in geriatric and complex disease management (Heart Failure, CKD, Diabetes).
    
    **Patient Profile:**
    - Name: ${patient.name}, ${patient.age}y ${patient.gender}
    - Conditions: ${patient.currentStatus.condition}
    - History: ${history}
    - Allergies: ${allergies}
    - **Current Medications:** ${meds}
    
    **Recent Labs (Crucial for Dosing):**
    ${labs}

    **Your Task:**
    Perform a comprehensive medication review. Focus on:
    1. **Renal & Hepatic Dosing:** Check eGFR/Creatinine and LFTs against all meds. Flag ANY mismatches.
    2. **Drug-Drug Interactions:** Identify significant interactions (mechanism, severity, management).
    3. **Deprescribing:** Identify medications with high risk/benefit ratio in this patient (e.g., anticholinergics in elderly, PPIs > 8 weeks).
    4. **Cost Optimization:** Suggest generic alternatives or consolidations.

    **Output Format:** JSON
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            interactions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        drug1: { type: Type.STRING },
                        drug2: { type: Type.STRING },
                        severity: { type: Type.STRING, enum: ['Major', 'Moderate', 'Minor'] },
                        mechanism: { type: Type.STRING },
                        management: { type: Type.STRING }
                    },
                    required: ['drug1', 'drug2', 'severity', 'mechanism', 'management']
                }
            },
            dosingAdjustments: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        drug: { type: Type.STRING },
                        currentDose: { type: Type.STRING },
                        recommendedDose: { type: Type.STRING },
                        reason: { type: Type.STRING, enum: ['Renal', 'Hepatic', 'Age', 'Weight', 'Interaction'] },
                        details: { type: Type.STRING }
                    },
                    required: ['drug', 'currentDose', 'recommendedDose', 'reason', 'details']
                }
            },
            deprescribingOpportunities: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        drug: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        recommendation: { type: Type.STRING }
                    },
                    required: ['drug', 'reason', 'recommendation']
                }
            },
            costOptimization: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        drug: { type: Type.STRING },
                        suggestion: { type: Type.STRING },
                        potentialSavings: { type: Type.STRING }
                    },
                    required: ['drug', 'suggestion', 'potentialSavings']
                }
            },
            summary: { type: Type.STRING }
        },
        required: ['title', 'interactions', 'dosingAdjustments', 'deprescribingOpportunities', 'costOptimization', 'summary']
    };

    try {
        const response = await ai.models.generateContent({
            model: AI_MODELS.PRO, // Use Pro for complex pharmacological reasoning
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema
            }
        });

        const result = JSON.parse(response.text.trim());

        return {
            id: Date.now(),
            sender: 'ai',
            type: 'pharmacist_analysis',
            title: result.title || `Pharmacy Consult: ${patient.name}`,
            interactions: result.interactions,
            dosingAdjustments: result.dosingAdjustments,
            deprescribingOpportunities: result.deprescribingOpportunities,
            costOptimization: result.costOptimization,
            summary: result.summary,
            suggestedAction: { type: 'generate_prescription', label: 'Update Prescriptions' }
        };

    } catch (error) {
        console.error("Error in runPharmacistAgent:", error);
        return {
            id: Date.now(),
            sender: 'ai',
            type: 'text',
            text: "I encountered an error while performing the pharmacy review. Please try again."
        };
    }
};

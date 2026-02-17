import { GoogleGenAI, Type } from "@google/genai";
import { AI_MODELS } from '../../config/aiModels';
import type { Patient, NutritionistMessage, TextMessage, Report, SuggestedAction } from '../../types';

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

export const runNutritionistAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<NutritionistMessage | TextMessage> => {
    // 1. Context Gathering
    const meds = patient.currentStatus.medications.join(', ');
    const history = patient.medicalHistory.map(h => h.description).join(', ');
    const conditions = patient.currentStatus.condition;

    // Get latest Lab for Electrolytes/Albumin/HbA1c
    const labs = patient.reports
        .filter(r => r.type === 'Lab')
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3)
        .map(r => `${r.date}: ${getReportText(r)?.substring(0, 500)}`)
        .join('\n\n');

    // Get Vitals (Weight/BMI)
    const vitals = patient.currentStatus.vitals;

    const prompt = `You are an expert Clinical Review Dietitian specializing in Medical Nutrition Therapy (MNT).
    
    **Patient Profile:**
    - Name: ${patient.name}, ${patient.age}y ${patient.gender}
    - Conditions: ${conditions}
    - History: ${history}
    - Medications (Nutrient-Drug Interactions?): ${meds}
    - Vitals (Weight/BMI): ${vitals}
    
    **Recent Labs (Crucial for Diet):**
    ${labs}

    **Your Task:**
    Provide a comprehensive nutritional assessment and plan. Focus on:
    1. **Nutritional Status:** Assess risk of malnutrition or obesity based on BMI/Weight/Albumin.
    2. **Dietary Restrictions:** Specific, evidence-based restrictions for their conditions (e.g., 2g Na+ for HF, Low Phos for CKD).
    3. **Deficiencies:** Identify potential deficiencies (Iron, B12, Vit D) based on labs or meds (e.g., Metformin -> B12).
    4. **Meal Planning:** Provide a concrete, appetizing daily meal plan example fitting their restrictions.

    **Output Format:** JSON
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            nutritionalStatus: { type: Type.STRING, enum: ['Well-nourished', 'At Risk', 'Malnourished'] },
            dietaryRestrictions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['Low Sodium', 'Fluid Restriction', 'Low Potassium', 'Carbohydrate Controlled', 'Low Phosphate', 'Renal', 'Heart Healthy'] },
                        status: { type: Type.STRING, enum: ['Active', 'Recommended', 'Contraindicated'] },
                        details: { type: Type.STRING }
                    },
                    required: ['type', 'status', 'details']
                }
            },
            deficiencies: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        nutrient: { type: Type.STRING },
                        level: { type: Type.STRING },
                        status: { type: Type.STRING, enum: ['Deficient', 'Insufficiency', 'Risk'] },
                        recommendation: { type: Type.STRING }
                    },
                    required: ['nutrient', 'level', 'status', 'recommendation']
                }
            },
            mealPlanSuggestion: { type: Type.STRING },
            educationalContent: { type: Type.STRING },
            summary: { type: Type.STRING }
        },
        required: ['title', 'nutritionalStatus', 'dietaryRestrictions', 'deficiencies', 'mealPlanSuggestion', 'educationalContent', 'summary']
    };

    try {
        const response = await ai.models.generateContent({
            model: AI_MODELS.PRO, // Use Pro for detailed meal planning and complex MNT
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
            type: 'nutritionist_analysis',
            title: result.title || `Nutrition Consult: ${patient.name}`,
            nutritionalStatus: result.nutritionalStatus,
            dietaryRestrictions: result.dietaryRestrictions,
            deficiencies: result.deficiencies,
            mealPlanSuggestion: result.mealPlanSuggestion,
            educationalContent: result.educationalContent,
            suggestedAction: { type: 'view_report', label: 'View Diet Plan' }
        };

    } catch (error) {
        console.error("Error in runNutritionistAgent:", error);
        return {
            id: Date.now(),
            sender: 'ai',
            type: 'text',
            text: "I encountered an error while performing the nutrition assessment. Please try again."
        };
    }
};

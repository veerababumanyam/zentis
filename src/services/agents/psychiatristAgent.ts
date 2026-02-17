
import { GoogleGenAI, Type } from "@google/genai";
import type { Patient, TextMessage, PsychiatryMessage, Report } from '../../types';
import { AI_MODELS } from '../../config/aiModels';

const getPsychContext = (patient: Patient): string => {
    // Filter for psychiatry, psychology, mental health, behavioral health, and relevant notes
    const relevantReports = patient.reports.filter(r =>
        ['psychiatry', 'psychology', 'mental', 'behavioral', 'depression', 'anxiety', 'suicide', 'mood', 'cognitive'].some(k =>
            r.title.toLowerCase().includes(k) ||
            r.type.toLowerCase().includes(k) ||
            (typeof r.content === 'string' && r.content.toLowerCase().includes(k))
        )
    ).slice(0, 10);

    // Also include recent clinical notes as they often contain MSE
    const recentNotes = patient.reports.filter(r =>
        (r.type === 'LiveSession' || r.title.toLowerCase().includes('note') || r.title.toLowerCase().includes('visit')) &&
        !relevantReports.includes(r)
    ).slice(0, 3);

    const allReports = [...relevantReports, ...recentNotes].sort((a, b) => b.date.localeCompare(a.date));

    if (allReports.length === 0) {
        return "No specific psychiatry or mental health reports found. Reviewing general history.";
    }

    return allReports.map(r => {
        let text = '';
        if (typeof r.content === 'string') text = r.content;
        else if (r.content.type === 'pdf') text = r.content.rawText;
        else if (r.content.type === 'link') text = r.content.metadata?.simulatedContent || 'External Link';
        else if (r.content.type === 'live_session') text = r.content.transcript;

        return `[${r.date}] ${r.title} (${r.type}):\n${text.substring(0, 1000)}...`;
    }).join('\n\n');
};

export const runPsychiatryAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<PsychiatryMessage | TextMessage> => {
    const context = getPsychContext(patient);

    try {
        const prompt = `You are an expert Psychiatrist AI. Analyze the patient data to provide a comprehensive psychiatric assessment.

        **Patient:** ${patient.name}, ${patient.age}y ${patient.gender}.
        **Condition:** ${patient.currentStatus.condition}.
        **Current Meds:** ${patient.currentStatus.medications.join(', ')}.
        **User Query:** "${query}"
        
        **Clinical Data:**
        ${context}
        
        **Task:**
        1. **Mental Status Exam (MSE):** Infer/extract MSE components from the available text (notes, transcripts). If not explicitly stated, infer from behavior/speech patterns described.
        2. **Risk Assessment:** detailed evaluation of suicide, homicide, and self-harm risk based on history and current presentation.
        3. **Differential Diagnosis:** Consider medical/organic causes (e.g., thyroid, toxins, delirium) vs primary psychiatric disorders.
        4. **Medication Analysis:** Review psychotropics for adherence, side effects, and interactions.
        5. **Plan:** Evidence-based recommendations.

        Return structured JSON.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                mse: {
                    type: Type.OBJECT,
                    properties: {
                        appearance: { type: Type.STRING },
                        behavior: { type: Type.STRING },
                        speech: { type: Type.STRING },
                        mood: { type: Type.STRING },
                        affect: { type: Type.STRING },
                        thoughtProcess: { type: Type.STRING },
                        thoughtContent: { type: Type.STRING },
                        perception: { type: Type.STRING },
                        insight: { type: Type.STRING },
                        judgment: { type: Type.STRING }
                    },
                    required: ["appearance", "behavior", "speech", "mood", "affect", "thoughtProcess", "thoughtContent", "perception", "insight", "judgment"]
                },
                riskAssessment: {
                    type: Type.OBJECT,
                    properties: {
                        suicideRisk: { type: Type.STRING, enum: ['Low', 'Moderate', 'High', 'Critical'] },
                        homicideRisk: { type: Type.STRING, enum: ['Low', 'Moderate', 'High', 'Critical'] },
                        selfHarmRisk: { type: Type.STRING, enum: ['Low', 'Moderate', 'High'] },
                        rationale: { type: Type.STRING }
                    },
                    required: ["suicideRisk", "homicideRisk", "selfHarmRisk", "rationale"]
                },
                findings: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            category: { type: Type.STRING, enum: ['MSE', 'Risk', 'Psychosocial', 'Medical Rule-out'] },
                            finding: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ['Normal', 'Abnormal', 'Critical'] },
                            details: { type: Type.STRING }
                        },
                        required: ["category", "finding", "status", "details"]
                    }
                },
                differentialDiagnosis: { type: Type.ARRAY, items: { type: Type.STRING } },
                medicationAnalysis: { type: Type.STRING },
                plan: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "mse", "riskAssessment", "findings", "differentialDiagnosis", "medicationAnalysis", "plan"]
        };

        const response = await ai.models.generateContent({
            model: AI_MODELS.PRO, // Use Pro for deep clinical reasoning and nuance
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema }
        });

        const result = JSON.parse(response.text.trim());

        return {
            id: 0,
            sender: 'ai',
            type: 'psychiatry_analysis',
            title: result.title || `Psychiatric Consultation: ${patient.name}`,
            mse: result.mse,
            riskAssessment: result.riskAssessment,
            findings: result.findings,
            differentialDiagnosis: result.differentialDiagnosis,
            medicationAnalysis: result.medicationAnalysis,
            plan: result.plan
        };

    } catch (e) {
        console.error("Error in PsychiatryAgent:", e);
        return {
            id: 0,
            sender: 'ai',
            type: 'text',
            text: "I attempted to perform a psychiatric assessment but encountered an error processing the clinical data."
        };
    }
};

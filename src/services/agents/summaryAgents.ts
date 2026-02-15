
import { GoogleGenAI, Type } from "@google/genai";
import type { Patient, TextMessage, AiPersonalizationSettings, SmartSummaryMessage } from '../../types';

const getPersonalizationInstructions = (aiSettings: AiPersonalizationSettings): string => {
  const instructions: string[] = [];
  if (aiSettings.tone === 'formal') instructions.push('Adopt a formal, clinical tone.');
  if (aiSettings.tone === 'collaborative') instructions.push('Adopt a collaborative, conversational tone.');
  if (aiSettings.verbosity === 'concise') instructions.push('Keep the response concise and to the point.');
  if (aiSettings.verbosity === 'detailed') instructions.push('Provide a detailed, comprehensive response.');
  return instructions.join(' ');
};

export const runSmartSummaryAgent = async (patient: Patient, ai: GoogleGenAI, aiSettings: AiPersonalizationSettings): Promise<SmartSummaryMessage> => {
    const personalization = getPersonalizationInstructions(aiSettings);

    // --- NEW USER CHECK: If patient has no reports and no meaningful medical history, return a friendly welcome ---
    const hasReports = patient.reports && patient.reports.length > 0;
    const hasMedicalHistory = patient.medicalHistory && patient.medicalHistory.length > 0;
    const hasMedications = patient.currentStatus?.medications && patient.currentStatus.medications.length > 0;
    const hasVitals = patient.currentStatus?.vitals && patient.currentStatus.vitals.trim() !== '' && patient.currentStatus.vitals !== 'BP 120/80';

    if (!hasReports && !hasMedicalHistory && !hasMedications && !hasVitals) {
        return {
            id: Date.now(),
            sender: 'ai',
            type: 'smart_summary',
            title: `Clinical Summary: ${patient.name}`,
            highlights: [
                { icon: 'vitals', text: `Wellness check for a ${patient.age}-year-old ${patient.gender?.toLowerCase() || ''}.`.trim() }
            ],
            tables: [
                {
                    title: 'Current Vitals & Status',
                    items: [
                        { metric: 'Condition', value: patient.currentStatus?.condition || 'Healthy' },
                        { metric: 'Records', value: 'No documents uploaded yet' }
                    ]
                }
            ],
            narrativeSummary: `Welcome, ${patient.name}. No health records have been uploaded yet. You can start by uploading medical documents (lab results, imaging reports, prescriptions) for a personalized clinical summary. In the meantime, feel free to ask any health or medical questions — I'm here to help as your personal health assistant.`
        };
    }

    const latestEcho = patient.reports.filter(r => r.type === 'Echo').sort((a,b) => b.date.localeCompare(a.date))[0];
    const latestLab = patient.reports.filter(r => r.type === 'Lab' && typeof r.content === 'string').sort((a,b) => b.date.localeCompare(a.date))[0];

    // Prepare structured data context
    const conditions = patient.medicalHistory.map(h => h.description).join('; ');
    const alerts = patient.criticalAlerts && patient.criticalAlerts.length > 0 ? patient.criticalAlerts.join('; ') : 'None';
    const vitals = patient.currentStatus.vitals;
    
    const prompt = `You are a world-class cardiologist AI. Your task is to generate a "Smart Summary" for a patient, specifically focusing on Medical Conditions, Vital Signs, and Critical Alerts. ${personalization}

    **Patient Profile:**
    - **Name/Age:** ${patient.name}, ${patient.age}y ${patient.gender}.
    - **Reason for Visit:** ${patient.currentStatus.condition}.
    
    **CRITICAL DATA (Prioritize this):**
    - **Active Medical Conditions:** ${conditions}.
    - **Critical Alerts:** ${alerts}.
    - **Most Recent Vitals:** ${vitals}.
    - **Current Medications:** ${patient.currentStatus.medications.join(', ')}.
    
    **Supporting Reports (For verification):**
    [Report ID: ${latestEcho ? latestEcho.id : 'N/A'}] - Latest Echo (${latestEcho?.date}):
    ${typeof latestEcho?.content === 'string' ? latestEcho.content : 'N/A'}
    
    [Report ID: ${latestLab ? latestLab.id : 'N/A'}] - Latest Lab (${latestLab?.date}):
    ${latestLab && typeof latestLab.content === 'string' ? latestLab.content : 'N/A'}

    **Instructions:**
    1.  **Highlights (Top 3-4):** 
        - **MANDATORY:** If 'Critical Alerts' are present (not 'None'), the FIRST highlight MUST be the alert(s) using the 'alert' icon.
        - Include key diagnoses or recent events.
    2.  **Tables:** 
        - Create a table titled **"Current Vitals & Status"**. Extract specific metrics (BP, HR, Weight) from the "Most Recent Vitals" data provided above.
        - Create a second table for "Recent Labs" if data exists in the reports.
    3.  **EVIDENCE MODE:** 
        - If data comes from the *Reports* section, provide the 'reportId' and exact 'quote' in the verification object.
        - If data comes from the *Patient Profile* (History/Vitals/Alerts), leave 'verification' as null (or undefined).
    4.  **Narrative Summary:** A comprehensive paragraph synthesizing the patient's current clinical status, active conditions, and stability.
    5.  Return JSON matching the schema.

    **Icon Types:** 'alert', 'labs', 'meds', 'vitals', 'echo'
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            highlights: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        icon: { type: Type.STRING, enum: ['alert', 'labs', 'meds', 'vitals', 'echo'] },
                        text: { type: Type.STRING }
                    },
                    required: ['icon', 'text']
                }
            },
            tables: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    metric: { type: Type.STRING },
                                    value: { type: Type.STRING },
                                    trend: { type: Type.STRING, enum: ['up', 'down', 'stable'] },
                                    verification: {
                                        type: Type.OBJECT,
                                        properties: {
                                            reportId: { type: Type.STRING },
                                            quote: { type: Type.STRING }
                                        },
                                        required: ['reportId', 'quote']
                                    }
                                },
                                required: ['metric', 'value']
                            }
                        }
                    },
                    required: ['title', 'items']
                }
            },
            narrativeSummary: { type: Type.STRING }
        },
        required: ['highlights', 'tables', 'narrativeSummary']
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
        type: 'smart_summary',
        title: `Clinical Summary: ${patient.name}`,
        highlights: result.highlights,
        tables: result.tables,
        narrativeSummary: result.narrativeSummary,
    };
};


export const runMedicationReviewAgent = async (patient: Patient, query: string, ai: GoogleGenAI, aiSettings: AiPersonalizationSettings): Promise<TextMessage> => {
    const personalization = getPersonalizationInstructions(aiSettings);
    const prompt = `You are a cardiology AI assistant. Review the patient's current medication list and provide a brief commentary. ${personalization}

    **Patient:** ${patient.name}
    **Current Medications:** ${patient.currentStatus.medications.join(', ')}.

    **Instructions:**
    List the current medications and add a brief note about their purpose in this patient's context.`;
    
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    
    return { 
        id: 0, 
        sender: 'ai', 
        type: 'text', 
        text: `### Medication Review for ${patient.name}\n${response.text}`
    };
};

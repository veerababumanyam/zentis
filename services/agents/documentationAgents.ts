


import { GoogleGenAI, Type } from "@google/genai";
import type { Patient, Message, ClinicalNote, AiPersonalizationSettings } from '../../types';

// --- HELPER FUNCTIONS ---
const getReportText = (report: any): string | null => {
    if (typeof report.content === 'string') {
        return report.content;
    }
    if (typeof report.content === 'object' && report.content.type === 'pdf') {
        return report.content.rawText;
    }
    return null;
}

export const runClinicalNoteGeneratorAgent = async (patient: Patient, chatHistory: Message[], ai: GoogleGenAI, aiSettings: AiPersonalizationSettings, transcript?: string): Promise<ClinicalNote> => {
    
    // 1. Gather Context - Smart Report Comparison for Interval History
    // We group reports by type to compare the most recent vs. the previous one.
    const reportTypes = ['Echo', 'Lab', 'ECG', 'Cath', 'CTA', 'Device', 'HF Device'];
    let comparisonContext = "";
    
    // Sort reports descending by date
    const sortedReports = [...patient.reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    reportTypes.forEach(type => {
        const typeReports = sortedReports.filter(r => r.type === type);
        if (typeReports.length > 0) {
            const current = typeReports[0];
            const previous = typeReports[1]; // might be undefined if it's the only report
            
            comparisonContext += `\n--- ${type.toUpperCase()} REPORTS ---\n`;
            
            const currentText = current.aiSummary || getReportText(current)?.substring(0, 1000) || '[Image/Data - See full report]';
            comparisonContext += `CURRENT (${current.date}):\n${currentText}\n`;
            
            if (previous) {
                const prevText = previous.aiSummary || getReportText(previous)?.substring(0, 1000) || '[Image/Data - See full report]';
                comparisonContext += `PREVIOUS (${previous.date}):\n${prevText}\n`;
                comparisonContext += `>>> COMPARISON INSTRUCTION: Compare Current vs Previous to generate specific 'Interval History' points (e.g., "EF stable at...", "Cr increased from...").\n`;
            } else {
                comparisonContext += `(No prior ${type} report available for comparison)\n`;
            }
            comparisonContext += `\n`;
        }
    });

    // Fallback if no specific typed reports found, just dump recent ones to ensure nothing is missed
    if (!comparisonContext) {
        comparisonContext = sortedReports.slice(0, 5).map(r => 
            `[${r.date}] ${r.type} - ${r.title}:\n${r.aiSummary || getReportText(r)?.substring(0, 300) || 'Image Data'}`
        ).join('\n\n');
    }

    // --- CONTEXT WINDOW MANAGEMENT ---
    // Limit chat history to the last 20 messages to prevent token limits (rolling summary strategy)
    const recentHistory = chatHistory.slice(-20);
    const conversationContext = recentHistory
        .filter(msg => msg.type === 'text')
        .map(msg => `${msg.sender.toUpperCase()}: ${(msg as any).text}`)
        .join('\n');

    // 2. Construct Prompt
    const prompt = `You are an expert Medical Scribe and Cardiology Fellow. Your task is to generate a professional, structured clinical note (SOAP format) for the patient encounter, ready to be copied into an EMR (like Epic or Cerner).

    **Patient:** ${patient.name}, ${patient.age}y ${patient.gender}.
    **Reason for Visit:** ${patient.currentStatus.condition}.
    **Vitals:** ${patient.currentStatus.vitals}.
    **Current Meds:** ${patient.currentStatus.medications.join(', ')}.

    **Context Sources:**
    1. **Clinical Reports & Interval Comparison Data:** 
    ${comparisonContext}
    
    2. **Live Session Transcript (Ambient Listening):**
    ${transcript || "No ambient transcript available."}

    3. **Chat Conversation Transcript (Last ${recentHistory.length} messages):**
    ${conversationContext || "No chat history available."}

    **Instructions:**
    - **Subjective:** Summarize the patient's condition, symptoms, and the "Reason for Visit". Incorporate specific symptoms mentioned in the Live Session Transcript (Ambient Listening) if available. This is the most important section for the ambient scribe data.
    - **Objective:** List relevant vitals (from provided data). **CRITICAL:** You must generate a distinct "Interval History" / "Data Review" subsection here. Explicitly state changes in key metrics (LVEF, Creatinine, Potassium, etc.) by comparing the CURRENT vs PREVIOUS reports provided above. Use phrases like "stable compared to...", "improved from...", "worsened from...".
    - **Assessment:** Provide a concise, professional summary of the patient's cardiovascular status and risk profile (e.g., "Stable HFrEF on GDMT", "Uncontrolled Hypertension with new end-organ damage"). Incorporate risk scores (CHA2DS2-VASc, etc.) if they were calculated in the chat.
    - **Plan:** Detail changes to medications (start/stop/titrate), ordered diagnostics, and follow-up instructions. If the AI suggested a med change or next step in the chat, include it here.

    **Format:** Return a JSON object with fields: subjective, objective, assessment, plan. Do not use markdown formatting *inside* the JSON strings, just plain text with newlines.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            subjective: { type: Type.STRING },
            objective: { type: Type.STRING },
            assessment: { type: Type.STRING },
            plan: { type: Type.STRING }
        },
        required: ["subjective", "objective", "assessment", "plan"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema,
                temperature: 0.3 // Low temperature for factual consistency
            }
        });

        const note = JSON.parse(response.text.trim()) as ClinicalNote;
        return note;

    } catch (error) {
        console.error("Error generating clinical note:", error);
        throw new Error("Failed to generate clinical note.");
    }
};

import { GoogleGenAI, Type } from "@google/genai";
import type { Patient, Message, TextMessage, InterventionalCardiologyMessage, EpDeviceReportMessage, AdvancedHeartFailureMessage, CtaAnalysisMessage, NeurologyMessage, OncologyMessage, UniversalSpecialistMessage, Report, AiPersonalizationSettings } from '../../types';
import { runImageAnalysisAgent } from './utilityAgents';

// --- HELPER FUNCTIONS ---
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

// --- AGENT IMPLEMENTATIONS ---

// ... (Keep Existing Cardio Agents: runInterventionalCardiologyAgent, runEpAgent, runAdvancedHfAgent, runCtaAnalysisAgent) ...
// NOTE: For brevity in this update, I am appending the new agents. 
// Ideally, the old ones are preserved. I will re-include them to ensure file integrity.

export const runInterventionalCardiologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<InterventionalCardiologyMessage | TextMessage> => {
    const cathReport = patient.reports.filter(r => r.type === 'Cath').sort((a,b) => b.date.localeCompare(a.date))[0];

    if (!cathReport || !getReportText(cathReport)) {
        return { id: 0, sender: 'ai', type: 'text', text: "No coronary angiogram report was found for this patient to analyze." };
    }

    try {
        const prompt = `You are a world-class interventional cardiologist AI. Analyze the provided coronary angiogram report.
        **Patient:** ${patient.name}.
        **Report:** ${getReportText(cathReport)}
        Extract lesions, estimate SYNTAX score, and provide a recommendation (PCI vs CABG vs Meds). Return JSON.`;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                lesions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            vessel: { type: Type.STRING },
                            location: { type: Type.STRING },
                            stenosis: { type: Type.STRING },
                            ffr_ifr: { type: Type.STRING },
                            notes: { type: Type.STRING }
                        },
                        required: ["vessel", "location", "stenosis", "ffr_ifr", "notes"]
                    }
                },
                estimatedSyntaxScore: { type: Type.STRING },
                recommendation: {
                    type: Type.OBJECT,
                    properties: {
                        strategy: { type: Type.STRING, enum: ['PCI', 'CABG', 'Medical Therapy'] },
                        rationale: { type: Type.STRING },
                        guideline: { type: Type.STRING }
                    },
                    required: ["strategy", "rationale", "guideline"]
                },
                summary: { type: Type.STRING }
            },
            required: ["lesions", "estimatedSyntaxScore", "recommendation", "summary"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema }
        });

        const result = JSON.parse(response.text.trim());

        return {
            id: 0,
            sender: 'ai',
            type: 'interventional_cardiology',
            title: `Interventional Plan for ${patient.name}`,
            lesions: result.lesions,
            estimatedSyntaxScore: result.estimatedSyntaxScore,
            recommendation: result.recommendation,
            summary: result.summary,
            suggestedAction: { type: 'view_report', label: `View Angiogram Report`, reportId: cathReport.id }
        };
    } catch(error) {
        return { id: 0, sender: 'ai', type: 'text', text: "Error analyzing cath report." };
    }
};

export const runEpAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<EpDeviceReportMessage | TextMessage> => {
    const deviceReport = patient.reports.filter(r => r.type === 'Device').sort((a,b) => b.date.localeCompare(a.date))[0];
    if (!deviceReport) return { id: 0, sender: 'ai', type: 'text', text: "No device report found." };

    try {
        const prompt = `Analyze device report. Patient: ${patient.name}. Report: ${getReportText(deviceReport)}. Extract summary stats. Return JSON.`;
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                deviceSummary: { type: Type.OBJECT, properties: { therapiesDelivered: {type: Type.STRING}, atpDelivered: {type: Type.STRING}, shocksDelivered: {type: Type.STRING} } },
                arrhythmiaSummary: { type: Type.OBJECT, properties: { at_afBurden: {type: Type.STRING}, vt_ns_Episodes: {type: Type.STRING}, vfEpisodes: {type: Type.STRING} } },
                deviceStatus: { type: Type.OBJECT, properties: { battery: {type: Type.STRING}, leadImpedance: {type: Type.STRING}, sensing: {type: Type.STRING}, pacingThreshold: {type: Type.STRING} } },
                aiAssessment: { type: Type.STRING }
            }
        };
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema } });
        const result = JSON.parse(response.text.trim());
        return { id: 0, sender: 'ai', type: 'ep_device_report', title: `Device Interrogation: ${patient.name}`, ...result, suggestedAction: { type: 'view_report', label: 'View Report', reportId: deviceReport.id } };
    } catch(e) { return { id: 0, sender: 'ai', type: 'text', text: "Error analyzing device report." }; }
};

export const runAdvancedHfAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<AdvancedHeartFailureMessage | TextMessage> => {
    const hfDeviceReport = patient.reports.filter(r => r.type === 'HF Device').sort((a,b) => b.date.localeCompare(a.date))[0];
    if (!hfDeviceReport) return { id: 0, sender: 'ai', type: 'text', text: "No LVAD report found." };

    try {
        const prompt = `Analyze LVAD report for ${patient.name}. Content: ${getReportText(hfDeviceReport)}. Return JSON.`;
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                deviceType: { type: Type.STRING },
                parameters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { parameter: {type: Type.STRING}, value: {type: Type.STRING}, trend: {type: Type.STRING, enum: ['Increasing', 'Decreasing', 'Stable']}, status: {type: Type.STRING, enum: ['Normal', 'Concerning', 'Critical']} } } },
                aiAssessment: { type: Type.OBJECT, properties: { concern: {type: Type.STRING}, rationale: {type: Type.STRING}, recommendation: {type: Type.STRING} } }
            }
        };
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema } });
        const result = JSON.parse(response.text.trim());
        return { id: 0, sender: 'ai', type: 'advanced_heart_failure', title: `LVAD Analysis`, ...result, suggestedAction: { type: 'view_report', label: 'View Report', reportId: hfDeviceReport.id } };
    } catch(e) { return { id: 0, sender: 'ai', type: 'text', text: "Error analyzing LVAD report." }; }
};

export const runCtaAnalysisAgent = async (patient: Patient, query: string, ai: GoogleGenAI, aiSettings: AiPersonalizationSettings): Promise<CtaAnalysisMessage | TextMessage> => {
    const ctaReport = patient.reports.filter(r => r.type === 'CTA').sort((a,b) => b.date.localeCompare(a.date))[0];
    if (!ctaReport) return { id: 0, sender: 'ai', type: 'text', text: "No CTA report found." };
    if (!getReportText(ctaReport)) return { id: 0, sender: 'ai', type: 'text', text: "CTA report has no text content." };

    try {
        const prompt = `Analyze Coronary CTA. Patient: ${patient.name}. Report: ${getReportText(ctaReport)}. Return JSON with lesions, calcium score, and recs.`;
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                calciumScore: { type: Type.OBJECT, properties: { score: {type: Type.STRING}, interpretation: {type: Type.STRING} } },
                lesionAnalysis: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { vessel: {type: Type.STRING}, segment: {type: Type.STRING}, plaqueType: {type: Type.STRING, enum: ['Non-calcified', 'Mixed', 'Calcified', 'None']}, stenosisSeverity: {type: Type.STRING, enum: ['Minimal', 'Mild', 'Moderate', 'Severe']}, cadRads: {type: Type.STRING} } } },
                graftAnalysis: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { graftName: {type: Type.STRING}, status: {type: Type.STRING}, details: {type: Type.STRING} } } },
                otherCardiacFindings: { type: Type.STRING },
                extracardiacFindings: { type: Type.STRING },
                overallImpression: { type: Type.STRING },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        };
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema } });
        const result = JSON.parse(response.text.trim());
        return { id: 0, sender: 'ai', type: 'cta_analysis', title: `CTA Analysis`, ...result, suggestedAction: { type: 'view_report', label: 'View CTA', reportId: ctaReport.id } };
    } catch(e) { return { id: 0, sender: 'ai', type: 'text', text: "Error analyzing CTA report." }; }
};

// --- NEW SPECIALTY AGENTS ---

export const runNeurologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<NeurologyMessage | TextMessage> => {
    // Find relevant neuro reports (MRI, CT Head, EEG)
    const neuroReports = patient.reports.filter(r => 
        r.type === 'MRI' || r.title.toLowerCase().includes('brain') || r.title.toLowerCase().includes('head') || r.title.toLowerCase().includes('eeg')
    ).sort((a,b) => b.date.localeCompare(a.date));

    if (neuroReports.length === 0) {
        return { id: 0, sender: 'ai', type: 'text', text: "No neurology-related imaging (MRI/CT) or EEG reports found." };
    }
    
    const targetReport = neuroReports[0];
    const reportText = getReportText(targetReport);

    try {
        const prompt = `You are an expert Neurologist AI. Analyze the following report.
        **Patient:** ${patient.name}, ${patient.age}y ${patient.gender}.
        **Report (${targetReport.type}):** ${reportText}
        
        **Tasks:**
        1. Extract specific regional findings (e.g. Frontal Lobe, Basal Ganglia).
        2. Determine significance (Normal/Abnormal/Critical).
        3. Determine Stroke Protocol eligibility if applicable.
        4. Return JSON.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                modality: { type: Type.STRING, enum: ['MRI', 'CT', 'EEG'] },
                findings: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            region: { type: Type.STRING },
                            finding: { type: Type.STRING },
                            significance: { type: Type.STRING, enum: ['Normal', 'Abnormal', 'Critical'] }
                        },
                        required: ["region", "finding", "significance"]
                    }
                },
                impression: { type: Type.STRING },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                strokeProtocolStatus: { type: Type.STRING, description: "Optional: e.g. 'Outside tPA window' or 'Candidate for Thrombectomy'" }
            },
            required: ["modality", "findings", "impression", "recommendations"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Pro for complex neuro reasoning
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema }
        });

        const result = JSON.parse(response.text.trim());

        return {
            id: 0,
            sender: 'ai',
            type: 'neurology_analysis',
            title: `Neurology Analysis: ${targetReport.title}`,
            ...result,
            suggestedAction: { type: 'view_report', label: 'View Image/Report', reportId: targetReport.id }
        };

    } catch (e) {
        return { id: 0, sender: 'ai', type: 'text', text: "Sorry, I encountered an error analyzing the neurology report." };
    }
};

export const runOncologyAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<OncologyMessage | TextMessage> => {
    const oncoReports = patient.reports.filter(r => 
        r.type === 'Pathology' || r.title.toLowerCase().includes('biopsy') || r.title.toLowerCase().includes('oncology')
    ).sort((a,b) => b.date.localeCompare(a.date));

    if (oncoReports.length === 0) {
        return { id: 0, sender: 'ai', type: 'text', text: "No pathology or oncology reports found." };
    }
    
    const targetReport = oncoReports[0];

    try {
        const prompt = `You are an expert Oncologist AI. Analyze the pathology/oncology report.
        **Patient:** ${patient.name}.
        **Report:** ${getReportText(targetReport)}
        
        **Tasks:**
        1. Extract Tumor Site and Histology.
        2. Extract TNM Staging if available.
        3. Identify biomarker status (e.g. ER/PR, HER2, PD-L1).
        4. Summarize treatment plan/protocol.
        5. Return JSON.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                tumorSite: { type: Type.STRING },
                histology: { type: Type.STRING },
                biomarkers: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            status: { type: Type.STRING }
                        },
                        required: ["name", "status"]
                    }
                },
                staging: {
                    type: Type.OBJECT,
                    properties: {
                        t: { type: Type.STRING },
                        n: { type: Type.STRING },
                        m: { type: Type.STRING },
                        stage: { type: Type.STRING }
                    },
                    required: ["t", "n", "m", "stage"]
                },
                treatmentPlan: { type: Type.STRING }
            },
            required: ["tumorSite", "histology", "biomarkers", "treatmentPlan"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema }
        });

        const result = JSON.parse(response.text.trim());

        return {
            id: 0,
            sender: 'ai',
            type: 'oncology_analysis',
            title: `Oncology Analysis: ${result.tumorSite}`,
            ...result,
            suggestedAction: { type: 'view_report', label: 'View Pathology', reportId: targetReport.id }
        };

    } catch (e) {
        return { id: 0, sender: 'ai', type: 'text', text: "Sorry, I encountered an error analyzing the oncology report." };
    }
};

export const runUniversalSpecialistAgent = async (patient: Patient, query: string, specialty: string, ai: GoogleGenAI): Promise<UniversalSpecialistMessage | TextMessage> => {
    // 1. Gather all reports that might be relevant to this specialty
    // A heuristic approach: look for reports matching the specialty name or general terms
    const relevantReports = patient.reports.slice(0, 5); // Fallback to 5 most recent for context if specific filtering is hard
    const context = relevantReports.map(r => `[${r.date}] ${r.title}: ${getReportText(r)?.substring(0, 300)}`).join('\n');

    try {
        const prompt = `You are a world-class ${specialty} Specialist AI.
        **Patient:** ${patient.name}, ${patient.age}y ${patient.gender}.
        **Condition:** ${patient.currentStatus.condition}.
        **User Query:** "${query}"
        
        **Available Clinical Data:**
        ${context}
        
        **Task:**
        1. Analyze the data from the perspective of a ${specialty} specialist.
        2. Identify key findings pertinent to your field.
        3. Provide a clinical assessment and a plan.
        4. Return structured JSON.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "e.g. 'Gastroenterology Consult'" },
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
            model: 'gemini-3-flash-preview', // Flash is sufficient for general queries
            contents: prompt,
            config: { responseMimeType: 'application/json', responseSchema }
        });

        const result = JSON.parse(response.text.trim());

        return {
            id: 0,
            sender: 'ai',
            type: 'universal_specialist',
            specialty: specialty,
            title: result.title,
            keyFindings: result.keyFindings,
            clinicalAssessment: result.clinicalAssessment,
            plan: result.plan
        };

    } catch (e) {
        console.error(e);
        return { id: 0, sender: 'ai', type: 'text', text: `I attempted to consult as a ${specialty} specialist but encountered an error processing the data.` };
    }
};

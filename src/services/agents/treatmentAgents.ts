
import { GoogleGenAI, Type } from "@google/genai";
import type { Patient, Message, TextMessage, GdmtChecklistMessage, GdmtChecklistItem, ContraindicationMessage, ContraindicationItem, DosageOptimizationMessage, DosageOptimizationItem, Report, AiPersonalizationSettings, PrescriptionMessage, SourceVerification, MedicalHistoryItem } from '@/types';
import { AI_MODELS } from '../../config/aiModels';

// --- HELPER FUNCTIONS ---

const parseLabValue = (content: string, regex: RegExp): number | null => {
    if (typeof content !== 'string') return null;
    const match = content.match(regex);
    return match ? parseFloat(match[1]) : null;
};

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

const findVerificationForTerm = (term: string, reports: Report[]): SourceVerification | undefined => {
    // Prefer Meds reports for drugs, Lab for values, etc.
    const textReports = reports
        .filter(r => typeof r.content === 'string' || (r.content as any).rawText || (r.content as any).metadata?.simulatedContent)
        .sort((a, b) => b.date.localeCompare(a.date)); // Search newest first

    for (const report of textReports) {
        const content = getReportText(report);
        if (content && content.toLowerCase().includes(term.toLowerCase())) {
            // Find the line containing the term
            const lines = content.split('\n');
            const matchingLine = lines.find((l: string) => l.toLowerCase().includes(term.toLowerCase()));
            if (matchingLine) {
                return { reportId: report.id, quote: matchingLine.trim() };
            }
        }
    }
    return undefined;
};

const getPersonalizationInstructions = (aiSettings: AiPersonalizationSettings): string => {
    const instructions: string[] = [];
    if (aiSettings.tone === 'formal') instructions.push('Adopt a formal, clinical tone.');
    if (aiSettings.tone === 'collaborative') instructions.push('Adopt a collaborative, conversational tone.');
    if (aiSettings.verbosity === 'concise') instructions.push('Keep the response concise and to the point.');
    if (aiSettings.verbosity === 'detailed') instructions.push('Provide a detailed, comprehensive response.');
    return instructions.join(' ');
};


// --- AGENT IMPLEMENTATIONS ---

export const runGuidelineAdherenceAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<GdmtChecklistMessage | TextMessage> => {
    if (!patient.medicalHistory.some((item: MedicalHistoryItem) => item.description.includes('Heart Failure (HFrEF)') || item.description.includes('Systolic Heart Failure'))) {

        return { id: 0, sender: 'ai', type: 'text', text: "The patient does not have a documented history of HFrEF, so a standard GDMT check is not applicable." };
    }

    const meds = patient.currentStatus.medications.map((m: string) => m.toLowerCase());
    const items: GdmtChecklistItem[] = [];
    const latestLab = patient.reports.filter((r: Report) => r.type === 'Lab').sort((a: Report, b: Report) => b.date.localeCompare(a.date))[0];

    // Extract Physiological Data
    let sbp: number | null = null;
    let hr: number | null = null;
    if (patient.currentStatus.vitals) {
        const bpMatch = patient.currentStatus.vitals.match(/BP\s*(\d+)\//i);
        if (bpMatch) sbp = parseInt(bpMatch[1]);
        const hrMatch = patient.currentStatus.vitals.match(/HR\s*(\d+)/i);
        if (hrMatch) hr = parseInt(hrMatch[1]);
    }

    let potassium: number | null = null;
    let egfr: number | null = null;
    let labVerification: SourceVerification | undefined = undefined;

    if (latestLab && getReportText(latestLab)) {
        const content = getReportText(latestLab)!;
        potassium = parseLabValue(content, /Potassium:\s*(\d+(\.\d+)?)/i);
        egfr = parseLabValue(content, /eGFR:\s*(\d+(\.\d+)?)/i);
        labVerification = { reportId: latestLab.id, quote: `Potassium: ${potassium}, eGFR: ${egfr}` }; // Approximate quote ref
    }

    // 1. ARNI / ACEi / ARB
    const hasArni = meds.some((m: string) => m.includes('sacubitril'));
    const hasAcei = meds.some((m: string) => m.includes('lisinopril') || m.includes('ramipril') || m.includes('enalapril') || m.includes('benazepril') || m.includes('quinapril'));
    const hasArb = meds.some((m: string) => m.includes('valsartan') && !m.includes('sacubitril')) || meds.some((m: string) => m.includes('losartan') || m.includes('candesartan') || m.includes('irbesartan') || m.includes('olmesartan') || m.includes('telmisartan'));

    if (hasArni) {
        items.push({
            status: 'prescribed',
            drugClass: 'ARNI',
            details: 'Prescribed (Sacubitril/Valsartan).',
            verification: findVerificationForTerm('Sacubitril', patient.reports)
        });
    } else if (hasAcei || hasArb) {
        // Find specifically which one to verify
        const prescribedDrug = patient.currentStatus.medications.find((m: string) => {
            const lower = m.toLowerCase();
            return lower.includes('lisinopril') || lower.includes('ramipril') || lower.includes('enalapril') || lower.includes('valsartan') || lower.includes('losartan') || lower.includes('candesartan') || lower.includes('irbesartan');
        }) || (hasAcei ? 'ACE-Inhibitor' : 'ARB');

        items.push({
            status: 'prescribed',
            drugClass: 'ACEi / ARB',
            details: `Prescribed (${hasAcei ? 'ACE-Inhibitor' : 'ARB'}). **Consider switch to ARNI** if stable and cost permits.`,
            verification: findVerificationForTerm(prescribedDrug.split(' ')[0], patient.reports)
        });
    } else {
        // Check contraindications
        if (sbp && sbp < 95) {
            items.push({ status: 'contraindicated', drugClass: 'ARNI / ACEi / ARB', details: `Not prescribed. **Contraindicated** due to Hypotension (SBP ${sbp} < 95 mmHg).` });
        } else if (potassium && potassium > 5.5) {
            items.push({
                status: 'contraindicated',
                drugClass: 'ARNI / ACEi / ARB',
                details: `Not prescribed. **Contraindicated** due to Hyperkalemia (K+ ${potassium} > 5.5 mEq/L).`,
                verification: latestLab ? findVerificationForTerm('Potassium', [latestLab]) : undefined
            });
        } else if (egfr && egfr < 30) {
            items.push({
                status: 'contraindicated',
                drugClass: 'ARNI / ACEi / ARB',
                details: `Not prescribed. **Caution** due to Severe Renal Impairment (eGFR ${egfr} < 30).`,
                verification: latestLab ? findVerificationForTerm('eGFR', [latestLab]) : undefined
            });
        } else {
            items.push({ status: 'missing', drugClass: 'ARNI / ACEi / ARB', details: '**Missing**. ARNI is preferred for HFrEF to reduce mortality.' });
        }
    }

    // 2. Beta-Blocker
    const hasBb = meds.some((m: string) => m.includes('carvedilol') || m.includes('metoprolol') || m.includes('bisoprolol'));
    if (hasBb) {
        const drug = meds.find((m: string) => m.includes('carvedilol') || m.includes('metoprolol') || m.includes('bisoprolol'));
        items.push({
            status: 'prescribed',
            drugClass: 'Beta-Blocker',
            details: `Prescribed (${drug ? drug.charAt(0).toUpperCase() + drug.slice(1).split(' ')[0] : 'Beta-Blocker'}).`,
            verification: findVerificationForTerm(drug ? drug.split(' ')[0] : 'Beta-Blocker', patient.reports)
        });
    } else {
        if (hr && hr < 55) {
            items.push({ status: 'contraindicated', drugClass: 'Beta-Blocker', details: `Not prescribed. **Caution** due to Bradycardia (HR ${hr} < 55 bpm).` });
        } else {
            items.push({ status: 'missing', drugClass: 'Beta-Blocker', details: '**Missing**. Evidence-based beta-blocker indicated.' });
        }
    }

    // 3. MRA
    const hasMra = meds.some((m: string) => m.includes('spironolactone') || m.includes('eplerenone'));
    if (hasMra) {
        items.push({
            status: 'prescribed',
            drugClass: 'MRA',
            details: 'Prescribed (Spironolactone/Eplerenone).',
            verification: findVerificationForTerm('Spironolactone', patient.reports)
        });
    } else {
        if (potassium && potassium > 5.0) {
            items.push({
                status: 'contraindicated',
                drugClass: 'MRA',
                details: `Not prescribed. **Contraindicated** due to Hyperkalemia (K+ ${potassium} > 5.0 mEq/L).`,
                verification: latestLab ? findVerificationForTerm('Potassium', [latestLab]) : undefined
            });
        } else if (egfr && egfr < 30) {
            items.push({
                status: 'contraindicated',
                drugClass: 'MRA',
                details: `Not prescribed. **Contraindicated** due to Severe Renal Impairment (eGFR ${egfr} < 30).`,
                verification: latestLab ? findVerificationForTerm('eGFR', [latestLab]) : undefined
            });
        } else {
            items.push({ status: 'missing', drugClass: 'MRA', details: '**Missing**. Consider initiating if K+ < 5.0 and eGFR > 30.' });
        }
    }

    // 4. SGLT2 Inhibitor
    const sglt2s = ['dapagliflozin', 'empagliflozin', 'sotagliflozin', 'canagliflozin', 'bexagliflozin'];
    const hasSglt2 = meds.some((m: string) => sglt2s.some(s => m.includes(s)));

    if (hasSglt2) {
        const drugName = patient.currentStatus.medications.find((m: string) => sglt2s.some(s => m.toLowerCase().includes(s))) || 'SGLT2i';
        items.push({
            status: 'prescribed',
            drugClass: 'SGLT2-Inhibitor',
            details: `Prescribed (${drugName}).`,
            verification: findVerificationForTerm(drugName.split(' ')[0], patient.reports)
        });
    } else {
        const historyText = patient.medicalHistory.map((h: MedicalHistoryItem) => h.description.toLowerCase()).join(' ');

        if (egfr && egfr < 20) {
            items.push({
                status: 'contraindicated',
                drugClass: 'SGLT2-Inhibitor',
                details: `Not prescribed. **Contraindicated** due to Severe Renal Impairment (eGFR ${egfr} < 20).`,
                verification: latestLab ? findVerificationForTerm('eGFR', [latestLab]) : undefined
            });
        } else if (historyText.includes('dialysis') || historyText.includes('esrd')) {
            items.push({
                status: 'contraindicated',
                drugClass: 'SGLT2-Inhibitor',
                details: `Not prescribed. **Contraindicated** in Dialysis/ESRD.`,
            });
        } else {
            items.push({ status: 'missing', drugClass: 'SGLT2-Inhibitor', details: '**Missing**. Indicated for HFrEF regardless of diabetes status.' });
        }
    }

    const medsReport = patient.reports.find((r: Report) => r.type === 'Meds');

    return {
        id: 0,
        sender: 'ai',
        type: 'gdmt_checklist',
        title: 'HFrEF Guideline Adherence (GDMT)',
        items,
        summary: 'Assessment based on current medications, latest vitals, and renal function. Clinical correlation required.',
        suggestedAction: medsReport ? { type: 'view_report', label: 'View Medication List', reportId: medsReport.id } : undefined
    };
};

export const runMedicationSafetyAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<ContraindicationMessage | TextMessage> => {
    const latestLab = patient.reports.filter((r: Report) => r.type === 'Lab').sort((a: Report, b: Report) => b.date.localeCompare(a.date))[0];
    const labText = latestLab ? getReportText(latestLab) : 'No recent labs available.';

    const prompt = `You are an expert Clinical Pharmacist specializing in drug safety. Your task is to review a patient's medication list against their medical history, allergies, and recent labs to identify potential contraindications.

    **Patient Profile:**
    - **Name:** ${patient.name} (${patient.age}y, ${patient.gender})
    - **Current Medications:** ${patient.currentStatus.medications.join(', ')}
    - **Medical History:** ${patient.medicalHistory.map((h: MedicalHistoryItem) => h.description).join(', ')}
    - **Allergies:** ${patient.allergies.join(', ') || 'None'}
    
    **Recent Lab Context:**
    ${labText}

    **Analysis Instructions:**
    1. **Identify Contraindications:** Look for three types of conflicts:
       - **Drug-Drug:** Dangerous interactions between prescribed meds (e.g., Clopidogrel + Omeprazole).
       - **Drug-Condition:** Medications contraindicated by the patient's history (e.g., Beta-blockers in decompensated HF, NSAIDs in CKD).
       - **Drug-Lab/Allergy:** Medications conflicting with recent lab values (e.g., Spironolactone with K+ > 5.0) or documented allergies.
    
    2. **Severity Grading:**
       - **Critical:** Immediate risk of life-threatening event (e.g., Anaphylaxis risk, Hyperkalemia > 6.0).
       - **High:** Significant clinical risk requiring intervention (e.g., Worsening renal failure, reduced drug efficacy).
       - **Moderate:** Monitor closely or consider alternatives (e.g., increased side effect risk).

    3. **Output Format:**
       - Return a JSON object with an array of 'items' and a 'summary'.
       - If NO significant contraindications are found, return an empty 'items' array.
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            items: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        severity: { type: Type.STRING, enum: ['Critical', 'High', 'Moderate'] },
                        drug: { type: Type.STRING },
                        conflict: { type: Type.STRING },
                        rationale: { type: Type.STRING }
                    },
                    required: ["severity", "drug", "conflict", "rationale"]
                }
            },
            summary: { type: Type.STRING }
        },
        required: ["items", "summary"]
    };

    try {
        const response = await ai.models.generateContent({
            model: AI_MODELS.FLASH,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema
            }
        });

        const text = response.text || '';
        if (!text) throw new Error("No content generated");
        const result = JSON.parse(text.trim());

        if (result.items.length === 0) {
            return {
                id: 0,
                sender: 'ai',
                type: 'text',
                text: "I've reviewed the patient's medications against their history, allergies, and recent labs. No significant drug-drug or drug-condition contraindications were identified at this time."
            };
        }

        // Post-process to add source verification if possible
        const verifiedItems = result.items.map((item: any) => {
            // Try to find the drug in meds list, or conflict term in history/labs
            const drugVerification = findVerificationForTerm(item.drug.split(' ')[0], patient.reports);
            const conflictVerification = findVerificationForTerm(item.conflict.split(' ')[0], patient.reports);
            return {
                ...item,
                verification: conflictVerification || drugVerification
            };
        });

        return {
            id: 0,
            sender: 'ai',
            type: 'contraindication_checker',
            title: 'Medication Safety & Contraindication Check',
            items: verifiedItems,
            summary: result.summary,
        };

    } catch (error) {
        console.error("Error in runMedicationSafetyAgent:", error);
        return { id: 0, sender: 'ai', type: 'text', text: "Sorry, I encountered an error while performing the safety check." };
    }
};

export const runDosageOptimizationAgent = async (patient: Patient, query: string, ai: GoogleGenAI, aiSettings: AiPersonalizationSettings): Promise<DosageOptimizationMessage | TextMessage> => {
    const latestLab = patient.reports.filter((r: Report) => r.type === 'Lab').sort((a: Report, b: Report) => b.date.localeCompare(a.date))[0];
    const latestEcho = patient.reports.filter((r: Report) => r.type === 'Echo').sort((a: Report, b: Report) => b.date.localeCompare(a.date))[0];
    const personalization = getPersonalizationInstructions(aiSettings);

    const prompt = `You are an expert clinical pharmacist AI specializing in cardiology. Analyze the patient's full clinical picture to provide specific, actionable medication dosage optimization recommendations. ${personalization}

    **Patient Data:**
    - **Patient:** ${patient.name}, ${patient.age}-year-old ${patient.gender}.
    - **Diagnoses:** ${patient.medicalHistory.map((h: MedicalHistoryItem) => h.description).join(', ')}.
    - **Allergies:** ${patient.allergies.join(', ') || 'None'}.
    - **Current Medications:** ${JSON.stringify(patient.currentStatus.medications)}.
    - **Latest Lab Report (${latestLab?.date}):**
${getReportText(latestLab) || 'N/A'}
    - **Latest Echo Report (${latestEcho?.date}):**
${getReportText(latestEcho) || 'N/A'}

    **Instructions:**
    1.  Review each medication on the patient's current list.
    2.  For each drug, determine if the current dose is optimal based on the patient's diagnoses (e.g., HFrEF, CKD), latest lab values (especially eGFR, Potassium), and echo findings (LVEF).
    3.  Formulate a 'status' for each drug: 'Continue', 'Titrate Up', 'Titrate Down', or 'Change Advised'.
    4.  Provide a clear 'rationale' for each suggestion, citing specific patient data (e.g., "Titrate Up because current LVEF is 35%", "Change Advised due to eGFR of 28.").
    5.  For each suggestion, provide a concise 'monitoringPlan'. This plan must list potential side effects categorized by risk (High-Risk, Moderate-Risk, Low-Risk) and specify what to monitor (e.g., labs, vitals) and when. Use markdown like "High-Risk: ...".
    6.  Suggest a new dose where applicable. If continuing, suggested dose is the same as current.
    7.  Return the output in the specified JSON format. Only include medications that you are analyzing.

    Analyze the following medications: ${patient.currentStatus.medications.join(', ')}.
    `;

    try {
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            drug: { type: Type.STRING },
                            currentDose: { type: Type.STRING },
                            suggestedDose: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ['Continue', 'Titrate Up', 'Titrate Down', 'Change Advised', 'Labs Required'] }, // Added 'Labs Required'
                            rationale: { type: Type.STRING },
                            monitoringPlan: { type: Type.STRING, description: "A risk-stratified plan for monitoring side effects, including what to check and when." }
                        },
                        required: ["drug", "currentDose", "suggestedDose", "status", "rationale", "monitoringPlan"]
                    }
                },
                summary: { type: Type.STRING }
            },
            required: ["items", "summary"]
        };

        const response = await ai.models.generateContent({
            model: AI_MODELS.FLASH,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema
            }
        });

        const text = response.text || '';
        if (!text) throw new Error("No content generated");
        const result = JSON.parse(text.trim());

        // --- RENAL GUARD LOGIC (Refined 90-day logic) ---
        if (latestLab && result.items.length > 0) {
            const lastLabDate = new Date(latestLab.date);
            const today = new Date();
            const daysSinceLabs = (today.getTime() - lastLabDate.getTime()) / (1000 * 3600 * 24);

            // Standard: 90 days for stable patients. If older than 90 days, we must check.
            const renalDrugs = ['lisinopril', 'valsartan', 'sacubitril', 'spironolactone', 'furosemide', 'bumetanide', 'torsemide', 'metolazone', 'losartan', 'enalapril', 'ramipril', 'candesartan', 'irbesartan'];

            result.items = result.items.map((item: any) => {
                const drugName = item.drug.toLowerCase();
                if (renalDrugs.some(d => drugName.includes(d))) {
                    // Override logic if suggesting titration
                    if (item.status === 'Titrate Up' || item.status === 'Change Advised') {
                        if (daysSinceLabs > 90) {
                            return {
                                ...item,
                                status: 'Labs Required',
                                suggestedDose: item.currentDose, // Do not change dose until labs back
                                rationale: `**Renal Guard (Critical):** The most recent metabolic panel is ${Math.floor(daysSinceLabs)} days old (>90d). It is potentially unsafe to titrate ${item.drug} without updated Potassium and Creatinine levels.`,
                                monitoringPlan: 'Order BMP/Renal Panel today. Do not titrate until results are reviewed.'
                            };
                        } else if (daysSinceLabs > 30) {
                            // Soft Warning
                            item.rationale = `**Renal Guard (Caution):** Labs are ${Math.floor(daysSinceLabs)} days old. Ensure no recent acute illness before titrating. ` + item.rationale;
                        }
                    }
                }
                return item;
            });
        }

        if (result.items.length === 0) {
            return { id: 0, sender: 'ai', type: 'text', text: "All current medication dosages appear appropriate based on the available data. No immediate optimizations are suggested." };
        }

        return {
            id: 0,
            sender: 'ai',
            type: 'dosage_optimization',
            title: `AI-Powered Dosage Suggestions for ${patient.name}`,
            items: result.items,
            summary: result.summary,
            suggestedAction: { type: 'generate_prescription', label: 'Generate Prescription' }
        };

    } catch (error) {
        console.error("Error in runDosageOptimizationAgent:", error);
        return { id: 0, sender: 'ai', type: 'text', text: "Sorry, I encountered an error while analyzing medication dosages." };
    }
};

export const runTreatmentAdvisorAgent = async (patient: Patient, query: string, ai: GoogleGenAI, aiSettings: AiPersonalizationSettings): Promise<TextMessage> => {
    const latestEcho = patient.reports.filter((r: Report) => r.type === 'Echo').sort((a: Report, b: Report) => b.date.localeCompare(a.date))[0];
    const latestLab = patient.reports.filter((r: Report) => r.type === 'Lab').sort((a: Report, b: Report) => b.date.localeCompare(a.date))[0];

    let findings = '';
    if (latestEcho && getReportText(latestEcho)) {
        const content = getReportText(latestEcho)!;
        const lvef = content.match(/LVEF:\s*(.*?)\./i)?.[1] || 'N/A';
        const impression = content.match(/Conclusion:\s*(.*)/i)?.[1] || content.match(/Impression:\s*(.*)/i)?.[1] || 'N/A';
        findings += `- Latest Echo (${latestEcho.date}): LVEF ${lvef}. Impression: ${impression}\n`;
    }
    if (latestLab && getReportText(latestLab)) {
        const content = getReportText(latestLab)!;
        const bnp = content.match(/BNP:\s*([\d.]+)/i)?.[1] || 'N/A';
        const creatinine = content.match(/Creatinine:\s*([\d.]+)/i)?.[1] || 'N/A';
        const potassium = content.match(/Potassium:\s*([\d.]+)/i)?.[1] || 'N/A';
        findings += `- Latest Labs (${latestLab.date}): BNP ${bnp} pg/mL, Creatinine ${creatinine} mg/dL, K+ ${potassium} mEq/L\n`;
    }

    const personalization = getPersonalizationInstructions(aiSettings);

    const systemInstruction = `You are a world-class cardiologist with 40 years of clinical experience, known for creating thorough and practical treatment plans. ${personalization}

Your primary task is to answer the user's specific clinical question, using the full patient context provided in the prompt. Frame your answer as an expert consultation.

**Instruction Set 1: If the user asks "suggest next medication" or a similar query, perform a gap analysis against guidelines.**
First, identify the primary diagnosis (e.g., HFrEF). Then, review the current medication list to find missing classes of drugs or drugs that are not at their target dose. Your final output should be a recommendation for the **single most impactful medication to add or titrate next.** Structure the response with these exact headers:
- '### Suggested Next Medication'
- '### Rationale'
- '### Key Considerations & Monitoring': This section MUST include potential side effects categorized by risk (High-Risk, Moderate-Risk, Low-Risk) and specify monitoring parameters and frequency (e.g., 'Check Potassium and eGFR 1 week after initiation').

**Instruction Set 2: If the user asks a general question about the treatment plan** (e.g., "generate a treatment plan"), generate a comprehensive but **concise, scannable** plan. Your response **must** be well-organized for a busy cardiologist and **must** use the following exact markdown structure with brief bullet points under each header. **Avoid long paragraphs.**
- '### Pharmacotherapy'
- '### Diagnostics & Monitoring'
- '### Patient Education'
- '### Follow-up'

**Use Markdown Code Blocks:** If detailing a specific titration protocol (e.g., "Week 1: 50mg, Week 2: 100mg"), present the schedule in a code block using triple backticks (\`\`\`) to distinguish it from the narrative text.

Your tone should be authoritative, clear, and actionable for another healthcare professional. Use simple markdown for formatting (bolding with **, lists with -).`;

    const contents = `**Patient Data:**
- **Patient:** ${patient.name}, a ${patient.age}-year-old ${patient.gender}.
- **Reason for Visit:** ${patient.currentStatus.condition}.
- **Medical History:** ${patient.medicalHistory.map((h: MedicalHistoryItem) => h.description).join(', ')}.
- **Critical Alerts:** ${patient.criticalAlerts?.join(', ') || 'None'}.
- **Current Medications:** ${patient.currentStatus.medications.join(', ')}.
- **Vitals:** ${patient.currentStatus.vitals}.
- **Key Recent Findings:**
${findings || 'No specific findings provided.'}

**User's Specific Question:**
"${query}"`;

    try {
        const response = await ai.models.generateContent({
            model: AI_MODELS.FLASH,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.4,
            }
        });
        const text = response.text || '';

        return {
            id: 0,
            sender: 'ai',
            type: 'text',
            text: text || "Unable to generate a response.",
        };
    } catch (error) {
        console.error("Error in TreatmentAdvisorAgent:", error);
        return {
            id: 0,
            sender: 'ai',
            type: 'text',
            text: "Sorry, an error occurred while generating the treatment plan.",
        };
    }
};

export const runPrescriptionGeneratorAgent = async (patient: Patient, medications: { drug: string; suggestedDose: string; }[], ai: GoogleGenAI, aiSettings: AiPersonalizationSettings): Promise<PrescriptionMessage | TextMessage> => {
    try {
        const prompt = `You are a meticulous cardiologist AI generating a formal prescription for a patient.
        
        **Patient:** ${patient.name}
        **Medications to Prescribe:**
        ${JSON.stringify(medications)}

        **Instructions:**
        1.  Format the provided medication list into a structured prescription.
        2.  Use your clinical knowledge to determine the standard frequency (e.g., "Once Daily", "Twice Daily") and timing (e.g., "Morning", "Evening") for each drug if not specified.
        3.  Provide clear instructions (Sig).
        4.  Generate specific "Notes to Pharmacist" if there are any interactions or special handling (or "None").
        5.  Return JSON.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                patientName: { type: Type.STRING },
                date: { type: Type.STRING },
                medications: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            dosage: { type: Type.STRING },
                            frequency: { type: Type.STRING },
                            timing: { type: Type.STRING, enum: ['Morning', 'Afternoon', 'Evening', 'Bedtime', 'With Meals', 'As Needed'] },
                            instructions: { type: Type.STRING }
                        },
                        required: ["name", "dosage", "frequency", "timing", "instructions"]
                    }
                },
                doctorInfo: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        credentials: { type: Type.STRING },
                        contact: { type: Type.STRING }
                    },
                    required: ["name", "credentials", "contact"]
                },
                notesToPharmacist: { type: Type.STRING }
            },
            required: ["title", "patientName", "date", "medications", "doctorInfo"]
        };

        const response = await ai.models.generateContent({
            model: AI_MODELS.FLASH,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema
            }
        });

        const text = response.text || '';
        if (!text) throw new Error("No content generated");
        const result = JSON.parse(text.trim());

        return {
            id: 0,
            sender: 'ai',
            type: 'prescription',
            title: result.title || 'Prescription',
            patientName: result.patientName,
            date: result.date,
            medications: result.medications,
            doctorInfo: result.doctorInfo,
            notesToPharmacist: result.notesToPharmacist
        };

    } catch (error) {
        console.error("Error in runPrescriptionGeneratorAgent:", error);
        return { id: 0, sender: 'ai', type: 'text', text: "Sorry, I encountered an error while generating the prescription." };
    }
};


import { GoogleGenAI, Type } from "@google/genai";
import type { Patient, Message, TextMessage, TrendChartMessage, ReportComparisonMessage, ReportComparisonRow, TrendChartSeries, TrendChartDataPoint, Report, DifferentialDiagnosisMessage, DiagnosisItem, EjectionFractionTrendMessage, ArrhythmiaAnalysisMessage, BloodPressureAnalysisMessage, CardiacBiomarkerMessage, VitalTrendsMessage, SourceVerification } from '../../types';
import { runReportComparisonAgent } from './utilityAgents';

// --- HELPER FUNCTIONS ---

const parseLabValue = (content: string, regex: RegExp): number | null => {
    if (typeof content !== 'string') return null;
    const match = content.match(regex);
    return match ? parseFloat(match[1]) : null;
};

// Robust parser that handles unit conversion (International -> US Standard)
const parseLabValueWithUnits = (content: string, regex: RegExp, targetUnit: 'mg/dL' | 'mmol/L' | 'pg/mL' | 'ng/mL' | 'mEq/L' | 'mL/min'): number | null => {
    if (typeof content !== 'string') return null;
    
    // Extend regex to capture potential unit if not strictly defined in input regex
    // We assume the input regex captures the number in group 1.
    // We look ahead for units.
    const match = content.match(regex);
    if (!match) return null;
    
    let value = parseFloat(match[1]);
    
    // Grab the text immediately following the match to check for units
    const postMatchStr = content.substring(match.index! + match[0].length).trim();
    
    // --- CREATININE CONVERSION (umol/L -> mg/dL) ---
    if (targetUnit === 'mg/dL' && (regex.source.includes('Creatinine') || regex.source.includes('Cr'))) {
        if (postMatchStr.match(/^(umol\/L|µmol\/L)/i) || (value > 20 && value < 1000)) { 
            // If explicit unit match OR value is clearly in umol/L range (e.g. 80-120) vs mg/dL range (0.5-1.5)
            // Divide by 88.4
            return parseFloat((value / 88.4).toFixed(2));
        }
    }
    
    // --- GLUCOSE/CHOLESTEROL CONVERSION (mmol/L -> mg/dL) ---
    // (Example logic, can be expanded if needed)
    
    return value;
};

const getReportText = (report: Report): string | null => {
    if (typeof report.content === 'string') {
        return report.content;
    }
    // FIX: Access 'rawText' for PDF content instead of the non-existent 'content' property.
    if (typeof report.content === 'object' && report.content.type === 'pdf') {
        return report.content.rawText;
    }
    return null;
}

const findVerification = (term: string, reports: Report[]): SourceVerification | undefined => {
    const textReports = reports
        .filter(r => typeof r.content === 'string' || (r.content as any).rawText)
        .sort((a,b) => b.date.localeCompare(a.date));
    
    for (const report of textReports) {
        const content = typeof report.content === 'string' ? report.content : (report.content as any).rawText;
        if (content && content.toLowerCase().includes(term.toLowerCase())) {
            const lines = content.split('\n');
            const matchingLine = lines.find((l: string) => l.toLowerCase().includes(term.toLowerCase()));
            if (matchingLine) {
                return { reportId: report.id, quote: matchingLine.trim() };
            }
        }
    }
    return undefined;
};

// --- AGENT IMPLEMENTATIONS ---

export const runVitalTrendsAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<VitalTrendsMessage | TextMessage> => {
    const vitalsLog = patient.vitalsLog || [];
    if (vitalsLog.length < 2) {
        return { id: 0, sender: 'ai', type: 'text', text: "Not enough historical vital signs data is available to generate a trend chart." };
    }

    const sbpData: TrendChartDataPoint[] = [];
    const dbpData: TrendChartDataPoint[] = [];
    const hrData: TrendChartDataPoint[] = [];

    const vitalsRegex = /BP\s*(\d+)\/(\d+),\s*HR\s*(\d+)/i;

    let criticalAlerts = "";

    vitalsLog.forEach(log => {
        const match = log.vitals.match(vitalsRegex);
        if (match) {
            const sbp = parseInt(match[1], 10);
            const dbp = parseInt(match[2], 10);
            const hr = parseInt(match[3], 10);
            
            sbpData.push({ date: log.date, value: sbp });
            dbpData.push({ date: log.date, value: dbp });
            hrData.push({ date: log.date, value: hr });

            // Critical Value Check
            if (sbp > 180) criticalAlerts += `- **CRITICAL: SBP ${sbp}** on ${log.date}. Hypertensive Crisis.\n`;
            else if (sbp < 90) criticalAlerts += `- **CRITICAL: SBP ${sbp}** on ${log.date}. Hypotension.\n`;
            
            if (hr > 120) criticalAlerts += `- **CRITICAL: HR ${hr}** on ${log.date}. Significant Tachycardia.\n`;
            else if (hr < 40) criticalAlerts += `- **CRITICAL: HR ${hr}** on ${log.date}. Significant Bradycardia.\n`;
        }
    });

    const series: TrendChartSeries[] = [
        { name: 'Systolic BP', unit: 'mmHg', data: sbpData },
        { name: 'Diastolic BP', unit: 'mmHg', data: dbpData },
        { name: 'Heart Rate', unit: 'bpm', data: hrData },
    ];
    
    const prompt = `You are a cardiologist AI. Analyze the following time-series vital sign data for a patient and provide a concise clinical interpretation.
    
    **Patient Context:**
    - Patient: ${patient.name}, ${patient.age}-year-old ${patient.gender}.
    - Current Condition: ${patient.currentStatus.condition}.
    - History: ${patient.medicalHistory.map(h => h.description).join(', ')}.

    **Data:**
    - Systolic BP: ${sbpData.map(d => `${d.date}: ${d.value}`).join(', ')}
    - Diastolic BP: ${dbpData.map(d => `${d.date}: ${d.value}`).join(', ')}
    - Heart Rate: ${hrData.map(d => `${d.date}: ${d.value}`).join(', ')}

    **Detected Critical Values:**
    ${criticalAlerts}

    **Task:** Write a brief, one-paragraph summary highlighting any significant trends, abnormalities (like hypertension, hypotension, tachycardia, bradycardia), or correlations in the data. If specific critical values were detected, you MUST mention them in bold in your interpretation using markdown (e.g., "**CRITICAL: SBP 185 on 2024-05-15**").
    `;

    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const interpretation = response.text;
        
        return {
            id: 0,
            sender: 'ai',
            type: 'vital_trends',
            title: `Vital Sign Trends for ${patient.name}`,
            series,
            interpretation,
        };

    } catch (error) {
        console.error("Error in runVitalTrendsAgent:", error);
        return { id: 0, sender: 'ai', type: 'text', text: "Sorry, an error occurred while analyzing vital trends." };
    }
};

export const runTrendAnalysisAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<TrendChartMessage | TextMessage> => {
    const labReports = patient.reports.filter(r => r.type === 'Lab' && typeof r.content === 'string')
        .sort((a, b) => a.date.localeCompare(b.date));

    if (labReports.length < 2) {
        return { id: 0, sender: 'ai', type: 'text', text: "Not enough historical lab data to generate a trend analysis for this patient." };
    }

    const series: TrendChartSeries[] = [];
    const lowerQuery = query.toLowerCase();

    // Enhanced matchers with Reference Ranges and Unit Handling
    const paramMatchers = [
        { name: 'BNP', unit: 'pg/mL', regex: /BNP:\s*(\d+(\.\d+)?)/i, threshold: { value: 400, label: 'High' }, referenceRange: { min: 0, max: 100 } },
        { name: 'eGFR', unit: 'mL/min', regex: /eGFR:\s*(\d+(\.\d+)?)/i, threshold: { value: 60, label: 'Low' }, referenceRange: { min: 60, max: 120 } },
        { name: 'Potassium', unit: 'mEq/L', regex: /Potassium:\s*(\d+(\.\d+)?)/i, threshold: { value: 5.2, label: 'High' }, referenceRange: { min: 3.5, max: 5.0 } },
        // Creatinine needs explicit unit check (mg/dL vs umol/L)
        { name: 'Creatinine', unit: 'mg/dL', regex: /Creatinine:\s*(\d+(\.\d+)?)/i, threshold: { value: 1.4, label: 'High' }, referenceRange: { min: 0.7, max: 1.3 }, convert: true },
    ];

    let criticalAlerts = "";

    paramMatchers.forEach(param => {
        if (lowerQuery.includes(param.name.toLowerCase())) {
            const data: TrendChartDataPoint[] = [];
            labReports.forEach(report => {
                if (typeof report.content !== 'string') return;
                
                let value: number | null;
                if ((param as any).convert) {
                    value = parseLabValueWithUnits(report.content, param.regex, param.unit as any);
                } else {
                    value = parseLabValue(report.content, param.regex);
                }

                if (value !== null) {
                    data.push({ date: report.date, value });
                    // Check for criticals based on threshold type
                    if (param.threshold.label === 'High' && value > param.threshold.value * 1.1) { // 10% buffer for critical vs elevated
                         criticalAlerts += `- **CRITICAL: ${param.name} ${value}** (Target < ${param.threshold.value}) on ${report.date}.\n`;
                    }
                    if (param.threshold.label === 'Low' && value < param.threshold.value * 0.8) {
                         criticalAlerts += `- **CRITICAL: ${param.name} ${value}** (Target > ${param.threshold.value}) on ${report.date}.\n`;
                    }
                }
            });
            if (data.length > 0) {
                // Attach referenceRange to the series
                series.push({ 
                    name: param.name, 
                    unit: param.unit, 
                    data, 
                    threshold: param.threshold, 
                    referenceRange: param.referenceRange 
                });
            }
        }
    });

    if (series.length === 0) {
        return { id: 0, sender: 'ai', type: 'text', text: `I couldn't find data for the requested lab values. I can track trends for BNP, eGFR, Potassium, and Creatinine.` };
    }
    
    let interpretation = "### AI Interpretation\n";
    if (criticalAlerts) {
        interpretation += `\n**ALERT:** Critical values detected:\n${criticalAlerts}\n`;
    }

    const bnpSeries = series.find(s => s.name === 'BNP');
    if (bnpSeries && bnpSeries.data.length > 1) {
        const first = bnpSeries.data[0].value;
        const last = bnpSeries.data[bnpSeries.data.length - 1].value;
        if (last > first * 1.2) {
            interpretation += `- **BNP has been steadily increasing**, which may suggest worsening heart failure. `;
        }
    }
    const egfrSeries = series.find(s => s.name === 'eGFR');
     if (egfrSeries && egfrSeries.data.length > 1) {
        const first = egfrSeries.data[0].value;
        const last = egfrSeries.data[egfrSeries.data.length - 1].value;
        if (last < first * 0.9) {
            interpretation += `- **eGFR shows a declining trend**, indicating potential progression of cardiorenal syndrome. Recommend assessing volume status and considering diuretic adjustment.`;
        }
    }
    
    const latestReport = labReports[labReports.length - 1];

    return {
        id: 0,
        sender: 'ai',
        type: 'trend_chart',
        title: `Lab Trends for ${patient.name}`,
        series,
        interpretation: interpretation.length > 25 ? interpretation : "Review the plotted trends for clinical correlation.",
        suggestedAction: { type: 'view_report', label: `View ${latestReport.date} Lab Report`, reportId: latestReport.id }
    };
};

export const runReportComparisonAgentFromHistory = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<ReportComparisonMessage | TextMessage> => {
    let reportType: Report['type'] = 'Echo'; // Default to Echo
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('lab')) {
        reportType = 'Lab';
    } else if (lowerQuery.includes('ecg') || lowerQuery.includes('ekg')) {
        reportType = 'ECG';
    } else if (lowerQuery.includes('echo')) {
        reportType = 'Echo';
    }

    const reportsToCompare = patient.reports.filter(r => r.type === reportType && getReportText(r) !== null)
        .sort((a, b) => b.date.localeCompare(a.date));
    
    if (reportsToCompare.length < 2) {
        return { id: 0, sender: 'ai', type: 'text', text: `There are not enough historical ${reportType} reports to perform a comparison.` };
    }
    const [currentReport, previousReport] = reportsToCompare;
    return runReportComparisonAgent(currentReport, previousReport, patient, ai);
};

export const runDifferentialDiagnosisAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<DifferentialDiagnosisMessage | TextMessage> => {
    const latestEcho = patient.reports.filter(r => r.type === 'Echo').sort((a,b) => b.date.localeCompare(a.date))[0];
    const latestLab = patient.reports.filter(r => r.type === 'Lab' && typeof r.content === 'string').sort((a,b) => b.date.localeCompare(a.date))[0];

    const prompt = `You are a world-class cardiologist acting as a diagnostic assistant. The user wants a differential diagnosis for a patient.
    **Patient:** ${patient.name}, a ${patient.age}-year-old ${patient.gender}.
    **Presenting Complaint / Condition:** ${patient.currentStatus.condition}.
    **Medical History:** ${patient.medicalHistory.map(h => h.description).join(', ')}.
    **Critical Alerts:** ${patient.criticalAlerts?.join(', ') || 'None'}.
    **Key Findings from Recent Reports:**
    - Latest Echo (${latestEcho?.date}): LVEF ${typeof latestEcho?.content === 'string' ? (latestEcho.content.match(/LVEF:\s*(.*?)\./i)?.[1] || 'Not specified') : 'N/A'}. Impression: ${typeof latestEcho?.content === 'string' ? (latestEcho.content.match(/Impression:\s*(.*)/i)?.[1] || '') : ''}
    - Latest Lab (${latestLab?.date}): BNP ${latestLab && typeof latestLab.content === 'string' ? (parseLabValue(latestLab.content, /BNP:\s*(\d+(\.\d+)?)/i) || 'N/A') : 'N/A'} pg/mL. eGFR ${latestLab && typeof latestLab.content === 'string' ? (parseLabValue(latestLab.content, /eGFR:\s*(\d+(\.\d+)?)/i) || 'N/A') : 'N/A'}.

    Based on this, generate a ranked list of 3-4 potential differential diagnoses. For each diagnosis, provide a confidence level ('High', 'Medium', or 'Low') and a brief clinical rationale citing patient-specific data. Also provide a final summary paragraph. Return the result in the specified JSON format.
    `;

    try {
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                diagnoses: {
                    type: Type.ARRAY,
                    description: "A ranked list of potential differential diagnoses.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            confidence: {
                                type: Type.STRING,
                                description: "The confidence level for the diagnosis ('High', 'Medium', or 'Low')."
                            },
                            diagnosis: {
                                type: Type.STRING,
                                description: "The name of the potential diagnosis."
                            },
                            rationale: {
                                type: Type.STRING,
                                description: "The clinical reasoning for this diagnosis, citing patient-specific data."
                            }
                        },
                        required: ["confidence", "diagnosis", "rationale"]
                    }
                },
                summary: {
                    type: Type.STRING,
                    description: "A final summary paragraph synthesizing the findings."
                }
            },
            required: ["diagnoses", "summary"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema,
            }
        });
        const jsonStr = response.text.trim();
        
        if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
             throw new Error("AI did not return valid JSON.");
        }
        const result = JSON.parse(jsonStr) as { diagnoses: DiagnosisItem[], summary: string };

        if (!result || !result.diagnoses || !result.summary) {
            throw new Error("Invalid JSON response from AI.");
        }
        
        // EVIDENCE MODE: Post-processing to attach verifications
        result.diagnoses = result.diagnoses.map(d => {
            let verification: SourceVerification | undefined;
            
            // Heuristic verification search based on rationale keywords
            if (d.rationale.includes('Echo') || d.rationale.includes('LVEF') || d.rationale.includes('valvular') || d.rationale.includes('wall motion')) {
                verification = { reportId: latestEcho?.id || '', quote: getReportText(latestEcho)?.substring(0, 100) + '...' || 'Echo Report' }; 
                if (latestEcho) {
                    const lvef = getReportText(latestEcho)?.match(/LVEF:\s*(.*?)\./i)?.[0];
                    if (lvef) verification.quote = lvef;
                }
            } else if (d.rationale.includes('BNP') || d.rationale.includes('Troponin') || d.rationale.includes('Creatinine')) {
                verification = findVerification('BNP', [latestLab]) || findVerification('Troponin', [latestLab]);
            }

            return { ...d, verification };
        });

        return {
            id: 0,
            sender: 'ai',
            type: 'differential_diagnosis',
            title: `Differential Diagnosis for ${patient.currentStatus.condition}`,
            diagnoses: result.diagnoses,
            summary: result.summary,
        };
    } catch (error) {
        console.error("Error in DifferentialDiagnosisAgent:", error);
        return {
            id: 0,
            sender: 'ai',
            type: 'text',
            text: "Sorry, I encountered an error while generating the differential diagnosis.",
        }
    }
};

export const runEjectionFractionTrendAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<EjectionFractionTrendMessage | TextMessage> => {
    const echoReports = patient.reports
        .filter(r => r.type === 'Echo' && typeof r.content === 'string')
        .sort((a, b) => a.date.localeCompare(b.date));

    const data: TrendChartDataPoint[] = [];
    echoReports.forEach(report => {
        if (typeof report.content !== 'string') return;
        const lvefMatch = report.content.match(/LVEF\)?:\s*(\d+)/i);
        if (lvefMatch) {
            data.push({ date: report.date, value: parseFloat(lvefMatch[1]) });
        }
    });

    if (data.length < 2) {
        return { id: 0, sender: 'ai', type: 'text', text: 'Not enough historical echocardiogram reports with LVEF values are available to perform a trend analysis.', };
    }

    const firstPoint = data[0];
    const lastPoint = data[data.length - 1];
    const timeDiffMillis = new Date(lastPoint.date).getTime() - new Date(firstPoint.date).getTime();
    const timeDiffYears = timeDiffMillis / (1000 * 60 * 60 * 24 * 365.25);
    const valueDiff = lastPoint.value - firstPoint.value;
    const annualChange = timeDiffYears > 0.25 ? valueDiff / timeDiffYears : 0;
    
    const latestLabReport = patient.reports.filter(r => r.type === 'Lab' && typeof r.content === 'string').sort((a,b) => b.date.localeCompare(a.date))[0];
    const latestBnp = latestLabReport && typeof latestLabReport.content === 'string' ? parseLabValue(latestLabReport.content, /BNP:\s*(\d+(\.\d+)?)/i) : null;

    try {
        const model = 'gemini-2.5-flash';
        const prompt = `You are a predictive cardiologist AI. Your task is to analyze a patient's LVEF trend and other clinical data to predict their risk of heart failure hospitalization.
        
        **Patient Context:**
        - Patient: ${patient.name}, ${patient.age}-year-old ${patient.gender}.
        - Condition: ${patient.currentStatus.condition}.
        - History: ${patient.medicalHistory.map(h => h.description).join(', ')}

        **Trend Data:**
        - **Current LVEF:** ${lastPoint.value}%
        - **Annual LVEF Change:** ${annualChange.toFixed(1)}% per year
        - **Latest BNP:** ${latestBnp || 'N/A'} pg/mL
        - **LVEF Data Points:** ${data.map(d => `${d.date}: ${d.value}%`).join(', ')}

        **Instructions:**
        1.  Synthesize all the provided data.
        2.  Generate a plain-text 'prediction' string summarizing the clinical outlook.
        3.  Generate a structured 'predictedRisk' object with a quantitative risk assessment for heart failure hospitalization.
            - The risk 'percentage' should be a reasonable clinical estimate.
            - The 'timeframe' should be '6 months' or '12 months'.
            - The 'rationale' must explain your reasoning, citing the provided data.
        
        Provide the output in the specified JSON format.`;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                prediction: { type: Type.STRING, description: 'A plain-text summary of the clinical outlook based on the LVEF trend.' },
                predictedRisk: {
                    type: Type.OBJECT,
                    properties: {
                        riskLevel: { type: Type.STRING, enum: ['Low', 'Moderate', 'High'], description: 'The overall risk category.' },
                        percentage: { type: Type.INTEGER, description: 'The estimated percentage risk of hospitalization.' },
                        timeframe: { type: Type.STRING, description: 'The timeframe for the risk assessment (e.g., "6 months").' },
                        rationale: { type: Type.STRING, description: 'The clinical reasoning behind the risk assessment.' }
                    },
                    required: ['riskLevel', 'percentage', 'timeframe', 'rationale']
                }
            },
            required: ['prediction'] // predictedRisk can be optional if data is insufficient
        };

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema
            }
        });
        const result = JSON.parse(response.text.trim());

        return {
            id: 0,
            sender: 'ai',
            type: 'ef_trend',
            title: `LVEF Trend Analysis for ${patient.name}`,
            data,
            currentLVEF: lastPoint.value,
            annualChange,
            prediction: result.prediction,
            predictedRisk: result.predictedRisk,
            suggestedAction: { type: 'view_report', label: `View Latest Echo (${lastPoint.date})`, reportId: echoReports.find(r => r.date === lastPoint.date)!.id }
        };

    } catch (error) {
        console.error("Error in EjectionFractionTrendAgent:", error);
        return {
            id: 0,
            sender: 'ai',
            type: 'text',
            text: "Sorry, I encountered an error while generating the LVEF trend analysis."
        }
    }
};

export const runArrhythmiaAnalysisAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<ArrhythmiaAnalysisMessage | TextMessage> => {
    const holterReport = patient.reports.filter(r => r.type === 'ECG' && typeof r.content === 'string' && r.title.toLowerCase().includes('holter')).sort((a,b) => b.date.localeCompare(a.date))[0];

    if (!holterReport || typeof holterReport.content !== 'string') {
        return { id: 0, sender: 'ai', type: 'text', text: "No Holter monitor or event monitor report was found to analyze arrhythmia patterns." };
    }

    try {
        const prompt = `You are a world-class cardiac electrophysiologist AI. Analyze the provided ambulatory ECG (Holter) report for the patient.

        **Patient:** ${patient.name}, ${patient.age}-year-old ${patient.gender}.
        **Condition:** ${patient.currentStatus.condition}.
        **History:** ${patient.medicalHistory.map(item => item.description).join(', ')}.

        **Holter Report (${holterReport.date}):**
        ${holterReport.content}

        **Instructions:**
        1.  Identify key arrhythmia findings (e.g., PVC burden, couplets, NSVT runs, AT/AF burden).
        2.  For each finding, assign a risk level ('Low', 'Moderate', 'High').
        3.  Identify the overall recognized arrhythmia pattern.
        4.  Provide a concise, AI-powered risk assessment based on the findings.
        5.  Return the output in the specified JSON format.`;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                findings: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            value: { type: Type.STRING },
                            risk: { type: Type.STRING, enum: ['Low', 'Moderate', 'High'] },
                            description: { type: Type.STRING }
                        },
                        required: ["name", "value", "risk", "description"]
                    }
                },
                recognizedPattern: { type: Type.STRING },
                riskAssessment: { type: Type.STRING }
            },
            required: ["findings", "recognizedPattern", "riskAssessment"]
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
            id: 0,
            sender: 'ai',
            type: 'arrhythmia_analysis',
            title: `Arrhythmia Analysis for ${patient.name}`,
            findings: result.findings,
            recognizedPattern: result.recognizedPattern,
            riskAssessment: result.riskAssessment,
            suggestedAction: { type: 'view_report', label: `View Holter Report (${holterReport.date})`, reportId: holterReport.id }
        };
    } catch(error) {
        console.error("Error in runArrhythmiaAnalysisAgent:", error);
        return { id: 0, sender: 'ai', type: 'text', text: "Sorry, I encountered an error while analyzing the arrhythmia report." };
    }
};

export const runBloodPressureAnalysisAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<BloodPressureAnalysisMessage | TextMessage> => {
    const bpLogReport = patient.reports.filter(r => r.title.toLowerCase().includes('bp log')).sort((a,b) => b.date.localeCompare(a.date))[0];

    if (!bpLogReport || typeof bpLogReport.content !== 'string') {
        return { id: 0, sender: 'ai', type: 'text', text: "No home blood pressure log was found for analysis." };
    }

    try {
        const prompt = `You are a world-class hypertension specialist AI. Analyze the provided home blood pressure log.

        **Patient:** ${patient.name}, ${patient.age}-year-old ${patient.gender}.
        **Condition:** ${patient.currentStatus.condition}.
        **History:** ${patient.medicalHistory.map(item => item.description).join(', ')}.

        **Home BP Log (${bpLogReport.date}):**
        ${bpLogReport.content}

        **Instructions:**
        1.  Calculate the key BP metrics from the log.
        2.  Provide a concise AI risk assessment based on the patterns observed (e.g., nocturnal dipping status, variability).
        3.  Provide clear, actionable recommendations.
        4.  Return the output in the specified JSON format.`;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                findings: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            value: { type: Type.STRING },
                            description: { type: Type.STRING }
                        },
                        required: ["name", "value", "description"]
                    }
                },
                riskAssessment: { type: Type.STRING },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["findings", "riskAssessment", "recommendations"]
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
            id: 0,
            sender: 'ai',
            type: 'blood_pressure_analysis',
            title: `Blood Pressure Pattern Analysis for ${patient.name}`,
            findings: result.findings,
            riskAssessment: result.riskAssessment,
            recommendations: result.recommendations,
            suggestedAction: { type: 'view_report', label: `View BP Log (${bpLogReport.date})`, reportId: bpLogReport.id }
        };
    } catch(error) {
        console.error("Error in runBloodPressureAnalysisAgent:", error);
        return { id: 0, sender: 'ai', type: 'text', text: "Sorry, I encountered an error while analyzing the blood pressure data." };
    }
};

export const runCardiacBiomarkerAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<CardiacBiomarkerMessage | TextMessage> => {
    const labReports = patient.reports.filter(r => r.type === 'Lab' && typeof r.content === 'string').sort((a,b) => a.date.localeCompare(b.date));

    if (labReports.length === 0) {
        return { id: 0, sender: 'ai', type: 'text', text: "No lab reports found to analyze cardiac biomarkers." };
    }
    
    const reportsForPrompt = labReports.slice(-5).map(r => `Report Date: ${r.date}\n${getReportText(r)}\n---\n`).join('\n');

    try {
        const prompt = `You are a world-class cardiologist AI. Analyze the provided series of lab reports to create a summary of key cardiac biomarkers (Troponin, BNP).

        **Patient:** ${patient.name}, ${patient.age}-year-old ${patient.gender}.
        **Condition:** ${patient.currentStatus.condition}.
        **History:** ${patient.medicalHistory.map(item => item.description).join(', ')}.

        **Lab Reports:**
        ${reportsForPrompt}

        **Instructions:**
        1.  Focus on high-sensitivity Troponin and BNP.
        2.  For each biomarker, determine the current value, status ('Normal' or 'Elevated'), and trend ('Rising', 'Falling', 'Stable').
        3.  Provide a concise clinical interpretation for each biomarker.
        4.  Extract historical data points to create trend data for a sparkline.
        5.  Write a final synthesized summary of the overall biomarker picture.
        6.  Return the output in the specified JSON format.`;
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            unit: { type: Type.STRING },
                            value: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ['Normal', 'Elevated'] },
                            trend: { type: Type.STRING, enum: ['Rising', 'Falling', 'Stable'] },
                            interpretation: { type: Type.STRING },
                            trendData: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, value: { type: Type.NUMBER } }, required: ["date", "value"] } }
                        },
                        required: ["name", "unit", "value", "status", "trend", "interpretation", "trendData"]
                    }
                },
                summary: { type: Type.STRING }
            },
            required: ["items", "summary"]
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
            id: 0,
            sender: 'ai',
            type: 'cardiac_biomarker',
            title: `Cardiac Biomarker Interpretation for ${patient.name}`,
            items: result.items,
            summary: result.summary,
            suggestedAction: { type: 'view_report', label: `View Latest Labs (${labReports[labReports.length - 1].date})`, reportId: labReports[labReports.length - 1].id }
        };
    } catch(error) {
        console.error("Error in runCardiacBiomarkerAgent:", error);
        return { id: 0, sender: 'ai', type: 'text', text: "Sorry, I encountered an error while analyzing cardiac biomarkers." };
    }
};

export const runEcgAnalysisAgent = async (patient: Patient, query: string, ai: GoogleGenAI): Promise<TextMessage> => {
    const ecgReports = patient.reports
        .filter(r => r.type === 'ECG' && typeof r.content === 'string')
        .sort((a, b) => b.date.localeCompare(a.date));

    if (ecgReports.length === 0) {
        return { 
            id: 0, 
            sender: 'ai', 
            type: 'text', 
            text: "No ECG reports with interpretable text were found for this patient." 
        };
    }

    const latestEcg = ecgReports[0];
    const content = latestEcg.content as string;
    
    const rhythm = content.match(/Rhythm:\s*(.*)/i)?.[1] || 'Not specified';
    const rate = content.match(/Heart Rate:\s*(.*)/i)?.[1] || 'Not specified';
    const prInterval = content.match(/PR Interval:\s*(.*)/i)?.[1] || 'N/A';
    const qrsDuration = content.match(/QRS Duration:\s*(.*)/i)?.[1] || 'N/A';
    const qtc = content.match(/QTc:\s*(.*)/i)?.[1] || 'N/A';
    const axis = content.match(/Axis:\s*(.*)/i)?.[1] || 'Not specified';
    const interpretation = content.match(/Interpretation:\s*([\s\S]*)/i)?.[1] || 'No interpretation provided.';
    const lowerInterpretation = interpretation.toLowerCase();

    let aiInsight = '';
    if (lowerInterpretation.includes('stemi') || lowerInterpretation.includes('st-segment elevation')) {
        aiInsight = '**Critical Finding:** The ECG shows signs of an acute myocardial infarction (STEMI), requiring immediate attention.';
    } else if (lowerInterpretation.includes('atrial fibrillation')) {
        aiInsight = '**AI Insight:** Atrial fibrillation is present. Key considerations are rate control and assessing stroke risk (CHA₂DS₂-VASc) for appropriate anticoagulation.';
    } else if (lowerInterpretation.includes('lvh') || lowerInterpretation.includes('left ventricular hypertrophy')) {
        aiInsight = '**AI Insight:** Voltage criteria for LVH are met, which is often associated with chronic hypertension. Blood pressure management is a key long-term goal.';
    } else if (lowerInterpretation.includes('normal sinus rhythm') && (lowerInterpretation.includes('no significant abnormalities') || lowerInterpretation.includes('otherwise normal'))) {
        aiInsight = '**AI Insight:** The ECG is within normal limits, suggesting no acute electrical abnormalities.';
    }

    let responseText = `### ECG Analysis (${latestEcg.date})\n`;
    if (aiInsight) {
        responseText += `${aiInsight}\n\n`;
    }
    responseText += `- **Rhythm:** ${rhythm}\n`;
    responseText += `- **Heart Rate:** ${rate}\n`;
    responseText += `- **Intervals:** PR ${prInterval}, QRS ${qrsDuration}, QTc ${qtc}\n`;
    responseText += `- **Axis:** ${axis}\n\n`;
    responseText += `**Original Interpretation:**\n${interpretation.trim()}`;

    return {
        id: 0,
        sender: 'ai',
        type: 'text',
        text: responseText,
        suggestedAction: { type: 'view_report', label: `View ${latestEcg.date} ECG Report`, reportId: latestEcg.id }
    };
};

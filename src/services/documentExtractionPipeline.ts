/**
 * Document Extraction Pipeline Service
 * 
 * Orchestrates the complete document-to-database pipeline:
 * 1. Detects document type (image, PDF, text, DICOM)
 * 2. Routes to appropriate extraction agent (Vision AI or Text AI)
 * 3. Saves extracted structured data to Firestore sub-collections
 * 4. Updates report extraction status
 * 5. Returns results for UI feedback
 * 
 * This is the central orchestrator that connects:
 * - Upload flow (UploadReportForm → AppContext.handleAddReport)
 * - Extraction agents (Vision AI, Text AI)
 * - Firebase persistence (ehrService.saveExtractedData)
 */

import { GoogleGenAI } from "@google/genai";
import { AI_MODELS } from '../config/aiModels';
import type { Report } from '../types';
import type { ExtractionResult } from './agents/extractionAgents';
import { runImageExtractionAgent, runTextExtractionAgent } from './agents/extractionAgents';
import { saveExtractedData, updateReportExtractionStatus, fetchExtractedData } from './ehrService';
import type { MedicationDocument, LabResultDocument, VitalSignDocument, DiagnosisDocument } from './databaseSchema';

// --- TYPES ---

export type ExtractionStatus = 'idle' | 'extracting' | 'saving' | 'completed' | 'failed';

export interface ExtractionProgress {
    reportId: string;
    status: ExtractionStatus;
    message: string;
    result?: ExtractionResult;
    error?: string;
}

export interface ExtractedPatientData {
    medications: MedicationDocument[];
    labs: LabResultDocument[];
    vitals: VitalSignDocument[];
    diagnoses: DiagnosisDocument[];
}

// --- FILE TYPE DETECTION ---

const isImageContent = (report: Report): boolean => {
    if (typeof report.content === 'object' && report.content !== null) {
        return (report.content as any).type === 'image';
    }
    return false;
};

const isPdfContent = (report: Report): boolean => {
    if (typeof report.content === 'object' && report.content !== null) {
        return (report.content as any).type === 'pdf';
    }
    return false;
};

const isTextContent = (report: Report): boolean => {
    return typeof report.content === 'string';
};

const isDicomContent = (report: Report): boolean => {
    if (typeof report.content === 'object' && report.content !== null) {
        return (report.content as any).type === 'dicom';
    }
    return false;
};

// --- UTILITY: Convert File to base64 ---

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- MAIN EXTRACTION PIPELINE ---

/**
 * Runs the complete extraction pipeline for a report.
 * 
 * Flow:
 * 1. Determine content type
 * 2. Extract text + structured data via appropriate AI agent
 * 3. Save extracted data to Firestore sub-collections
 * 4. Update report extraction status
 * 5. Return results
 */
export const runExtractionPipeline = async (
    patientId: string,
    report: Report & { id: string },
    apiKey: string,
    file?: File,
    onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractionResult> => {
    const ai = new GoogleGenAI({ apiKey });
    const reportId = report.id;

    const updateProgress = (status: ExtractionStatus, message: string, result?: ExtractionResult, error?: string) => {
        onProgress?.({ reportId, status, message, result, error });
    };

    try {
        // --- PHASE 1: EXTRACTION ---
        updateProgress('extracting', 'AI is reading and analyzing the document...');

        let extractionResult: ExtractionResult;

        // Route to appropriate extraction agent based on content type
        if (isImageContent(report) && file) {
            // IMAGE: Use Gemini Vision
            const base64 = await fileToBase64(file);
            extractionResult = await runImageExtractionAgent(
                base64,
                file.type || 'image/jpeg',
                report.type,
                ai
            );
        } else if (isPdfContent(report)) {
            // PDF: Use text extraction (rawText already available)
            const rawText = (report.content as any).rawText || report.rawTextForAnalysis || '';
            if (!rawText) {
                // If PDF has no extracted text, try image-based extraction on the file
                if (file) {
                    const base64 = await fileToBase64(file);
                    extractionResult = await runImageExtractionAgent(base64, 'application/pdf', report.type, ai);
                } else {
                    updateProgress('failed', 'No extractable content in PDF.');
                    return { medications: [], labs: [], vitals: [], diagnoses: [] };
                }
            } else {
                extractionResult = await runTextExtractionAgent(rawText, report.type, ai);
            }
        } else if (isTextContent(report)) {
            // TEXT: Direct text extraction
            extractionResult = await runTextExtractionAgent(report.content as string, report.type, ai);
        } else if (isDicomContent(report) && file) {
            // DICOM: Convert to image first, then use Vision
            // Note: DICOM rendering happens client-side via DWV library
            // We'll use the file directly as Gemini can handle some DICOM formats
            const base64 = await fileToBase64(file);
            extractionResult = await runImageExtractionAgent(base64, file.type || 'application/dicom', report.type, ai);
        } else if (report.rawTextForAnalysis) {
            // Fallback: use rawTextForAnalysis if available
            extractionResult = await runTextExtractionAgent(report.rawTextForAnalysis, report.type, ai);
        } else if (file) {
            // Last resort: try image extraction on any file
            const base64 = await fileToBase64(file);
            extractionResult = await runImageExtractionAgent(base64, file.type, report.type, ai);
        } else {
            updateProgress('failed', 'No extractable content found in this document.');
            return { medications: [], labs: [], vitals: [], diagnoses: [] };
        }

        // --- PHASE 2: SAVE TO FIRESTORE ---
        updateProgress('saving', 'Saving extracted clinical data to your health profile...');

        const hasData =
            extractionResult.medications.length > 0 ||
            extractionResult.labs.length > 0 ||
            extractionResult.vitals.length > 0 ||
            extractionResult.diagnoses.length > 0;

        if (hasData || (extractionResult.keyFindings && extractionResult.keyFindings.length > 0)) {
            await saveExtractedData(patientId, reportId, {
                medications: extractionResult.medications,
                labs: extractionResult.labs,
                vitals: extractionResult.vitals,
                diagnoses: extractionResult.diagnoses,
                keyFindings: extractionResult.keyFindings,
                unstructuredData: extractionResult.unstructuredData
            });
        }

        // Update report status
        try {
            await updateReportExtractionStatus(patientId, reportId, 'completed', extractionResult.rawExtractedText);
        } catch (statusErr) {
            // Non-critical — log but don't fail
            console.warn('Failed to update report extraction status:', statusErr);
        }

        // --- PHASE 3: COMPLETE ---
        const summary = buildExtractionSummary(extractionResult);
        updateProgress('completed', summary, extractionResult);

        return extractionResult;

    } catch (error: any) {
        console.error(`Extraction pipeline failed for report ${reportId}:`, error);

        // Update status to failed
        try {
            await updateReportExtractionStatus(patientId, reportId, 'failed');
        } catch { /* ignore */ }

        updateProgress('failed', `Extraction failed: ${error.message || 'Unknown error'}`, undefined, error.message);
        return { medications: [], labs: [], vitals: [], diagnoses: [] };
    }
};

// --- FETCH PATIENT'S EXTRACTED DATA ---

/**
 * Loads all extracted structured data for a patient from Firestore sub-collections.
 * Used by the UI to display medications, labs, vitals, diagnoses panels.
 */
export const loadExtractedPatientData = async (patientId: string): Promise<ExtractedPatientData> => {
    return fetchExtractedData(patientId);
};

// --- SUMMARY BUILDER ---

const buildExtractionSummary = (result: ExtractionResult): string => {
    const parts: string[] = [];

    if (result.medications.length > 0) {
        parts.push(`${result.medications.length} medication(s)`);
    }
    if (result.labs.length > 0) {
        parts.push(`${result.labs.length} lab result(s)`);
    }
    if (result.vitals.length > 0) {
        parts.push(`${result.vitals.length} vital sign(s)`);
    }
    if (result.diagnoses.length > 0) {
        parts.push(`${result.diagnoses.length} diagnosis/diagnoses`);
    }
    if (result.keyFindings && result.keyFindings.length > 0) {
        parts.push(`${result.keyFindings.length} key finding(s)`);
    }

    if (parts.length === 0) {
        return 'Document analyzed — no structured clinical data found.';
    }

    return `Extracted: ${parts.join(', ')}. Data saved to health profile.`;
};

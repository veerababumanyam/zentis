/**
 * Extraction Agents
 * 
 * Specialized AI agents for extracting structured clinical data from
 * all document types: images, PDFs, text, and DICOM files.
 * 
 * Uses Gemini Vision for image-based documents and text extraction
 * for text-based documents, then normalizes output to a standard
 * structured format for storage in Firestore sub-collections.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { AI_MODELS } from '../../config/aiModels';
import type { MedicationDocument, LabResultDocument, VitalSignDocument, DiagnosisDocument } from '../databaseSchema';

// --- TYPES ---

export interface ExtractionResult {
    medications: Omit<MedicationDocument, 'createdAt'>[];
    labs: Omit<LabResultDocument, 'createdAt'>[];
    vitals: Omit<VitalSignDocument, 'createdAt'>[];
    diagnoses: Omit<DiagnosisDocument, 'createdAt'>[];
    keyFindings?: string[];
    unstructuredData?: Record<string, any>;
    rawExtractedText?: string;
    ocrConfidence?: number;
}

// Shared response schema for all extraction agents
const EXTRACTION_RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        rawExtractedText: { type: Type.STRING, description: 'The full text content extracted/OCR from the document' },
        ocrConfidence: { type: Type.NUMBER, description: 'Confidence score 0-1 for text extraction quality' },
        keyFindings: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Important clinical findings that do not fit into meds/labs/vitals/diagnoses' },
        unstructuredData: { type: Type.OBJECT, description: 'Any other structured data extracted from the report (e.g., procedure details, device settings)' },
        medications: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    dose: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    route: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['active', 'stopped', 'held'] },
                    indication: { type: Type.STRING }
                },
                required: ['name', 'dose', 'frequency', 'status']
            }
        },
        labs: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    testName: { type: Type.STRING },
                    value: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    referenceRange: { type: Type.STRING },
                    date: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['Chemistry', 'Hematology', 'Microbiology', 'Other'] },
                    isAbnormal: { type: Type.BOOLEAN }
                },
                required: ['testName', 'value', 'unit', 'date']
            }
        },
        vitals: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['BP', 'HR', 'Respiratory Rate', 'Temp', 'O2 Sat', 'Weight', 'Height', 'BMI'] },
                    value: { type: Type.NUMBER },
                    value2: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    date: { type: Type.STRING }
                },
                required: ['type', 'value', 'unit', 'date']
            }
        },
        diagnoses: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    icd10: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['active', 'resolved', 'historical'] },
                    onsetDate: { type: Type.STRING },
                    notes: { type: Type.STRING }
                },
                required: ['name', 'status']
            }
        }
    },
    required: ['rawExtractedText', 'medications', 'labs', 'vitals', 'diagnoses']
};

// --- VISION EXTRACTION AGENT ---

/**
 * Uses Gemini Vision (multimodal) to extract structured medical data
 * from image-based documents: photos of reports, scanned lab results,
 * eye reports, X-rays with text overlays, ECG printouts, etc.
 */
export const runImageExtractionAgent = async (
    base64Data: string,
    mimeType: string,
    reportType: string,
    ai: GoogleGenAI
): Promise<ExtractionResult> => {
    const prompt = `You are a specialized medical document OCR and extraction engine.
You are given an image of a medical ${reportType} report/document.

Your task:
1. **OCR**: Extract ALL visible text from the image, preserving the structure as much as possible. Include headers, values, dates, notes, and any handwritten text you can decipher.
2. **Structured Extraction**: From the extracted text, identify and structure the following clinical entities:
   - **Medications**: Drug names, dosages, frequencies, routes, status (active/stopped/held)
   - **Lab Results**: Test names, numeric values, units, reference ranges, dates, whether abnormal
   - **Vital Signs**: BP, HR, Respiratory Rate, Temperature, O2 Sat, Weight, Height, BMI with values and dates
   - **Diagnoses**: Condition names, ICD-10 codes if visible, status (active/resolved/historical), onset dates
   - **Key Findings**: Important clinical findings that do NOT fit into the above categories (e.g., "Left ventricular hypertrophy", "No acute fracture").
   - **Unstructured Data**: Any other useful structured info.

Be thorough — extract EVERYTHING visible. For dates, use YYYY-MM-DD format. 
If a value is unclear, make your best estimate and note low confidence.
Return empty arrays for categories with no data found.
Set ocrConfidence to a value between 0 and 1 indicating how confident you are in the text extraction.`;

    try {
        const response = await ai.models.generateContent({
            model: AI_MODELS.IMAGE,
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType, data: base64Data } }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: EXTRACTION_RESPONSE_SCHEMA
            }
        });

        const result = JSON.parse(response.text.trim());
        return {
            medications: result.medications || [],
            labs: result.labs || [],
            vitals: result.vitals || [],
            diagnoses: result.diagnoses || [],
            keyFindings: result.keyFindings || [],
            unstructuredData: result.unstructuredData || {},
            rawExtractedText: result.rawExtractedText || '',
            ocrConfidence: result.ocrConfidence || 0
        };
    } catch (error) {
        console.error("Error in image extraction agent:", error);
        return { medications: [], labs: [], vitals: [], diagnoses: [], rawExtractedText: '', ocrConfidence: 0 };
    }
};

// --- TEXT-BASED EXTRACTION AGENT (Enhanced) ---

/**
 * Enhanced version of the existing structured extraction agent.
 * Adds rawExtractedText passthrough and confidence scoring.
 */
export const runTextExtractionAgent = async (
    textContent: string,
    reportType: string,
    ai: GoogleGenAI
): Promise<ExtractionResult> => {
    const prompt = `You are a specialized medical data extraction engine. Extract structured clinical data from the following ${reportType} report.
    
Content:
${textContent.substring(0, 12000)}

Extract the following entities into strict JSON:
1. **rawExtractedText**: Return the full input text as-is (for storage).
2. **Medications**: Current/Active medications found. Status should be 'active' unless explicitly stopped.
3. **Labs**: Discrete lab results with numeric values and units.
4. **Vitals**: Vital signs with dates. For BP, use value=systolic, value2=diastolic.
5. **Diagnoses**: New or confirmed diagnoses with ICD-10 codes if mentioned.
6. **Key Findings**: Important clinical findings that do NOT fit into the above categories.
7. **Unstructured Data**: Any other useful structured info.

Use YYYY-MM-DD format for dates. Set ocrConfidence to 1.0 for text documents.
Return empty arrays if no data found for a category.`;

    try {
        const response = await ai.models.generateContent({
            model: AI_MODELS.FLASH,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: EXTRACTION_RESPONSE_SCHEMA
            }
        });

        const result = JSON.parse(response.text.trim());
        return {
            medications: result.medications || [],
            labs: result.labs || [],
            vitals: result.vitals || [],
            diagnoses: result.diagnoses || [],
            keyFindings: result.keyFindings || [],
            unstructuredData: result.unstructuredData || {},
            rawExtractedText: result.rawExtractedText || textContent,
            ocrConfidence: 1.0
        };
    } catch (error) {
        console.error("Error in text extraction agent:", error);
        return { medications: [], labs: [], vitals: [], diagnoses: [], rawExtractedText: textContent, ocrConfidence: 1.0 };
    }
};

// --- MULTI-IMAGE EXTRACTION AGENT ---

/**
 * Extracts data from multiple images at once (e.g., multi-page scanned reports).
 */
export const runMultiImageExtractionAgent = async (
    images: Array<{ base64Data: string; mimeType: string }>,
    reportType: string,
    ai: GoogleGenAI
): Promise<ExtractionResult> => {
    const prompt = `You are a specialized medical document OCR and extraction engine.
You are given ${images.length} image(s) that together form a medical ${reportType} report.

Analyze ALL images as a single cohesive document and extract:
1. **rawExtractedText**: Complete OCR text from all pages combined
2. **Medications**: All medications mentioned across all pages
3. **Labs**: All lab results with values and units
4. **Vitals**: All vital signs
5. **Diagnoses**: All diagnoses and conditions
6. **Key Findings**: Important clinical findings that do NOT fit into the above categories.
7. **Unstructured Data**: Any other useful structured info.

Deduplicate entries that appear on multiple pages. Use YYYY-MM-DD for dates.
Return empty arrays for categories with no data found.`;

    const parts: any[] = [{ text: prompt }];
    images.forEach(img => {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64Data } });
    });

    try {
        const response = await ai.models.generateContent({
            model: AI_MODELS.IMAGE,
            contents: { parts },
            config: {
                responseMimeType: 'application/json',
                responseSchema: EXTRACTION_RESPONSE_SCHEMA
            }
        });

        const result = JSON.parse(response.text.trim());
        return {
            medications: result.medications || [],
            labs: result.labs || [],
            vitals: result.vitals || [],
            diagnoses: result.diagnoses || [],
            keyFindings: result.keyFindings || [],
            unstructuredData: result.unstructuredData || {},
            rawExtractedText: result.rawExtractedText || '',
            ocrConfidence: result.ocrConfidence || 0
        };
    } catch (error) {
        console.error("Error in multi-image extraction agent:", error);
        return { medications: [], labs: [], vitals: [], diagnoses: [], rawExtractedText: '', ocrConfidence: 0 };
    }
};

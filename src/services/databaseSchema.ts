/**
 * Firestore Database Schema Definitions
 * 
 * This file defines the TypeScript interfaces for the Firestore database structure,
 * specifically focusing on the new sub-collection architecture for granular patient data.
 */

// --- ROOT COLLECTIONS ---

// users/{uid} - Auth & Profile
export interface UserDocument {
    uid: string;
    email: string;
    role: 'doctor' | 'patient';
    displayName: string;
    photoURL: string;
    createdAt: number;
    geminiApiKey?: string;
    // For doctors: list of patient IDs they manage (can be redundant if we use queries, but good for quick access)
    managedPatientIds?: string[];
    // For patients: link to their detailed patient record
    patientRecordId?: string;
}

// patients/{patientId} - Demographics & Core Info
export interface PatientDocument {
    id: string; // Matches Firestore Document ID
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    dob: string; // YYYY-MM-DD
    mrn?: string; // Medical Record Number

    // Aggregate/Caching fields for UI performance (fetched with the patient doc)
    currentCondition?: string;
    allergies?: string[];
    criticalAlerts?: string[];

    createdAt: number;
    updatedAt: number;
}

// --- SUB-COLLECTIONS (patients/{patientId}/...) ---

// patients/{patientId}/medications/{medId}
export interface MedicationDocument {
    id?: string;
    name: string;
    dose: string;
    frequency: string;
    route?: string; // e.g., PO, IV
    status: 'active' | 'stopped' | 'held';
    startDate?: string;
    endDate?: string;
    prescriber?: string;
    indication?: string;

    // Metadata
    sourceReportId?: string; // Link to the report where this was found
    createdAt: number;
}

// patients/{patientId}/labs/{labId}
export interface LabResultDocument {
    id?: string;
    testName: string; // e.g., "Creatinine", "Potassium"
    value: number;
    unit: string;
    referenceRange?: string; // e.g., "0.7 - 1.3"
    date: string; // Date of collection
    category?: 'Chemistry' | 'Hematology' | 'Microbiology' | 'Other';

    // Metadata
    sourceReportId?: string;
    isAbnormal?: boolean;
    createdAt: number;
}

// patients/{patientId}/vitals/{vitalId}
export interface VitalSignDocument {
    id?: string;
    type: 'BP' | 'HR' | 'Respiratory Rate' | 'Temp' | 'O2 Sat' | 'Weight' | 'Height' | 'BMI';
    value: number;
    value2?: number; // For BP (Systolic/Diastolic) -> value=Systolic, value2=Diastolic
    unit: string;
    date: string; // Timestamp of reading
    source?: string; // e.g., "Home Monitor", "Clinic", "Apple Health"

    createdAt: number;
}

// patients/{patientId}/diagnoses/{diagnosisId}
export interface DiagnosisDocument {
    id?: string;
    name: string;
    icd10?: string;
    status: 'active' | 'resolved' | 'historical';
    onsetDate?: string;
    notes?: string;

    sourceReportId?: string;
    createdAt: number;
}

// patients/{patientId}/reports/{reportId}
// Extending the metadata for stored files
export interface ReportDocument {
    id: string;
    title: string;
    type: string; // Maps to Report['type'] in types.ts
    date: string; // Clinical date of the report
    storagePath: string; // Firebase Storage path
    downloadUrl: string;

    // AI Processing Status
    extractionStatus: 'pending' | 'processing' | 'completed' | 'failed';
    aiSummary?: string;
    keyFindings?: string[];

    createdAt: number;
    uploadedBy: string;
}

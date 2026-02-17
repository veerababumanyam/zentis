import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  addDoc,
  Timestamp,
  writeBatch,
  deleteDoc,
  where, // NEW
  arrayUnion // NEW
} from 'firebase/firestore';
import { db } from './firebase';

/** Recursively removes undefined values from an object/array (Firestore rejects undefined). */
const stripUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(item => stripUndefined(item));
  if (obj instanceof Date) return obj;
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return obj;
};
import type { Patient, Report, VitalsLog, MedicalHistoryItem, ClinicalTask } from '../types';
import type {
  MedicationDocument,
  LabResultDocument,
  VitalSignDocument,
  DiagnosisDocument,
  PatientDocument,
  ImmunizationDocument,
  FamilyHistoryDocument,
  SocialHistoryDocument
} from './databaseSchema';

const USERS_COLLECTION = 'users';
const PATIENTS_COLLECTION = 'patients'; // Top-level collection for scalable patient data

// --- CONVERSION HELPERS (DTO -> Domain App Type) ---

const mapMedToDomain = (doc: MedicationDocument): string => {
  // App currently uses string array for meds e.g. "Lisinopril 10mg daily"
  return `${doc.name} ${doc.dose} ${doc.frequency}`;
};

const mapLabToDomain = (doc: LabResultDocument): any => {
  // App expects Report type for labs mainly in the reports array, 
  // but we might want to expose discrete values too.
  // For now, the App domain 'Patient' type doesn't have a direct 'labs' array property 
  // other than inside 'reports' or 'pendingLabs'.
  return doc;
};

// --- REPOSITORY IMPLEMENTATION ---

/**
 * Fetches a complete Patient object by aggregating data from sub-collections.
 * Implements robust parallel fetching: Patient Doc, Fallback User Doc, and all sub-collections
 * are fetched concurrently to minimize waterfall latency.
 */
export const getPatient = async (patientId: string): Promise<Patient | null> => {
  try {
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    const userRef = doc(db, USERS_COLLECTION, patientId);

    // 1. Parallel Fetch: Parent Patient, Fallback User, and ALL sub-collections
    // This removes the waterfall where we waited for patient existence before fetching details
    const [
      patientSnap,
      userSnap,
      medsSnap,
      labsSnap, // Note: labs currently fetched but not fully mapped in original code, keeping for consistency
      vitalsSnap,
      diagnosesSnap,
      reportsSnap,
      immunizationsSnap,
      familyHistorySnap,
      socialHistorySnap
    ] = await Promise.all([
      getDoc(patientRef),
      getDoc(userRef),
      getDocs(collection(patientRef, 'medications')),
      getDocs(query(collection(patientRef, 'labs'), orderBy('date', 'desc'), limit(50))),
      getDocs(query(collection(patientRef, 'vitals'), orderBy('date', 'desc'), limit(20))),
      getDocs(collection(patientRef, 'diagnoses')),
      getDocs(query(collection(patientRef, 'reports'), orderBy('date', 'desc'), limit(20))),
      getDocs(collection(patientRef, 'immunizations')),
      getDocs(collection(patientRef, 'familyHistory')),
      getDocs(collection(patientRef, 'socialHistory'))
    ]);

    // 2. Determine Base Patient Data (Demographics)
    let pData: PatientDocument | any = null;

    if (patientSnap.exists()) {
      pData = patientSnap.data() as PatientDocument;
    } else if (userSnap.exists() && userSnap.data().role === 'patient') {
      // Fallback: Construct a default profile from User data
      const userData = userSnap.data();
      pData = {
        id: patientId,
        name: userData.displayName || 'Unknown Patient',
        age: userData.age ?? 0,
        gender: (userData.gender as 'Male' | 'Female' | 'Other') || 'Female',
        allergies: [],
      };
    } else {
      // Neither exists (or user is not a patient)
      return null;
    }

    // 3. Process Sub-collections (Always process these if base data found)
    const medications = medsSnap.docs
      .map(d => d.data() as MedicationDocument)
      .filter(m => m.status === 'active')
      .map(mapMedToDomain);

    const medicalHistory: MedicalHistoryItem[] = diagnosesSnap.docs.map(d => {
      const data = d.data() as DiagnosisDocument;
      return {
        description: data.name,
        icd10: data.icd10
      };
    });

    const recentVitals = vitalsSnap.docs.map(d => d.data() as VitalSignDocument);
    const latestBp = recentVitals.find(v => v.type === 'BP');
    const latestHr = recentVitals.find(v => v.type === 'HR');

    let vitalsString = '';
    if (latestBp) vitalsString += `BP ${latestBp.value}/${latestBp.value2 || '?'}`;
    if (latestHr) vitalsString += `, HR ${latestHr.value}`;

    const reports: Report[] = reportsSnap.docs
      .map(d => {
        const data = d.data();
        const resolvedText = data.extractedText || data.rawTextForAnalysis || '';
        const cType = data.contentType || 'pdf'; // backward-compat default
        return {
          id: d.id,
          type: data.type as Report['type'],
          date: data.date,
          title: data.title,
          content: cType === 'text'
            ? (resolvedText || '')
            : { type: cType, url: data.downloadUrl, ...(cType === 'pdf' ? { rawText: resolvedText } : {}) } as any,
          rawTextForAnalysis: resolvedText || null,
          aiSummary: data.aiSummary,
          keyFindings: data.keyFindings,
          isDeleted: data.isDeleted || false,
          deletedAt: data.deletedAt || null
        } as Report;
      })
      .filter(r => !r.isDeleted); // Filter out soft-deleted reports

    const immunizations: ImmunizationDocument[] = immunizationsSnap.docs.map(d => ({
      id: d.id,
      ...(d.data() as ImmunizationDocument)
    }));

    const familyHistory: FamilyHistoryDocument[] = familyHistorySnap.docs.map(d => ({
      id: d.id,
      ...(d.data() as FamilyHistoryDocument)
    }));

    const socialHistory: SocialHistoryDocument[] = socialHistorySnap.docs.map(d => ({
      id: d.id,
      ...(d.data() as SocialHistoryDocument)
    }));

    // 4. Construct Final Domain Object
    return {
      id: pData.id,
      name: pData.name,
      photoURL: pData.photoURL || (userSnap.exists() ? userSnap.data().photoURL : undefined), // NEW: Fallback to user photo
      age: pData.age ?? 0,
      gender: (pData.gender as any) || 'Female',
      weight: 70, // Default/Placeholder
      allergies: pData.allergies || [],
      medicalHistory: medicalHistory,
      appointmentTime: '09:00', // Default
      criticalAlerts: pData.criticalAlerts,
      // Administrative details
      emergencyContacts: pData.emergencyContacts || [],
      insurance: pData.insurance || undefined,
      primaryCarePhysician: pData.primaryCarePhysician || undefined,
      // Legal & directives
      advancedDirectives: pData.advancedDirectives || undefined,
      privacyConsent: pData.privacyConsent || undefined,
      // Clinical goals
      clinicalGoals: pData.clinicalGoals || undefined,
      currentStatus: {
        condition: pData.currentCondition || 'Wellness Check',
        vitals: vitalsString,
        medications: medications
      },
      reports: reports,
      immunizations,
      familyHistory,
      socialHistory,
      notes: '',
      vitalsLog: recentVitals.map(v => ({ date: v.date, vitals: `${v.type} ${v.value} ${v.unit}` }))
    };

  } catch (error) {
    console.error(`Error aggregating patient data for ${patientId}:`, error);
    return null;
  }
};

/**
 * Saves a new patient or updates demographics (Top-level document only).
 */
export const savePatientDemographics = async (patientId: string, data: Partial<PatientDocument>): Promise<void> => {
  await setDoc(doc(db, PATIENTS_COLLECTION, patientId), stripUndefined({
    ...data,
    updatedAt: Date.now()
  }), { merge: true });
};

export const savePatientProfile = async (
  patientId: string,
  data: Partial<PatientDocument>
): Promise<void> => {
  try {
    await savePatientDemographics(patientId, data);
  } catch (error) {
    console.error(`Error saving patient profile for ${patientId}:`, error);
    throw error;
  }
};

export const addImmunization = async (
  patientId: string,
  immunization: Omit<ImmunizationDocument, 'createdAt'>
) => {
  await addDoc(collection(db, PATIENTS_COLLECTION, patientId, 'immunizations'), {
    ...immunization,
    createdAt: Date.now()
  });
};

export const addFamilyHistoryEntry = async (
  patientId: string,
  entry: Omit<FamilyHistoryDocument, 'createdAt'>
) => {
  await addDoc(collection(db, PATIENTS_COLLECTION, patientId, 'familyHistory'), {
    ...entry,
    createdAt: Date.now()
  });
};

export const addSocialHistoryEntry = async (
  patientId: string,
  entry: Omit<SocialHistoryDocument, 'createdAt'>
) => {
  await addDoc(collection(db, PATIENTS_COLLECTION, patientId, 'socialHistory'), {
    ...entry,
    createdAt: Date.now()
  });
};

/**
 * Adds a granular medication entry to the sub-collection.
 */
export const addMedication = async (patientId: string, med: Omit<MedicationDocument, 'createdAt'>) => {
  await addDoc(collection(db, PATIENTS_COLLECTION, patientId, 'medications'), {
    ...med,
    createdAt: Date.now()
  });
};

/**
 * Adds a discrete lab result.
 */
export const addLabResult = async (patientId: string, lab: Omit<LabResultDocument, 'createdAt'>) => {
  await addDoc(collection(db, PATIENTS_COLLECTION, patientId, 'labs'), {
    ...lab,
    createdAt: Date.now()
  });
};

/**
 * Adds a report metadata entry.
 * Uses setDoc with the client-generated report ID so the Firestore document ID
 * matches the ID used by the extraction pipeline for status updates.
 */
export const addReportMetadata = async (patientId: string, report: Report) => {
  // Convert App 'Report' type to Firestore 'ReportDocument' schema
  const contentUrl = (typeof report.content === 'object' && report.content !== null && 'url' in report.content)
    ? (report.content as any).url
    : '';
  // Derive the original content type so we can restore it on read
  const contentType = (typeof report.content === 'object' && report.content !== null && 'type' in report.content)
    ? (report.content as any).type   // 'image' | 'pdf' | 'dicom' | 'link' | 'live_session'
    : 'text';

  // Capture raw text at upload time (PDF client-side extraction, text file, etc.)
  const rawTextForAnalysis = (() => {
    if (report.rawTextForAnalysis) return report.rawTextForAnalysis;
    if (typeof report.content === 'string') return report.content;
    if (typeof report.content === 'object' && report.content.type === 'pdf' && report.content.rawText) return report.content.rawText;
    return null;
  })();

  const docData: Record<string, any> = {
    title: report.title,
    type: report.type,
    date: report.date || new Date().toISOString(),
    extractionStatus: 'pending',
    aiSummary: report.aiSummary,
    keyFindings: report.keyFindings,
    unstructuredData: report.unstructuredData,
    fileHash: report.fileHash,
    tags: report.tags || [],
    storagePath: contentUrl,
    downloadUrl: contentUrl,
    contentType,                                               // NEW: preserve original media type
    rawTextForAnalysis: rawTextForAnalysis                      // NEW: persist text for later analysis
      ? rawTextForAnalysis.substring(0, 50000)                 // Firestore field-size guard
      : null,
    createdAt: Date.now()
  };

  // Use setDoc with the client-generated ID (e.g. "rep_17xxxxx")
  // so the extraction pipeline can later update this exact document.
  const reportRef = doc(db, PATIENTS_COLLECTION, patientId, 'reports', report.id);
  await setDoc(reportRef, stripUndefined(docData));
};

/**
 * Batch saves extracted data from AI analysis.
 */
export const saveExtractedData = async (
  patientId: string,
  reportId: string,
  data: {
    medications: Omit<MedicationDocument, 'createdAt'>[],
    labs: Omit<LabResultDocument, 'createdAt'>[],
    vitals: Omit<VitalSignDocument, 'createdAt'>[],
    diagnoses: Omit<DiagnosisDocument, 'createdAt'>[],
    keyFindings?: string[],   // NEW
    unstructuredData?: Record<string, any> // NEW
  }
) => {
  const batch = writeBatch(db);

  // 1. Medications
  data.medications.forEach(med => {
    const ref = doc(collection(db, PATIENTS_COLLECTION, patientId, 'medications'));
    batch.set(ref, { ...med, sourceReportId: reportId, createdAt: Date.now() });
  });

  // 2. Labs
  data.labs.forEach(lab => {
    const ref = doc(collection(db, PATIENTS_COLLECTION, patientId, 'labs'));
    batch.set(ref, { ...lab, sourceReportId: reportId, createdAt: Date.now() });
  });

  // 3. Vitals
  data.vitals.forEach(vital => {
    const ref = doc(collection(db, PATIENTS_COLLECTION, patientId, 'vitals'));
    batch.set(ref, { ...vital, source: `Report: ${reportId}`, createdAt: Date.now() });
  });

  // 4. Diagnoses
  data.diagnoses.forEach(dx => {
    const ref = doc(collection(db, PATIENTS_COLLECTION, patientId, 'diagnoses'));
    batch.set(ref, { ...dx, sourceReportId: reportId, createdAt: Date.now() });
  });

  // 5. Update Report Status & Metadata (use set+merge)
  const reportRef = doc(db, PATIENTS_COLLECTION, patientId, 'reports', reportId);
  const reportUpdate: any = { extractionStatus: 'completed' };

  if (data.keyFindings && data.keyFindings.length > 0) {
    reportUpdate.keyFindings = data.keyFindings;

    // 6. Update Patient Consolidated Findings (NEW)
    // Aggregates key findings from this report into the patient's master list
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    batch.set(patientRef, {
      consolidatedFindings: arrayUnion(...data.keyFindings)
    }, { merge: true });
  }
  if (data.unstructuredData && Object.keys(data.unstructuredData).length > 0) {
    reportUpdate.unstructuredData = data.unstructuredData;
  }

  batch.set(reportRef, reportUpdate, { merge: true });

  await batch.commit();
};

export const updatePatient = async (patient: Patient): Promise<void> => {
  // This ensures that simple updates (notes etc) persist even if we haven't fully migrated that specific field to a sub-collection yet.
  try {
    // We only update the top-level patient document for simplicity here.
    // Deep updates like medications should technically go to subcollections, 
    // but we support hybrid for now.
    await setDoc(doc(db, PATIENTS_COLLECTION, patient.id), stripUndefined({ ...patient }), { merge: true });
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a new patient and links it to the current user's profile.
 */
export const createPatient = async (userId: string, patientData: Partial<Patient>): Promise<string> => {
  try {
    // 1. Create Patient Document
    const patientRef = await addDoc(collection(db, PATIENTS_COLLECTION), stripUndefined({
      ...patientData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));

    const patientId = patientRef.id;

    // 2. Link to User Profile
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentIds = userSnap.data().managedPatientIds || [];
      await updateDoc(userRef, {
        managedPatientIds: [...currentIds, patientId]
      });
    }

    return patientId;
  } catch (error) {
    console.error("Error creating patient:", error);
    throw error;
  }
};

// --- LEGACY COMPATIBILITY ---
// Maintains the interface expected by App.tsx until we fully migrate call sites

export const fetchPatients = async (currentUserId?: string): Promise<Patient[]> => {
  if (!currentUserId) return [];

  try {
    // 1. Get managed patients list from the User Profile
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, currentUserId));
    if (!userDoc.exists()) return [];
    const userData = userDoc.data();

    const patientIds: string[] = userData.managedPatientIds || [];

    // 2. Fetch each patient profile using the robust aggregator
    const patients = await Promise.all(patientIds.map(pid => getPatient(pid)));

    // Filter out nulls
    return patients.filter(p => p !== null) as Patient[];

  } catch (error) {
    console.error("Error fetching patients list:", error);
    return [];
  }
}

/**
 * Updates the extraction status of a report document.
 */
export const updateReportExtractionStatus = async (
  patientId: string,
  reportId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  rawExtractedText?: string
): Promise<void> => {
  try {
    const reportRef = doc(db, PATIENTS_COLLECTION, patientId, 'reports', reportId);
    const updateData: any = { extractionStatus: status };
    if (status === 'completed') {
      updateData.tags = arrayUnion('processed', 'smart-extracted');
    }
    if (rawExtractedText) {
      updateData.extractedText = rawExtractedText.substring(0, 50000); // Firestore field size limit
    }
    await updateDoc(reportRef, updateData);
  } catch (error) {
    console.warn(`Failed to update extraction status for report ${reportId}:`, error);
  }
};

/**
 * Fetches all extracted structured data for a patient from sub-collections.
 * Returns medications, labs, vitals, and diagnoses sorted by recency.
 */
export const fetchExtractedData = async (patientId: string): Promise<{
  medications: import('./databaseSchema').MedicationDocument[];
  labs: import('./databaseSchema').LabResultDocument[];
  vitals: import('./databaseSchema').VitalSignDocument[];
  diagnoses: import('./databaseSchema').DiagnosisDocument[];
}> => {
  try {
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);

    const [medsSnap, labsSnap, vitalsSnap, diagnosesSnap] = await Promise.all([
      getDocs(query(collection(patientRef, 'medications'), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(patientRef, 'labs'), orderBy('date', 'desc'), limit(100))),
      getDocs(query(collection(patientRef, 'vitals'), orderBy('date', 'desc'), limit(50))),
      getDocs(collection(patientRef, 'diagnoses'))
    ]);

    return {
      medications: medsSnap.docs.map(d => ({ id: d.id, ...d.data() } as import('./databaseSchema').MedicationDocument)),
      labs: labsSnap.docs.map(d => ({ id: d.id, ...d.data() } as import('./databaseSchema').LabResultDocument)),
      vitals: vitalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as import('./databaseSchema').VitalSignDocument)),
      diagnoses: diagnosesSnap.docs.map(d => ({ id: d.id, ...d.data() } as import('./databaseSchema').DiagnosisDocument))
    };
  } catch (error) {
    console.error(`Error fetching extracted data for patient ${patientId}:`, error);
    return { medications: [], labs: [], vitals: [], diagnoses: [] };
  }
};

export const exportAllData = async (): Promise<any> => {
  console.warn("exportAllData not implemented");
  return {};
};

export const importData = async (data: any): Promise<void> => {
  console.warn("importData not implemented");
};

/**
 * Checks if a report with the given file hash already exists for the patient.
 * Returns the existing report if found, otherwise null.
 */
export const checkForDuplicateReport = async (patientId: string, fileHash: string): Promise<Report | null> => {
  if (!fileHash) return null;
  try {
    const reportsRef = collection(db, PATIENTS_COLLECTION, patientId, 'reports');
    const q = query(reportsRef, where('fileHash', '==', fileHash), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      const resolvedText = data.extractedText || data.rawTextForAnalysis || '';
      const cType = data.contentType || 'pdf';
      return {
        id: snapshot.docs[0].id,
        type: data.type as Report['type'],
        date: data.date,
        title: data.title,
        content: cType === 'text'
          ? (resolvedText || '')
          : { type: cType, url: data.downloadUrl, ...(cType === 'pdf' ? { rawText: resolvedText } : {}) } as any,
        rawTextForAnalysis: resolvedText || null,
        aiSummary: data.aiSummary,
        keyFindings: data.keyFindings,
        unstructuredData: data.unstructuredData,
        extractionStatus: data.extractionStatus,
        tags: data.tags,
        fileHash: data.fileHash
      } as Report;
    }
    return null;
  } catch (error) {
    console.error("Error checking for duplicate report:", error);
    return null;
  }
};

// --- SOFT DELETE IMPLEMENTATION ---

export const softDeleteReport = async (patientId: string, reportId: string): Promise<void> => {
  try {
    const reportRef = doc(db, PATIENTS_COLLECTION, patientId, 'reports', reportId);
    await updateDoc(reportRef, {
      isDeleted: true,
      deletedAt: Date.now()
    });
  } catch (error) {
    console.error("Error soft deleting report:", error);
    throw error;
  }
};

export const restoreReport = async (patientId: string, reportId: string): Promise<void> => {
  try {
    const reportRef = doc(db, PATIENTS_COLLECTION, patientId, 'reports', reportId);
    await updateDoc(reportRef, {
      isDeleted: false,
      deletedAt: null
    });
  } catch (error) {
    console.error("Error restoring report:", error);
    throw error;
  }
};

import { deleteFileFromUrl } from './storageService'; // Ensure this import is added at the top too if not present

export const permanentlyDeleteReport = async (patientId: string, reportId: string, downloadUrl?: string): Promise<void> => {
  try {
    // 1. Delete from Firestore
    const reportRef = doc(db, PATIENTS_COLLECTION, patientId, 'reports', reportId);
    await deleteDoc(reportRef);

    // 2. Delete from Storage (if URL provided)
    if (downloadUrl) {
      await deleteFileFromUrl(downloadUrl);
    }
  } catch (error) {
    console.error("Error permanently deleting report:", error);
    throw error;
  }
};

export const fetchDeletedReports = async (patientId: string): Promise<Report[]> => {
  try {
    const reportsRef = collection(db, PATIENTS_COLLECTION, patientId, 'reports');
    // Fetch reports where isDeleted is true
    const q = query(reportsRef, where("isDeleted", "==", true), orderBy("deletedAt", "desc"));

    // Note: This query requires an index on isDeleted + deletedAt. 
    // If it fails initially, we might need to fetch all and filter client-side 
    // or just fetch all reports and filter in the UI if the list isn't huge.
    // Given the architecture, let's try strict query first.

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      const resolvedText = data.extractedText || data.rawTextForAnalysis || '';
      const cType = data.contentType || 'pdf';
      return {
        id: d.id,
        type: data.type as Report['type'],
        date: data.date,
        title: data.title,
        content: cType === 'text'
          ? (resolvedText || '')
          : { type: cType, url: data.downloadUrl, ...(cType === 'pdf' ? { rawText: resolvedText } : {}) } as any,
        rawTextForAnalysis: resolvedText || null,
        aiSummary: data.aiSummary,
        keyFindings: data.keyFindings,
        isDeleted: true,
        deletedAt: data.deletedAt
      } as Report;
    });
  } catch (error: any) {
    // Fallback: If index missing, fetch all and filter (less efficient but works for now)
    if (error.code === 'failed-precondition') {
      console.warn("Missing index for deleted reports query. Fetching all and filtering.");
      const snapshot = await getDocs(collection(db, PATIENTS_COLLECTION, patientId, 'reports'));
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(d => d.isDeleted === true)
        .map(data => {
          const resolvedText = data.extractedText || data.rawTextForAnalysis || '';
          const cType = data.contentType || 'pdf';
          return {
            id: data.id,
            type: data.type as Report['type'],
            date: data.date,
            title: data.title,
            content: cType === 'text'
              ? (resolvedText || '')
              : { type: cType, url: data.downloadUrl, ...(cType === 'pdf' ? { rawText: resolvedText } : {}) } as any,
            rawTextForAnalysis: resolvedText || null,
            aiSummary: data.aiSummary,
            keyFindings: data.keyFindings,
            isDeleted: true,
            deletedAt: data.deletedAt
          } as Report;
        });
    }
    console.error("Error fetching deleted reports:", error);
    return [];
  }
};


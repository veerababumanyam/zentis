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
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import type { Patient, Report, VitalsLog, MedicalHistoryItem, ClinicalTask } from '../types';
import type {
  MedicationDocument,
  LabResultDocument,
  VitalSignDocument,
  DiagnosisDocument,
  PatientDocument
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
 * This is the "Read Model" aggregator.
 */
export const getPatient = async (patientId: string): Promise<Patient | null> => {
  try {
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId);
    const patientSnap = await getDoc(patientRef);

    if (!patientSnap.exists()) {
      // Fallback: Check if it's a user claiming to be a patient (Legacy/Auth path)
      // This supports the hybrid model where a user login is a 'patient'
      const userRef = doc(db, USERS_COLLECTION, patientId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().role === 'patient') {
        // Return minimal profile from User
        const userData = userSnap.data();
        return {
          id: patientId,
          name: userData.displayName,
          age: 0, // Profile doesn't have age yet
          gender: 'Female', // Default/Placeholder
          weight: 0,
          allergies: [],
          medicalHistory: [],
          appointmentTime: '09:00',
          currentStatus: {
            condition: 'Wellness Check',
            vitals: '',
            medications: []
          },
          reports: []
        } as Patient;
      }
      return null;
    }

    const pData = patientSnap.data() as PatientDocument;

    // Parallel Fetch of Sub-collections
    const [medsSnap, labsSnap, vitalsSnap, diagnosesSnap, reportsSnap] = await Promise.all([
      getDocs(collection(patientRef, 'medications')),
      getDocs(query(collection(patientRef, 'labs'), orderBy('date', 'desc'), limit(50))),
      getDocs(query(collection(patientRef, 'vitals'), orderBy('date', 'desc'), limit(20))),
      getDocs(collection(patientRef, 'diagnoses')),
      getDocs(query(collection(patientRef, 'reports'), orderBy('date', 'desc'), limit(20)))
    ]);

    // Map Sub-collections to Domain Object
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

    const reports: Report[] = reportsSnap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        type: data.type as Report['type'],
        date: data.date,
        title: data.title,
        content: { type: 'pdf', url: data.downloadUrl, rawText: '' }, // Simplified for list view
        aiSummary: data.aiSummary,
        keyFindings: data.keyFindings
      } as Report;
    });

    // Construct Domain Object
    return {
      id: pData.id,
      name: pData.name,
      age: pData.age,
      gender: pData.gender as any,
      weight: 70, // TODO: store in profile or get from latest weight vital
      allergies: pData.allergies || [],
      medicalHistory: medicalHistory,
      appointmentTime: '10:00', // Placeholder or add to schema
      criticalAlerts: pData.criticalAlerts,
      currentStatus: {
        condition: pData.currentCondition || 'Follow-up',
        vitals: vitalsString,
        medications: medications
      },
      reports: reports,
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
  await setDoc(doc(db, PATIENTS_COLLECTION, patientId), {
    ...data,
    updatedAt: Date.now()
  }, { merge: true });
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
 */
export const addReportMetadata = async (patientId: string, report: Omit<Report, 'id'>) => {
  // Convert App 'Report' type to Firestore 'ReportDocument' schema
  const docData = {
    title: report.title,
    type: report.type,
    date: report.date || new Date().toISOString(),
    // Assuming content is an object with URL for now, need robust check
    extractionStatus: 'pending',
    aiSummary: report.aiSummary,
    keyFindings: report.keyFindings,
    storagePath: (report.content as any).url || '',
    downloadUrl: (report.content as any).url || '',
    createdAt: Date.now()
  };

  await addDoc(collection(db, PATIENTS_COLLECTION, patientId, 'reports'), docData);
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
    diagnoses: Omit<DiagnosisDocument, 'createdAt'>[]
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

  // 5. Update Report Status
  const reportRef = doc(db, PATIENTS_COLLECTION, patientId, 'reports', reportId);
  batch.update(reportRef, { extractionStatus: 'completed' });

  await batch.commit();
};

export const updatePatient = async (patient: Patient): Promise<void> => {
  // This ensures that simple updates (notes etc) persist even if we haven't fully migrated that specific field to a sub-collection yet.
  try {
    // We only update the top-level patient document for simplicity here.
    // Deep updates like medications should technically go to subcollections, 
    // but we support hybrid for now.
    await setDoc(doc(db, PATIENTS_COLLECTION, patient.id), patient, { merge: true });
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
    const patientRef = await addDoc(collection(db, PATIENTS_COLLECTION), {
      ...patientData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

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

export const exportAllData = async (): Promise<any> => {
  console.warn("exportAllData not implemented");
  return {};
};

export const importData = async (data: any): Promise<void> => {
  console.warn("importData not implemented");
};

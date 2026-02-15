
import type { Patient, Report } from '../types';

// The initial data to seed the database with.
const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p001',
    name: 'Venkatesh Rao',
    age: 65,
    gender: 'Male',
    weight: 85,
    allergies: ['Penicillin'],
    medicalHistory: [
        { description: 'Hypertension', icd10: 'I10' },
        { description: 'Diabetes Type 2', icd10: 'E11.9' },
        { description: 'Coronary Artery Disease', icd10: 'I25.10' },
        { description: 's/p STEMI (2024)', icd10: 'I21.3' },
        { description: 'Smoking history (quit 10 years ago)' }
    ],
    criticalAlerts: ['Recent STEMI', 'On DAPT'],
    appointmentTime: '10:15',
    pendingLabs: ['Troponin I', 'Basic Metabolic Panel'], 
    currentStatus: {
      condition: 'Post-PCI Day 3',
      conditionIcd10: 'Z98.61',
      vitals: 'BP 130/85, HR 72, O2 Sat 98%',
      medications: ['Aspirin 81mg', 'Clopidrel 75mg', 'Atorvastatin 80mg', 'Metoprolol Succinate 50mg', 'Omeprazole 20mg'],
    },
    tasks: [
        { id: 't1', text: 'Review repeat Troponin', isCompleted: false, createdAt: '2024-07-24' },
        { id: 't2', text: 'Confirm DAPT duration', isCompleted: true, createdAt: '2024-07-23' }
    ],
    reports: [
      { id: 'r111', type: 'Lab', date: '2021-06-10', title: 'Annual Labs (3 years ago)', content: 'Creatinine: 0.9 mg/dL\neGFR: 80 mL/min/1.73m²\nBNP: 40 pg/mL\nPotassium: 4.1 mEq/L\nTotal Cholesterol: 220 mg/dL\nHDL: 38 mg/dL' },
      { id: 'r106', type: 'Lab', date: '2022-06-15', title: 'Annual Labs (2 years ago)', content: 'Creatinine: 1.0 mg/dL\neGFR: 75 mL/min/1.73m²\nBNP: 50 pg/mL\nPotassium: 4.2 mEq/L\nTotal Cholesterol: 210 mg/dL\nHDL: 40 mg/dL' },
      { id: 'r108', type: 'Lab', date: '2023-07-10', title: 'Annual Labs (last year)', content: 'Creatinine: 1.1 mg/dL\neGFR: 71 mL/min/1.73m²\nBNP: 80 pg/mL\nPotassium: 4.3 mEq/L\nTotal Cholesterol: 195 mg/dL\nHDL: 42 mg/dL' },
      { id: 'r101', type: 'Lab', date: '2024-07-20', title: 'Admission Labs (STEMI)', content: 'Troponin T: 3.5 ng/mL (Elevated)\nCreatinine: 1.1 mg/dL\neGFR: 70 mL/min/1.73m²\nBNP: 350 pg/mL\nPotassium: 4.0 mEq/L\nTotal Cholesterol: 190 mg/dL\nHDL: 40 mg/dL' },
      { id: 'r107', type: 'Lab', date: '2024-07-22', title: 'Post-PCI Labs', content: 'Troponin T: 1.2 ng/mL (Trending down)\nCreatinine: 1.2 mg/dL\neGFR: 65 mL/min/1.73m²\nBNP: 400 pg/mL\nPotassium: 3.8 mEq/L' },
      { id: 'r109', type: 'Lab', date: '2024-07-23', title: 'Discharge Labs', content: 'Troponin T: 0.8 ng/mL (Trending down)\nCreatinine: 1.1 mg/dL\neGFR: 68 mL/min/1.73m²\nBNP: 320 pg/mL (Improved)\nPotassium: 4.1 mEq/L' },
      { id: 'r102', type: 'ECG', date: '2024-07-20', title: 'Admission ECG', content: 'Rhythm: Sinus Rhythm\nHeart Rate: 88 bpm\nPR Interval: 170 ms\nQRS Duration: 94 ms\nQTc: 430 ms\nAxis: Normal\nInterpretation: ST-segment elevation in anterior leads (V1-V4), consistent with acute anterior STEMI.' },
      { id: 'r110', type: 'Echo', date: '2022-01-10', title: 'Echocardiogram (2.5 years ago)', content: 'LVEF: 55%. Normal wall motion. Valvular: Trivial Mitral Regurgitation.' },
      { id: 'r105', type: 'Echo', date: '2023-01-15', title: 'Echocardiogram (1.5 years ago)', content: 'LVEF: 55%. Normal wall motion. Valvular: Trivial Mitral Regurgitation.' },
      { id: 'r103', type: 'Echo', date: '2024-07-21', title: 'Echocardiogram (Post-STEMI)', content: 'LVEF: 45%. Wall Motion: Akinesis of the anterior wall. Valvular: Mild Mitral Regurgitation.' },
      { id: 'r104', type: 'Meds', date: '2024-07-21', title: 'Discharge Meds', content: 'Patient discharged on Aspirin 81mg daily, Clopidogrel 75mg daily (for 12 months), Atorvastatin 80mg nightly, Metoprolol Succinate 50mg daily.' },
    ],
  },
  {
    id: 'p002',
    name: 'Lakshmi Devi',
    age: 81,
    gender: 'Female',
    weight: 58,
    allergies: ['None'],
    medicalHistory: [
        { description: 'Heart Failure (HFrEF)', icd10: 'I50.22' },
        { description: 'Atrial Fibrillation', icd10: 'I48.91' },
        { description: 'CKD Stage 3', icd10: 'N18.3' },
        { description: 'Prior Bleeding Event (GI)' }
    ],
    criticalAlerts: ['Atrial Fibrillation', 'High Bleeding Risk'],
    appointmentTime: '10:30',
    currentStatus: {
      condition: 'Stable, NYHA Class II',
      vitals: 'BP 110/70, HR 65 (rate controlled), O2 Sat 97%',
      medications: ['Sacubitril/Valsartan 49/51mg BID', 'Carvedilol 12.5mg BID', 'Spironolactone 25mg', 'Apixaban 5mg BID', 'Dapagliflozin 10mg'],
    },
    tasks: [
        { id: 't3', text: 'Check renal function (eGFR trend)', isCompleted: false, createdAt: '2024-07-24' }
    ],
    reports: [
      { id: 'r210', type: 'Lab', date: '2021-10-05', title: 'Renal Panel & BNP (3 years ago)', content: 'Creatinine: 1.2 mg/dL\neGFR: 52 mL/min/1.73m²\nBNP: 280 pg/mL\nPotassium: 4.2 mEq/L' },
      { id: 'r203', type: 'Lab', date: '2022-10-10', title: 'Renal Panel & BNP (2 years ago)', content: 'Creatinine: 1.3 mg/dL\neGFR: 48 mL/min/1.73m²\nBNP: 350 pg/mL\nPotassium: 4.4 mEq/L' },
      { id: 'r207', type: 'Lab', date: '2023-04-12', title: 'Renal Panel & BNP (15mo ago)', content: 'Creatinine: 1.4 mg/dL\neGFR: 45 mL/min/1.73m²\nBNP: 420 pg/mL\nPotassium: 4.6 mEq/L' },
      { id: 'r204', type: 'Lab', date: '2023-11-22', title: 'Renal Panel & BNP (8mo ago)', content: 'Creatinine: 1.5 mg/dL\neGFR: 41 mL/min/1.73m²\nBNP: 620 pg/mL\nPotassium: 4.8 mEq/L' },
      { id: 'r201', type: 'Lab', date: '2024-07-15', title: 'Renal Panel & BNP (Current)', content: 'Creatinine: 1.6 mg/dL\neGFR: 28 mL/min/1.73m²\nBNP: 850 pg/mL\nPotassium: 5.4 mEq/L' },
      { id: 'r209', type: 'Echo', date: '2021-10-01', title: 'Echo (3 years ago)', content: 'LVEF: 40%. Wall Motion: Global hypokinesis.' },
      { id: 'r205', type: 'Echo', date: '2022-04-01', title: 'Echo (Initial Diagnosis)', content: 'LVEF: 35%. Wall Motion: Global hypokinesis. Valvular: Moderate functional mitral regurgitation.' },
      { id: 'r206', type: 'Echo', date: '2024-04-15', title: 'Echo (3 months ago)', content: 'LVEF: 40%. Wall Motion: Global hypokinesis, improved from prior on GDMT. Valvular: Mild-moderate functional mitral regurgitation.' },
      { id: 'r208', type: 'Imaging', date: '2024-04-15', title: 'Chest X-Ray', content: { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Cardiomegaly_on_chest_X-ray_in_a_patient_with_dilated_cardiomyopathy.jpg/1024px-Cardiomegaly_on_chest_X-ray_in_a_patient_with_dilated_cardiomyopathy.jpg' } },
      { id: 'r202', type: 'ECG', date: '2024-07-01', title: 'Routine ECG', content: 'Rhythm: Atrial Fibrillation\nHeart Rate: 68 bpm (ventricular rate)\nPR Interval: N/A\nQRS Duration: 88 ms\nQTc: 440 ms\nAxis: Left Axis Deviation\nInterpretation: Atrial fibrillation with a controlled ventricular response. No acute ischemic changes.' },
    ],
    vitalsLog: [
        { date: '2023-11-22', vitals: 'BP 115/75, HR 70, O2 Sat 97%' },
        { date: '2024-02-20', vitals: 'BP 112/72, HR 68, O2 Sat 98%' },
        { date: '2024-05-18', vitals: 'BP 110/70, HR 65, O2 Sat 97%' },
        { date: '2024-07-15', vitals: 'BP 110/70, HR 65, O2 Sat 97%' },
    ],
  },
  {
    id: 'p003',
    name: 'Robert Chen',
    age: 74,
    gender: 'Male',
    weight: 78,
    allergies: ['Latex'],
    medicalHistory: [
        { description: 'Severe Aortic Stenosis', icd10: 'I35.0' },
        { description: 'Coronary Artery Disease', icd10: 'I25.10' },
        { description: 'Hyperlipidemia', icd10: 'E78.5' }
    ],
    criticalAlerts: ['Severe AS', 'Syncope Evaluation'],
    appointmentTime: '11:00',
    currentStatus: {
      condition: 'Symptomatic AS, TAVR Eval',
      vitals: 'BP 115/75, HR 72, O2 Sat 96%',
      medications: ['Aspirin 81mg', 'Atorvastatin 40mg', 'Metoprolol 25mg'],
    },
    reports: [
        { id: 'r301', type: 'Echo', date: '2024-07-20', title: 'TTE (Severe AS)', content: 'LVEF: 60%. Aortic Valve: Heavily calcified trileaflet valve. Peak Velocity: 4.5 m/s. Mean Gradient: 48 mmHg. AVA: 0.7 cm². DI: 0.18. Severe Aortic Stenosis.' },
        { id: 'r302', type: 'Cath', date: '2024-07-22', title: 'Coronary Angiogram', content: 'LM: Patent. LAD: 30% proximal stenosis. LCx: Patent. RCA: 80% mid-vessel stenosis. Plan: PCI to RCA prior to TAVR.' },
        { id: 'r303', type: 'ECG', date: '2024-07-20', title: '12-Lead ECG', content: 'Rhythm: Sinus Rhythm. Rate: 70 bpm. LVH with strain pattern. No acute ischemia.' }
    ]
  },
  {
    id: 'p004',
    name: 'Sarah Miller',
    age: 32,
    gender: 'Female',
    weight: 60,
    allergies: ['Sulfa'],
    medicalHistory: [
        { description: 'Palpitations', icd10: 'R00.2' },
        { description: 'Anxiety', icd10: 'F41.1' }
    ],
    appointmentTime: '11:30',
    currentStatus: {
      condition: 'Follow-up Palpitations',
      vitals: 'BP 118/76, HR 80, O2 Sat 99%',
      medications: ['None'],
    },
    reports: [
        { id: 'r401', type: 'ECG', date: '2024-06-15', title: 'ECG - Palpitations', content: 'Sinus Tachycardia at 110 bpm. Normal axis. Normal intervals. No ST/T changes.' },
        { id: 'r402', type: 'Echo', date: '2024-06-20', title: 'TTE - Normal', content: 'LVEF: 65%. Normal LV size and function. No valvular abnormalities. Normal RV function.' },
        { id: 'r403', type: 'ECG', date: '2024-07-10', title: 'Holter Monitor (48hr)', content: 'Duration: 47 hours. Avg HR: 78 bpm. Min HR: 55 bpm. Max HR: 145 bpm (sinus). PVC Burden: <1% (isolated). PAC Burden: <1%. One 4-beat run of SVT at 160 bpm. Symptom correlation: Diaries noted "skipping" corresponding to PVCs.' }
    ]
  },
  {
    id: 'p005',
    name: 'Albert Johnson',
    age: 55,
    gender: 'Male',
    weight: 102,
    allergies: ['Lisinopril (Cough)'],
    medicalHistory: [
        { description: 'Resistant Hypertension', icd10: 'I10' },
        { description: 'Obesity', icd10: 'E66.9' },
        { description: 'OSA (On CPAP)', icd10: 'G47.33' }
    ],
    criticalAlerts: ['Uncontrolled BP'],
    appointmentTime: '13:00',
    currentStatus: {
      condition: 'BP Management',
      vitals: 'BP 155/95, HR 78, O2 Sat 97%',
      medications: ['Amlodipine 10mg', 'Valsartan 320mg', 'Chlorthalidone 25mg'],
    },
    reports: [
        { id: 'r501', type: 'Lab', date: '2024-07-15', title: 'Chemistry Panel', content: 'Sodium: 138 mEq/L. Potassium: 3.6 mEq/L (Low end). Creatinine: 1.0 mg/dL. eGFR: >60. Glucose: 105 mg/dL.' },
        { id: 'r502', type: 'PDF', date: '2024-07-20', title: 'Home BP Log', content: { type: 'pdf', url: '', rawText: 'Average AM BP: 148/92. Average PM BP: 152/94. Highest: 165/100. Lowest: 135/85.' } },
        { id: 'r503', type: 'Lab', date: '2024-07-15', title: 'Aldosterone/Renin', content: 'Plasma Aldosterone: 15 ng/dL. Plasma Renin Activity: 0.5 ng/mL/hr. ARR: 30 (Suggestive of Primary Aldosteronism).' }
    ]
  },
  {
    id: 'p006',
    name: 'Emily Wong',
    age: 45,
    gender: 'Female',
    weight: 65,
    allergies: ['None'],
    medicalHistory: [
        { description: 'Dyspnea on Exertion' },
        { description: 'Family Hx of CAD' }
    ],
    appointmentTime: '14:30',
    currentStatus: {
      condition: 'New Patient Consult',
      vitals: 'BP 125/80, HR 68, O2 Sat 98%',
      medications: ['Multivitamin'],
    },
    reports: [
        { id: 'r601', type: 'CTA', date: '2024-07-21', title: 'Coronary CTA', content: 'Calcium Score: 0. LAD: Normal. LCx: Normal. RCA: Normal. No plaque or stenosis identified. CAD-RADS 0.' },
        { id: 'r602', type: 'Echo', date: '2024-07-22', title: 'Stress Echo', content: 'Resting LVEF: 60%. Exercise duration: 9 mins (Bruce Protocol). Max HR: 165 bpm (94% predicted). No wall motion abnormalities at peak stress. Negative for ischemia.' }
    ]
  },
  {
    id: 'p007',
    name: 'Eleanor Vance',
    age: 68,
    gender: 'Female',
    weight: 72,
    allergies: ['Codeine'],
    medicalHistory: [
        { description: 'Type 2 Diabetes Mellitus', icd10: 'E11.9' },
        { description: 'COPD (Gold Stage 2)', icd10: 'J44.9' },
        { description: 'CKD Stage 3b', icd10: 'N18.3' },
        { description: 'Migraine with Aura', icd10: 'G43.109' },
        { description: 'Psoriasis', icd10: 'L40.0' },
        { description: 'Incidental Lung Nodule' }
    ],
    criticalAlerts: ['CKD Progression', 'Lung Nodule Surveillance'],
    appointmentTime: '15:15',
    currentStatus: {
      condition: 'Multi-system Follow-up',
      vitals: 'BP 135/82, HR 78, O2 Sat 94% (Room Air), BMI 28',
      medications: ['Metformin 1000mg BID', 'Tiotropium Inhaler', 'Lisinopril 10mg', 'Adalimumab (Humira)', 'Sumatriptan PRN'],
    },
    reports: [
        { id: 'r701', type: 'Lab', date: '2024-07-20', title: 'Metabolic & A1c', content: 'HbA1c: 8.2% (Target <7%). Glucose: 185 mg/dL. Creatinine: 1.8 mg/dL (Baseline 1.5). eGFR: 32 mL/min/1.73m² (Decline). Potassium: 4.8 mEq/L.' },
        { id: 'r702', type: 'Lab', date: '2024-07-15', title: 'PFT Report', content: 'Spirometry: FEV1 62% predicted. FEV1/FVC 0.65. Conclusion: Moderate obstructive ventilatory defect. No significant bronchodilator response.' },
        { id: 'r703', type: 'Imaging', date: '2024-06-10', title: 'Chest CT (Lung Nodule)', content: 'Findings: 6mm non-calcified nodule in RUL. Stable compared to 2023. No lymphadenopathy. Mild emphysematous changes. Recommendation: Follow-up CT in 12 months (Fleischner criteria).' },
        { id: 'r704', type: 'Imaging', date: '2024-05-01', title: 'MRI Brain (Migraine Protocol)', content: 'Technique: T1, T2, FLAIR sequences. Findings: No acute infarction or hemorrhage. Scattered non-specific T2/FLAIR hyperintensities in subcortical white matter, likely chronic microvascular changes. No mass effect or midline shift. Ventricles normal size.' },
        { id: 'r705', type: 'PDF', date: '2024-04-20', title: 'Dermatology Clinic Note', content: { type: 'pdf', url: '', rawText: 'Assessment: Psoriasis Vulgaris. Plaques on elbows and knees. PASI score 8. Plan: Continue Adalimumab. Monitor for infection signs.' } },
        { id: 'r706', type: 'PDF', date: '2024-03-15', title: 'Gastroenterology Consult', content: { type: 'pdf', url: '', rawText: 'Reason: Chronic abdominal pain. Colonoscopy (2023): Diverticulosis, no polyps. Impression: Likely IBS-C. Plan: Fiber supplement, trial of Linaclotide.' } }
    ]
  }
];

const DB_NAME = 'CardioSnapDB';
const DB_VERSION = 2; // Incremented version to force re-seed
const STORE_NAME = 'patients';

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database error:", request.error);
      reject("Database error: " + request.error);
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction;
      
      let objectStore: IDBObjectStore;

      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        objectStore = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        objectStore = transaction!.objectStore(STORE_NAME);
      }
      
      // Clear existing data to re-seed with updated INITIAL_PATIENTS
      objectStore.clear(); 
      
      INITIAL_PATIENTS.forEach(patient => {
        objectStore.add(patient);
      });
      console.log("Database re-seeded with initial patient data (Version 2).");
    };
  });
};

export const fetchPatients = async (): Promise<Patient[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => {
            console.error('Error fetching patients:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };
    });
};

export const updatePatient = async (patient: Patient): Promise<Patient> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(patient);

        request.onerror = () => {
            console.error('Error updating patient:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(patient);
        };
    });
};

export const exportAllData = async (): Promise<string> => {
    const patients = await fetchPatients();
    return JSON.stringify(patients, null, 2);
};

export const importData = async (jsonString: string): Promise<Patient[]> => {
    try {
        const patients = JSON.parse(jsonString);
        if (!Array.isArray(patients)) throw new Error("Invalid format: Expected an array of patients.");
        
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        // Clear existing data to prevent duplicates/conflicts during full restore
        await new Promise<void>((resolve, reject) => {
             const clearReq = store.clear();
             clearReq.onsuccess = () => resolve();
             clearReq.onerror = () => reject(clearReq.error);
        });
        
        // Add new data
        for (const p of patients) {
            store.add(p);
        }
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(patients);
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Import failed:", e);
        throw e;
    }
};

export const getMostRelevantReports = (patient: Patient, count: number = 7): Report[] => {
    if (!patient || !patient.reports) return [];

    const today = new Date('2024-07-23T10:20:00Z'); 

    const calculateScore = (report: Report): number => {
        let score = 0;
        const reportDate = new Date(report.date);
        const diffDays = Math.ceil(Math.abs(today.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) score += 100;
        else if (diffDays <= 30) score += 50;
        else if (diffDays <= 180) score += 10;
        
        score -= diffDays / 365;

        const title = report.title.toLowerCase();
        const acuityKeywords: { [key: string]: number } = {
            'stemi': 50, 'admission': 40, 'holter': 35, 'stress test': 35,
            'post-pci': 30, 'interrogation': 30, 'critical': 25, 'angiogram': 30,
        };
        for (const keyword in acuityKeywords) {
            if (title.includes(keyword)) {
                score += acuityKeywords[keyword];
                break;
            }
        }

        const combinedContext = [
            ...((patient.medicalHistory || []).map(h => h.description)),
            ...(patient.criticalAlerts || [])
        ].join(' ').toLowerCase();

        const contextKeywords: { [key: string]: Array<Report['type']> } = {
            'stemi': ['ECG', 'Lab'], 'arrhythmia': ['ECG'], 'atrial fibrillation': ['ECG'],
            'aortic stenosis': ['Echo'], 'heart failure': ['Echo', 'Lab'], 'hfref': ['Echo', 'Lab'],
            'uncontrolled htn': ['ECG', 'Lab'], 'transplant': ['Lab'], 'immunosuppressed': ['Lab'],
            'mitral': ['Echo'], 'cad': ['CTA', 'Cath']
        };
        for (const keyword in contextKeywords) {
            if (combinedContext.includes(keyword) && contextKeywords[keyword].includes(report.type)) {
                score += 40;
            }
        }
        
        return score;
    };

    return [...patient.reports]
        .map(report => ({ report, score: calculateScore(report) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map(item => item.report);
};

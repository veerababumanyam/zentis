/**
 * Clinical Data Aggregator
 * 
 * Transforms raw extracted data (accumulated from all uploaded documents)
 * into a deduplicated, prioritized clinical snapshot.
 * 
 * Design principles:
 * - Zero hallucination: only displays data directly extracted from uploaded documents
 * - Document-agnostic: works with any specialty (cardio, neuro, ortho, etc.)
 * - Deduplicates by name/key, keeps the most recent entry
 * - Prioritizes active items over historical ones
 */

import type {
    MedicationDocument,
    DiagnosisDocument,
    VitalSignDocument,
    LabResultDocument
} from '../services/databaseSchema';
import type { ExtractedPatientData } from '../services/documentExtractionPipeline';

// --- PUBLIC TYPES ---

export interface VitalGroup {
    type: VitalSignDocument['type'];
    label: string;
    value: number;
    value2?: number;
    unit: string;
    date: string;
}

export interface LabGroup {
    testName: string;
    value: number;
    unit: string;
    referenceRange?: string;
    isAbnormal?: boolean;
    date: string;
    category?: string;
}

export interface ClinicalSnapshotData {
    /** Deduplicated medications, active first, alphabetical */
    medications: MedicationDocument[];
    /** Deduplicated conditions, active first, most recent */
    conditions: DiagnosisDocument[];
    /** Most recent reading per vital type */
    vitalGroups: VitalGroup[];
    /** Most recent result per lab test */
    labGroups: LabGroup[];
    /** High-level summary strings for the header card */
    summarySegments: string[];
    /** Whether any extracted data exists at all */
    hasData: boolean;
    /** Total number of unique data points across all categories */
    totalDataPoints: number;
}

// --- HELPERS ---

/**
 * Extract a comparable timestamp from any document.
 * Checks domain-specific date fields first, falls back to createdAt.
 */
const getTimestamp = (doc: { startDate?: string; onsetDate?: string; date?: string; createdAt?: number }): number => {
    const dateStr = doc.startDate ?? doc.onsetDate ?? doc.date;
    if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.getTime();
    }
    return doc.createdAt ?? 0;
};

/** Normalize a string key for dedup (trim + lowercase). */
const normalizeKey = (s: string): string => s.toLowerCase().trim();

/** Format a date string for display. */
const formatDateShort = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Label map for vital types */
const VITAL_LABELS: Record<VitalSignDocument['type'], string> = {
    'BP': 'Blood Pressure',
    'HR': 'Heart Rate',
    'Respiratory Rate': 'Resp. Rate',
    'Temp': 'Temperature',
    'O2 Sat': 'SpO₂',
    'Weight': 'Weight',
    'Height': 'Height',
    'BMI': 'BMI',
};

// --- MAIN AGGREGATION ---

export const aggregateClinicalData = (data: ExtractedPatientData | null): ClinicalSnapshotData => {
    const empty: ClinicalSnapshotData = {
        medications: [],
        conditions: [],
        vitalGroups: [],
        labGroups: [],
        summarySegments: [],
        hasData: false,
        totalDataPoints: 0,
    };

    if (!data) return empty;

    // --- 1. MEDICATIONS: group by name, pick latest, prefer active ---
    const medMap = new Map<string, MedicationDocument[]>();
    for (const med of data.medications) {
        const key = normalizeKey(med.name);
        const list = medMap.get(key) ?? [];
        list.push(med);
        medMap.set(key, list);
    }

    const medications: MedicationDocument[] = [];
    for (const entries of medMap.values()) {
        const active = entries.filter(m => m.status === 'active');
        const candidates = active.length > 0 ? active : entries;
        candidates.sort((a, b) => getTimestamp(b) - getTimestamp(a));
        medications.push(candidates[0]);
    }
    // Active first, then alphabetical
    medications.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return a.name.localeCompare(b.name);
    });

    // --- 2. CONDITIONS: group by icd10 or name, pick latest, prefer active ---
    const dxMap = new Map<string, DiagnosisDocument[]>();
    for (const dx of data.diagnoses) {
        const key = dx.icd10 ? normalizeKey(dx.icd10) : normalizeKey(dx.name);
        const list = dxMap.get(key) ?? [];
        list.push(dx);
        dxMap.set(key, list);
    }

    const conditions: DiagnosisDocument[] = [];
    for (const entries of dxMap.values()) {
        entries.sort((a, b) => getTimestamp(b) - getTimestamp(a));
        conditions.push(entries[0]);
    }
    conditions.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return getTimestamp(b) - getTimestamp(a);
    });

    // --- 3. VITALS: group by type, pick latest per type ---
    const vitalMap = new Map<string, VitalSignDocument[]>();
    for (const v of data.vitals) {
        const key = v.type;
        const list = vitalMap.get(key) ?? [];
        list.push(v);
        vitalMap.set(key, list);
    }

    const vitalGroups: VitalGroup[] = [];
    for (const [type, entries] of vitalMap) {
        entries.sort((a, b) => getTimestamp(b) - getTimestamp(a));
        const latest = entries[0];
        vitalGroups.push({
            type: latest.type,
            label: VITAL_LABELS[latest.type] ?? latest.type,
            value: latest.value,
            value2: latest.value2,
            unit: latest.unit,
            date: latest.date,
        });
    }
    // Sort: BP first, then HR, then the rest alphabetically
    const vitalOrder = ['BP', 'HR', 'O2 Sat', 'Temp', 'Respiratory Rate', 'Weight', 'Height', 'BMI'];
    vitalGroups.sort((a, b) => {
        const ai = vitalOrder.indexOf(a.type);
        const bi = vitalOrder.indexOf(b.type);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    // --- 4. LABS: group by test name, pick latest per test ---
    const labMap = new Map<string, LabResultDocument[]>();
    for (const lab of data.labs) {
        const key = normalizeKey(lab.testName);
        const list = labMap.get(key) ?? [];
        list.push(lab);
        labMap.set(key, list);
    }

    const labGroups: LabGroup[] = [];
    for (const entries of labMap.values()) {
        entries.sort((a, b) => getTimestamp(b) - getTimestamp(a));
        const latest = entries[0];
        labGroups.push({
            testName: latest.testName,
            value: latest.value,
            unit: latest.unit,
            referenceRange: latest.referenceRange,
            isAbnormal: latest.isAbnormal,
            date: latest.date,
            category: latest.category,
        });
    }
    // Abnormal first, then by date newest, then alphabetical
    labGroups.sort((a, b) => {
        if (a.isAbnormal && !b.isAbnormal) return -1;
        if (!a.isAbnormal && b.isAbnormal) return 1;
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.testName.localeCompare(b.testName);
    });

    // --- 5. SUMMARY ---
    const summarySegments: string[] = [];

    const activeMedCount = medications.filter(m => m.status === 'active').length;
    if (medications.length > 0) {
        summarySegments.push(
            activeMedCount > 0
                ? `${activeMedCount} Active Med${activeMedCount !== 1 ? 's' : ''}`
                : `${medications.length} Medication${medications.length !== 1 ? 's' : ''}`
        );
    }

    const activeCondCount = conditions.filter(c => c.status === 'active').length;
    if (conditions.length > 0) {
        summarySegments.push(
            activeCondCount > 0
                ? `${activeCondCount} Active Condition${activeCondCount !== 1 ? 's' : ''}`
                : `${conditions.length} Condition${conditions.length !== 1 ? 's' : ''}`
        );
    }

    if (vitalGroups.length > 0) {
        const latestDate = vitalGroups.reduce((best, v) => {
            const t = new Date(v.date).getTime();
            return t > best ? t : best;
        }, 0);
        if (latestDate > 0) {
            summarySegments.push(`Vitals from ${formatDateShort(new Date(latestDate).toISOString())}`);
        }
    }

    if (labGroups.length > 0) {
        const abnormalCount = labGroups.filter(l => l.isAbnormal).length;
        const labSummary = `${labGroups.length} Lab${labGroups.length !== 1 ? 's' : ''}`;
        summarySegments.push(
            abnormalCount > 0
                ? `${labSummary} (${abnormalCount} abnormal)`
                : labSummary
        );
    }

    const totalDataPoints = medications.length + conditions.length + vitalGroups.length + labGroups.length;
    const hasData = totalDataPoints > 0;

    return {
        medications,
        conditions,
        vitalGroups,
        labGroups,
        summarySegments,
        hasData,
        totalDataPoints,
    };
};


import type { SpecialistReport } from '../types';
import type { Patient } from '../types';

const CACHE_PREFIX = 'board_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 50; // Maximum number of cached opinions

export interface CachedSpecialistOpinion {
    specialty: string;
    patientHash: string;
    opinion: SpecialistReport;
    timestamp: number;
    expiresAt: number;
}

/**
 * Generate a simple hash of patient data for cache key
 * Uses key fields that would affect specialist opinions
 */
function generatePatientHash(patient: Patient): string {
    const keyData = {
        age: patient.age,
        gender: patient.gender,
        condition: patient.currentStatus.condition,
        meds: patient.currentStatus.medications.slice(0, 5).sort().join(','),
        historyCount: patient.medicalHistory.length,
        reportsCount: patient.reports.length
    };

    // Simple string hash
    const str = JSON.stringify(keyData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Get cache key for a specialist opinion
 */
function getCacheKey(specialty: string, patientHash: string): string {
    return `${CACHE_PREFIX}${specialty}_${patientHash}`;
}

/**
 * Get all cache keys
 */
function getAllCacheKeys(): string[] {
    try {
        const allKeys = Object.keys(localStorage);
        return allKeys.filter(k => k.startsWith(CACHE_PREFIX));
    } catch (error) {
        console.error('[BoardCacheService] Failed to get cache keys:', error);
        return [];
    }
}

/**
 * Clean expired entries and enforce size limit
 */
export function cleanCache(): void {
    try {
        const now = Date.now();
        const keys = getAllCacheKeys();
        const entries: Array<{ key: string; timestamp: number }> = [];

        // Collect all entries with their timestamps
        for (const key of keys) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed: CachedSpecialistOpinion = JSON.parse(data);
                    if (parsed.expiresAt < now) {
                        // Expired - remove
                        localStorage.removeItem(key);
                    } else {
                        entries.push({ key, timestamp: parsed.timestamp });
                    }
                }
            } catch {
                // Invalid entry - remove
                localStorage.removeItem(key);
            }
        }

        // If over limit, remove oldest entries
        if (entries.length > MAX_CACHE_SIZE) {
            entries.sort((a, b) => a.timestamp - b.timestamp);
            const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
            for (const entry of toRemove) {
                localStorage.removeItem(entry.key);
            }
        }
    } catch (error) {
        console.error('[BoardCacheService] Failed to clean cache:', error);
    }
}

/**
 * Get a cached specialist opinion
 * @returns Cached opinion if found and valid, null otherwise
 */
export function getCachedOpinion(patient: Patient, specialty: string): SpecialistReport | null {
    try {
        const patientHash = generatePatientHash(patient);
        const key = getCacheKey(specialty, patientHash);
        const data = localStorage.getItem(key);

        if (!data) return null;

        const cached: CachedSpecialistOpinion = JSON.parse(data);
        const now = Date.now();

        // Check if expired
        if (cached.expiresAt < now) {
            localStorage.removeItem(key);
            return null;
        }

        // Verify the hash matches (patient data hasn't changed)
        if (cached.patientHash !== patientHash) {
            localStorage.removeItem(key);
            return null;
        }

        console.log(`[BoardCacheService] Cache hit: ${specialty}`);
        return cached.opinion;
    } catch (error) {
        console.error('[BoardCacheService] Failed to get cached opinion:', error);
        return null;
    }
}

/**
 * Cache a specialist opinion
 */
export function setCachedOpinion(patient: Patient, specialty: string, opinion: SpecialistReport): void {
    try {
        cleanCache(); // Clean before adding new entry

        const patientHash = generatePatientHash(patient);
        const key = getCacheKey(specialty, patientHash);
        const now = Date.now();

        const cached: CachedSpecialistOpinion = {
            specialty,
            patientHash,
            opinion,
            timestamp: now,
            expiresAt: now + CACHE_TTL_MS
        };

        localStorage.setItem(key, JSON.stringify(cached));
        console.log(`[BoardCacheService] Cached: ${specialty}`);
    } catch (error) {
        console.error('[BoardCacheService] Failed to cache opinion:', error);
    }
}

/**
 * Get multiple cached opinions at once
 * @returns Map of specialty to opinion
 */
export function getCachedOpinions(patient: Patient, specialties: string[]): Map<string, SpecialistReport> {
    const results = new Map<string, SpecialistReport>();

    for (const specialty of specialties) {
        const opinion = getCachedOpinion(patient, specialty);
        if (opinion) {
            results.set(specialty, opinion);
        }
    }

    return results;
}

/**
 * Clear all cached board opinions
 */
export function clearBoardCache(): void {
    try {
        const keys = getAllCacheKeys();
        for (const key of keys) {
            localStorage.removeItem(key);
        }
        console.log(`[BoardCacheService] Cleared ${keys.length} cached opinions`);
    } catch (error) {
        console.error('[BoardCacheService] Failed to clear cache:', error);
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { totalEntries: number; validEntries: number } {
    const keys = getAllCacheKeys();
    const now = Date.now();
    let validEntries = 0;

    for (const key of keys) {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const parsed: CachedSpecialistOpinion = JSON.parse(data);
                if (parsed.expiresAt >= now) {
                    validEntries++;
                }
            }
        } catch {
            // Invalid entry
        }
    }

    return {
        totalEntries: keys.length,
        validEntries
    };
}

/**
 * Invalidate cache for a specific patient (called when patient data changes)
 */
export function invalidatePatientCache(patient: Patient): void {
    try {
        const oldHash = generatePatientHash(patient);
        const keys = getAllCacheKeys();

        for (const key of keys) {
            if (key.includes(`_${oldHash}`)) {
                localStorage.removeItem(key);
            }
        }
    } catch (error) {
        console.error('[BoardCacheService] Failed to invalidate cache:', error);
    }
}

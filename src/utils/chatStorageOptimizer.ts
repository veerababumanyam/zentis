/**
 * chatStorageOptimizer.ts
 * Utilities for optimizing chat messages before persisting to localStorage.
 * - Strips heavy base64 data from image/multi_file messages
 * - Generates lightweight thumbnails for inline preview
 * - Estimates serialized size to prevent quota exceeded errors
 */

import type { Message, UploadableFile } from '../types';

/** Maximum width/height for generated thumbnails. */
const THUMBNAIL_MAX_SIZE = 80;
/** JPEG quality for thumbnails (0-1). */
const THUMBNAIL_QUALITY = 0.5;
/** Estimated localStorage budget in bytes (leave headroom from the ~5MB limit). */
const LOCALSTORAGE_BUDGET_BYTES = 3.5 * 1024 * 1024; // 3.5MB

/**
 * Generates a tiny thumbnail base64 string from a full base64 image.
 * Uses a canvas to resize the image down to a small preview (~2-5KB).
 * Returns empty string if generation fails (e.g., in non-browser context).
 */
export const generateThumbnail = (base64Data: string, mimeType: string): Promise<string> => {
    return new Promise((resolve) => {
        try {
            if (!base64Data || typeof document === 'undefined') {
                resolve('');
                return;
            }
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const scale = Math.min(THUMBNAIL_MAX_SIZE / img.width, THUMBNAIL_MAX_SIZE / img.height, 1);
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { resolve(''); return; }
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY);
                    // Return only the base64 portion (no data: prefix)
                    resolve(dataUrl.split(',')[1] || '');
                } catch {
                    resolve('');
                }
            };
            img.onerror = () => resolve('');
            img.src = `data:${mimeType};base64,${base64Data}`;
        } catch {
            resolve('');
        }
    });
};

/**
 * Strips heavy base64 data from a single UploadableFile, keeping storageUrl and thumbnail.
 */
const stripFileBase64 = (file: UploadableFile): UploadableFile => ({
    ...file,
    base64Data: '', // Remove the heavy payload
    previewUrl: file.storageUrl || (file.thumbnailBase64 ? `data:image/jpeg;base64,${file.thumbnailBase64}` : ''),
});

/**
 * Strips base64 data from messages before persisting to storage.
 * Preserves storageUrl and thumbnailBase64 fields for rendering.
 * Returns a new array — does not mutate the original.
 */
export const stripBase64ForStorage = (messages: Message[]): Message[] => {
    return messages.map(msg => {
        if (msg.type === 'image' && (msg as any).base64Data) {
            return {
                ...msg,
                base64Data: '',
                // Keep storageUrl and thumbnailBase64 if present
            };
        }
        if (msg.type === 'multi_file' && (msg as any).files) {
            return {
                ...msg,
                files: ((msg as any).files as UploadableFile[]).map(stripFileBase64),
            };
        }
        return msg;
    });
};

/**
 * Strips base64 from all patient chat histories.
 */
export const stripBase64FromHistories = (histories: Record<string, Message[]>): Record<string, Message[]> => {
    const result: Record<string, Message[]> = {};
    for (const [patientId, messages] of Object.entries(histories)) {
        result[patientId] = stripBase64ForStorage(messages);
    }
    return result;
};

/**
 * Estimates the byte size of a value when JSON-serialized.
 * Uses a fast heuristic (multiply string length by 2 for UTF-16 overhead in localStorage).
 */
export const estimateStorageSize = (value: any): number => {
    try {
        const json = JSON.stringify(value);
        return json.length * 2; // localStorage uses UTF-16
    } catch {
        return Infinity; // If we can't serialize, assume it's too big
    }
};

/**
 * Checks whether a value would fit in the localStorage budget.
 */
export const wouldFitInStorage = (value: any): boolean => {
    return estimateStorageSize(value) < LOCALSTORAGE_BUDGET_BYTES;
};

/**
 * Aggressively prunes chat histories to fit within storage budget:
 * 1. Strip all base64 data
 * 2. Limit each patient to the most recent N messages
 * 3. If still too large, reduce per-patient message count further
 */
export const pruneToFit = (histories: Record<string, Message[]>, maxPerPatient = 50): Record<string, Message[]> => {
    let pruned = stripBase64FromHistories(histories);

    // Limit per-patient
    for (const [pid, msgs] of Object.entries(pruned)) {
        if (msgs.length > maxPerPatient) {
            pruned[pid] = msgs.slice(-maxPerPatient);
        }
    }

    // If still too large, reduce aggressively
    if (!wouldFitInStorage(pruned)) {
        const reducedMax = Math.max(10, Math.floor(maxPerPatient / 2));
        for (const [pid, msgs] of Object.entries(pruned)) {
            if (msgs.length > reducedMax) {
                pruned[pid] = msgs.slice(-reducedMax);
            }
        }
    }

    return pruned;
};

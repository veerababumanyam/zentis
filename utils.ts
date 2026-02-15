
import { Patient, MedicationEvent, UploadableFile } from './types';

/**
 * Determines a simplified report type category from a file's name and MIME type.
 * This is used for displaying an appropriate icon for uploaded files before they become full reports.
 */
export const getFileTypeFromFile = (file: { name: string; mimeType: string }): 'DICOM' | 'PDF' | 'Imaging' | 'Lab' => {
    const name = file.name.toLowerCase();
    const type = file.mimeType;

    if (name.endsWith('.dcm') || type === 'application/dicom') return 'DICOM';
    if (type === 'application/pdf') return 'PDF';
    if (type.startsWith('image/')) return 'Imaging';
    return 'Lab'; // Default for text files or other unrecognized types
};

/**
 * Extracts medication events and significant interventions from patient reports.
 * Uses heuristics based on report types (Meds, Cath, Device) to populate the timeline.
 */
export const extractMedicationEvents = (patient: Patient): MedicationEvent[] => {
    const events: MedicationEvent[] = [];

    patient.reports.forEach(report => {
        if (report.type === 'Meds') {
            events.push({
                date: report.date,
                title: 'Medication Review',
                details: report.title
            });
        } else if (report.type === 'Cath' || report.title.toLowerCase().includes('angiogram') || report.title.toLowerCase().includes('pci')) {
            events.push({
                date: report.date,
                title: 'Intervention',
                details: `${report.title} (Possible Med Change)`
            });
        } else if (report.title.toLowerCase().includes('discharge')) {
             events.push({
                date: report.date,
                title: 'Discharge',
                details: 'Discharge Medications Adjusted'
            });
        } else if (report.type === 'Device' || report.type === 'HF Device') {
             // Optional: Device checks can imply med changes
        }
    });

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

/**
 * Simulates fetching metadata from specific medical viewers.
 * In a real app, this would be a server-side scraping or API call.
 */
export const getLinkMetadata = (url: string): { title: string; simulatedContent: string } | null => {
    if (url.includes('medsynaptic') || url.includes('pacs')) {
        return {
            title: 'Medsynaptic PACS: CT Thorax',
            simulatedContent: `
            [SYSTEM ANALYSIS OF MEDSYNAPTIC PACS VIEWER]
            Study: CT Thorax w/ Contrast
            Date: 2024-07-24
            
            Technique:
            Axial helical CT images of the thorax were obtained with intravenous contrast.
            
            Findings:
            - Lungs: Clear. No consolidation, effusion, or pneumothorax. Mild centrilobular emphysema in upper lobes.
            - Pulmonary Arteries: No filling defects to suggest pulmonary embolism.
            - Heart: Normal heart size. Coronary artery calcification is present (moderate).
            - Mediastinum: Normal. No lymphadenopathy.
            - Bones: Degenerative changes in the thoracic spine.
            
            Impression:
            1. No acute pulmonary abnormality.
            2. Mild emphysema.
            3. Moderate coronary artery calcification.
            `
        };
    }
    return null;
};

/**
 * Processes an external link to fetch metadata or image content.
 * Simulates fetching for specialized medical domains where CORS usually blocks direct client-side access.
 */
export const processExternalLink = async (url: string): Promise<UploadableFile> => {
    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    
    // Attempt to fetch if it's a direct image link
    if (isImage) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch image");
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        name: url.split('/').pop() || 'External Image',
                        mimeType: blob.type,
                        base64Data: (reader.result as string).split(',')[1],
                        previewUrl: URL.createObjectURL(blob),
                        isLink: true,
                        sourceUrl: url
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn("CORS or network error fetching image, falling back to reference.", e);
        }
    }

    // Special handling for medical viewers (Mock Logic for Demo)
    if (url.includes('medsynaptic.com') || url.includes('pacs') || url.includes('viewer')) {
        // Return a mock object representing the viewer session
        return {
            name: "External PACS Study",
            mimeType: "application/x-external-link",
            base64Data: "", // No data, just a reference
            previewUrl: "https://cdn-icons-png.flaticon.com/512/2382/2382461.png", // Generic placeholder
            isLink: true,
            sourceUrl: url
        };
    }

    // Default fallback for generic links
    return {
        name: "External Link",
        mimeType: "text/uri-list",
        base64Data: btoa(url), // Store URL as "data"
        previewUrl: "",
        isLink: true,
        sourceUrl: url
    };
};

import { useState, useCallback } from 'react';

declare const JSZip: any;
declare const dwv: any;

export interface StagedFile {
    file: File;
    previewUrl: string;
}

// Fix: Export constants to be used in ChatComposer.tsx for file input accept attribute.
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom', 'text/plain', 'application/zip', 'application/x-zip-compressed'];
export const ALLOWED_EXTENSIONS = ['.dcm'];
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizes = ['B', 'KB', 'MB', 'GB'];
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const generatePreview = async (file: File): Promise<string> => {
    if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
    }
    if (file.type === 'application/pdf') {
        try {
            const pdfjsLib = (window as any).pdfjsLib;
            if (!pdfjsLib) {
                console.error("PDF library is not loaded.");
                return '';
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.js`;

            const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.3 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) return '';
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            return canvas.toDataURL();
        } catch (e) {
            console.error("Failed to generate PDF preview:", e);
            return '';
        }
    }
    if (file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom') {
        return new Promise<string>((resolve) => {
            try {
                const app = new dwv.App();
                app.init({ containerDivId: 'dwv-hidden' });
                app.addEventListener('loadend', () => {
                    try {
                        const canvas = app.getViewController().getCanvas();
                        resolve(canvas.toDataURL('image/jpeg', 0.7));
                    } catch (renderError) {
                        console.error("Failed to get canvas data from DICOM:", renderError);
                        resolve('');
                    } finally {
                        app.reset();
                    }
                });
                app.addEventListener('error', (e: any) => {
                    console.error("DWV error during preview generation:", e.error);
                    resolve('');
                });
                app.loadURLs([URL.createObjectURL(file)]);
            } catch (initError) {
                console.error("Failed to initialize DWV for preview:", initError);
                resolve('');
            }
        });
    }
    return ''; // Fallback for text files, etc.
};

const isValidFile = (file: File): boolean => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    // Some systems (like macOS) might not assign a MIME type to .dcm files, so we check extension
    return ALLOWED_MIME_TYPES.includes(fileType) || ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
};

export const useFileStaging = () => {
    const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addFiles = useCallback(async (files: FileList) => {
        setIsProcessing(true);
        setError(null);
        
        let newFiles: File[] = [];
        let errors: string[] = [];

        for (const file of Array.from(files)) {
            // Check file size before any processing (including ZIP extraction)
            if (file.size > MAX_FILE_SIZE_BYTES) {
                errors.push(`"${file.name}" (${formatFileSize(file.size)}) exceeds the 20 MB size limit.`);
                continue;
            }

            if (file.type.includes('zip')) {
                try {
                    const zip = await JSZip.loadAsync(file);
                    for (const filename in zip.files) {
                        if (!zip.files[filename].dir) {
                            const zipFile = zip.files[filename];
                            const blob = await zipFile.async('blob');
                            // Check extracted file size as well
                            if (blob.size > MAX_FILE_SIZE_BYTES) {
                                errors.push(`"${filename}" inside ${file.name} (${formatFileSize(blob.size)}) exceeds the 20 MB size limit.`);
                                continue;
                            }
                            const extractedFile = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
                            newFiles.push(extractedFile);
                        }
                    }
                } catch (e) {
                    errors.push(`Could not extract files from ${file.name}.`);
                }
            } else {
                newFiles.push(file);
            }
        }

        const validFiles = newFiles.filter(isValidFile);
        if (validFiles.length < newFiles.length) {
            errors.push("Some files had unsupported types and were ignored.");
        }

        if (errors.length > 0) {
            setError(errors.join(' '));
        }

        const filesWithPreviews = await Promise.all(
            validFiles.map(async file => ({
                file,
                previewUrl: await generatePreview(file)
            }))
        );

        setStagedFiles(prev => [...prev, ...filesWithPreviews]);
        setIsProcessing(false);
    }, []);

    const removeFile = useCallback((indexToRemove: number) => {
        setStagedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);
    
    const clearFiles = useCallback(() => {
        stagedFiles.forEach(sf => {
            // Revoke object URLs to prevent memory leaks
            if (sf.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(sf.previewUrl);
            }
        });
        setStagedFiles([]);
    }, [stagedFiles]);

    return { stagedFiles, addFiles, removeFile, clearFiles, isProcessing, error };
};
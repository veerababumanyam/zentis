
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { AiModel } from '../types';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { LinkIcon } from './icons/LinkIcon';
import { XCircleIcon } from './icons/ChecklistIcons';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { analyzeReasonForConsult } from '../services/apiManager';
import { SparklesIcon } from './icons/SparklesIcon';
import { processExternalLink } from '../utils';

declare const JSZip: any;

interface NewPatientConsultationModalProps {
  onClose: () => void;
  onCreateAndAnalyze: (data: {
    patientName: string;
    age: number;
    gender: 'Male' | 'Female';
    files: File[];
    prompt: string;
    model: AiModel;
  }) => void;
}

const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/dicom',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
];

export const NewPatientConsultationModal: React.FC<NewPatientConsultationModalProps> = ({ onClose, onCreateAndAnalyze }) => {
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [files, setFiles] = useState<File[]>([]);
  const [externalLinks, setExternalLinks] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [model, setModel] = useState<AiModel>('speed');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitDisabled = (files.length === 0 && externalLinks.length === 0) || !prompt.trim() || !patientName.trim() || !age.trim();

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);
  
  const handleFileChange = async (selectedFiles: FileList | null) => {
    if (selectedFiles) {
        setUploadError(null);
        let processedFiles: File[] = [];
        let errors: string[] = [];

        for (const file of Array.from(selectedFiles)) {
            if (file.type.includes('zip')) {
                try {
                    const zip = await JSZip.loadAsync(file);
                    for (const filename in zip.files) {
                        if (!zip.files[filename].dir) {
                            const zipFile = zip.files[filename];
                            const blob = await zipFile.async('blob');
                            const extractedFile = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
                            processedFiles.push(extractedFile);
                        }
                    }
                } catch (e) {
                    errors.push(`Could not extract files from ${file.name}. It may be corrupted.`);
                }
            } else {
                processedFiles.push(file);
            }
        }
        
        const validFiles = processedFiles.filter(file => {
            const fileType = file.type;
            const fileName = file.name.toLowerCase();
            return ALLOWED_FILE_TYPES.includes(fileType) || fileName.endsWith('.dcm');
        });

        if (validFiles.length !== processedFiles.length) {
            errors.push("Some files were unsupported and were ignored. Only PDF, JPG, PNG, and DICOM files are allowed.");
        }
        
        if (errors.length > 0) {
            setUploadError(errors.join(' '));
        }
        
        setFiles(prev => [...prev, ...validFiles]);

        // Auto-analyze reason for consult if prompt is empty and we have valid files
        if (validFiles.length > 0 && !prompt.trim()) {
            setIsAnalyzingFile(true);
            try {
                // Determine relevant file for context (prefer images or PDFs over binaries)
                const relevantFiles = validFiles.filter(f => f.type.startsWith('image/') || f.type.includes('pdf') || f.type.includes('text'));
                if (relevantFiles.length > 0) {
                    const reason = await analyzeReasonForConsult(relevantFiles);
                    if (reason) {
                        setPrompt(reason);
                    }
                }
            } catch (err) {
                console.error("Failed to auto-analyze consult reason:", err);
            } finally {
                setIsAnalyzingFile(false);
            }
        }
    }
  };
  
  const handleRemoveFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAddLink = () => {
      if (urlInput.trim()) {
          setExternalLinks(prev => [...prev, urlInput.trim()]);
          // If prompt is empty, use URL as context seed
          if (!prompt.trim()) {
              setPrompt(`Please analyze the clinical data found at this external link: ${urlInput.trim()}`);
          }
          setUrlInput('');
          setShowUrlInput(false);
      }
  };

  const handleRemoveLink = (index: number) => {
      setExternalLinks(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleDragEvents = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
      handleDragEvents(e);
      setDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
      handleDragEvents(e);
      setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      handleDragEvents(e);
      setDragOver(false);
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
          handleFileChange(droppedFiles);
      }
  };

  const handleSubmit = async () => {
    if (isSubmitDisabled) return;
    
    // Convert links to placeholder files so the rest of the system can process them uniformly
    // or simply append them to the prompt.
    // Here we will create a text file containing the URL as a fallback, 
    // but the system should ideally handle 'Link' types.
    
    const linkFiles = await Promise.all(externalLinks.map(async (link) => {
        // Attempt to pre-fetch if image to convert to file, else make a dummy text file
        const processed = await processExternalLink(link);
        if (processed.mimeType.startsWith('image/') && processed.base64Data) {
             // Convert back to file for consistency
             const byteCharacters = atob(processed.base64Data);
             const byteNumbers = new Array(byteCharacters.length);
             for (let i = 0; i < byteCharacters.length; i++) {
                 byteNumbers[i] = byteCharacters.charCodeAt(i);
             }
             const byteArray = new Uint8Array(byteNumbers);
             return new File([byteArray], processed.name, { type: processed.mimeType });
        } else {
             // Return a text file with the URL, system will read this
             return new File([`External Resource Link: ${link}`], `link_${Date.now()}.txt`, { type: 'text/plain' });
        }
    }));

    onCreateAndAnalyze({
      patientName,
      age: parseInt(age, 10),
      gender,
      files: [...files, ...linkFiles],
      prompt: `${prompt}\n\n[Included External Links]:\n${externalLinks.join('\n')}`,
      model
    });
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-patient-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
    >
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 id="new-patient-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">
            New Patient Consultation
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label htmlFor="patient-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Patient Name</label>
                    <input
                        type="text"
                        id="patient-name"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g., John Doe"
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age</label>
                    <input
                        type="number"
                        id="age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g., 65"
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                <div className="mt-1 flex space-x-4">
                    <label className="inline-flex items-center">
                        <input type="radio" className="form-radio text-blue-600 bg-gray-200 dark:bg-gray-600" name="gender" value="Male" checked={gender === 'Male'} onChange={() => setGender('Male')} />
                        <span className="ml-2">Male</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input type="radio" className="form-radio text-blue-600 bg-gray-200 dark:bg-gray-600" name="gender" value="Female" checked={gender === 'Female'} onChange={() => setGender('Female')} />
                        <span className="ml-2">Female</span>
                    </label>
                </div>
            </div>
            
            <div>
                <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Sources</label>
                    <button 
                        type="button" 
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    >
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Add External Link
                    </button>
                </div>

                {showUrlInput && (
                    <div className="mb-2 flex items-center space-x-2 animate-fadeIn">
                        <input 
                            type="text" 
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://south.medsynaptic.com/..."
                            className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <button 
                            type="button"
                            onClick={handleAddLink}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                        >
                            Add
                        </button>
                    </div>
                )}

                <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragEvents}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}
                >
                    <div className="space-y-1 text-center">
                        <PaperclipIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-300 justify-center">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                <span>Upload files</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={(e) => handleFileChange(e.target.files)} ref={fileInputRef} />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PDF, PNG, JPG, DICOM, ZIP</p>
                    </div>
                </div>
            </div>
             
             {uploadError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md flex items-center space-x-2">
                    <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-800 dark:text-red-300">{uploadError}</p>
                </div>
             )}

            {(files.length > 0 || externalLinks.length > 0) && (
                <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Attached Sources ({files.length + externalLinks.length})</h4>
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-2 pr-2">
                        {files.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                                <div className="flex items-center space-x-2 min-w-0">
                                    <DocumentIcon className="w-5 h-5 text-gray-500 dark:text-gray-300 flex-shrink-0" />
                                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate" title={file.name}>{file.name}</span>
                                </div>
                                <button onClick={() => handleRemoveFile(index)} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                                    <XCircleIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {externalLinks.map((link, index) => (
                            <div key={`link-${index}`} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
                                <div className="flex items-center space-x-2 min-w-0">
                                    <LinkIcon className="w-5 h-5 text-blue-500 dark:text-blue-300 flex-shrink-0" />
                                    <span className="text-sm text-blue-800 dark:text-blue-200 truncate" title={link}>{link}</span>
                                </div>
                                <button onClick={() => handleRemoveLink(index)} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                                    <XCircleIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                    <span>Clinical Context / Reason for Consult</span>
                    {isAnalyzingFile && (
                        <span className="flex items-center text-xs text-blue-600 animate-pulse">
                            <SparklesIcon className="w-3 h-3 mr-1" />
                            Analyzing doc...
                        </span>
                    )}
                </label>
                <textarea
                    id="prompt"
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700"
                    placeholder="e.g., Patient presents with new onset chest pain, rule out ACS."
                ></textarea>
            </div>
            
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AI Model Preference</label>
                 <div className="mt-1 flex space-x-4">
                    <label className="inline-flex items-center">
                        <input type="radio" className="form-radio text-blue-600 bg-gray-200 dark:bg-gray-600" name="model" value="speed" checked={model === 'speed'} onChange={() => setModel('speed')} />
                        <span className="ml-2">Speed (Quick Summary)</span>
                    </label>
                    <label className="inline-flex items-center">
                        <input type="radio" className="form-radio text-blue-600 bg-gray-200 dark:bg-gray-600" name="model" value="accuracy" checked={model === 'accuracy'} onChange={() => setModel('accuracy')} />
                        <span className="ml-2">Accuracy (Detailed Analysis)</span>
                    </label>
                </div>
            </div>

        </main>
        
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
             <button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Patient & Analyze Sources
              </button>
        </footer>
      </div>
    </div>
  );
};

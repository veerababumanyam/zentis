
import React, { useState, useEffect } from 'react';
import type { Report } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { getAiSmartReportAnalysis } from '../services/geminiService';
import { XCircleIcon } from './icons/ChecklistIcons';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { LinkIcon } from './icons/LinkIcon';

interface UploadReportFormProps {
  onSave: (reportData: { title: string; type: Report['type']; content: Report['content']; date: string; aiSummary?: string; keyFindings?: string[]; }) => void;
  onCancel: () => void;
}

const reportTypes: Array<Report['type']> = ['Lab', 'ECG', 'Echo', 'Imaging', 'Meds', 'Cath', 'Device', 'HF Device', 'CTA', 'PDF', 'DICOM', 'Link'];

type UploadStep = 'initial' | 'analyzing' | 'review';

const getTextFromPdf = async (file: File): Promise<string> => {
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      throw new Error("PDF library is not loaded.");
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ');
    }
    return text;
};

const fileToReport = async (file: File, specifiedType: Report['type']): Promise<Omit<Report, 'id'> & { rawTextForAnalysis: string | null }> => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const isDicom = file.name.toLowerCase().endsWith('.dcm') || file.type === 'application/dicom';

    const url = URL.createObjectURL(file);
    const date = new Date().toISOString().split('T')[0];
    const title = file.name;

    if (isDicom) {
        return { type: 'DICOM', date, title, content: { type: 'dicom', url }, rawTextForAnalysis: null };
    }
    if (isImage) {
        return { type: 'Imaging', date, title, content: { type: 'image', url }, rawTextForAnalysis: null };
    }
    if (isPdf) {
        const rawText = await getTextFromPdf(file);
        return { type: 'PDF', date, title, content: { type: 'pdf', url, rawText }, rawTextForAnalysis: rawText };
    }
    
    // Default to text
    const rawText = await file.text();
    return { type: specifiedType, date, title, content: rawText, rawTextForAnalysis: rawText };
};


export const UploadReportForm: React.FC<UploadReportFormProps> = ({ onSave, onCancel }) => {
    const [step, setStep] = useState<UploadStep>('initial');
    const [fileContent, setFileContent] = useState<Report['content'] | null>(null);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [urlInput, setUrlInput] = useState('');
    
    // State for review step
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDate, setEditedDate] = useState('');
    const [editedType, setEditedType] = useState<Report['type']>('Lab');
    const [aiSummary, setAiSummary] = useState('');
    const [keyFindings, setKeyFindings] = useState<string[]>([]);
    
    // Progress Bar Animation Effect
    useEffect(() => {
        let interval: number;
        if (step === 'analyzing') {
            setProgress(0);
            interval = window.setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev; // Stall at 90 until complete
                    return prev + 10;
                });
            }, 500);
        }
        return () => window.clearInterval(interval);
    }, [step]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setStep('analyzing');
            setError('');

            try {
                const { content, rawTextForAnalysis, title, date, type } = await fileToReport(selectedFile, editedType);
                setFileContent(content);
                setEditedType(type);

                if (rawTextForAnalysis) {
                    const aiResult = await getAiSmartReportAnalysis(rawTextForAnalysis, type);
                    setEditedTitle(aiResult.suggestedTitle);
                    setEditedDate(aiResult.extractedDate);
                    setAiSummary(aiResult.summary);
                    setKeyFindings(aiResult.keyFindings);
                } else {
                    setEditedTitle(title);
                    setEditedDate(date);
                    setAiSummary('AI analysis is not available for this file type in this mode.');
                    setKeyFindings(['Visual inspection required.']);
                }
                setProgress(100);
                setTimeout(() => setStep('review'), 500); // Short delay to show 100%
            } catch (err) {
                setError('Failed to process or analyze the file. Please try again.');
                console.error(err);
                setStep('initial');
            }
        }
    };

    const handleUrlSubmit = () => {
        if (!urlInput.trim()) {
            setError('Please enter a valid URL.');
            return;
        }
        setFileContent({ type: 'link', url: urlInput.trim() });
        setEditedTitle('External Link');
        setEditedDate(new Date().toISOString().split('T')[0]);
        setAiSummary('External resource linked. Content analysis unavailable.');
        setKeyFindings(['Check external link for details.']);
        setStep('review');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editedTitle || !fileContent) {
            setError('Title and content are required.');
            return;
        }
        onSave({
            title: editedTitle,
            type: editedType,
            content: fileContent,
            date: editedDate,
            aiSummary,
            keyFindings,
        });
    };

    if (step === 'analyzing') {
        return (
            <div className="p-6 bg-gray-100 dark:bg-gray-800 border-t border-b border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center space-y-4 h-64">
                <div className="relative">
                    <SparklesIcon className="w-10 h-10 text-blue-500 animate-pulse" />
                </div>
                <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-200">Generating Smart Report...</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">AI is extracting key findings and generating a summary.</p>
                </div>
                <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        );
    }
    
    if (step === 'review') {
        return (
             <form onSubmit={handleSubmit} className="p-3 bg-gray-100 dark:bg-gray-800 border-t border-b border-gray-200 dark:border-gray-700 space-y-3">
                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-base flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-500"/>Smart Report Review</h4>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                
                <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label htmlFor="report-title" className="text-xs font-medium text-gray-600 dark:text-gray-400">Suggested Title</label>
                        <input id="report-title" type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="w-full mt-1 p-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                     <div>
                        <label htmlFor="report-date" className="text-xs font-medium text-gray-600 dark:text-gray-400">Extracted Date</label>
                        <input id="report-date" type="date" value={editedDate} onChange={(e) => setEditedDate(e.target.value)} className="w-full mt-1 p-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                </div>

                <div>
                    <label htmlFor="report-type" className="text-xs font-medium text-gray-600 dark:text-gray-400">Report Type</label>
                    <select id="report-type" value={editedType} onChange={(e) => setEditedType(e.target.value as Report['type'])} className="w-full mt-1 p-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
                        {reportTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                 
                 <div className="p-3 bg-white dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-600">
                    <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-100">AI Summary</h5>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{aiSummary}</p>
                    <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-100 mt-2">Key Findings</h5>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {keyFindings.map((finding, i) => <li key={i} className="text-xs text-gray-600 dark:text-gray-300">{finding}</li>)}
                    </ul>
                </div>

                <div className="flex items-center space-x-2">
                    <button type="submit" className="flex-1 px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        Save to Patient Chart
                    </button>
                    <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-500">
                        Cancel
                    </button>
                </div>
            </form>
        )
    }

    return (
        <div className="p-3 bg-gray-100 dark:bg-gray-800 border-t border-b border-gray-200 dark:border-gray-700 space-y-3">
            <h4 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Upload New Report</h4>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            
            <p className="text-xs text-gray-500 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md border border-blue-200 dark:border-blue-800">
                <SparklesIcon className="w-4 h-4 inline-block mr-1 text-blue-600"/>
                Select a file or link to automatically generate a smart summary and extract key data.
            </p>

             <div>
                <label htmlFor="report-type-select" className="text-xs font-medium text-gray-600 dark:text-gray-400">Report Type</label>
                <select id="report-type-select" value={editedType} onChange={(e) => setEditedType(e.target.value as Report['type'])} className="w-full mt-1 p-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500">
                    {reportTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            
            {editedType === 'Link' ? (
                <div>
                    <label htmlFor="report-url" className="text-xs font-medium text-gray-600 dark:text-gray-400">External URL</label>
                    <div className="flex space-x-2 mt-1">
                        <input
                            id="report-url"
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 p-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button type="button" onClick={handleUrlSubmit} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700">
                            Add Link
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                     <label htmlFor="report-file" className="text-xs font-medium text-gray-600 dark:text-gray-400">File</label>
                     <input
                        id="report-file"
                        type="file"
                        onChange={handleFileChange}
                        className="w-full mt-1 text-sm text-gray-500 dark:text-gray-300 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900"
                        accept="image/png,image/jpeg,image/webp,text/plain,application/pdf,.dcm,application/dicom"
                    />
                </div>
            )}

            <div className="flex items-center space-x-2">
                <button type="button" onClick={onCancel} className="w-full px-3 py-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-500">
                    Cancel
                </button>
            </div>
        </div>
    );
};


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SendIcon } from './icons/SendIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { UploadIcon } from './icons/UploadIcon';
import { LinkIcon } from './icons/LinkIcon';
import { XIcon } from './icons/XIcon';
import { useFileStaging, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS } from '../hooks/useFileStaging';
import { getFileTypeFromFile, processExternalLink } from '../utils';
import { ReportTypeIcon } from './icons/ReportTypeIcon';
import * as apiManager from '../services/apiManager';

interface ChatComposerProps {
  onSendMessage: (query: string, files: File[]) => void;
  isLoading: boolean;
}

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const ChatComposer: React.FC<ChatComposerProps> = React.memo(({ onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const { stagedFiles, addFiles, removeFile, clearFiles, isProcessing } = useFileStaging();
    const [isRecording, setIsRecording] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkInputVal, setLinkInputVal] = useState('');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [input]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const transcript = await apiManager.transcribeAudio(audioBlob);
                setInput(prev => (prev ? prev + ' ' : '') + transcript);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleToggleRecord = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    const handleSendMessageClick = () => {
        if (isLoading || (!input.trim() && stagedFiles.length === 0)) return;
        
        // Deep Thinking Trigger Check
        if (input.toLowerCase().startsWith('/think') || input.toLowerCase().includes('deep reason')) {
             onSendMessage(`(Thinking...) ${input}`, stagedFiles.map(sf => sf.file));
        } else {
             onSendMessage(input, stagedFiles.map(sf => sf.file));
        }
        
        setInput('');
        clearFiles();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessageClick();
        }
    };
    
    // Drag and Drop Handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    }, [addFiles]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) addFiles(e.target.files);
        e.target.value = '';
    };

    const handleAddLink = async () => {
        if (!linkInputVal.trim()) {
            setShowLinkInput(false);
            return;
        }
        
        try {
            const processed = await processExternalLink(linkInputVal.trim());
            let file: File;
            if (processed.base64Data && processed.mimeType.startsWith('image/')) {
                 const byteCharacters = atob(processed.base64Data);
                 const byteNumbers = new Array(byteCharacters.length);
                 for (let i = 0; i < byteCharacters.length; i++) {
                     byteNumbers[i] = byteCharacters.charCodeAt(i);
                 }
                 const byteArray = new Uint8Array(byteNumbers);
                 file = new File([byteArray], processed.name, { type: processed.mimeType });
            } else {
                 file = new File([`External Resource Link: ${linkInputVal.trim()}`], `link_${Date.now()}.txt`, { type: 'text/plain' });
            }
            const dt = new DataTransfer();
            dt.items.add(file);
            addFiles(dt.files);
        } catch (e) {
            console.error("Error adding link:", e);
        } finally {
            setLinkInputVal('');
            setShowLinkInput(false);
        }
    };

    return (
        <div 
            className="relative transition-all duration-200"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            {dragOver && (
                <div className="absolute inset-0 -m-2 bg-blue-500/10 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-2xl pointer-events-none z-50 flex flex-col items-center justify-center animate-fadeIn">
                    <UploadIcon className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-2 animate-bounce" />
                    <p className="font-bold text-blue-700 dark:text-blue-300 text-lg">Drop files here</p>
                </div>
            )}
            
            {(stagedFiles.length > 0 || isProcessing) && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 ease-in-out">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full mr-2 text-[10px]">
                                {stagedFiles.length}
                            </span>
                            Attached Files
                        </h4>
                        <button 
                            onClick={clearFiles}
                            className="text-[10px] font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:underline transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                    
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        {stagedFiles.map((sf, index) => (
                            <div key={`${sf.file.name}-${index}`} className="relative group flex-shrink-0 w-24 flex flex-col">
                                <div className="aspect-square bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm relative">
                                    {sf.previewUrl ? (
                                        <img src={sf.previewUrl} alt={sf.file.name} className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-2 bg-gray-100 dark:bg-gray-800/50">
                                            <ReportTypeIcon type={getFileTypeFromFile({name: sf.file.name, mimeType: sf.file.type})} className="w-8 h-8 mb-1" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="absolute top-1 right-1 p-1 bg-white/90 dark:bg-black/60 text-gray-500 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 rounded-full shadow-sm backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        aria-label={`Remove ${sf.file.name}`}
                                    >
                                        <XIcon className="w-3 h-3"/>
                                    </button>
                                </div>
                                <div className="mt-1.5 px-0.5">
                                    <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate w-full" title={sf.file.name}>
                                        {sf.file.name}
                                    </p>
                                    <p className="text-[9px] text-gray-400 dark:text-gray-500">
                                        {formatFileSize(sf.file.size)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex-shrink-0 w-24 aspect-square bg-gray-100 dark:bg-gray-800/50 rounded-xl flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 animate-pulse">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                <span className="text-[9px] text-gray-500 font-medium">Processing...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showLinkInput && (
                <div className="p-2 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center space-x-2 animate-fadeIn">
                    <LinkIcon className="w-4 h-4 text-blue-500" />
                    <input 
                        type="text" 
                        value={linkInputVal}
                        onChange={(e) => setLinkInputVal(e.target.value)}
                        placeholder="Paste URL here..."
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                        className="flex-1 bg-transparent text-sm focus:outline-none text-gray-800 dark:text-gray-200"
                    />
                    <button onClick={handleAddLink} className="text-xs font-bold text-blue-600 dark:text-blue-400">Add</button>
                    <button onClick={() => setShowLinkInput(false)} className="text-xs text-gray-400">Cancel</button>
                </div>
            )}

            <div className="flex items-end space-x-2 p-1">
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept={[...ALLOWED_MIME_TYPES, ...ALLOWED_EXTENSIONS].join(',')}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100/50 dark:hover:bg-gray-800/50 disabled:opacity-50 transition-colors"
                    title="Upload files (Images, PDF, DICOM)"
                >
                    <UploadIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setShowLinkInput(true)}
                    disabled={isLoading}
                    className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100/50 dark:hover:bg-gray-800/50 disabled:opacity-50 transition-colors"
                    title="Add external link"
                >
                    <LinkIcon className="w-5 h-5" />
                </button>
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask AI, drag files, or type '/think' for deep reasoning..."
                    className="flex-1 bg-transparent rounded-lg p-2.5 resize-none max-h-40 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-800 dark:text-gray-100"
                    rows={1}
                    disabled={isLoading}
                />
                <button
                    onClick={handleToggleRecord}
                    disabled={isLoading}
                    className={`p-2.5 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'} disabled:opacity-50`}
                    title={isRecording ? 'Stop Recording' : 'Start Recording (Gemini Transcription)'}
                >
                    <MicrophoneIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={handleSendMessageClick}
                    disabled={isLoading || (!input.trim() && stagedFiles.length === 0)}
                    className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95"
                    title="Send message"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
});

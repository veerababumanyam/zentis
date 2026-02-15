
import React, { useState, useEffect, useCallback } from 'react';
import type { UploadableFile } from '../types';
import { ImageWithZoom } from './ImageWithZoom';
import { DicomViewer } from './DicomViewer';
import { PdfViewer } from './PdfViewer';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { XIcon } from './icons/XIcon';
import { getFileTypeFromFile } from '../utils';

interface FileViewerModalProps {
  files: UploadableFile[];
  startIndex: number;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ files, startIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const activeFile = files[currentIndex];
  const fileType = getFileTypeFromFile(activeFile);
  
  // State to hold the stable Object URL for DICOM files
  const [dicomUrl, setDicomUrl] = useState<string | null>(null);

  const goToPrevious = useCallback(() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : files.length - 1)), [files.length]);
  const goToNext = useCallback(() => setCurrentIndex(prev => (prev < files.length - 1 ? prev + 1 : 0)), [files.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  }, [onClose, goToPrevious, goToNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Manage DICOM Blob URL lifecycle
  useEffect(() => {
    let url: string | null = null;

    if (fileType === 'DICOM' && activeFile.base64Data) {
        try {
            const byteCharacters = atob(activeFile.base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/dicom' });
            url = URL.createObjectURL(blob);
            setDicomUrl(url);
        } catch (e) {
            console.error("Error creating DICOM blob:", e);
            setDicomUrl(null);
        }
    } else {
        setDicomUrl(null);
    }

    // Cleanup: Revoke URL when active file changes or component unmounts
    return () => {
        if (url) {
            URL.revokeObjectURL(url);
        }
    };
  }, [activeFile, fileType]);

  const renderFile = () => {
    const dataUrl = `data:${activeFile.mimeType};base64,${activeFile.base64Data}`;
    switch (fileType) {
        case 'Imaging':
            return <ImageWithZoom src={dataUrl} alt={activeFile.name} />;
        case 'PDF':
            return <PdfViewer url={dataUrl} />;
        case 'DICOM':
            if (dicomUrl) {
                return <DicomViewer url={dicomUrl} />;
            }
            return <div className="text-white flex items-center"><span className="animate-spin mr-2">⟳</span> Loading DICOM...</div>;
        default:
            return <div className="text-white">Preview not available for this file type.</div>;
    }
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-viewer-title"
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-white z-20 bg-gradient-to-b from-black/50 to-transparent">
          <div>
            <p id="file-viewer-title" className="font-bold">{activeFile.name}</p>
            <p className="text-sm text-gray-300">{currentIndex + 1} of {files.length}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-black/30 hover:bg-white/20">
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        
        {/* Main Content */}
        <div className="w-full h-[85%] flex items-center justify-center">
            {renderFile()}
        </div>
        
        {/* Navigation */}
        {files.length > 1 && (
            <>
                <button 
                    onClick={goToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-white/20 text-white z-20 transition-all hover:scale-110"
                    aria-label="Previous file"
                >
                    <ChevronLeftIcon className="w-8 h-8"/>
                </button>
                 <button 
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-white/20 text-white z-20 transition-all hover:scale-110"
                    aria-label="Next file"
                >
                    <ChevronRightIcon className="w-8 h-8"/>
                </button>
            </>
        )}
      </div>
    </div>
  );
};

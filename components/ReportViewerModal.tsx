
import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import type { Patient, Report } from '../types';
import { ImageWithZoom } from './ImageWithZoom';
import { ReportTypeIcon } from './icons/ReportTypeIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { UploadIcon } from './icons/UploadIcon';
import { UploadReportForm } from './UploadReportForm';
import { useAppContext } from '../contexts/AppContext';
import { LinkIcon } from './icons/LinkIcon';

// Lazy load heavy viewers to code-split them
const DicomViewer = React.lazy(() => import('./DicomViewer').then(module => ({ default: module.DicomViewer })));
const PdfViewer = React.lazy(() => import('./PdfViewer').then(module => ({ default: module.PdfViewer })));


const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
};

const renderBold = (line: string, key: string) => {
    const parts = line.split('**');
    return (
        <React.Fragment key={key}>
            {parts.map((part, index) =>
                index % 2 === 1 ? <strong key={index}>{part}</strong> : part
            )}
        </React.Fragment>
    );
};

const formatText = (text: string): React.ReactNode[] => {
    const lines = text.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    const flushList = () => {
        if (currentList.length > 0) {
            elements.push(
                <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 my-2">
                    {currentList}
                </ul>
            );
            currentList = [];
        }
    };

    lines.forEach((line, index) => {
        const key = `line-${index}`;

        if (line.startsWith('### ')) {
            flushList();
            elements.push(<h3 key={key} className="text-lg font-bold mt-4 mb-2">{renderBold(line.substring(4), key)}</h3>);
            return;
        }

        if (line.trim().startsWith('- ')) {
            currentList.push(<li key={key}>{renderBold(line.trim().substring(2), key)}</li>);
            return;
        }

        flushList();
        if (line.trim()) {
            elements.push(<p key={key}>{renderBold(line, key)}</p>);
        }
    });

    flushList();
    return elements;
};

const ViewerLoader: React.FC = () => (
    <div className="flex items-center justify-center w-full h-full text-gray-500 dark:text-gray-400 p-8">
        <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-sm">Loading Viewer...</p>
        </div>
    </div>
);

// New component for highlighting text
const HighlightedTextRenderer: React.FC<{ content: string; highlightTerm?: string }> = ({ content, highlightTerm }) => {
    const containerRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (highlightTerm && containerRef.current) {
            const mark = containerRef.current.querySelector('mark');
            if (mark) {
                mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightTerm, content]);

    if (!highlightTerm || !content) {
        return <pre ref={containerRef} className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-md border dark:border-gray-700">{content}</pre>;
    }

    // Escape special regex characters in the highlight term
    const escapedTerm = highlightTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = content.split(new RegExp(`(${escapedTerm})`, 'gi'));

    return (
        <pre ref={containerRef} className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-md border dark:border-gray-700">
            {parts.map((part, i) => 
                part.toLowerCase() === highlightTerm.toLowerCase() ? 
                <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 text-gray-900 dark:text-white font-bold px-0.5 rounded animate-pulse">{part}</mark> : 
                part
            )}
        </pre>
    );
};


export const ReportViewerModal: React.FC = () => {
  const { state, actions } = useAppContext();
  const { viewingReport } = state;

  const patient = viewingReport?.patient;
  const initialReportId = viewingReport?.initialReportId;
  const highlightText = viewingReport?.highlightText;

  const {
    handleAnalyzeReports,
    handleCompareReports,
    handleAddReport,
    setViewingReport
  } = actions;

  const [openReports, setOpenReports] = useState<Report[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | undefined>(initialReportId);
  const [tabHistory, setTabHistory] = useState<string[]>([]); // [most_recent, ...older]
  const [activeFilter, setActiveFilter] = useState<Report['type'] | 'All'>('All');
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  const activeReport = useMemo(() => openReports.find(r => r.id === activeReportId), [openReports, activeReportId]);

  const dynamicReportFilterTypes = useMemo(() => {
    if (!patient) return [];

    const availableTypes = new Set(patient.reports.map(r => r.type));
    
    const canonicalOrder: Array<Report['type']> = ['LiveSession', 'Lab', 'ECG', 'Echo', 'CTA', 'PDF', 'DICOM', 'Imaging', 'Cath', 'Device', 'HF Device', 'Meds', 'Link', 'Pathology', 'MRI', 'Genomics', 'Procedure'];
    const typeLabels: Record<Report['type'], string> = {
        LiveSession: 'Live Sessions',
        Lab: 'Labs',
        ECG: 'ECG',
        Echo: 'Echo',
        Imaging: 'Imaging',
        CTA: 'CTA',
        PDF: 'PDFs',
        Meds: 'Meds',
        Cath: 'Cath Reports',
        Device: 'Device Reports',
        'HF Device': 'HF Devices',
        DICOM: 'DICOM',
        Link: 'Links',
        Pathology: 'Pathology',
        MRI: 'MRI',
        Genomics: 'Genomics',
        Procedure: 'Procedures'
    };

    const sortedTypes = canonicalOrder.filter(type => availableTypes.has(type));

    const filters = sortedTypes.map(type => ({
        id: type,
        label: typeLabels[type]
    }));

    return [{ id: 'All' as const, label: 'All' }, ...filters];
  }, [patient]);

  useEffect(() => {
    if (patient && initialReportId) {
      const initialReport = patient.reports.find(r => r.id === initialReportId);
      if (initialReport) {
        if (!openReports.some(r => r.id === initialReportId)) {
             setOpenReports(prev => [...prev, initialReport]);
        }
        setActiveReportId(initialReportId);
        setTabHistory(prev => [initialReportId, ...prev.filter(id => id !== initialReportId)]);
      }
    }
  }, [initialReportId, patient]);

  useEffect(() => {
    if (activeReportId && !tabHistory.includes(activeReportId)) {
        setTabHistory(prev => [activeReportId, ...prev.filter(id => id !== activeReportId)]);
    }
  }, [activeReportId, tabHistory]);

  const handleClose = useCallback(() => {
    setViewingReport(null);
  }, [setViewingReport]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const addReportTab = (report: Report) => {
      if (!openReports.some(r => r.id === report.id)) {
          setOpenReports(prev => [...prev, report]);
      }
      setActiveReportId(report.id);
  }

  const closeTab = (reportIdToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const newRemainingReports = openReports.filter(r => r.id !== reportIdToClose);
    const newTabHistory = tabHistory.filter(id => id !== reportIdToClose);

    setOpenReports(newRemainingReports);
    setTabHistory(newTabHistory);

    if (activeReportId === reportIdToClose) {
        if (newRemainingReports.length === 0) {
            handleClose();
        } else {
            const nextActiveId = newTabHistory.find(id => newRemainingReports.some(r => r.id === id));
            setActiveReportId(nextActiveId || newRemainingReports[0].id);
        }
    }
  };

  const handleToggleSelectReport = (reportId: string) => {
      setSelectedReportIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(reportId)) {
              newSet.delete(reportId);
          } else {
              newSet.add(reportId);
          }
          return newSet;
      });
  };
  
  const handleAnalyzeSelected = () => {
      handleClose();
      handleAnalyzeReports(Array.from(selectedReportIds));
  };
  
  const handleCompareSelected = () => {
      handleClose();
      handleCompareReports(Array.from(selectedReportIds));
  };

  const handleSaveNewReport = (reportData: { title: string; type: Report['type']; content: Report['content']; date: string; aiSummary?: string; keyFindings?: string[]; }) => {
    if (patient) {
        handleAddReport(patient.id, reportData);
        setIsUploading(false); // Close form on save
    }
  };
  
  if (!patient) return null;

  const selectedReports = patient.reports.filter(r => selectedReportIds.has(r.id));
  
  const canCompare = useMemo(() => {
      return selectedReports.length === 2 && selectedReports[0].type === selectedReports[1].type;
  }, [selectedReports]);

  const filteredReports = patient.reports
    .filter(r => activeFilter === 'All' || r.type === activeFilter)
    .sort((a,b) => b.date.localeCompare(a.date));

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-viewer-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
    >
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 id="report-viewer-title" className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Reports for <span className="text-blue-600 dark:text-blue-400">{patient.name}</span>
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Close report viewer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        {/* Responsive Content Area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Sidebar: Report List */}
            <aside className="w-full md:w-[35%] border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50 h-1/3 md:h-auto overflow-hidden">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">All Reports</h3>
                    <button 
                        onClick={() => setIsUploading(prev => !prev)}
                        className={`flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${isUploading ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900'}`}
                        title="Upload a new report for this patient"
                    >
                        <UploadIcon className="w-4 h-4" />
                        <span>{isUploading ? 'Cancel' : 'Upload'}</span>
                    </button>
                </div>
                
                {isUploading && (
                    <UploadReportForm 
                        onSave={handleSaveNewReport}
                        onCancel={() => setIsUploading(false)}
                    />
                )}

                <div className="p-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">Filter by Type</h3>
                    <div className="flex gap-2">
                        {dynamicReportFilterTypes.map(filter => (
                            <button 
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                                    activeFilter === filter.id 
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredReports.map(report => (
                        <div
                            key={report.id}
                            className={`w-full text-left p-2 rounded-md flex items-center space-x-2 hover:bg-gray-200 dark:hover:bg-gray-700/50 cursor-pointer ${selectedReportIds.has(report.id) ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-transparent'}`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedReportIds.has(report.id)}
                                onChange={() => handleToggleSelectReport(report.id)}
                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
                                onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0 flex items-center space-x-3" onClick={() => addReportTab(report)}>
                                <ReportTypeIcon type={report.type} className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate" title={report.title}>{report.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(report.date)}</p>
                                </div>
                            </div>
                             <button onClick={() => { handleClose(); handleAnalyzeReports([report.id]); }} className="p-1.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300" title="Analyze this report">
                                <SparklesIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
                     <button
                        onClick={handleAnalyzeSelected}
                        disabled={selectedReportIds.size === 0}
                        className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                     >
                        Analyze Selected ({selectedReportIds.size})
                     </button>
                     <button
                        onClick={handleCompareSelected}
                        disabled={!canCompare}
                        className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                     >
                        Compare Selected ({canCompare ? '2' : selectedReports.length})
                     </button>
                </div>
            </aside>

            {/* Main Content: Tabs and Viewer */}
            <div className="w-full md:w-[65%] flex flex-col h-2/3 md:h-auto overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
                  <div className="flex items-center -mb-px overflow-x-auto">
                    {openReports.map(report => (
                      <button
                        key={report.id}
                        onClick={() => setActiveReportId(report.id)}
                        className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-200 max-w-[200px] flex-shrink-0 ${
                          activeReportId === report.id
                            ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <ReportTypeIcon type={report.type} className="flex-shrink-0" />
                        <span className="truncate" title={report.title}>{report.title}</span>
                        <span onClick={(e) => closeTab(report.id, e)} className="ml-2 p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-auto p-6 bg-gray-50 dark:bg-gray-900/50 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">
                        {activeReport ? (
                            <div className="h-full flex flex-col">
                            <h3 className="text-lg font-bold mb-1">{activeReport.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{activeReport.type} Report - {formatDate(activeReport.date)}</p>
                            <Suspense fallback={<ViewerLoader />}>
                              {typeof activeReport.content === 'string' ? (
                                  <HighlightedTextRenderer content={activeReport.content} highlightTerm={highlightText} />
                              ) : activeReport.content.type === 'image' ? (
                                  <ImageWithZoom src={activeReport.content.url} alt={activeReport.title} />
                              ) : activeReport.content.type === 'dicom' ? (
                                  <DicomViewer url={activeReport.content.url} />
                              ) : activeReport.content.type === 'pdf' ? (
                                  <PdfViewer url={activeReport.content.url} />
                              ) : activeReport.content.type === 'link' ? (
                                  <div className="flex flex-col items-center justify-center h-full space-y-6 p-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <div className="p-6 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                            <LinkIcon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">External Resource</h3>
                                            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
                                                This report is hosted on an external system.
                                            </p>
                                            <a 
                                                href={activeReport.content.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                                            >
                                                <span>Open in New Tab</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                                </svg>
                                            </a>
                                        </div>
                                        <div className="w-full border-t border-gray-200 dark:border-gray-700 pt-4">
                                            <p className="text-xs text-gray-500 text-center mb-2 uppercase tracking-wide font-bold">Preview</p>
                                            <div className="w-full h-64 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-black relative">
                                                <iframe src={activeReport.content.url} className="w-full h-full" title="External Content" sandbox="allow-scripts allow-same-origin" />
                                                {/* Interaction blocker to prevent hijacking, allow scroll */}
                                                <div className="absolute inset-0 bg-transparent" />
                                            </div>
                                        </div>
                                  </div>
                              ) : activeReport.content.type === 'live_session' ? (
                                  <div className="h-full overflow-y-auto p-4">
                                      <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">Session Transcript</h3>
                                      <div className="mb-6">
                                          <HighlightedTextRenderer content={activeReport.content.transcript} highlightTerm={highlightText} />
                                      </div>
                                      {activeReport.content.biomarkers && activeReport.content.biomarkers.length > 0 && (
                                          <div>
                                              <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-100">Detected Biomarkers</h3>
                                              <div className="space-y-2">
                                                  {activeReport.content.biomarkers.map((b: any, i: number) => (
                                                      <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                                          <div className="flex items-center space-x-3">
                                                              <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide ${b.severity === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : (b.severity === 'Medium' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300')}`}>{b.severity}</span>
                                                              <div>
                                                                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{b.symptom}</p>
                                                                  <p className="text-xs text-gray-500 dark:text-gray-400">{b.type.toUpperCase()} • Confidence: {b.confidence}</p>
                                                              </div>
                                                          </div>
                                                          <span className="text-xs text-gray-400 font-mono">{new Date(b.timestamp).toLocaleTimeString()}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              ) : (
                                  <div className="text-center text-gray-500">Unsupported report format.</div>
                              )}
                            </Suspense>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400 pt-16">
                                <p className="font-semibold">No report selected.</p>
                                <p className="text-sm">Please select or open a report to view its contents.</p>
                            </div>
                        )}
                    </div>
                    <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-auto p-6 bg-white dark:bg-gray-800">
                         <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center">
                                <SparklesIcon className="w-5 h-5 mr-2 text-blue-500" />
                                AI Analysis & Recommendations
                            </h3>
                             <button
                                onClick={() => { if (activeReport) { handleClose(); handleAnalyzeReports([activeReport.id]); } }}
                                disabled={!activeReport}
                                className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                                title="Re-run AI Analysis"
                            >
                                <RefreshIcon className="w-4 h-4" />
                            </button>
                        </div>
                        {activeReport?.aiSummary ? (
                            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 dark:prose-invert">
                                {activeReport.keyFindings && activeReport.keyFindings.length > 0 && (
                                    <>
                                        <h4 className="font-bold">Key Findings</h4>
                                        <ul className="list-disc pl-5">
                                            {activeReport.keyFindings.map((finding, i) => <li key={i}>{finding}</li>)}
                                        </ul>
                                    </>
                                )}
                                <h4 className="font-bold mt-3">Summary</h4>
                                {formatText(activeReport.aiSummary)}
                            </div>
                        ) : activeReport ? (
                            <div className="text-center text-gray-500 dark:text-gray-400 pt-16">
                                <p>No AI analysis available for this report.</p>
                                <button onClick={() => { handleClose(); handleAnalyzeReports([activeReport.id]); }} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">Generate Analysis</button>
                            </div>
                        ) : null }
                    </div>
                </main>
            </div>
        </div>
      </div>
    </div>
  );
};

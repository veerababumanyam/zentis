import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { DocumentIcon } from './icons/DocumentIcon';
import { UploadIcon } from './icons/UploadIcon';
import { SearchIcon } from './icons/SearchIcon';
import { fetchDeletedReports } from '../services/ehrService';
import { Report } from '../types';
import { SettingsIcon } from './icons/SettingsIcon';
import { ReportTypeIcon } from './icons/ReportTypeIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { useTheme } from '../hooks/useTheme';
import { UserIcon } from './icons/UserIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { UploadReportForm } from './UploadReportForm';
import { ModalLoader } from './ModalLoader';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/ChecklistIcons';
import { CompareIcon } from './icons/CompareIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ExtractedDataPanel } from './ExtractedDataPanel';
import { TrashIcon } from './icons/TrashIcon';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: '2-digit'
    });
};

export const HealthRecordSidebar: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const { state, actions } = useAppContext();
    const { selectedPatient, isPatientListCollapsed } = state;
    const { userProfile, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);

    // Filtering & Selection State
    const [activeFilter, setActiveFilter] = useState<string>('All');
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'documents' | 'extracted' | 'trash'>('documents');
    const [deletedReports, setDeletedReports] = useState<Report[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteMode, setDeleteMode] = useState<'soft' | 'permanent'>('soft');

    // Close account menu on outside click or Escape
    useEffect(() => {
        if (!isAccountMenuOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
                setIsAccountMenuOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsAccountMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isAccountMenuOpen]);

    // Reset selection when patient changes
    useEffect(() => {
        setSelectedReportIds(new Set());
        setIsSelectMode(false);
        setActiveFilter('All');
        if (activeTab === 'trash') {
            setActiveTab('documents'); // Reset to documents on patient change
        }
    }, [selectedPatient?.id]);

    // Fetch deleted reports when entering trash tab
    useEffect(() => {
        if (activeTab === 'trash' && selectedPatient) {
            fetchDeletedReports(selectedPatient.id).then(setDeletedReports);
        }
    }, [activeTab, selectedPatient, state.allPatients]); // Reload if patients update (e.g. after restore)

    // Derived list of unique report types present for this patient
    const availableTypes = useMemo(() => {
        if (!selectedPatient) return [];
        const types = new Set(selectedPatient.reports.map(r => r.type));
        return ['All', ...Array.from(types).sort()];
    }, [selectedPatient]);

    // Filter documents based on search AND active type filter
    const filteredReports = useMemo(() => {
        if (!selectedPatient) return [];

        let reports = [...selectedPatient.reports];

        // 1. Filter by Type
        if (activeFilter !== 'All') {
            reports = reports.filter(r => r.type === activeFilter);
        }

        // 2. Filter by Search Term
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            reports = reports.filter(r =>
                r.title.toLowerCase().includes(lower) ||
                r.type.toLowerCase().includes(lower) ||
                (typeof r.content === 'string' && r.content.toLowerCase().includes(lower))
            );
        }

        return reports.sort((a, b) => b.date.localeCompare(a.date));
    }, [selectedPatient, searchTerm, activeFilter]);

    const handleSaveReport = async (reportData: any, file?: File) => {
        if (selectedPatient) {
            await actions.handleAddReport(selectedPatient.id, reportData, file);
            setIsUploading(false);
            actions.showToast("Document analyzed and added to your health profile.", "success");
        }
    };

    const confirmDelete = async () => {
        if (selectedPatient && selectedReportIds.size > 0) {
            const reportIds = Array.from(selectedReportIds);

            for (const id of reportIds) {
                if (deleteMode === 'permanent') {
                    await actions.handlePermanentDeleteReport(selectedPatient.id, id as string);
                } else {
                    await actions.handleDeleteReport(selectedPatient.id, id as string);
                }
            }

            // Refresh trash list if we just deleted permanently
            if (activeTab === 'trash' && deleteMode === 'permanent') {
                const updated = deletedReports.filter(r => !selectedReportIds.has(r.id));
                setDeletedReports(updated);
            }

            setSelectedReportIds(new Set());
            setIsSelectMode(false);
            setIsDeleteModalOpen(false);
        }
    };

    const handleRestoreSelected = async () => {
        if (selectedPatient && selectedReportIds.size > 0) {
            const reportIds = Array.from(selectedReportIds);
            for (const id of reportIds) {
                await actions.handleRestoreReport(selectedPatient.id, id as string);
            }
            // Remove from local trash state immediately for UI responsiveness
            setDeletedReports(prev => prev.filter(r => !selectedReportIds.has(r.id)));
            setSelectedReportIds(new Set());
            setIsSelectMode(false);
        }
    };

    const toggleReportSelection = (reportId: string) => {
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
        if (selectedReportIds.size > 0) {
            actions.handleAnalyzeReports(Array.from(selectedReportIds));
            setSelectedReportIds(new Set());
            setIsSelectMode(false);
        }
    };

    const handleCompareSelected = () => {
        if (selectedReportIds.size === 2) {
            actions.handleCompareReports(Array.from(selectedReportIds));
            setSelectedReportIds(new Set());
            setIsSelectMode(false);
        }
    };

    if (!selectedPatient) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <ModalLoader inline />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {/* Header / Profile */}
            <header className={`z-20 flex flex-col p-4 transition-all ${isPatientListCollapsed ? 'items-center' : ''} bg-app`}>
                <div className="flex items-center justify-between w-full mb-4">
                    <div className="flex items-center space-x-3">
                        {onBack && !isPatientListCollapsed && (
                            <button onClick={onBack} className="p-1 -ml-2 mr-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Back to Patient List">
                                <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                        )}
                        {/* Account avatar + dropdown */}
                        <div className="relative" ref={accountMenuRef}>
                            <button
                                onClick={() => setIsAccountMenuOpen(prev => !prev)}
                                className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-transparent hover:ring-indigo-400/50 transition-all focus:outline-none focus:ring-indigo-400/60"
                                aria-label="Account menu"
                                title="Account menu"
                            >
                                {userProfile?.photoURL ? (
                                    <img src={userProfile.photoURL} alt={userProfile.displayName || 'Account'} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-6 h-6 text-white" />
                                )}
                            </button>

                            {/* Account dropdown menu */}
                            {isAccountMenuOpen && (
                                <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                    {/* User info header */}
                                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{userProfile?.displayName || 'User'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile?.email}</p>
                                    </div>

                                    <div className="py-1">
                                        {/* Profile / Settings */}
                                        <button
                                            onClick={() => { setIsAccountMenuOpen(false); actions.toggleSettings(); }}
                                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <SettingsIcon className="w-4 h-4 text-gray-400" />
                                            <span>Profile &amp; Settings</span>
                                        </button>

                                        {/* Theme toggle */}
                                        <button
                                            onClick={() => { toggleTheme(); }}
                                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            {theme === 'light' ? <MoonIcon className="w-4 h-4 text-gray-400" /> : <SunIcon className="w-4 h-4 text-gray-400" />}
                                            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                                        </button>
                                    </div>

                                    <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                                        <button
                                            onClick={async () => { setIsAccountMenuOpen(false); try { await logout(); } catch { actions.showToast('Failed to log out.', 'error'); } }}
                                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                            <span>Log Out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {!isPatientListCollapsed && (
                            <div>
                                <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">My Health Record</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedPatient.name}</p>
                            </div>
                        )}
                    </div>
                    {/* Always-visible theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-gray-200/70 dark:hover:bg-gray-700/70 transition-colors"
                        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                        title={theme === 'light' ? 'Dark mode' : 'Light mode'}
                    >
                        {theme === 'light' ? <MoonIcon className="w-5 h-5 text-gray-500" /> : <SunIcon className="w-5 h-5 text-yellow-400" />}
                    </button>
                </div>

                {!isPatientListCollapsed && (
                    <div className="w-full space-y-3">
                        <button
                            onClick={() => setIsUploading(true)}
                            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02]"
                        >
                            <UploadIcon className="w-5 h-5" />
                            <span className="font-semibold text-sm">Upload Record</span>
                        </button>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search your documents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-xs transition-all shadow-inner"
                            />
                        </div>

                        {/* Tab Toggle: Documents vs Extracted Data */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                            <button
                                onClick={() => setActiveTab('documents')}
                                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'documents'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                Documents
                            </button>
                            <button
                                onClick={() => setActiveTab('extracted')}
                                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'extracted'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <SparklesIcon className="w-3 h-3" />
                                Health Data
                            </button>
                            <button
                                onClick={() => setActiveTab('trash')}
                                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${activeTab === 'trash'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <TrashIcon className="w-3 h-3" />
                                Trash
                            </button>
                        </div>

                        {/* Filter Pills (only show for documents tab) */}
                        {activeTab === 'documents' && (
                            <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar mask-gradient-right">
                                {availableTypes.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setActiveFilter(type)}
                                        className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors border ${activeFilter === type
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Upload Modal Overlay */}
            {isUploading && (
                <div className="absolute inset-0 z-50 bg-white dark:bg-gray-900 p-4 flex flex-col">
                    <UploadReportForm onSave={handleSaveReport} onCancel={() => setIsUploading(false)} />
                </div>
            )}

            {/* Content Area: Documents or Extracted Data */}
            {!isPatientListCollapsed ? (
                activeTab === 'extracted' ? (
                    /* Extracted Data Tab */
                    <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar">
                        <ExtractedDataPanel />
                    </div>
                ) : activeTab === 'trash' ? (
                    /* Trash Tab */
                    <div className="flex-1 overflow-y-auto px-4 pb-28 custom-scrollbar">
                        <div className="flex items-center justify-between mb-2 sticky top-0 bg-[#f8fafc] dark:bg-[#020617] py-2 z-10">
                            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                Trash ({deletedReports.length})
                            </h3>
                            <button
                                onClick={() => {
                                    setIsSelectMode(!isSelectMode);
                                    if (isSelectMode) setSelectedReportIds(new Set());
                                }}
                                className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${isSelectMode ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
                            >
                                {isSelectMode ? 'Done' : 'Select'}
                            </button>
                        </div>
                        <div className="space-y-2">
                            {deletedReports.map(report => {
                                const isSelected = selectedReportIds.has(report.id);
                                return (
                                    <div
                                        key={report.id}
                                        onClick={() => {
                                            if (isSelectMode) {
                                                toggleReportSelection(report.id);
                                            }
                                        }}
                                        className={`group flex items-center p-3 rounded-xl cursor-copy transition-all shadow-sm border opacity-75 hover:opacity-100
                                ${isSelected
                                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                                : 'bg-white/60 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border-transparent'
                                            }`}
                                    >
                                        {isSelectMode && (
                                            <div className={`mr-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-red-600 border-red-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                        )}
                                        <div className={`p-2 rounded-lg mr-3 transition-colors bg-gray-100 dark:bg-gray-700`}>
                                            <ReportTypeIcon type={report.type} className={`w-5 h-5 text-gray-500 dark:text-gray-400`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-sm font-semibold truncate text-gray-600 dark:text-gray-300 line-through`}>{report.title}</h4>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-between mt-0.5">
                                                <span>Deleted {report.deletedAt ? formatDate(new Date(report.deletedAt).toISOString()) : ''}</span>
                                            </p>
                                        </div>
                                        {/* Restore Button (Single) */}
                                        {!isSelectMode && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    actions.handleRestoreReport(selectedPatient.id, report.id);
                                                    setDeletedReports(prev => prev.filter(r => r.id !== report.id));
                                                }}
                                                className="ml-2 p-1.5 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                                                title="Restore"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {deletedReports.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                                Trash is empty.
                            </div>
                        )}
                    </div>
                ) : (
                    /* Documents Tab */
                    <div className="flex-1 overflow-y-auto px-4 pb-28 custom-scrollbar">
                        <div className="flex items-center justify-between mb-2 sticky top-0 bg-[#f8fafc] dark:bg-[#020617] py-2 z-10">
                            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                {activeFilter === 'All' ? 'All Documents' : `${activeFilter}s`} ({filteredReports.length})
                            </h3>
                            <button
                                onClick={() => {
                                    setIsSelectMode(!isSelectMode);
                                    if (isSelectMode) setSelectedReportIds(new Set()); // Clear on exit
                                }}
                                className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${isSelectMode ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
                            >
                                {isSelectMode ? 'Done' : 'Select'}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {filteredReports.map(report => {
                                const isSelected = selectedReportIds.has(report.id);
                                return (
                                    <div
                                        key={report.id}
                                        onClick={() => {
                                            if (isSelectMode) {
                                                toggleReportSelection(report.id);
                                            } else {
                                                actions.setViewingReport({ patient: selectedPatient, initialReportId: report.id });
                                            }
                                        }}
                                        className={`group flex items-center p-3 rounded-xl cursor-pointer transition-all shadow-sm border 
                                ${isSelected
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                                : 'bg-white/60 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border-transparent hover:border-blue-200 dark:hover:border-blue-800'
                                            }`}
                                    >
                                        {isSelectMode && (
                                            <div className={`mr-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                        )}

                                        <div className={`p-2 rounded-lg mr-3 transition-colors ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-blue-50 dark:bg-blue-900/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50'}`}>
                                            <ReportTypeIcon type={report.type} className={`w-5 h-5 ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400'}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-800 dark:text-gray-200'}`}>{report.title}</h4>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-between mt-0.5">
                                                <span>{report.type}</span>
                                                <span>{formatDate(report.date)}</span>
                                            </p>
                                        </div>

                                        {/* Quick Action - Single Analyze */}
                                        {!isSelectMode && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    actions.handleAnalyzeSingleReport(report.id);
                                                }}
                                                className="ml-2 p-1.5 rounded-full text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                                                title="Quick Analyze"
                                            >
                                                <SparklesIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {filteredReports.length === 0 && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                                No documents found.
                            </div>
                        )}
                    </div>
                )
            ) : (
                /* Collapsed View */
                <div className="flex flex-col items-center flex-1 py-4 w-full space-y-4">
                    <button
                        onClick={() => setIsUploading(true)}
                        className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"
                        title="Upload Record"
                    >
                        <UploadIcon className="w-5 h-5" />
                    </button>
                    <div className="w-8 h-px bg-gray-300 dark:bg-gray-700" />
                    <div className="flex-1 w-full overflow-y-auto no-scrollbar flex flex-col items-center space-y-2">
                        {filteredReports.map(report => (
                            <button
                                key={report.id}
                                onClick={() => actions.setViewingReport({ patient: selectedPatient, initialReportId: report.id })}
                                className="p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title={`${report.title} (${report.date})`}
                            >
                                <ReportTypeIcon type={report.type} className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={actions.togglePerformanceModal}
                        className="p-2 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Floating Action Buttons (Select Mode) */}
            {isSelectMode && selectedReportIds.size > 0 && !isPatientListCollapsed && (
                <div className="absolute bottom-4 left-4 right-4 z-30 flex flex-col gap-2">
                    {/* Compare Button (Only if exactly 2 selected) */}
                    {selectedReportIds.size === 2 && activeTab !== 'trash' && (
                        <button
                            onClick={handleCompareSelected}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl shadow-xl flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] animate-slideUpFade"
                        >
                            <CompareIcon className="w-5 h-5" />
                            <span className="font-bold">Compare Selected (2)</span>
                        </button>
                    )}
                    {/* Analyze Button */}
                    {activeTab !== 'trash' && (
                        <button
                            onClick={handleAnalyzeSelected}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-xl flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] animate-slideUpFade"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            <span className="font-bold">Analyze Selected ({selectedReportIds.size})</span>
                        </button>
                    )}

                    {/* Trash & Restore Buttons */}
                    {activeTab === 'trash' ? (
                        <>
                            <button
                                onClick={handleRestoreSelected}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-xl flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] animate-slideUpFade"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                <span className="font-bold">Restore Selected ({selectedReportIds.size})</span>
                            </button>
                            <button
                                onClick={() => { setDeleteMode('permanent'); setIsDeleteModalOpen(true); }}
                                className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl shadow-xl flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] animate-slideUpFade"
                            >
                                <TrashIcon className="w-5 h-5" />
                                <span className="font-bold">Delete Forever ({selectedReportIds.size})</span>
                            </button>
                        </>
                    ) : (
                        /* Delete Button (Soft) */
                        <button
                            onClick={() => { setDeleteMode('soft'); setIsDeleteModalOpen(true); }}
                            className="w-full bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 p-3 rounded-xl shadow-sm border border-red-200 dark:border-red-800 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] animate-slideUpFade"
                        >
                            <TrashIcon className="w-5 h-5" />
                            <span className="font-bold">Move to Trash ({selectedReportIds.size})</span>
                        </button>
                    )}
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={deleteMode === 'permanent' ? "Delete Forever" : "Move to Trash"}
                message={deleteMode === 'permanent'
                    ? `Are you sure you want to permanently delete ${selectedReportIds.size} item${selectedReportIds.size !== 1 ? 's' : ''}? This action CANNOT be undone.`
                    : `Are you sure you want to move ${selectedReportIds.size} item${selectedReportIds.size !== 1 ? 's' : ''} to the Trash? You can restore them later.`}
                confirmText={deleteMode === 'permanent' ? "Delete Forever" : "Move to Trash"}
            />
        </div>
    );
};

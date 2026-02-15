
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { DocumentIcon } from './icons/DocumentIcon';
import { UploadIcon } from './icons/UploadIcon';
import { SearchIcon } from './icons/SearchIcon';
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

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: '2-digit'
    });
};

export const HealthRecordSidebar: React.FC = () => {
  const { state, actions } = useAppContext();
  const { selectedPatient, isPatientListCollapsed } = state;
  const { theme, toggleTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Filtering & Selection State
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());

  // Reset selection when patient changes
  useEffect(() => {
      setSelectedReportIds(new Set());
      setIsSelectMode(false);
      setActiveFilter('All');
  }, [selectedPatient?.id]);

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
      
      return reports.sort((a,b) => b.date.localeCompare(a.date));
  }, [selectedPatient, searchTerm, activeFilter]);

  const handleSaveReport = async (reportData: any) => {
      if(selectedPatient) {
          await actions.handleAddReport(selectedPatient.id, reportData);
          setIsUploading(false);
          actions.showToast("Document analyzed and added to your health profile.", "success");
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

  if (!selectedPatient) return <ModalLoader />;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Header / Profile */}
      <header className={`z-20 flex flex-col p-4 transition-all ${isPatientListCollapsed ? 'items-center' : ''} bg-[#f8fafc] dark:bg-[#020617]`}>
         <div className="flex items-center justify-between w-full mb-4">
             <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-6 h-6 text-white" />
                </div>
                {!isPatientListCollapsed && (
                    <div>
                        <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">My Health Record</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{selectedPatient.name}</p>
                    </div>
                )}
             </div>
             {!isPatientListCollapsed && (
                <button 
                  onClick={toggleTheme}
                  className="p-2 text-gray-500 dark:text-gray-400 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                </button>
             )}
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

                {/* Filter Pills */}
                <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar mask-gradient-right">
                    {availableTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setActiveFilter(type)}
                            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors border ${
                                activeFilter === type
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
             </div>
         )}
      </header>

      {/* Upload Modal Overlay */}
      {isUploading && (
          <div className="absolute inset-0 z-50 bg-white dark:bg-gray-900 p-4 flex flex-col">
              <UploadReportForm onSave={handleSaveReport} onCancel={() => setIsUploading(false)} />
          </div>
      )}
      
      {/* Document List */}
      {!isPatientListCollapsed ? (
        <div className="flex-1 overflow-y-auto px-4 pb-28 custom-scrollbar">
            <div className="flex items-center justify-between mb-2 sticky top-0 bg-[#f8fafc] dark:bg-[#020617] py-2 z-10">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    {activeFilter === 'All' ? 'All Documents' : `${activeFilter}s`} ({filteredReports.length})
                </h3>
                <button 
                    onClick={() => {
                        setIsSelectMode(!isSelectMode);
                        if(isSelectMode) setSelectedReportIds(new Set()); // Clear on exit
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
              {selectedReportIds.size === 2 && (
                  <button
                    onClick={handleCompareSelected}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl shadow-xl flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] animate-slideUpFade"
                  >
                      <CompareIcon className="w-5 h-5" />
                      <span className="font-bold">Compare Selected (2)</span>
                  </button>
              )}
              {/* Analyze Button */}
              <button
                onClick={handleAnalyzeSelected}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-xl flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] animate-slideUpFade"
              >
                  <SparklesIcon className="w-5 h-5" />
                  <span className="font-bold">Analyze Selected ({selectedReportIds.size})</span>
              </button>
          </div>
      )}
    </div>
  );
};

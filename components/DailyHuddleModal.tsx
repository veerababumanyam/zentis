
import React, { useEffect } from 'react';
import type { HighRiskPatient, CareOpportunity } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { useAppContext } from '../contexts/AppContext';

interface HuddleSectionProps {
  title: string;
  children: React.ReactNode;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  iconColorClass: string;
}

const HuddleSection: React.FC<HuddleSectionProps> = ({ title, children, Icon, iconColorClass }) => (
    <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center">
            <Icon className={`w-5 h-5 mr-2 ${iconColorClass}`} />
            {title}
        </h3>
        <div className="space-y-2">
            {children}
        </div>
    </div>
);

interface HuddleItemProps {
    item: HighRiskPatient | CareOpportunity;
    onSelect: (id: string) => void;
    onDraftOrder: (id: string, text: string) => void;
    onRemind: (id: string, text: string) => void;
}

const HuddleItem: React.FC<HuddleItemProps> = ({ item, onSelect, onDraftOrder, onRemind }) => {
    const isRisk = 'riskFactor' in item;
    const title = isRisk ? (item as HighRiskPatient).riskFactor : (item as CareOpportunity).opportunity;
    const detailText = item.details;

    return (
        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                        <a href="#" onClick={(e) => { e.preventDefault(); onSelect(item.patientId); }} className="text-blue-600 hover:underline dark:text-blue-400">
                            {item.patientName}
                        </a>
                        {' - '}
                        <span className="font-bold">{title}</span>
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{detailText}</p>
                </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button 
                    onClick={() => onDraftOrder(item.patientId, detailText)}
                    className="flex items-center px-2 py-1 text-[10px] font-medium text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    title="Ask AI to draft an order or plan based on this item"
                >
                    <ClipboardCheckIcon className="w-3 h-3 mr-1" />
                    Draft Order/Plan
                </button>
                <button 
                    onClick={() => onRemind(item.patientId, detailText)}
                    className="flex items-center px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-700/30 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    title="Add a reminder note to the patient's chart"
                >
                    <DocumentIcon className="w-3 h-3 mr-1" />
                    Remind Me
                </button>
            </div>
        </div>
    );
};

export const DailyHuddleModal: React.FC = () => {
  const { state, actions } = useAppContext();
  const { dailyHuddleData, isHuddleLoading, huddleError, allPatients } = state;
  const { toggleHuddleModal, selectPatientFromHuddle, showToast } = actions;
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleHuddleModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleHuddleModal]);

  const handleDraftOrder = (patientId: string, details: string) => {
      actions.selectPatient(patientId);
      toggleHuddleModal();
      // Use the new targetPatientId argument to ensure message sends to correct patient even if state update is lagging
      // We also add a small delay to allow UI transition to chat view
      setTimeout(() => {
          actions.handleSendMessage(`Action from Daily Huddle: Please draft an order or care plan related to: "${details}"`, [], patientId);
      }, 50);
  };

  const handleRemind = async (patientId: string, details: string) => {
      const patient = allPatients.find(p => p.id === patientId);
      if (patient) {
          const currentNotes = patient.notes || "";
          const newNote = `${currentNotes ? currentNotes + '\n' : ''}[Huddle Reminder ${new Date().toLocaleDateString()}]: ${details}`;
          await actions.handleSaveNotes(patientId, newNote);
          showToast(`Reminder saved to ${patient.name}'s notes.`, 'success');
      } else {
          showToast("Patient not found.", 'error');
      }
  };

  const renderContent = () => {
    if (isHuddleLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
            <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Generating Daily Huddle...</h3>
            <p className="text-gray-500 dark:text-gray-400">The AI is analyzing today's schedule to identify key patients and actions.</p>
        </div>
      );
    }
    if (huddleError) {
      return <div className="text-center p-6 text-red-600 dark:text-red-400">{huddleError}</div>;
    }
    if (!dailyHuddleData) {
      return <div className="text-center p-6 text-gray-500 dark:text-gray-400">No huddle data available.</div>;
    }
    return (
        <div className="p-6 space-y-6">
            <p className="text-gray-700 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">{dailyHuddleData.summary}</p>
            
            <HuddleSection title="High-Risk Patients" Icon={AlertTriangleIcon} iconColorClass="text-red-500">
                {dailyHuddleData.highRiskPatients.length > 0 ? (
                    dailyHuddleData.highRiskPatients.map(p => (
                        <HuddleItem 
                            key={p.patientId} 
                            item={p} 
                            onSelect={selectPatientFromHuddle} 
                            onDraftOrder={handleDraftOrder}
                            onRemind={handleRemind}
                        />
                    ))
                ) : <p className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">No specific high-risk patients identified for today.</p>}
            </HuddleSection>
            
            <HuddleSection title="Care Opportunities" Icon={SparklesIcon} iconColorClass="text-green-500">
                {dailyHuddleData.careOpportunities.length > 0 ? (
                    dailyHuddleData.careOpportunities.map(o => (
                        <HuddleItem 
                            key={o.patientId} 
                            item={o} 
                            onSelect={selectPatientFromHuddle} 
                            onDraftOrder={handleDraftOrder}
                            onRemind={handleRemind}
                        />
                    ))
                ) : <p className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">No specific care opportunities identified for today.</p>}
            </HuddleSection>
        </div>
    );
  };
  
  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
        onClick={toggleHuddleModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="huddle-title"
    >
      <div 
        className="bg-gray-100 dark:bg-gray-800/50 dark:backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
          <h2 id="huddle-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <SparklesIcon className="w-6 h-6 mr-2 text-blue-500" />
            AI-Powered Daily Huddle
          </h2>
          <button
            onClick={toggleHuddleModal}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

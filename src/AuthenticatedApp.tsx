import React, { Suspense } from 'react';
import { useAppContext } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import { HealthRecordSidebar } from './components/HealthRecordSidebar';
import { PatientSelector } from './components/PatientSelector';
import { PatientSettingsModal } from './components/PatientSettingsModal';
import { ChatInterfaceStitch as ChatWindow } from './components/ChatInterfaceStitch';
import { ToastContainer } from './components/ToastContainer';
import { ModalLoader } from './components/ModalLoader';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from './components/icons/ChevronRightIcon';
import { LiveAssistant } from './components/LiveAssistant';
import { ClinicalDashboard } from './components/ClinicalDashboard';
import { ApiKeyMissingBanner } from './components/ApiKeyMissingBanner';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { MobileSettingsStitch } from './components/MobileSettingsStitch';
// Lazy load modals to code-split them from the main bundle
const ReportViewerModal = React.lazy(() => import('./components/ReportViewerModal').then(module => ({ default: module.ReportViewerModal })));
const NewPatientConsultationModal = React.lazy(() => import('./components/NewPatientConsultationModal').then(module => ({ default: module.NewPatientConsultationModal })));
const DailyHuddleModal = React.lazy(() => import('./components/DailyHuddleModal').then(module => ({ default: module.DailyHuddleModal })));
const FeedbackModal = React.lazy(() => import('./components/FeedbackModal').then(module => ({ default: module.FeedbackModal })));
const FeedbackForm = React.lazy(() => import('./components/FeedbackForm').then(module => ({ default: module.FeedbackForm })));
const NoteGeneratorModal = React.lazy(() => import('./components/NoteGeneratorModal').then(module => ({ default: module.NoteGeneratorModal })));

export const AuthenticatedApp: React.FC = () => {
    const { state, actions } = useAppContext();
    const { userProfile } = useAuth();

    const {
        viewingReport,
        isConsultationModalOpen,
        isHuddleModalOpen,
        isPerformanceModalOpen,
        isFeedbackFormOpen,
        messageToReview,
        selectedPatient,
        isPatientListCollapsed,
        isNoteModalOpen,
        isDashboardOpen,
        aiSettings
    } = state;

    return (
        <div className="h-screen w-screen relative overflow-hidden font-sans text-gray-800 dark:text-gray-200 selection:bg-blue-500/30">

            {/* Ambient Background Layer */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-app">
                <div className="liquid-blob top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/20 dark:bg-blue-600/20 mix-blend-multiply dark:mix-blend-screen filter blur-3xl"></div>
                <div className="liquid-blob top-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-400/20 dark:bg-purple-600/20 mix-blend-multiply dark:mix-blend-screen filter blur-3xl animation-delay-2000"></div>
                <div className="liquid-blob bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-teal-400/20 dark:bg-teal-600/20 mix-blend-multiply dark:mix-blend-screen filter blur-3xl animation-delay-4000"></div>
            </div>

            {/* Content Layer */}
            <div className="relative z-10 flex flex-col h-full w-full">
                {/* API Key Missing Banner */}
                {!aiSettings.apiKey && (
                    <ApiKeyMissingBanner onOpenSettings={actions.togglePerformanceModal} />
                )}
                <div className="flex flex-1 min-h-0">
                    <>
                        <ToastContainer />

                        {/* Left Sidebar - Personal Health Record or Patient List */}
                        <aside className={`
                            h-full md:relative absolute inset-0 z-20 flex flex-col flex-shrink-0 
                            transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) 
                            ${isPatientListCollapsed ? 'md:w-20' : 'md:w-80'} 
                            glass-panel border-r border-white/20 dark:border-white/10
                            ${state.mobileView === 'chat' && selectedPatient ? 'hidden md:flex' : 'flex'}
                        `}>
                            <div className="flex-1 flex flex-col min-h-0">
                                {userProfile?.role === 'patient' || selectedPatient ? (
                                    <HealthRecordSidebar
                                        onBack={userProfile?.role !== 'patient' ? () => actions.selectPatient('') : undefined}
                                    />
                                ) : (
                                    <PatientSelector />
                                )}
                            </div>
                            <button
                                onClick={actions.togglePatientList}
                                className="hidden md:flex items-center justify-center absolute top-1/2 -right-3.5 z-30 w-8 h-8 glass-card rounded-full text-gray-600 dark:text-gray-300 hover:scale-110 transition-transform duration-200 shadow-lg"
                                aria-label={isPatientListCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            >
                                {isPatientListCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                            </button>
                        </aside>

                        {/* Main Content Area - Chat Assistant */}
                        <main className={`flex-1 flex flex-col min-w-0 w-full h-full relative z-10`}>
                            {selectedPatient ? (
                                <ChatWindow />
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 font-medium">
                                    Select a patient to view details
                                </div>
                            )}
                        </main>

                        {/* Right Sidebar (Dashboard) - Glass Pane */}
                        {selectedPatient && (
                            <aside className={`
                        absolute md:relative right-0 inset-y-0 z-30 
                        h-full transition-all duration-300 ease-in-out
                        ${isDashboardOpen ? 'translate-x-0 w-80' : 'translate-x-full md:translate-x-0 w-0 md:w-16'}
                        glass-panel border-l border-white/20 dark:border-white/10
                    `}>
                                <ClinicalDashboard />
                            </aside>
                        )}

                        {/* Overlay for mobile dashboard */}
                        {selectedPatient && isDashboardOpen && (
                            <div
                                className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-sm"
                                onClick={actions.toggleDashboard}
                            />
                        )}

                        <LiveAssistant />

                        <Suspense fallback={<ModalLoader />}>
                            {isNoteModalOpen && (
                                <NoteGeneratorModal />
                            )}

                            {viewingReport && (
                                <ReportViewerModal />
                            )}

                            {isConsultationModalOpen && (
                                <NewPatientConsultationModal
                                    onClose={actions.toggleConsultationModal}
                                    onCreateAndAnalyze={actions.handleCreateAndAnalyze}
                                />
                            )}

                            {isHuddleModalOpen && (
                                <DailyHuddleModal />
                            )}

                            {isPerformanceModalOpen && (
                                <>
                                    <div className="hidden md:block">
                                        <FeedbackModal />
                                    </div>
                                    <div className="md:hidden">
                                        <MobileSettingsStitch />
                                    </div>
                                </>
                            )}

                            {isFeedbackFormOpen && messageToReview && (
                                <FeedbackForm />
                            )}
                        </Suspense>
                        <PatientSettingsModal />
                    </>
                </div>
                <PWAInstallPrompt />
            </div>

        </div>
    );
};

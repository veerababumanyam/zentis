
import React, { useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { PreloadedQuestions } from './PreloadedQuestions';
import { SummarizeIcon } from './icons/SummarizeIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ChatComposer } from './ChatComposer';
import { useAppContext } from '../contexts/AppContext';
import { Message } from '../types';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { RadioIcon } from './icons/RadioIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';

export const ChatWindow: React.FC = () => {
  const { state, actions } = useAppContext();
  const { selectedPatient: patient, messages, isChatLoading, recommendedQuestions, activeOperation, chatStatusText } = state;
  const { handleSendMessage, openFeedbackForm, setViewingReport, setMobileView, toggleLiveMode, handleGenerateClinicalNote, handleRunMultiSpecialistReview, handleRunClinicalDebate, cancelActiveOperation } = actions;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatLoading, scrollToBottom]);

  const handlePreloadedQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const handleOpenReports = () => {
    if (patient && patient.reports.length > 0) {
      const initialReportId = patient.reports.sort((a, b) => b.date.localeCompare(a.date))[0].id;
      setViewingReport({ patient, initialReportId });
    }
  };

  if (!patient) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Initializing Health Assistant...
      </div>
    );
  }

  const getAlertStyle = (alertText: string) => {
    const lowerText = alertText.toLowerCase();
    if (lowerText.includes('risk') || lowerText.includes('uncontrolled')) {
      return {
        base: 'bg-amber-100/80 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200/50 dark:border-amber-800/50',
      };
    }
    if (lowerText.includes('stemi') || lowerText.includes('atrial fibrillation')) {
      return {
        base: 'bg-red-100/80 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-200/50 dark:border-red-800/50',
      };
    }
    return {
      base: 'bg-blue-100/80 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200/50 dark:border-blue-800/50',
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Floating Header */}
      <header className="p-4 mx-4 mt-4 mb-2 glass-panel rounded-2xl flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          {/* Back Button (Mobile Only) */}
          <button
            onClick={() => setMobileView('list')}
            className="p-2 -ml-2 text-gray-500 rounded-full md:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Back to document list"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>

          {/* Left Side: Context Info */}
          <div className="flex-1 min-w-0 flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-blue-500 to-teal-400 rounded-lg shadow-lg">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate tracking-tight">
                Personal Health Assistant
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:flex items-center mt-0.5">
                Analyzing {patient.reports.length} documents
              </p>
            </div>
          </div>

          {/* Right Side: Alerts & Action Buttons */}
          <div className="flex-shrink-0 flex items-center space-x-3">
            {/* Alerts */}
            {patient.criticalAlerts && patient.criticalAlerts.length > 0 && (
              <div className="flex items-center gap-2 hidden lg:flex">
                {patient.criticalAlerts.map(alert => {
                  const style = getAlertStyle(alert);
                  return (
                    <button
                      key={alert}
                      onClick={() => handleSendMessage(`Analyze the clinical risk associated with: ${alert}`)}
                      disabled={isChatLoading}
                      className={`px-3 py-1 text-xs font-bold rounded-full transition-all hover:scale-105 border backdrop-blur-sm ${style.base}`}
                      title={`Ask AI to analyze the specific risks associated with ${alert}`}
                    >
                      {alert}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleLiveMode}
                className="flex flex-col items-center justify-center p-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors gap-0.5"
                title="Live Audio/Video Assistant"
                disabled={isChatLoading}
              >
                <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-full">
                  <RadioIcon className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide hidden lg:inline">Live</span>
              </button>

              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden lg:block"></div>

              <button
                onClick={handleRunMultiSpecialistReview}
                className="flex flex-col items-center justify-center p-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors gap-0.5"
                title="Medical Board: Get a simulated multi-specialist review"
                disabled={isChatLoading}
              >
                <UsersIcon className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden lg:inline">Board</span>
              </button>

              <button
                onClick={handleRunClinicalDebate}
                className="flex flex-col items-center justify-center p-2 rounded-xl text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors gap-0.5"
                title="Clinical Critics: Start a multi-agent debate to find consensus"
                disabled={isChatLoading}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden lg:inline">Critics</span>
              </button>

              <button
                onClick={() => handleSendMessage('Identify my top 3 clinical risks based on these reports')}
                className="flex flex-col items-center justify-center p-2 rounded-xl text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors gap-0.5"
                title="Risk Analysis"
                disabled={isChatLoading}
              >
                <AlertTriangleIcon className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden lg:inline">Risks</span>
              </button>

              <button
                onClick={() => handleSendMessage('Calculate cardiovascular risk scores: CHA2DS2-VASc, HAS-BLED, and ASCVD')}
                className="flex flex-col items-center justify-center p-2 rounded-xl text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors gap-0.5"
                title="Calculate Risk Scores"
                disabled={isChatLoading}
              >
                <CalculatorIcon className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden lg:inline">Scores</span>
              </button>

              <button
                onClick={() => handleSendMessage('Generate a summary of my current conditions, vitals, and critical alerts')}
                className="flex flex-col items-center justify-center p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors gap-0.5"
                title="Summarize My Health"
                disabled={isChatLoading}
              >
                <SummarizeIcon className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden lg:inline">Brief</span>
              </button>
              <button
                onClick={handleGenerateClinicalNote}
                className="flex flex-col items-center justify-center p-2 rounded-xl text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors gap-0.5"
                title="Generate Summary Note / Report"
                disabled={isChatLoading}
              >
                <ClipboardCheckIcon className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden lg:inline">Report</span>
              </button>

              {/* Stop button — visible only during active operations */}
              {activeOperation && (
                <>
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden lg:block"></div>
                  <button
                    onClick={cancelActiveOperation}
                    className="flex flex-col items-center justify-center p-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors gap-0.5 animate-pulse"
                    title="Stop current operation"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    <span className="text-[10px] font-bold hidden lg:inline">Stop</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 px-4 md:px-8 py-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-6 pb-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              patient={patient}
              onViewReport={(reportId) => setViewingReport({ patient, initialReportId: reportId })}
              onAnalyzeReport={actions.handleAnalyzeSingleReport}
              onGeneratePrescription={actions.handleGeneratePrescription}
              onFeedback={openFeedbackForm}
              onContentResize={scrollToBottom}
            />
          ))}
          {/* Ephemeral status bubble — shows meaningful phase text during operations */}
          {chatStatusText && (
            <div className="flex items-start space-x-3 opacity-80">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center shadow-md">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <div className="glass-panel rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 flex items-center space-x-2">
                {chatStatusText !== 'Stopped' && (
                  <svg className="w-4 h-4 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                )}
                {chatStatusText === 'Stopped' && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                )}
                <span>{chatStatusText}</span>
              </div>
            </div>
          )}
          {isChatLoading && !chatStatusText && <MessageBubble message={{ id: 0, sender: 'ai', type: 'text', text: '...' }} isLoading={true} />}
          <div id="messages-end" ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Composer Area */}
      <div className="p-4 pt-0 z-20">
        <div className="glass-panel rounded-3xl p-1 shadow-xl border border-white/40 dark:border-white/10">
          <PreloadedQuestions
            questions={recommendedQuestions}
            onQuestionClick={handlePreloadedQuestion}
            disabled={isChatLoading}
          />
          <ChatComposer onSendMessage={handleSendMessage} isLoading={isChatLoading} />
        </div>
      </div>
    </div>
  );
};

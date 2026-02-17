
import React, { useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { PreloadedQuestions } from './PreloadedQuestions';
import { ChatComposer } from './ChatComposer';
import { useAppContext } from '../contexts/AppContext';
import { ChatHeaderStitch } from './ChatHeaderStitch';
import { QuickActionsStitch } from './QuickActionsStitch';
import { SparklesIcon } from './icons/SparklesIcon';

export const ChatInterfaceStitch: React.FC = () => {
    const { state, actions } = useAppContext();
    const { selectedPatient: patient, messages, isChatLoading, recommendedQuestions, chatStatusText } = state;
    const { handleSendMessage, setViewingReport, setMobileView, openFeedbackForm, handleGeneratePrescription, handleAnalyzeSingleReport } = actions;

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

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'upload_report':
                // Ideally trigger upload in composer, for now just a prompt
                handleSendMessage("I want to upload a new medical report.");
                break;
            case 'view_vitals':
                handleSendMessage("Show me my recent vitals trends.");
                break;
            case 'analyze_symptoms':
                handleSendMessage("Help me analyze my current symptoms.");
                break;
            case 'emergency':
                handleSendMessage("I think I am having a medical emergency.");
                break;
        }
    };

    if (!patient) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Initializing Health Assistant...
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full relative bg-stitch-bg-light dark:bg-stitch-bg-dark font-display">
            <ChatHeaderStitch
                onOpenSettings={actions.togglePatientList}
            />

            {/* Messages Area */}
            <div className="flex-1 px-4 md:px-8 py-4 overflow-y-auto custom-scrollbar space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] md:max-w-[80%] min-w-0 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            {/* 
                    We reuse MessageBubble but wrapper controls alignment. 
                    We might want to pass a 'stitch' variant prop later, 
                    but for now sticking to the plan of wrapping.
                 */}
                            <MessageBubble
                                message={msg}
                                patient={patient}
                                onViewReport={(reportId) => setViewingReport({ patient, initialReportId: reportId })}
                                onAnalyzeReport={handleAnalyzeSingleReport}
                                onGeneratePrescription={handleGeneratePrescription}
                                onFeedback={openFeedbackForm}
                                onContentResize={scrollToBottom}
                            />
                        </div>
                    </div>
                ))}

                {/* Ephemeral status bubble */}
                {chatStatusText && (
                    <div className="flex items-start space-x-3 opacity-80 animate-fadeIn">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-stitch-accent-dark flex items-center justify-center border border-white/5">
                            <SparklesIcon className="w-4 h-4 text-stitch-primary" />
                        </div>
                        <div className="glass-panel rounded-2xl p-3 text-sm text-gray-600 dark:text-gray-300 flex items-center space-x-2 border border-white/5">
                            {chatStatusText !== 'Stopped' && (
                                <div className="w-2 h-2 bg-stitch-primary rounded-full animate-ping" />
                            )}
                            <span>{chatStatusText}</span>
                        </div>
                    </div>
                )}

                {isChatLoading && !chatStatusText && (
                    <div className="flex items-start gap-3 max-w-[85%] self-start animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-stitch-accent-dark flex items-center justify-center shrink-0 border border-white/5">
                            <span className="material-symbols-outlined text-stitch-primary text-sm">smart_toy</span>
                        </div>
                        <div className="ai-bubble glass-effect p-4 rounded-2xl border border-white/5">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-stitch-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-stitch-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-stitch-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div id="messages-end" ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <section className="sticky bottom-0 pb-6 pt-2 bg-gradient-to-t from-stitch-bg-light via-stitch-bg-light to-transparent dark:from-stitch-bg-dark dark:via-stitch-bg-dark z-20">
                <QuickActionsStitch onAction={handleQuickAction} />

                <div className="px-4">
                    {/* We wrap ChatComposer to give it the Stitch floating look */}
                    <div className="bg-white dark:bg-stitch-accent-dark/80 rounded-2xl shadow-2xl backdrop-blur-md border border-gray-200 dark:border-white/5">
                        <PreloadedQuestions
                            questions={recommendedQuestions}
                            onQuestionClick={handlePreloadedQuestion}
                            disabled={isChatLoading}
                        />
                        <ChatComposer onSendMessage={handleSendMessage} isLoading={isChatLoading} />
                    </div>
                </div>
            </section>
        </div>
    );
};


import React, { useState, useRef } from 'react';
import type { Message, SuggestedAction, Patient, UploadableFile } from '../types';
import { UserIcon } from './icons/UserIcon';
import { LogoIcon } from './icons/LogoIcon';
import { TrendChart } from './TrendChart';
import { GdmtChecklist } from './GdmtChecklist';
import { ReportComparisonTable } from './ReportComparisonTable';
import { DocumentIcon } from './icons/DocumentIcon';
import { DifferentialDiagnosis } from './DifferentialDiagnosis';
import { BRAND_NAME } from '../constants/branding';
import { RiskStratificationCalculator } from './RiskStratificationCalculator';
import { ContraindicationChecker } from './ContraindicationChecker';
import { DosageOptimization } from './DosageOptimization';
import { EjectionFractionTrend } from './EjectionFractionTrend';
import { ArrhythmiaAnalysis } from './ArrhythmiaAnalysis';
import { BloodPressureAnalysis } from './BloodPressureAnalysis';
import { CardiacBiomarkerInterpretation } from './CardiacBiomarkerInterpretation';
import { InterventionalCardiologyReport } from './InterventionalCardiologyReport';
import { EpDeviceReport } from './EpDeviceReport';
import { AdvancedHeartFailureReport } from './AdvancedHeartFailureReport';
import { InlineReportViewer } from './InlineReportViewer';
import { CtaAnalysisReport } from './CtaAnalysisReport';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { ThumbsDownIcon } from './icons/ThumbsDownIcon';
import { SmartSummary } from './SmartSummary';
import { Prescription } from './Prescription';
import { VitalTrendsChart } from './VitalTrendsChart';
import { FileViewerModal } from './FileViewerModal';
import { ReportTypeIcon } from './icons/ReportTypeIcon';
import { getFileTypeFromFile, extractMedicationEvents } from '../utils';
import { HccCodingOpportunity } from './HccCodingOpportunity';
import { MultiSpecialistReview } from './MultiSpecialistReview';
import { ClinicalDebate } from './ClinicalDebate';
import { SpecialtyReport } from './SpecialtyReport';
import { SpeakerIcon } from './icons/SpeakerIcon';
import * as apiManager from '../services/apiManager';
import { useAppContext } from '../contexts/AppContext';

interface MessageBubbleProps {
    message: Message;
    isLoading?: boolean;
    patient?: Patient | null;
    onViewReport?: (reportId: string) => void;
    onAnalyzeReport?: (reportId: string) => void;
    onGeneratePrescription?: (meds: Array<{ drug: string; suggestedDose: string; }>) => void;
    onFeedback?: (message: Message) => void;
    onContentResize?: () => void;
}

const SuggestedActionButton: React.FC<{ action: SuggestedAction; onViewReport: (reportId: string) => void; }> = React.memo(({ action, onViewReport }) => {
    if (action.type !== 'view_report' || !action.reportId) return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
            <button
                onClick={() => onViewReport(action.reportId!)}
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all shadow-sm border border-blue-100 dark:border-blue-800"
            >
                <DocumentIcon className="w-4 h-4" />
                <span>{action.label}</span>
            </button>
        </div>
    );
});

// Helper for decoding audio
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

const formatText = (text: string): React.ReactNode[] => {
    // Split by code blocks first (triple backticks)
    const parts = text.split(/(```[\s\S]*?```)/g);
    const elements: React.ReactNode[] = [];

    parts.forEach((part, partIndex) => {
        // Handle Code Block
        if (part.startsWith('```') && part.endsWith('```')) {
            // Remove the backticks and optional language identifier
            const content = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
            elements.push(
                <div key={`code-${partIndex}`} className="my-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider border-b border-gray-200 dark:border-gray-700">
                        Data Snippet
                    </div>
                    <pre className="bg-gray-50 dark:bg-gray-900/50 p-3 overflow-x-auto text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        <code>{content}</code>
                    </pre>
                </div>
            );
            return;
        }

        // Handle Normal Text (headers, lists, bold)
        const lines = part.trim().split('\n');
        let currentList: React.ReactNode[] = [];

        const renderBold = (line: string, key: string) => {
            const parts = line.split('**');
            return (
                <React.Fragment key={key}>
                    {parts.map((textPart, index) =>
                        index % 2 === 1 ? <strong key={index} className="font-bold text-gray-900 dark:text-white">{textPart}</strong> : textPart
                    )}
                </React.Fragment>
            );
        };

        const flushList = () => {
            if (currentList.length > 0) {
                elements.push(
                    <ul key={`ul-${elements.length}-${partIndex}`} className="list-disc pl-5 space-y-1 my-2 marker:text-blue-500">
                        {currentList}
                    </ul>
                );
                currentList = [];
            }
        };

        lines.forEach((line, lineIndex) => {
            const key = `line-${partIndex}-${lineIndex}`;

            if (!line.trim()) return;

            if (line.startsWith('### ')) {
                flushList();
                elements.push(<h3 key={key} className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-white">{renderBold(line.substring(4), key)}</h3>);
                return;
            }

            if (line.trim().startsWith('- ')) {
                currentList.push(<li key={key} className="pl-1">{renderBold(line.trim().substring(2), key)}</li>);
                return;
            }

            flushList();
            elements.push(<p key={key} className="mb-2 last:mb-0 leading-relaxed">{renderBold(line, key)}</p>);
        });

        flushList();
    });

    return elements;
};

const AiMessageContent: React.FC<{ message: Message; patient?: Patient | null; onViewReport?: (reportId: string) => void; onAnalyzeReport?: (reportId: string) => void; onGeneratePrescription?: (meds: Array<{ drug: string; suggestedDose: string; }>) => void; onContentResize?: () => void; }> = React.memo(({ message, patient, onViewReport, onAnalyzeReport, onGeneratePrescription, onContentResize }) => {

    // Extract medication events once if patient is available
    const medEvents = patient ? extractMedicationEvents(patient) : [];

    switch (message.type) {
        case 'trend_chart':
            return <TrendChart message={message} medicationEvents={medEvents} onViewReport={onViewReport} />;
        case 'vital_trends':
            return <VitalTrendsChart message={message} medicationEvents={medEvents} />;
        case 'ef_trend':
            return <EjectionFractionTrend message={message} medicationEvents={medEvents} onViewReport={onViewReport} />;
        case 'hcc_coding':
            return <HccCodingOpportunity message={message} />;
        case 'gdmt_checklist':
            return <GdmtChecklist message={message} onViewReport={onViewReport} />;
        case 'report_comparison':
            return <ReportComparisonTable message={message} onViewReport={onViewReport} />;
        case 'differential_diagnosis':
            return <DifferentialDiagnosis message={message} onViewReport={onViewReport} />;
        case 'risk_stratification':
            return <RiskStratificationCalculator message={message} onViewReport={onViewReport} />;
        case 'contraindication_checker':
            return <ContraindicationChecker message={message} onViewReport={onViewReport} />;
        case 'dosage_optimization':
            return <DosageOptimization message={message} onViewReport={onViewReport} onGeneratePrescription={onGeneratePrescription} />;
        case 'arrhythmia_analysis':
            return <ArrhythmiaAnalysis message={message} onViewReport={onViewReport} />;
        case 'blood_pressure_analysis':
            return <BloodPressureAnalysis message={message} onViewReport={onViewReport} />;
        case 'cardiac_biomarker':
            return <CardiacBiomarkerInterpretation message={message} onViewReport={onViewReport} />;
        case 'interventional_cardiology':
            return <InterventionalCardiologyReport message={message} onViewReport={onViewReport} />;
        case 'ep_device_report':
            return <EpDeviceReport message={message} onViewReport={onViewReport} />;
        case 'advanced_heart_failure':
            return <AdvancedHeartFailureReport message={message} onViewReport={onViewReport} />;
        case 'cta_analysis':
            return <CtaAnalysisReport message={message} onViewReport={onViewReport} />;
        case 'neurology_analysis':
        case 'oncology_analysis':
        case 'universal_specialist':
            return <SpecialtyReport message={message} onViewReport={onViewReport} />;
        case 'smart_summary':
            return <SmartSummary message={message} />;
        case 'prescription':
            return <Prescription message={message} />;
        case 'multi_specialist_review':
            return <MultiSpecialistReview message={message} />;
        case 'clinical_debate':
            return <ClinicalDebate message={message} onContentResize={onContentResize} />;
        case 'report_viewer':
            if (patient && onAnalyzeReport) {
                const report = patient.reports.find(r => r.id === message.reportId);
                if (!report) {
                    return <div className="text-red-500">Error: The referenced report (ID: {message.reportId}) could not be found for this patient.</div>;
                }

                return (
                    <div>
                        <div className="prose prose-sm max-w-none mb-3 text-gray-800 dark:text-gray-200 dark:prose-invert">{formatText(message.title)}</div>
                        <InlineReportViewer
                            report={report}
                            onAnalyzeReport={onAnalyzeReport}
                        />
                    </div>
                );
            }
            return null;
        case 'text':
            if (message.sender === 'ai') {
                return (
                    <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-200 dark:prose-invert break-words">
                        {formatText(message.text)}
                        {message.suggestedAction && onViewReport && (
                            <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
                        )}
                    </div>
                );
            }
            return null;
        default:
            return null;
    }
});

const UserMessageContent: React.FC<{ message: Message; onViewFiles: (files: UploadableFile[], startIndex: number) => void }> = React.memo(({ message, onViewFiles }) => {
    switch (message.type) {
        case 'text':
            return <p className="font-medium text-stitch-bg-dark break-words">{message.text}</p>;
        case 'image':
            // Resolve image source: storageUrl > base64 > thumbnail
            const imgSrc = message.storageUrl
                ? message.storageUrl
                : message.base64Data
                    ? `data:${message.mimeType};base64,${message.base64Data}`
                    : message.thumbnailBase64
                        ? `data:image/jpeg;base64,${message.thumbnailBase64}`
                        : '';
            const imageFile: UploadableFile = {
                name: "Uploaded Image",
                mimeType: message.mimeType,
                base64Data: message.base64Data || '',
                previewUrl: imgSrc,
                storageUrl: message.storageUrl,
                thumbnailBase64: message.thumbnailBase64,
            };
            return imgSrc ? (
                <div onClick={() => onViewFiles([imageFile], 0)} className="p-1.5 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-colors backdrop-blur-sm">
                    <img
                        src={imgSrc}
                        alt="Uploaded report"
                        className="max-w-xs max-h-64 rounded-lg shadow-sm"
                    />
                </div>
            ) : (
                <div className="p-3 bg-white/10 rounded-xl text-white/60 text-sm italic">
                    📷 Image uploaded (preview unavailable)
                </div>
            );
        case 'multi_file':
            return (
                <div>
                    {message.text && <p className="mb-3 font-medium">{message.text}</p>}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        {message.files.map((file, index) => {
                            // Resolve file image source: storageUrl > previewUrl > thumbnail
                            const fileSrc = file.storageUrl || file.previewUrl || (file.thumbnailBase64 ? `data:image/jpeg;base64,${file.thumbnailBase64}` : '');
                            return (
                                <div
                                    key={index}
                                    onClick={() => onViewFiles(message.files, index)}
                                    className="relative group aspect-square bg-white/10 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden border border-white/20 hover:border-white/40 transition-all"
                                >
                                    {fileSrc ? (
                                        <img src={fileSrc} alt={file.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <div className="text-white/40 text-xs text-center p-2">📎 {file.name}</div>
                                    )}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                        <ReportTypeIcon type={getFileTypeFromFile(file)} className="w-6 h-6 text-white drop-shadow-md" />
                                        <p className="text-white text-xs text-center font-bold truncate mt-1 drop-shadow-md w-full px-1">{file.name}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
        default:
            return null;
    }
});

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, isLoading = false, patient, onViewReport, onAnalyzeReport, onGeneratePrescription, onFeedback, onContentResize }) => {
    const { state } = useAppContext();
    const { aiSettings } = state;
    const isAI = message.sender === 'ai';
    const [viewingFiles, setViewingFiles] = useState<{ files: UploadableFile[], startIndex: number } | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    const handleViewFiles = (files: UploadableFile[], startIndex: number) => {
        setViewingFiles({ files, startIndex });
    };

    const handlePlayTTS = async () => {
        if (isPlaying) {
            audioContextRef.current?.close();
            audioContextRef.current = null;
            setIsPlaying(false);
            return;
        }

        setIsPlaying(true);
        let textToRead = '';
        if (message.type === 'text') textToRead = message.text;
        else if (message.type === 'smart_summary') textToRead = message.narrativeSummary;
        else if ('summary' in message && typeof message.summary === 'string') textToRead = message.summary;
        else textToRead = "Audio output not supported for this message type.";

        const audioData = await apiManager.generateSpeech(textToRead.substring(0, 500), aiSettings); // Limit for preview

        if (audioData) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = ctx;
            const outputNode = ctx.createGain();
            const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            outputNode.connect(ctx.destination);

            source.addEventListener('ended', () => {
                setIsPlaying(false);
                ctx.close();
                audioContextRef.current = null;
            });
            source.start();
        } else {
            setIsPlaying(false);
        }
    };

    if (isAI && isLoading) {
        return (
            <div className="flex items-start space-x-3">
                <div className="w-8 h-8 flex-shrink-0 bg-stitch-primary/10 dark:bg-stitch-primary/20 rounded-full flex items-center justify-center animate-pulse">
                    <LogoIcon className="w-5 h-5 text-stitch-primary" />
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2 border border-white/40 dark:border-gray-700/40">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-0"></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-300"></span>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-end space-x-3 group ${isAI ? 'justify-start' : 'justify-end'}`}>
            {isAI && (
                <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-stitch-primary to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-stitch-primary/30 mb-2">
                    <LogoIcon className="w-5 h-5 text-white" />
                </div>
            )}
            <div
                className={`relative p-5 rounded-2xl shadow-lg border backdrop-blur-md transition-all duration-300 break-words min-w-0
        ${isAI
                        ? 'glass-card text-gray-800 dark:text-gray-200 rounded-bl-none max-w-4xl hover:shadow-xl'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-none max-w-xl border-transparent shadow-blue-500/20'
                    }`}
            >
                {isAI ? (
                    <AiMessageContent message={message} patient={patient} onViewReport={onViewReport} onAnalyzeReport={onAnalyzeReport} onGeneratePrescription={onGeneratePrescription} onContentResize={onContentResize} />
                ) : (
                    <UserMessageContent message={message} onViewFiles={handleViewFiles} />
                )}

                {isAI && (
                    <div className="absolute -bottom-8 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={handlePlayTTS}
                            title={isPlaying ? "Stop" : "Read Aloud"}
                            className={`p-1.5 rounded-full shadow-md border border-white/20 dark:border-gray-700/50 backdrop-blur-sm transition-all ${isPlaying ? 'bg-blue-600 text-white animate-pulse' : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 hover:text-blue-600'}`}
                        >
                            <SpeakerIcon className="w-3.5 h-3.5" />
                        </button>
                        {onFeedback && (
                            <>
                                <button onClick={() => onFeedback(message)} title="Helpful" className="p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-md border border-white/20 dark:border-gray-700/50 text-gray-400 hover:text-green-600 hover:scale-110 transition-all backdrop-blur-sm">
                                    <ThumbsUpIcon className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => onFeedback(message)} title="Not helpful" className="p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-full shadow-md border border-white/20 dark:border-gray-700/50 text-gray-400 hover:text-red-600 hover:scale-110 transition-all backdrop-blur-sm">
                                    <ThumbsDownIcon className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
            {!isAI && (
                <div className="w-8 h-8 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-2">
                    <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </div>
            )}

            {viewingFiles && (
                <FileViewerModal
                    files={viewingFiles.files}
                    startIndex={viewingFiles.startIndex}
                    onClose={() => setViewingFiles(null)}
                />
            )}
        </div>
    );
});

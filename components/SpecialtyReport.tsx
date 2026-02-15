
import React from 'react';
import type { NeurologyMessage, OncologyMessage, UniversalSpecialistMessage, SuggestedAction } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { LungsIcon, StomachIcon, BoneIcon, DropIcon, KidneyIcon, DnaIcon, JointIcon, BugIcon, BrainCircuitIcon, EyeIcon, ElderIcon, SkinIcon, BrainIcon } from './icons/SpecialtyIcons';

interface SpecialtyReportProps {
    message: NeurologyMessage | OncologyMessage | UniversalSpecialistMessage;
    onViewReport?: (reportId: string) => void;
}

const SuggestedActionButton: React.FC<{ action: SuggestedAction; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
    if (!action || action.type !== 'view_report' || !action.reportId) return null;
    return (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
                onClick={() => onViewReport(action.reportId!)}
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
                <DocumentIcon className="w-4 h-4" />
                <span>{action.label}</span>
            </button>
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const lower = status.toLowerCase();
    let colorClass = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    if (lower.includes('critical') || lower.includes('abnormal') || lower.includes('high')) colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    else if (lower.includes('normal') || lower.includes('stable')) colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colorClass}`}>{status}</span>;
}

// Icon Mapping
const getSpecialtyIcon = (specialty: string) => {
    const s = specialty.toLowerCase();
    if (s.includes('gastro')) return { Icon: StomachIcon, bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-600 dark:text-orange-300' };
    if (s.includes('pulm')) return { Icon: LungsIcon, bg: 'bg-cyan-100 dark:bg-cyan-900/50', text: 'text-cyan-600 dark:text-cyan-300' };
    if (s.includes('endo') || s.includes('diabetes')) return { Icon: DropIcon, bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-600 dark:text-purple-300' };
    if (s.includes('ortho') || s.includes('bone')) return { Icon: BoneIcon, bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-600 dark:text-stone-300' };
    if (s.includes('nephro') || s.includes('kidney')) return { Icon: KidneyIcon, bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-600 dark:text-yellow-300' };
    if (s.includes('neuro')) return { Icon: BrainIcon, bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-600 dark:text-indigo-300' };
    if (s.includes('onco')) return { Icon: DnaIcon, bg: 'bg-pink-100 dark:bg-pink-900/50', text: 'text-pink-600 dark:text-pink-300' };
    if (s.includes('hema') || s.includes('blood')) return { Icon: DropIcon, bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-600 dark:text-red-300' };
    if (s.includes('rheum')) return { Icon: JointIcon, bg: 'bg-teal-100 dark:bg-teal-900/50', text: 'text-teal-600 dark:text-teal-300' };
    if (s.includes('derm') || s.includes('skin')) return { Icon: SkinIcon, bg: 'bg-rose-100 dark:bg-rose-900/50', text: 'text-rose-600 dark:text-rose-300' };
    
    // New mappings
    if (s.includes('infect') || s.includes('micro')) return { Icon: BugIcon, bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300' };
    if (s.includes('psych') || s.includes('mental')) return { Icon: BrainCircuitIcon, bg: 'bg-violet-100 dark:bg-violet-900/50', text: 'text-violet-600 dark:text-violet-300' };
    if (s.includes('urol')) return { Icon: KidneyIcon, bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-600 dark:text-yellow-300' };
    if (s.includes('opht') || s.includes('eye')) return { Icon: EyeIcon, bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-600 dark:text-blue-300' };
    if (s.includes('geria') || s.includes('elder')) return { Icon: ElderIcon, bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-300' };

    // Default
    return { Icon: SparklesIcon, bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-600 dark:text-indigo-300' };
};

export const SpecialtyReport: React.FC<SpecialtyReportProps> = React.memo(({ message, onViewReport }) => {
    
    // 1. NEUROLOGY RENDERER
    if (message.type === 'neurology_analysis') {
        return (
            <div className="space-y-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
                        <BrainIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Modality: {message.modality}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Regional Findings</h4>
                    {message.findings.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-700">
                            <div>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 mr-2">{item.region}:</span>
                                <span className="text-sm text-gray-600 dark:text-gray-300">{item.finding}</span>
                            </div>
                            <StatusBadge status={item.significance} />
                        </div>
                    ))}
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-r-lg">
                    <h4 className="font-bold text-purple-800 dark:text-purple-300">Impression</h4>
                    <p className="text-sm text-purple-900 dark:text-purple-200 mt-1">{message.impression}</p>
                    {message.strokeProtocolStatus && (
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-2 uppercase tracking-wider">⚠ {message.strokeProtocolStatus}</p>
                    )}
                </div>

                <div>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Recommendations</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                        {message.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                    </ul>
                </div>

                {message.suggestedAction && onViewReport && (
                    <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
                )}
            </div>
        );
    }

    // 2. ONCOLOGY RENDERER
    if (message.type === 'oncology_analysis') {
        return (
            <div className="space-y-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 flex-shrink-0 bg-pink-100 dark:bg-pink-900/50 rounded-full flex items-center justify-center">
                        <DnaIcon className="w-6 h-6 text-pink-600 dark:text-pink-300" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{message.tumorSite} - {message.histology}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {message.staging && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">TNM Staging</h4>
                            <div className="flex space-x-2 mt-1 font-mono text-sm">
                                <span title="Tumor">T:{message.staging.t}</span>
                                <span title="Node">N:{message.staging.n}</span>
                                <span title="Metastasis">M:{message.staging.m}</span>
                            </div>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">{message.staging.stage}</p>
                        </div>
                    )}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Biomarkers</h4>
                        <ul className="mt-1 space-y-1">
                            {message.biomarkers.map((bio, i) => (
                                <li key={i} className="text-xs flex justify-between">
                                    <span className="font-semibold">{bio.name}</span>
                                    <span className={bio.status.includes('+') || bio.status.includes('Pos') ? 'text-red-500 font-bold' : 'text-green-500'}>{bio.status}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Treatment Protocol</h4>
                    <p className="text-sm text-blue-900 dark:text-blue-200">{message.treatmentPlan}</p>
                </div>

                {message.suggestedAction && onViewReport && (
                    <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
                )}
            </div>
        );
    }

    // 3. UNIVERSAL / SPECIALTY AGENTS RENDERER
    if (message.type === 'universal_specialist') {
        const { Icon, bg, text } = getSpecialtyIcon(message.specialty);
        
        return (
            <div className="space-y-4">
                <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${bg}`}>
                        <Icon className={`w-6 h-6 ${text}`} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${text}`}>{message.specialty} Consult</p>
                    </div>
                </div>

                {message.keyFindings.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {message.keyFindings.map((finding, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{finding.label}</span>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{finding.value}</span>
                                    <StatusBadge status={finding.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">Assessment</h4>
                    <p>{message.clinicalAssessment}</p>
                    
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mt-3">Plan</h4>
                    <ul className="list-disc pl-5">
                        {message.plan.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                </div>

                {message.suggestedAction && onViewReport && (
                    <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
                )}
            </div>
        );
    }

    return null;
});

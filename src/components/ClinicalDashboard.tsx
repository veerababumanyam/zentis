
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SidebarRightIcon } from './icons/SidebarRightIcon';
import { HeartPulseIcon } from './icons/HeartPulseIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { PillIcon } from './icons/PillIcon';
import { ActivityIcon } from './icons/ActivityIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { SettingsIcon } from './icons/SettingsIcon';
import { AlertCircleIcon } from './icons/AlertCircleIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { aggregateClinicalData } from '../utils/clinicalDataAggregator';
import type { ClinicalSnapshotData, VitalGroup, LabGroup } from '../utils/clinicalDataAggregator';
import type { ClinicalTask } from '../types';
import type { MedicationDocument, DiagnosisDocument } from '../services/databaseSchema';

// --- REUSABLE SUB-COMPONENTS ---

const DashboardCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    date?: string | null;
    badge?: string | null;
}> = ({ title, icon, children, date, badge }) => (
    <div className="glass-card rounded-2xl p-4 transition-all hover:scale-[1.01] hover:shadow-lg">
        <div className="flex items-center justify-between mb-3 border-b border-gray-200/50 dark:border-gray-700/50 pb-2">
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                {icon}
                <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
                {badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{badge}</span>
                )}
            </div>
            {date && (
                <span className="text-[10px] text-gray-400 font-mono" title={`Data from ${date}`}>
                    {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
            )}
        </div>
        <div className="space-y-2">
            {children}
        </div>
    </div>
);

const DataRow: React.FC<{
    label: string;
    value: string;
    unit?: string;
    highlight?: boolean;
    subtext?: string;
}> = ({ label, value, unit, highlight, subtext }) => (
    <div className="flex justify-between items-baseline group" title={`${label}: ${value} ${unit || ''}`}>
        <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">{label}</span>
            {subtext && <span className="text-[9px] text-gray-400 dark:text-gray-500">{subtext}</span>}
        </div>
        <span className={`text-sm font-semibold tracking-tight ${highlight ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-200'}`}>
            {value} {unit && <span className="text-xs text-gray-400 font-normal ml-0.5">{unit}</span>}
        </span>
    </div>
);

/** Formats BP as "120/80" or a single vital value */
const formatVitalValue = (v: VitalGroup): string => {
    if (v.type === 'BP' && v.value2 != null) return `${v.value}/${v.value2}`;
    return String(v.value);
};

// --- VITALS HERO CARD ---

const VitalsHeroCard: React.FC<{ vitals: VitalGroup[] }> = ({ vitals }) => {
    const bp = vitals.find(v => v.type === 'BP');
    const hr = vitals.find(v => v.type === 'HR');
    const spo2 = vitals.find(v => v.type === 'O2 Sat');
    const latestDate = vitals.length > 0
        ? vitals.reduce((best, v) => {
              const t = new Date(v.date).getTime();
              return t > best ? t : best;
          }, 0)
        : 0;

    return (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group hover:scale-[1.01] transition-transform">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <HeartPulseIcon className="w-16 h-16" />
            </div>
            <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Latest Vitals</span>
                {latestDate > 0 && (
                    <span className="text-[10px] text-blue-200 font-mono">
                        {new Date(latestDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>
            <div className="flex justify-between items-end relative z-10">
                <div title="Blood Pressure">
                    <span className="text-4xl font-bold tracking-tighter">
                        {bp ? formatVitalValue(bp) : '--/--'}
                    </span>
                    <span className="text-xs text-blue-100 block font-medium mt-1 opacity-80">
                        {bp ? bp.unit : 'mmHg'}
                    </span>
                </div>
                <div className="text-right" title="Heart Rate">
                    <span className="text-2xl font-semibold">{hr ? String(hr.value) : '--'}</span>
                    <span className="text-xs text-blue-100 block font-medium mt-1 opacity-80">
                        {hr ? hr.unit : 'bpm'}
                    </span>
                </div>
                {spo2 && (
                    <div className="text-right" title="SpO2">
                        <span className="text-2xl font-semibold">{spo2.value}%</span>
                        <span className="text-xs text-blue-100 block font-medium mt-1 opacity-80">SpO₂</span>
                    </div>
                )}
            </div>
            {/* Additional vitals row */}
            {vitals.filter(v => !['BP', 'HR', 'O2 Sat'].includes(v.type)).length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-2 relative z-10">
                    {vitals.filter(v => !['BP', 'HR', 'O2 Sat'].includes(v.type)).map(v => (
                        <div key={v.type} className="text-center">
                            <span className="text-sm font-semibold">{formatVitalValue(v)}</span>
                            <span className="text-[10px] text-blue-200 block">{v.label} ({v.unit})</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- CONDITIONS LIST ---

const ConditionsList: React.FC<{ conditions: DiagnosisDocument[] }> = ({ conditions }) => {
    const [expanded, setExpanded] = useState(false);
    const visibleCount = expanded ? conditions.length : 4;
    const visible = conditions.slice(0, visibleCount);

    return (
        <div className="space-y-1.5">
            {visible.map((dx, i) => (
                <div key={dx.id ?? i} className="flex items-start justify-between gap-2 group p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start gap-2 min-w-0">
                        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                            dx.status === 'active' ? 'bg-green-500' : dx.status === 'resolved' ? 'bg-gray-400' : 'bg-yellow-500'
                        }`} />
                        <div className="min-w-0">
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block truncate" title={dx.name}>{dx.name}</span>
                            {dx.icd10 && <span className="text-[9px] text-gray-400 dark:text-gray-500">{dx.icd10}</span>}
                        </div>
                    </div>
                    <span className="text-[9px] text-gray-400 flex-shrink-0 capitalize">{dx.status}</span>
                </div>
            ))}
            {conditions.length > 4 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[10px] text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 font-medium w-full text-center pt-1"
                >
                    {expanded ? 'Show less' : `+${conditions.length - 4} more`}
                </button>
            )}
        </div>
    );
};

// --- MEDICATIONS LIST ---

const MedicationsList: React.FC<{ medications: MedicationDocument[] }> = ({ medications }) => {
    const [expanded, setExpanded] = useState(false);
    const visibleCount = expanded ? medications.length : 5;
    const visible = medications.slice(0, visibleCount);

    return (
        <div className="space-y-1.5">
            {visible.map((med, i) => (
                <div key={med.id ?? i} className="flex items-start justify-between gap-2 group p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="min-w-0">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block truncate" title={med.name}>
                            {med.name}
                        </span>
                        <span className="text-[9px] text-gray-400">
                            {[med.dose, med.frequency, med.route].filter(Boolean).join(' · ')}
                        </span>
                    </div>
                    <span className={`text-[9px] flex-shrink-0 px-1.5 py-0.5 rounded-full font-medium ${
                        med.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : med.status === 'held'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                        {med.status}
                    </span>
                </div>
            ))}
            {medications.length > 5 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[10px] text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 font-medium w-full text-center pt-1"
                >
                    {expanded ? 'Show less' : `+${medications.length - 5} more`}
                </button>
            )}
        </div>
    );
};

// --- LABS LIST ---

const LabsList: React.FC<{ labs: LabGroup[] }> = ({ labs }) => {
    const [expanded, setExpanded] = useState(false);
    const visibleCount = expanded ? labs.length : 6;
    const visible = labs.slice(0, visibleCount);

    return (
        <div className="space-y-1">
            {visible.map((lab, i) => (
                <DataRow
                    key={i}
                    label={lab.testName}
                    value={String(lab.value)}
                    unit={lab.unit}
                    highlight={lab.isAbnormal}
                    subtext={lab.referenceRange ? `Ref: ${lab.referenceRange}` : undefined}
                />
            ))}
            {labs.length > 6 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[10px] text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 font-medium w-full text-center pt-1"
                >
                    {expanded ? 'Show less' : `+${labs.length - 6} more`}
                </button>
            )}
        </div>
    );
};

// --- TASK LIST (preserved) ---

const TaskList: React.FC<{
    tasks: ClinicalTask[];
    onAddTask: (text: string) => void;
    onToggleTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
}> = ({ tasks, onAddTask, onToggleTask, onDeleteTask }) => {
    const [newTaskText, setNewTaskText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            onAddTask(newTaskText);
            setNewTaskText('');
        }
    };

    return (
        <div>
            <div className="space-y-2 mb-3">
                {tasks.length === 0 && <p className="text-xs text-gray-400 italic text-center">No action items.</p>}
                {tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between group p-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <input
                                type="checkbox"
                                checked={task.isCompleted}
                                onChange={() => onToggleTask(task.id)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                            />
                            <span className={`text-xs truncate ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`} title={task.text}>
                                {task.text}
                            </span>
                        </div>
                        <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Task"
                        >
                            <TrashIcon className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="relative">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add new task..."
                    className="w-full pl-2 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-800 dark:text-gray-200 placeholder-gray-400"
                />
                <button
                    type="submit"
                    disabled={!newTaskText.trim()}
                    className="absolute right-1 top-1 p-0.5 text-blue-500 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <PlusCircleIcon className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};

// --- SUMMARY HEADER CARD ---

const SummaryHeader: React.FC<{ snapshot: ClinicalSnapshotData }> = ({ snapshot }) => {
    if (snapshot.summarySegments.length === 0) return null;

    return (
        <div className="glass-card rounded-2xl p-3">
            <div className="flex flex-wrap gap-2">
                {snapshot.summarySegments.map((seg, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                        {seg}
                    </span>
                ))}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const ClinicalDashboard: React.FC = () => {
    const { state, actions } = useAppContext();
    const { selectedPatient, isDashboardOpen } = state;
    const { toggleDashboard, handleUpdateTasks, showToast, toggleSettings, extractedData } = actions;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    // Aggregate extracted data into the clinical snapshot
    const snapshot: ClinicalSnapshotData = useMemo(
        () => aggregateClinicalData(extractedData),
        [extractedData]
    );

    const tasks = selectedPatient?.tasks ?? [];

    const handleAddTask = async (text: string) => {
        if (!selectedPatient) return;
        const newTask: ClinicalTask = {
            id: `t_${Date.now()}`,
            text,
            isCompleted: false,
            createdAt: new Date().toISOString()
        };
        await handleUpdateTasks(selectedPatient.id, [...(selectedPatient.tasks || []), newTask]);
    };

    const handleToggleTask = async (id: string) => {
        if (!selectedPatient) return;
        const updatedTasks = (selectedPatient.tasks || []).map(t =>
            t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
        );
        await handleUpdateTasks(selectedPatient.id, updatedTasks);
    };

    const requestDeleteTask = (id: string) => {
        setTaskToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteTask = async () => {
        if (!selectedPatient || !taskToDelete) return;
        const updatedTasks = (selectedPatient.tasks || []).filter(t => t.id !== taskToDelete);
        await handleUpdateTasks(selectedPatient.id, updatedTasks);
        setTaskToDelete(null);
        showToast('Task deleted.', 'info');
    };

    if (!selectedPatient) return null;

    if (!isDashboardOpen) {
        return (
            <div className="w-16 border-l border-white/20 dark:border-white/10 glass-panel flex flex-col items-center py-4 space-y-4">
                <button
                    onClick={toggleDashboard}
                    className="flex flex-col items-center justify-center p-2 rounded-xl text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800/50 dark:text-gray-400 transition-all hover:scale-110 shadow-sm gap-0.5 w-12 h-12"
                    title="Open Clinical Snapshot Dashboard"
                >
                    <ActivityIcon className="w-6 h-6" />
                    <span className="text-[8px] font-bold uppercase">View</span>
                </button>
            </div>
        );
    }

    return (
        <div className="w-80 flex flex-col h-full overflow-hidden">
            <header className="p-4 border-b border-white/20 dark:border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-2 text-gray-800 dark:text-gray-100">
                    <ActivityIcon className="w-5 h-5 text-blue-600" />
                    <h2 className="text-sm font-bold tracking-wide">CLINICAL SNAPSHOT</h2>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={toggleSettings}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-white/20 rounded-lg transition-colors"
                        title="Patient Settings"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>

                    <button
                        onClick={toggleDashboard}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 hover:bg-white/20 rounded-lg transition-colors"
                        title="Close Dashboard"
                    >
                        <SidebarRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">

                {/* Empty State — no reports and no extracted data */}
                {!snapshot.hasData && (!selectedPatient.reports || selectedPatient.reports.length === 0) && (
                    <div className="glass-card rounded-2xl p-5 text-center space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <DocumentIcon className="w-6 h-6 text-blue-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">No Health Records Yet</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Upload medical documents (lab results, imaging, prescriptions) to populate your clinical dashboard with personalized insights.
                        </p>
                    </div>
                )}

                {/* Reports uploaded but no extracted data yet */}
                {!snapshot.hasData && selectedPatient.reports && selectedPatient.reports.length > 0 && (
                    <div className="glass-card rounded-2xl p-5 text-center space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                            <AlertCircleIcon className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Processing Documents</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            {selectedPatient.reports.length} document{selectedPatient.reports.length !== 1 ? 's' : ''} uploaded. Clinical data is being extracted — this snapshot will update automatically.
                        </p>
                    </div>
                )}

                {/* --- DYNAMIC SNAPSHOT (only when data exists) --- */}
                {snapshot.hasData && (
                    <>
                        {/* Summary chips */}
                        <SummaryHeader snapshot={snapshot} />

                        {/* Vitals Hero (only if vitals extracted) */}
                        {snapshot.vitalGroups.length > 0 && (
                            <VitalsHeroCard vitals={snapshot.vitalGroups} />
                        )}

                        {/* Action Items / Tasks */}
                        <DashboardCard title="Action Items" icon={<ClipboardListIcon className="w-4 h-4" />} date={null}>
                            <TaskList
                                tasks={tasks}
                                onAddTask={handleAddTask}
                                onToggleTask={handleToggleTask}
                                onDeleteTask={requestDeleteTask}
                            />
                        </DashboardCard>

                        {/* Active Conditions (only if conditions extracted) */}
                        {snapshot.conditions.length > 0 && (
                            <DashboardCard
                                title="Conditions"
                                icon={<ClipboardListIcon className="w-4 h-4" />}
                                badge={String(snapshot.conditions.filter(c => c.status === 'active').length) + ' active'}
                            >
                                <ConditionsList conditions={snapshot.conditions} />
                            </DashboardCard>
                        )}

                        {/* Current Medications (only if medications extracted) */}
                        {snapshot.medications.length > 0 && (
                            <DashboardCard
                                title="Medications"
                                icon={<PillIcon className="w-4 h-4" />}
                                badge={String(snapshot.medications.filter(m => m.status === 'active').length) + ' active'}
                            >
                                <MedicationsList medications={snapshot.medications} />
                            </DashboardCard>
                        )}

                        {/* Latest Labs (only if labs extracted) */}
                        {snapshot.labGroups.length > 0 && (
                            <DashboardCard
                                title="Latest Labs"
                                icon={<BeakerIcon className="w-4 h-4" />}
                                date={snapshot.labGroups[0]?.date}
                                badge={snapshot.labGroups.some(l => l.isAbnormal) ? 'abnormal' : null}
                            >
                                <LabsList labs={snapshot.labGroups} />
                            </DashboardCard>
                        )}
                    </>
                )}

                {/* Action Items shown even when no extracted data, as long as patient exists */}
                {!snapshot.hasData && (selectedPatient.reports?.length ?? 0) > 0 && (
                    <DashboardCard title="Action Items" icon={<ClipboardListIcon className="w-4 h-4" />} date={null}>
                        <TaskList
                            tasks={tasks}
                            onAddTask={handleAddTask}
                            onToggleTask={handleToggleTask}
                            onDeleteTask={requestDeleteTask}
                        />
                    </DashboardCard>
                )}

                {/* Footer */}
                {snapshot.hasData && (
                    <div className="pt-2 border-t border-white/20 dark:border-white/10">
                        <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 italic">
                            Auto-extracted from {snapshot.totalDataPoints} data point{snapshot.totalDataPoints !== 1 ? 's' : ''} across all uploaded documents.
                        </p>
                    </div>
                )}
            </div>

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteTask}
                title="Delete Task?"
                message="Are you sure you want to delete this action item? This cannot be undone."
            />
        </div>
    );
};

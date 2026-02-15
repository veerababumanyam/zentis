
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SidebarRightIcon } from './icons/SidebarRightIcon';
import { HeartPulseIcon } from './icons/HeartPulseIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { EcgWaveformIcon } from './icons/EcgWaveformIcon';
import { PillIcon } from './icons/PillIcon';
import { ActivityIcon } from './icons/ActivityIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { extractMedicationEvents } from '../utils';
import type { Report, Patient, MedicationEvent, ClinicalTask } from '../types';

// Helper to get text content from a report
const getReportContent = (report: Report | undefined): string => {
    if (!report) return '';
    if (typeof report.content === 'string') return report.content;
    if (typeof report.content === 'object' && 'rawText' in report.content) return (report.content as any).rawText;
    return '';
};

// --- DATA EXTRACTION HELPERS ---

const extractEchoData = (patient: Patient) => {
    const echoReport = patient.reports
        .filter(r => r.type === 'Echo')
        .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!echoReport) return { lvef: 'N/A', date: null };

    const content = getReportContent(echoReport);
    const lvefMatch = content.match(/LVEF\)?:\s*(\d+)%?/i);
    const lvef = lvefMatch ? `${lvefMatch[1]}%` : 'N/A';

    return { lvef, date: echoReport.date };
};

const extractLabData = (patient: Patient) => {
    const labReport = patient.reports
        .filter(r => r.type === 'Lab' && getReportContent(r))
        .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (!labReport) return { creatinine: 'N/A', potassium: 'N/A', egfr: 'N/A', date: null };

    const content = getReportContent(labReport);
    const crMatch = content.match(/Creatinine:\s*(\d+(\.\d+)?)/i);
    const kMatch = content.match(/Potassium:\s*(\d+(\.\d+)?)/i);
    const egfrMatch = content.match(/eGFR:\s*(\d+(\.\d+)?)/i);

    return {
        creatinine: crMatch ? crMatch[1] : 'N/A',
        potassium: kMatch ? kMatch[1] : 'N/A',
        egfr: egfrMatch ? egfrMatch[1] : 'N/A',
        date: labReport.date
    };
};

const extractRhythm = (patient: Patient) => {
    // Prefer Holter, then ECG
    const ecgReports = patient.reports
        .filter(r => r.type === 'ECG')
        .sort((a, b) => b.date.localeCompare(a.date));

    const latestEcg = ecgReports[0];
    if (!latestEcg) return { rhythm: 'Unknown', date: null };

    const content = getReportContent(latestEcg);
    // Simple heuristic for rhythm extraction
    let rhythm = 'See Report';
    if (content.match(/Sinus Rhythm/i)) rhythm = 'Sinus Rhythm';
    else if (content.match(/Atrial Fibrillation/i)) rhythm = 'Atrial Fibrillation';
    else if (content.match(/Paced/i)) rhythm = 'Paced Rhythm';
    else {
        const rhythmMatch = content.match(/Rhythm:\s*([^\n]+)/i);
        if (rhythmMatch) rhythm = rhythmMatch[1].substring(0, 20) + (rhythmMatch[1].length > 20 ? '...' : '');
    }

    return { rhythm, date: latestEcg.date };
};

const extractAnticoagulation = (patient: Patient) => {
    const meds = patient.currentStatus.medications.map(m => m.toLowerCase());
    const doacs = ['apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban', 'eliquis', 'xarelto'];
    const warfarin = ['warfarin', 'coumadin', 'jantoven'];

    let status = 'None';
    if (meds.some(m => doacs.some(d => m.includes(d)))) status = 'DOAC';
    else if (meds.some(m => warfarin.some(w => m.includes(w)))) status = 'Warfarin';
    else if (meds.some(m => m.includes('aspirin') && m.includes('clopidogrel'))) status = 'DAPT';
    else if (meds.some(m => m.includes('aspirin'))) status = 'Aspirin';

    // Quick CHA2DS2-VASc Calc (Approximation)
    let score = 0;
    const hx = patient.medicalHistory.map(h => h.description.toLowerCase()).join(' ');
    if (hx.includes('heart failure') || hx.includes('hfref') || hx.includes('hfpef')) score++;
    if (hx.includes('hypertension')) score++;
    if (patient.age >= 75) score += 2;
    if (hx.includes('diabetes')) score++;
    if (hx.includes('stroke') || hx.includes('tia')) score += 2;
    if (hx.includes('vascular') || hx.includes('cad') || hx.includes('pad') || hx.includes('mi')) score++;
    if (patient.age >= 65 && patient.age < 75) score++;
    if (patient.gender === 'Female') score++;

    return { status, score };
};

const DashboardCard: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, date?: string | null }> = ({ title, icon, children, date }) => (
    <div className="glass-card rounded-2xl p-4 transition-all hover:scale-[1.01] hover:shadow-lg">
        <div className="flex items-center justify-between mb-3 border-b border-gray-200/50 dark:border-gray-700/50 pb-2">
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                {icon}
                <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
            </div>
            {date && <span className="text-[10px] text-gray-400 font-mono" title={`Data from ${date}`}>{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
        </div>
        <div className="space-y-2">
            {children}
        </div>
    </div>
);

const DataRow: React.FC<{ label: string, value: string, unit?: string, highlight?: boolean }> = ({ label, value, unit, highlight }) => (
    <div className="flex justify-between items-baseline group" title={`${label}: ${value} ${unit || ''}`}>
        <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">{label}</span>
        <span className={`text-sm font-semibold tracking-tight ${highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
            {value} {unit && <span className="text-xs text-gray-400 font-normal ml-0.5">{unit}</span>}
        </span>
    </div>
);

const TimelineView: React.FC<{ events: MedicationEvent[] }> = ({ events }) => {
    // Take top 5 most recent events reversed (newest at top)
    const recentEvents = [...events].reverse().slice(0, 5);

    if (recentEvents.length === 0) return <p className="text-xs text-gray-400 italic p-4 text-center">No recent major events recorded.</p>;

    return (
        <div className="relative pl-4 space-y-4 py-2">
            {/* Vertical Line */}
            <div className="absolute top-2 bottom-2 left-[19px] w-px bg-gray-200 dark:bg-gray-700"></div>

            {recentEvents.map((event, index) => (
                <div key={index} className="relative flex items-start space-x-3 group">
                    {/* Dot */}
                    <div className="relative z-10 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900 mt-1.5 shadow-sm group-hover:scale-125 transition-transform"></div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{event.title}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5" title={event.details}>
                            {event.details}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const TaskList: React.FC<{ tasks: ClinicalTask[], onAddTask: (text: string) => void, onToggleTask: (id: string) => void, onDeleteTask: (id: string) => void }> = ({ tasks, onAddTask, onToggleTask, onDeleteTask }) => {
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

export const ClinicalDashboard: React.FC = () => {
    const { state, actions } = useAppContext();
    const { selectedPatient, isDashboardOpen } = state;
    const { toggleDashboard, handleUpdateTasks, showToast } = actions;

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    const data = useMemo(() => {
        if (!selectedPatient) return null;
        return {
            echo: extractEchoData(selectedPatient),
            labs: extractLabData(selectedPatient),
            rhythm: extractRhythm(selectedPatient),
            anticoag: extractAnticoagulation(selectedPatient),
            events: extractMedicationEvents(selectedPatient),
            tasks: selectedPatient.tasks || []
        };
    }, [selectedPatient]);

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
                    <a
                        href="http://localhost:5001"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-500 p-1 hover:bg-white/20 rounded-lg transition-colors"
                        title="Open ADK Inspector"
                    >
                        <SidebarRightIcon className="w-5 h-5 rotate-180" /> {/* Reusing icon for external link visual */}
                    </a>
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
                {/* Empty State for New Users */}
                {(!selectedPatient.reports || selectedPatient.reports.length === 0) && (!selectedPatient.medicalHistory || selectedPatient.medicalHistory.length === 0) && (
                    <div className="glass-card rounded-2xl p-5 text-center space-y-3">
                        <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <ClipboardListIcon className="w-6 h-6 text-blue-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">No Health Records Yet</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Upload medical documents (lab results, imaging, prescriptions) to populate your clinical dashboard with personalized insights.
                        </p>
                    </div>
                )}

                {/* Hemodynamics Card */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group hover:scale-[1.01] transition-transform">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <HeartPulseIcon className="w-16 h-16" />
                    </div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Current Vitals</span>
                    </div>
                    <div className="flex justify-between items-end relative z-10">
                        <div title="Blood Pressure">
                            <span className="text-4xl font-bold tracking-tighter">{selectedPatient.currentStatus.vitals.match(/BP\s*(\d+\/\d+)/i)?.[1] || '--/--'}</span>
                            <span className="text-xs text-blue-100 block font-medium mt-1 opacity-80">mmHg</span>
                        </div>
                        <div className="text-right" title="Heart Rate">
                            <span className="text-2xl font-semibold">{selectedPatient.currentStatus.vitals.match(/HR\s*(\d+)/i)?.[1] || '--'}</span>
                            <span className="text-xs text-blue-100 block font-medium mt-1 opacity-80">bpm</span>
                        </div>
                    </div>
                </div>

                {/* Action Items / Tasks */}
                <DashboardCard title="Action Items" icon={<ClipboardListIcon className="w-4 h-4" />} date={null}>
                    <TaskList
                        tasks={data?.tasks || []}
                        onAddTask={handleAddTask}
                        onToggleTask={handleToggleTask}
                        onDeleteTask={requestDeleteTask}
                    />
                </DashboardCard>

                {/* Key Metrics */}
                <DashboardCard title="Function & Rhythm" icon={<EcgWaveformIcon className="w-4 h-4" />} date={data?.echo.date}>
                    <DataRow label="LVEF" value={data?.echo.lvef || 'N/A'} highlight />
                    <DataRow label="Rhythm" value={data?.rhythm.rhythm || 'Unknown'} />
                </DashboardCard>

                {/* Renal & Electrolytes */}
                <DashboardCard title="Renal & Lytes" icon={<BeakerIcon className="w-4 h-4" />} date={data?.labs.date}>
                    <DataRow label="Creatinine" value={data?.labs.creatinine || 'N/A'} unit="mg/dL" />
                    <DataRow label="eGFR" value={data?.labs.egfr || 'N/A'} unit="mL/min" />
                    <DataRow label="Potassium" value={data?.labs.potassium || 'N/A'} unit="mEq/L" highlight={parseFloat(data?.labs.potassium || '0') > 5.0 || parseFloat(data?.labs.potassium || '0') < 3.5} />
                </DashboardCard>

                {/* Anticoagulation */}
                <DashboardCard title="Anticoagulation" icon={<PillIcon className="w-4 h-4" />} date={null}>
                    <DataRow label="Status" value={data?.anticoag.status || 'None'} highlight={data?.anticoag.status !== 'None'} />
                    <DataRow label="CHA₂DS₂-VASc" value={String(data?.anticoag.score)} />
                </DashboardCard>

                {/* Timeline */}
                <DashboardCard title="Clinical Timeline" icon={<ClipboardListIcon className="w-4 h-4" />} date={null}>
                    <TimelineView events={data?.events || []} />
                </DashboardCard>

                {/* Manual Notes Link */}
                <div className="pt-2 border-t border-white/20 dark:border-white/10">
                    <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 italic">
                        Auto-extracted from latest available reports.
                    </p>
                </div>
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

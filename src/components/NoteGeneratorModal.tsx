


import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { XIcon } from './icons/XIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { ClinicalNote } from '../types';

export const NoteGeneratorModal: React.FC = () => {
    const { state, actions } = useAppContext();
    const { isNoteModalOpen, draftNote, isNoteGenerating, selectedPatient } = state;
    const { toggleNoteModal, handleGenerateClinicalNote, handleSaveNotes, showToast } = actions;

    const [editedNote, setEditedNote] = useState(draftNote);
    const [emrFormat, setEmrFormat] = useState<'Standard' | 'Epic' | 'Cerner'>('Standard');

    useEffect(() => {
        setEditedNote(draftNote);
    }, [draftNote]);

    if (!isNoteModalOpen) return null;

    const formatForEmr = (note: ClinicalNote, format: string) => {
        if (format === 'Epic') {
            return `*** SUBJECTIVE ***\n${note.subjective}\n\n*** OBJECTIVE ***\n${note.objective}\n\n*** ASSESSMENT ***\n${note.assessment}\n\n*** PLAN ***\n${note.plan}`;
        }
        if (format === 'Cerner') {
            return `;Subjective:\n${note.subjective}\n\n;Objective:\n${note.objective}\n\n;Assessment:\n${note.assessment}\n\n;Plan:\n${note.plan}`;
        }
        // Standard
        return `SUBJECTIVE:\n${note.subjective}\n\nOBJECTIVE:\n${note.objective}\n\nASSESSMENT:\n${note.assessment}\n\nPLAN:\n${note.plan}`;
    }

    const handleCopy = () => {
        if (!editedNote) return;
        const text = formatForEmr(editedNote, emrFormat);
        navigator.clipboard.writeText(text);
        showToast(`${emrFormat} formatted note copied to clipboard!`, 'success');
    };

    const handleSave = async () => {
        if (!editedNote || !selectedPatient) return;
        const text = `[AI GENERATED NOTE - ${new Date().toLocaleDateString()}]\n\n${formatForEmr(editedNote, 'Standard')}\n\n---\n`;
        const existingNotes = selectedPatient.notes || '';
        await handleSaveNotes(selectedPatient.id, existingNotes + '\n' + text);
        showToast('Note saved to patient chart.', 'success');
        toggleNoteModal();
    };

    const handleTextChange = (section: keyof typeof editedNote, value: string) => {
        if (editedNote) {
            setEditedNote({ ...editedNote, [section]: value });
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4" onClick={toggleNoteModal}>
            <div className="bg-white dark:bg-gray-900 w-full h-full md:h-[90vh] md:max-w-4xl md:rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <ClipboardCheckIcon className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Clinical Note Generator</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">AI-Drafted SOAP Note</p>
                        </div>
                    </div>
                    <button onClick={toggleNoteModal} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-100 dark:bg-gray-950">
                    {isNoteGenerating ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <RefreshIcon className="w-12 h-12 text-blue-500 animate-spin" />
                            <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">Drafting clinical note...</p>
                            <p className="text-sm text-gray-500">Synthesizing chat history, reports, and vitals.</p>
                        </div>
                    ) : editedNote ? (
                        <>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subjective</label>
                                <textarea
                                    className="w-full min-h-[120px] p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm leading-relaxed"
                                    value={editedNote.subjective}
                                    onChange={(e) => handleTextChange('subjective', e.target.value)}
                                />
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Objective (Interval History & Data)</label>
                                <textarea
                                    className="w-full min-h-[150px] p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm leading-relaxed font-mono"
                                    value={editedNote.objective}
                                    onChange={(e) => handleTextChange('objective', e.target.value)}
                                />
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assessment</label>
                                <textarea
                                    className="w-full min-h-[100px] p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm leading-relaxed"
                                    value={editedNote.assessment}
                                    onChange={(e) => handleTextChange('assessment', e.target.value)}
                                />
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Plan</label>
                                <textarea
                                    className="w-full min-h-[120px] p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm leading-relaxed"
                                    value={editedNote.plan}
                                    onChange={(e) => handleTextChange('plan', e.target.value)}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-gray-500">No note generated yet.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center flex-wrap gap-4">
                    <button
                        onClick={handleGenerateClinicalNote}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        disabled={isNoteGenerating}
                    >
                        <RefreshIcon className={`w-4 h-4 ${isNoteGenerating ? 'animate-spin' : ''}`} />
                        <span>Regenerate</span>
                    </button>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleSave}
                            disabled={isNoteGenerating || !editedNote}
                            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            <DocumentIcon className="w-4 h-4" />
                            <span>Save to App</span>
                        </button>

                        <div className="flex items-center rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-1">
                            <select
                                value={emrFormat}
                                onChange={(e) => setEmrFormat(e.target.value as any)}
                                className="bg-transparent text-sm font-medium text-blue-700 dark:text-blue-300 focus:outline-none cursor-pointer pl-2 pr-1 py-1"
                            >
                                <option value="Standard">Standard</option>
                                <option value="Epic">Epic (.phrase)</option>
                                <option value="Cerner">Cerner</option>
                            </select>
                            <div className="w-px h-4 bg-blue-300 dark:bg-blue-700 mx-2"></div>
                            <button
                                onClick={handleCopy}
                                disabled={isNoteGenerating || !editedNote}
                                className="flex items-center space-x-2 px-3 py-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors disabled:opacity-50"
                            >
                                <ClipboardCheckIcon className="w-4 h-4" />
                                <span>Copy</span>
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};
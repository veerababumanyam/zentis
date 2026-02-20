import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import type { BoardMode } from '../types';

interface BoardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (config: { mode: BoardMode; selectedSpecialties: string[] }) => void;
    type: 'board' | 'debate';
}

const ALL_SPECIALTIES = [
    "Cardiology",
    "Neurology",
    "Oncology",
    "Gastroenterology",
    "Pulmonology",
    "Endocrinology",
    "Orthopedics",
    "Dermatology",
    "Nephrology",
    "Hematology",
    "Rheumatology",
    "Infectious Disease",
    "Psychiatry",
    "Urology",
    "Ophthalmology",
    "Geriatrics"
];

const MODE_CONFIGS: Record<BoardMode, { maxSpecialties: number; maxDebateTurns: number; label: string; description: string; estimatedCalls: string }> = {
    quick: { maxSpecialties: 4, maxDebateTurns: 4, label: 'Quick', description: '4-6 specialists, ~15 seconds', estimatedCalls: '6-8' },
    standard: { maxSpecialties: 8, maxDebateTurns: 6, label: 'Standard', description: '6-8 specialists, ~30 seconds', estimatedCalls: '10-12' },
    comprehensive: { maxSpecialties: 16, maxDebateTurns: 8, label: 'Comprehensive', description: 'All relevant specialists, ~60+ seconds', estimatedCalls: '15-20' }
};

/**
 * Modal for configuring Board Review or Clinical Debate settings.
 * Allows users to select mode (quick/standard/comprehensive) and optionally select specific specialties.
 */
export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
    isOpen,
    onClose,
    onStart,
    type
}) => {
    const { state } = useAppContext();
    const { boardSettings } = state;

    const [mode, setMode] = useState<BoardMode>(boardSettings.mode);
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['Cardiology']);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Reset selections when mode changes
    useEffect(() => {
        const config = MODE_CONFIGS[mode];
        // Always include Cardiology, then fill with top priorities
        const maxSpecialties = type === 'debate' ? 6 : config.maxSpecialties;
        const newSelection = ['Cardiology'];
        for (const specialty of ALL_SPECIALTIES) {
            if (newSelection.length >= maxSpecialties) break;
            if (specialty !== 'Cardiology') {
                newSelection.push(specialty);
            }
        }
        setSelectedSpecialties(newSelection);
    }, [mode, type]);

    if (!isOpen) return null;

    const config = MODE_CONFIGS[mode];
    const maxSelection = type === 'debate' ? 6 : config.maxSpecialties;

    const handleToggleSpecialty = (specialty: string) => {
        if (specialty === 'Cardiology') return; // Cardiology is always required

        setSelectedSpecialties(prev => {
            if (prev.includes(specialty)) {
                // Don't allow deselecting below 2
                if (prev.length <= 2) return prev;
                return prev.filter(s => s !== specialty);
            } else {
                // Don't allow exceeding max
                if (prev.length >= maxSelection) return prev;
                return [...prev, specialty];
            }
        });
    };

    const estimatedCalls = type === 'board'
        ? `${parseInt(config.estimatedCalls.split('-')[0]) + selectedSpecialties.length - 4}-${parseInt(config.estimatedCalls.split('-')[1]) + selectedSpecialties.length - 4}`
        : config.estimatedCalls;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {type === 'board' ? 'Medical Board' : 'Clinical Debate'} Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Mode Selection */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                            Review Mode
                        </label>
                        <div className="space-y-2">
                            {(Object.entries(MODE_CONFIGS) as [BoardMode, typeof MODE_CONFIGS[BoardMode]][]).map(([key, value]) => (
                                <button
                                    key={key}
                                    onClick={() => setMode(key)}
                                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                                        mode === key
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-900 dark:text-white">{value.label}</span>
                                        {mode === key && (
                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{value.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Advanced Options Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between p-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
                    >
                        <span>Advanced: Customize Specialists</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {/* Specialty Selection (Advanced) */}
                    {showAdvanced && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                    Selected: {selectedSpecialties.length} / {maxSelection}
                                </span>
                                <button
                                    onClick={() => {
                                        const newSelection = ['Cardiology'];
                                        for (const specialty of ALL_SPECIALTIES) {
                                            if (newSelection.length >= maxSelection) break;
                                            if (specialty !== 'Cardiology') newSelection.push(specialty);
                                        }
                                        setSelectedSpecialties(newSelection);
                                    }}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Reset to defaults
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                                {ALL_SPECIALTIES.map(specialty => (
                                    <button
                                        key={specialty}
                                        onClick={() => handleToggleSpecialty(specialty)}
                                        disabled={specialty === 'Cardiology'}
                                        className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            selectedSpecialties.includes(specialty)
                                                ? 'bg-blue-500 text-white'
                                                : specialty === 'Cardiology'
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        <span className="truncate block">
                                            {specialty}
                                            {specialty === 'Cardiology' && ' (required)'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Estimated API Calls */}
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-blue-900 dark:text-blue-100">
                            Estimated API calls: <strong>{estimatedCalls}</strong>
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onStart({ mode, selectedSpecialties });
                            // Remember settings
                            // (This would be handled by parent component)
                        }}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                    >
                        Start {type === 'board' ? 'Board Review' : 'Debate'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BoardSettingsModal;

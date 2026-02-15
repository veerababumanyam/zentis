import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { useAppContext } from '../contexts/AppContext';

const SpeechRecognitionAPI = (typeof window !== 'undefined') && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

export const PatientNotes: React.FC = React.memo(() => {
  const { state, actions } = useAppContext();
  const { selectedPatient } = state;
  const { handleSaveNotes } = actions;
  
  const notes = selectedPatient?.notes || '';
  const disabled = !selectedPatient;

  const [currentNotes, setCurrentNotes] = useState(notes);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    setCurrentNotes(notes);
    setHasUnsavedChanges(false);
  }, [notes]);

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      finalTranscriptRef.current = currentNotes ? currentNotes + ' ' : '';
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript.trim() + '. ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setCurrentNotes(finalTranscriptRef.current + interimTranscript);
      setHasUnsavedChanges(true);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [currentNotes]);

  const handleToggleListen = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(prev => !prev);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentNotes(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleSaveClick = async () => {
    if (!hasUnsavedChanges || !selectedPatient) return;
    setIsSaving(true);
    await handleSaveNotes(selectedPatient.id, currentNotes);
    setIsSaving(false);
    setHasUnsavedChanges(false);
  };

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
        Private Notes
      </h3>
      <div className="relative">
        <textarea
          value={currentNotes}
          onChange={handleNoteChange}
          disabled={disabled || isSaving}
          placeholder="Add private notes for this patient..."
          className="w-full h-24 p-2 pr-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Private patient notes"
        />
        {SpeechRecognitionAPI && (
            <button
                onClick={handleToggleListen}
                disabled={disabled || isSaving}
                className={`absolute bottom-2 right-2 p-1.5 rounded-full transition-colors ${
                    isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300'
                }`}
                aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
                title={isListening ? 'Stop dictation' : 'Start dictation'}
            >
                <MicrophoneIcon className="w-4 h-4" />
            </button>
        )}
      </div>
      <button
        onClick={handleSaveClick}
        disabled={!hasUnsavedChanges || isSaving || disabled}
        className="mt-2 w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? 'Saving...' : 'Save Notes'}
      </button>
    </div>
  );
});
import React, { useState, useEffect } from 'react';
import type { Message, Feedback } from '../types';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { ThumbsDownIcon } from './icons/ThumbsDownIcon';
import { useAppContext } from '../contexts/AppContext';

const getMessageText = (message: Message | null): string => {
    if (!message) return '';
    if (message.type === 'text') return message.text;
    // For non-text messages, a more complex representation might be needed in a real app
    return `[${message.type.replace(/_/g, ' ').toUpperCase()} Component]`;
};

export const FeedbackForm: React.FC = () => {
  const { state, actions } = useAppContext();
  const { isFeedbackFormOpen, messageToReview, selectedPatient } = state;
  const { closeFeedbackForm, addFeedback } = actions;
  
  const [rating, setRating] = useState<'good' | 'bad' | null>(null);
  const [correction, setCorrection] = useState('');

  useEffect(() => {
    if (!isFeedbackFormOpen) {
      setRating(null);
      setCorrection('');
    }
  }, [isFeedbackFormOpen]);

  if (!isFeedbackFormOpen || !messageToReview || !selectedPatient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      alert('Please select a rating (thumbs up or down).');
      return;
    }
    addFeedback({
      messageId: messageToReview.id,
      patientId: selectedPatient.id,
      rating,
      correction,
      originalText: getMessageText(messageToReview),
    });
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" 
        onClick={closeFeedbackForm}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-form-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 id="feedback-form-title" className="text-lg font-bold text-gray-800 dark:text-gray-100">Provide Feedback on AI Response</h2>
          <button onClick={closeFeedbackForm} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="font-semibold text-sm text-gray-600 dark:text-gray-300">Original AI Response:</label>
            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
              <div className="prose prose-sm max-w-none dark:prose-invert">{getMessageText(messageToReview)}</div>
            </div>
          </div>
          <div>
            <label className="font-semibold text-sm text-gray-600 dark:text-gray-300">Was this response helpful?</label>
            <div className="mt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setRating('good')}
                className={`p-2 rounded-full border-2 transition-colors ${rating === 'good' ? 'bg-green-100 border-green-500 text-green-600' : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-green-400'}`}
              >
                <ThumbsUpIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setRating('bad')}
                className={`p-2 rounded-full border-2 transition-colors ${rating === 'bad' ? 'bg-red-100 border-red-500 text-red-600' : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-red-400'}`}
              >
                <ThumbsDownIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="correction" className="font-semibold text-sm text-gray-600 dark:text-gray-300">
              Suggested Correction (Optional)
            </label>
            <textarea
              id="correction"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              placeholder="What should the AI have said instead?"
              className="w-full mt-1 p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={closeFeedbackForm} className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
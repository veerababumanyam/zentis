
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface PreloadedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
  disabled: boolean;
}

const QuestionButton: React.FC<{ question: string; onClick: (q: string) => void; disabled: boolean; }> = React.memo(({ question, onClick, disabled }) => (
    <button
        onClick={() => onClick(question)}
        disabled={disabled}
        className="text-xs font-medium text-left px-3 py-1.5 bg-white/50 dark:bg-gray-800/50 text-blue-700 dark:text-blue-200 rounded-full hover:bg-white dark:hover:bg-gray-700 border border-blue-100 dark:border-blue-900/30 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 whitespace-nowrap flex-shrink-0 hover:scale-105"
    >
        {question}
    </button>
));


export const PreloadedQuestions: React.FC<PreloadedQuestionsProps> = React.memo(({
  questions,
  onQuestionClick,
  disabled,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      const isScrollable = el.scrollWidth > el.clientWidth;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(isScrollable && el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      checkScrollability();
      const resizeObserver = new ResizeObserver(checkScrollability);
      resizeObserver.observe(el);
      el.addEventListener('scroll', checkScrollability, { passive: true });
      return () => {
        resizeObserver.disconnect();
        el.removeEventListener('scroll', checkScrollability);
      }
    }
  }, [questions, checkScrollability]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (el) {
      const scrollAmount = direction === 'left' ? -el.clientWidth * 0.8 : el.clientWidth * 0.8;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (questions.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="relative group">
        {canScrollLeft && (
          <button 
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-gray-100/90 to-transparent dark:from-gray-900/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-300"/>
          </button>
        )}
        <div 
          ref={scrollRef} 
          className="flex items-center space-x-2 overflow-x-auto pb-2 -mb-2 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {questions.map((question, index) => (
              <QuestionButton key={`question-${index}`} question={question} onClick={onQuestionClick} disabled={disabled} />
          ))}
        </div>
         {canScrollRight && (
          <button 
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-gray-100/90 to-transparent dark:from-gray-900/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
             <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-300"/>
          </button>
        )}
      </div>
    </div>
  );
});

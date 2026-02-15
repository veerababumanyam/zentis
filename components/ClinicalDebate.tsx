
import React, { useEffect, useRef } from 'react';
import type { ClinicalDebateMessage } from '../types';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';

interface ClinicalDebateProps {
    message: ClinicalDebateMessage;
    onContentResize?: () => void;
}

const getAvatarColor = (role: string) => {
    const hash = role.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
    return colors[hash % colors.length];
};

export const ClinicalDebate: React.FC<ClinicalDebateProps> = React.memo(({ message, onContentResize }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastTranscriptLength = useRef(0);

    // Auto-scroll when new items arrive
    useEffect(() => {
        if (message.transcript.length > lastTranscriptLength.current) {
            lastTranscriptLength.current = message.transcript.length;
            if (containerRef.current) {
                containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
            }
            if (onContentResize) onContentResize();
        }
    }, [message.transcript, onContentResize]);

    // Determine active speaker (last in transcript)
    const activeSpeakerRole = message.transcript.length > 0 ? message.transcript[message.transcript.length - 1].role : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 flex-shrink-0 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center relative">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-orange-600 dark:text-orange-300" />
                    {message.isLive && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>
                    )}
                </div>
                <div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center">
                        {message.title}
                        {message.isLive && <span className="ml-2 text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">Live</span>}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Topic: {message.topic}</p>
                </div>
            </div>

            {/* Participants Bar */}
            {message.participants && message.participants.length > 0 && (
                <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-gray-700">
                    {message.participants.map((p, i) => (
                        <div key={i} className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all duration-300 ${message.isLive && p.role === activeSpeakerRole ? 'bg-orange-100 dark:bg-orange-900/40 ring-2 ring-orange-400 scale-105' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${getAvatarColor(p.role)}`}>
                                {p.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200 leading-tight">{p.name}</span>
                                <span className="text-[8px] text-gray-500 dark:text-gray-400 leading-tight">{p.specialty}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Debate Script */}
            <div ref={containerRef} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 max-h-[400px] overflow-y-auto space-y-4 custom-scrollbar transition-all duration-300 relative">
                {message.transcript.length === 0 && message.isLive && (
                    <div className="flex items-center justify-center h-20 text-gray-400 text-sm animate-pulse">
                        Waiting for specialists to join...
                    </div>
                )}
                
                {message.transcript.map((turn, index) => (
                    <div key={index} className="flex items-start space-x-3 animate-slideUpFade">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm ${getAvatarColor(turn.role)}`}>
                            {turn.speaker.charAt(0)}
                        </div>
                        <div className="flex-1 bg-white dark:bg-gray-800 p-3 rounded-lg rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-xs font-bold text-gray-900 dark:text-white">{turn.speaker}</span>
                                <span className="text-[10px] uppercase text-gray-400 font-semibold tracking-wide">{turn.role}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {turn.text}
                            </p>
                        </div>
                    </div>
                ))}
                
                {message.isLive && (
                    <div className="flex justify-center py-2">
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                            <span>Deliberating...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Final Consensus */}
            {message.consensus && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-r-lg animate-fadeIn shadow-sm">
                    <div className="flex items-center mb-1">
                        <h4 className="font-bold text-orange-800 dark:text-orange-300 uppercase text-xs tracking-wider">Final Consensus Reached</h4>
                        <div className="ml-2 w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed">{message.consensus}</p>
                </div>
            )}
        </div>
    );
});

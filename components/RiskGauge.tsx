
import React from 'react';
import type { RiskScoreItem } from '../types';
import { VerifySourceButton } from './VerifySourceButton';

interface RiskGaugeProps {
  scoreItem: RiskScoreItem;
}

// Map risk level to a color set for gradients
const getRiskColorPalette = (riskLevel: RiskScoreItem['riskLevel']) => {
    switch(riskLevel) {
        case 'Low': return { start: '#4ade80', end: '#22c55e', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' }; // Green
        case 'Borderline': return { start: '#fcd34d', end: '#f59e0b', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' }; // Amber
        case 'Intermediate': return { start: '#fb923c', end: '#ea580c', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' }; // Orange
        case 'High': return { start: '#f87171', end: '#dc2626', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' }; // Red
        case 'Very High': return { start: '#fca5a5', end: '#991b1b', text: 'text-red-800 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' }; // Dark Red
        default: return { start: '#9ca3af', end: '#6b7281', text: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' };
    }
};

const normalizeScore = (name: string, scoreStr: string): number => {
    const cleanScore = parseFloat(scoreStr.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanScore)) return 0;

    if (name.includes('ASCVD')) {
        return Math.min(100, cleanScore); // Already % or raw number
    }
    // Standardizing CHADS/HAS-BLED to a 0-9 scale usually, map to 0-100
    return Math.min(100, (cleanScore / 9) * 100);
};

export const RiskGauge: React.FC<RiskGaugeProps> = React.memo(({ scoreItem }) => {
    const { score, riskLevel, name, description, details } = scoreItem;
    
    const palette = getRiskColorPalette(riskLevel);
    const percentage = normalizeScore(name, score);
    
    // SVG Geometry
    const radius = 40;
    const strokeWidth = 8;
    const center = 50;
    const circumference = Math.PI * radius; // Half circle
    // const arcLength = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className={`rounded-xl p-5 flex flex-col items-center border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] ${palette.bg}`}>
            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-4 text-center h-10 flex items-center justify-center">{name}</h4>
            
            <div className="relative w-48 h-24 mb-2">
                <svg viewBox="0 0 100 55" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id={`grad-${name.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={palette.start} />
                            <stop offset="100%" stopColor={palette.end} />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    
                    {/* Background Track */}
                    <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="#e5e7eb" // gray-200
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className="dark:stroke-gray-700"
                    />
                    
                    {/* Value Arc with Animation */}
                    <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke={`url(#grad-${name.replace(/\s/g, '')})`}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000 ease-out"
                        filter="url(#glow)"
                    />
                    
                    {/* Needle/Value Text */}
                    <text x="50" y="45" textAnchor="middle" className="text-2xl font-bold fill-gray-900 dark:fill-white" fontSize="14">
                        {score}
                    </text>
                    <text x="50" y="60" textAnchor="middle" className={`text-[8px] font-bold uppercase tracking-wider ${palette.text}`} fontSize="6">
                        {riskLevel} Risk
                    </text>
                </svg>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4 min-h-[2.5em]">{description}</p>
            
            {details && details.length > 0 && (
                <div className="w-full bg-white/50 dark:bg-black/20 rounded-lg p-3 space-y-1.5 border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Contributing Factors</p>
                    {details.map((detail, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 group">
                            <span className="truncate pr-2 border-l-2 border-blue-400 pl-2">{detail.text}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <VerifySourceButton verification={detail.verification} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

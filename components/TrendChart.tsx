
import React from 'react';
import type { TrendChartMessage, MedicationEvent } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';
import { PillIcon } from './icons/PillIcon';

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

const SuggestedActionButton: React.FC<{ action: TrendChartMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
    if (!action || action.type !== 'view_report') return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-200/30 dark:border-gray-700/30">
            <button
                onClick={() => onViewReport(action.reportId!)}
                title={`Open report: ${action.label}`}
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
                <DocumentIcon className="w-4 h-4" />
                <span>{action.label}</span>
            </button>
        </div>
    );
};

export const TrendChart: React.FC<{ message: TrendChartMessage, medicationEvents?: MedicationEvent[], onViewReport?: (reportId: string) => void; }> = React.memo(({ message, medicationEvents = [], onViewReport }) => {
    const colors = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981'];
    const width = 500;
    const height = 280; // Increased height for timeline
    const margin = { top: 20, right: 20, bottom: 80, left: 50 }; // Increased bottom margin
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const allDates = message.series.flatMap(s => s.data.map(d => new Date(d.date).getTime()));
    medicationEvents.forEach(e => allDates.push(new Date(e.date).getTime()));
    
    const xMin = Math.min(...allDates);
    const xMax = Math.max(...allDates);
    const xRange = xMax - xMin || 1; 
    const xPadding = xRange * 0.05;

    const allValues = message.series.flatMap(s => s.data.map(d => d.value));
    const yMax = Math.max(...allValues) * 1.1;
    const yMin = 0;

    const xScale = (date: number) => margin.left + ((date - (xMin - xPadding)) / (xRange + xPadding * 2)) * innerWidth;
    const yScale = (value: number) => margin.top + innerHeight - ((value - yMin) / (yMax - yMin)) * innerHeight;

    const visibleEvents = medicationEvents.filter(e => {
        const t = new Date(e.date).getTime();
        return t >= xMin && t <= xMax;
    });

    const renderBold = (text: string) => {
        const parts = text.split('**');
        return (
            <React.Fragment>
                {parts.map((part, index) =>
                    index % 2 === 1 ? <strong key={index} className="font-bold">{part}</strong> : part
                )}
            </React.Fragment>
        );
    };

    return (
        <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
            <div className="p-3 inner-glass">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                    {/* Y-Axis */}
                    {Array.from({ length: 5 }, (_, i) => yMin + (i * (yMax / 4))).map(tick => (
                        <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
                            <line x1={margin.left - 5} y1="0" x2={width - margin.right} className="stroke-gray-300 dark:stroke-gray-600" strokeDasharray="2,2" />
                            <text x={margin.left - 8} y="0" dy="0.32em" textAnchor="end" fontSize="10" className="fill-gray-500 dark:fill-gray-400">
                                {tick.toFixed(0)}
                            </text>
                        </g>
                    ))}

                    {/* X-Axis (Dates) */}
                    {message.series[0].data.map((d, i) => {
                         if (message.series[0].data.length > 5 && i % 2 !== 0) return null;
                         const t = new Date(d.date).getTime();
                         return (
                            <g key={i} transform={`translate(${xScale(t)}, 0)`}>
                                <text x="0" y={height - margin.bottom + 15} textAnchor="middle" fontSize="10" className="fill-gray-500 dark:fill-gray-400">
                                    {formatDate(d.date)}
                                </text>
                            </g>
                        )
                    })}

                     {/* Reference Ranges */}
                     {message.series.map((s, i) => s.referenceRange && (
                        <g key={`ref-${i}`}>
                            <rect
                                x={margin.left}
                                y={yScale(s.referenceRange.max)}
                                width={innerWidth}
                                height={Math.max(0, yScale(s.referenceRange.min) - yScale(s.referenceRange.max))}
                                fill={colors[i % colors.length]}
                                opacity={0.1}
                            />
                            <text x={width - margin.right} y={yScale(s.referenceRange.max) - 2} textAnchor="end" fontSize="8" fill={colors[i % colors.length]} opacity={0.7}>
                                Normal Range
                            </text>
                        </g>
                    ))}

                     {/* Threshold lines */}
                    {message.series.map((s, i) => s.threshold && (
                        <g key={`thresh-${i}`} transform={`translate(0, ${yScale(s.threshold.value)})`}>
                            <line x1={margin.left} x2={innerWidth + margin.left} stroke={colors[i]} strokeDasharray="4,4" strokeOpacity="0.7" />
                            <text x={margin.left + 5} y="-3" fill={colors[i]} fontSize="9" fontWeight="bold">{s.threshold.label}</text>
                        </g>
                    ))}

                    {/* Data Lines & Points */}
                    {message.series.map((s, i) => (
                        <g key={s.name}>
                            <path
                                d={`M ${s.data.map(d => `${xScale(new Date(d.date).getTime())},${yScale(d.value)}`).join(' L ')}`}
                                fill="none"
                                stroke={colors[i % colors.length]}
                                strokeWidth="2"
                            />
                            {s.data.map((d, j) => {
                                const isCritical = s.threshold && (
                                    (s.threshold.label.includes('High') && d.value > s.threshold.value) ||
                                    (s.threshold.label.includes('Low') && d.value < s.threshold.value)
                                );
                                const pointColor = isCritical ? '#ef4444' : colors[i % colors.length];

                                return (
                                <g key={j} className="group">
                                    <circle
                                        cx={xScale(new Date(d.date).getTime())}
                                        cy={yScale(d.value)}
                                        r={isCritical ? "5" : "4"}
                                        fill={pointColor}
                                        className={`cursor-pointer ${isCritical ? 'animate-pulse' : ''}`}
                                    />
                                    {isCritical && (
                                        <circle cx={xScale(new Date(d.date).getTime())} cy={yScale(d.value)} r="8" stroke="#ef4444" strokeWidth="1" fill="none" opacity="0.5" />
                                    )}
                                    <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <rect x={xScale(new Date(d.date).getTime()) - 35} y={yScale(d.value) - 35} width="70" height="25" fill="black" fillOpacity="0.7" rx="4" />
                                        <text x={xScale(new Date(d.date).getTime())} y={yScale(d.value) - 22} textAnchor="middle" fill="white" fontSize="10">
                                            {d.value.toFixed(1)} {s.unit} {isCritical ? '(!)' : ''}
                                        </text>
                                    </g>
                                </g>
                            )})}
                        </g>
                    ))}

                    {/* Medication Overlay Timeline */}
                    {visibleEvents.map((event, i) => {
                        const xPos = xScale(new Date(event.date).getTime());
                        const yBase = height - margin.bottom + 35;
                        
                        return (
                            <g key={`event-${i}`} className="group cursor-help">
                                <line 
                                    x1={xPos} 
                                    y1={margin.top} 
                                    x2={xPos} 
                                    y2={height - margin.bottom + 20} 
                                    stroke="#8b5cf6" 
                                    strokeWidth="1" 
                                    strokeDasharray="3,3" 
                                    opacity="0.6"
                                />
                                
                                <circle cx={xPos} cy={yBase} r="8" fill="#8b5cf6" fillOpacity="0.2" />
                                <circle cx={xPos} cy={yBase} r="3" fill="#8b5cf6" />
                                
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ pointerEvents: 'none' }}>
                                    <rect 
                                        x={Math.min(width - 160, Math.max(0, xPos - 80))} 
                                        y={yBase - 45} 
                                        width="160" 
                                        height="40" 
                                        rx="4" 
                                        fill="#1f2937" 
                                        fillOpacity="0.95" 
                                    />
                                    <text 
                                        x={Math.min(width - 160, Math.max(0, xPos - 80)) + 80} 
                                        y={yBase - 28} 
                                        textAnchor="middle" 
                                        fill="white" 
                                        fontSize="10" 
                                        fontWeight="bold"
                                    >
                                        {formatDate(event.date)}
                                    </text>
                                    <text 
                                        x={Math.min(width - 160, Math.max(0, xPos - 80)) + 80} 
                                        y={yBase - 14} 
                                        textAnchor="middle" 
                                        fill="#d1d5db" 
                                        fontSize="9"
                                    >
                                        {event.details.substring(0, 25)}{event.details.length > 25 ? '...' : ''}
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            </div>
             <div className="flex flex-wrap items-center justify-between px-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {message.series.map((s, i) => (
                        <div key={s.name} className="flex items-center space-x-1.5">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }}></div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{s.name} ({s.unit})</span>
                        </div>
                    ))}
                </div>
                {visibleEvents.length > 0 && (
                    <div className="flex items-center space-x-1.5 mt-1 sm:mt-0">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Medication/Event</span>
                    </div>
                )}
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 mt-2">
                {message.interpretation.split('\n').map((line, i) => {
                    if (line.startsWith('###')) {
                        return <h4 key={i} className="font-bold">{line.replace('### ', '')}</h4>;
                    }
                    if (line.startsWith('-')) {
                        return <p key={i} className="my-1">{renderBold(line)}</p>
                    }
                    return <p key={i} className="my-1">{renderBold(line)}</p>;
                })}
            </div>
            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});

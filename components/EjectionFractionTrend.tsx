
import React, { useState } from 'react';
import type { EjectionFractionTrendMessage, MedicationEvent } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

const SuggestedActionButton: React.FC<{ action: EjectionFractionTrendMessage['suggestedAction']; onViewReport: (reportId: string) => void;}> = ({ action, onViewReport }) => {
    if (!action || action.type !== 'view_report') return null;
    return (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
                onClick={() => onViewReport(action.reportId!)}
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
                <DocumentIcon className="w-4 h-4" />
                <span>{action.label}</span>
            </button>
        </div>
    );
};

const renderTextWithBold = (text: string) => {
    const parts = text.split('**');
    return (
        <React.Fragment>
            {parts.map((part, index) =>
                index % 2 === 1 ? <strong key={index} className="font-bold text-gray-900 dark:text-white">{part}</strong> : part
            )}
        </React.Fragment>
    );
};

const getRiskColorClasses = (riskLevel: 'Low' | 'Moderate' | 'High') => {
    switch (riskLevel) {
        case 'High':
            return {
                bg: 'bg-red-50 dark:bg-red-900/20',
                border: 'border-red-500',
                title: 'text-red-800 dark:text-red-300',
                text: 'text-red-700 dark:text-red-200',
                value: 'text-red-600 dark:text-red-400'
            };
        case 'Moderate':
            return {
                bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                border: 'border-yellow-500',
                title: 'text-yellow-800 dark:text-yellow-300',
                text: 'text-yellow-700 dark:text-yellow-200',
                value: 'text-yellow-600 dark:text-yellow-400'
            };
        default: // Low
            return {
                bg: 'bg-gray-50 dark:bg-gray-800',
                border: 'border-gray-300 dark:border-gray-600',
                title: 'text-gray-800 dark:text-gray-100',
                text: 'text-gray-700 dark:text-gray-300',
                value: 'text-gray-600 dark:text-gray-400'
            };
    }
};

export const EjectionFractionTrend: React.FC<{ message: EjectionFractionTrendMessage, medicationEvents?: MedicationEvent[], onViewReport?: (reportId: string) => void; }> = React.memo(({ message, medicationEvents = [], onViewReport }) => {
    const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, value: string, date: string, label?: string } | null>(null);

    const width = 600;
    const height = 300;
    const margin = { top: 30, right: 60, bottom: 60, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Prepare Data
    const sortedData = [...message.data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastPoint = sortedData[sortedData.length - 1];
    
    // Calculate Projection (1 year out)
    const projectionDate = new Date(lastPoint.date).getTime() + (365 * 24 * 60 * 60 * 1000);
    // Clamp projected value between 10% and 80% to stay on chart
    const projectedValue = Math.max(10, Math.min(80, lastPoint.value + message.annualChange)); 

    const allDates = sortedData.map(d => new Date(d.date).getTime());
    medicationEvents.forEach(e => allDates.push(new Date(e.date).getTime()));
    allDates.push(projectionDate); // Include projection in scale

    const xMin = Math.min(...allDates);
    const xMax = Math.max(...allDates);
    const xRange = xMax - xMin || 1;
    
    // Y-Axis Scale (Fixed 10-80% usually covers EF well)
    const yMin = 10;
    const yMax = 80;

    const xScale = (date: number) => margin.left + ((date - xMin) / xRange) * innerWidth;
    const yScale = (value: number) => margin.top + innerHeight - ((Math.min(yMax, Math.max(yMin, value)) - yMin) / (yMax - yMin)) * innerHeight;

    const visibleEvents = medicationEvents.filter(e => {
        const t = new Date(e.date).getTime();
        return t >= xMin && t <= xMax;
    });
    
    const changeColor = message.annualChange < -1 ? 'text-red-600 dark:text-red-400' : message.annualChange > 1 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400';
    const changeSymbol = message.annualChange > 0 ? '▲' : message.annualChange < 0 ? '▼' : '';

    const riskClasses = message.predictedRisk ? getRiskColorClasses(message.predictedRisk.riskLevel) : null;

    // Helper to generate path d string
    const generatePath = (points: {date: string, value: number}[]) => {
        return `M ${points.map(d => `${xScale(new Date(d.date).getTime())},${yScale(d.value)}`).join(' L ')}`;
    };

    return (
        <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center border dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Current LVEF</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{message.currentLVEF}%</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center border dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Annual Rate of Change</p>
                    <p className={`text-2xl font-bold ${changeColor}`}>{changeSymbol} {Math.abs(message.annualChange).toFixed(1)}%</p>
                </div>
            </div>

            {message.predictedRisk && riskClasses && (
                 <div className={`p-3 ${riskClasses.bg} border-l-4 ${riskClasses.border} rounded-r-lg`}>
                    <h4 className={`font-bold ${riskClasses.title}`}>Predicted Hospitalization Risk</h4>
                    <div className="flex items-baseline space-x-2 mt-1">
                        <p className={`text-3xl font-bold ${riskClasses.value}`}>{message.predictedRisk.percentage}%</p>
                        <p className={`text-sm font-semibold ${riskClasses.text}`}>within the next {message.predictedRisk.timeframe}</p>
                    </div>
                    <p className={`text-xs mt-1 italic ${riskClasses.text}`}>{message.predictedRisk.rationale}</p>
                </div>
            )}

            <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 relative">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" onMouseLeave={() => setHoveredPoint(null)}>
                    <defs>
                        <linearGradient id="efGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
                        </linearGradient>
                    </defs>

                    {/* Background Zones */}
                    {/* HFrEF < 40 */}
                    <rect x={margin.left} y={yScale(40)} width={innerWidth} height={yScale(yMin) - yScale(40)} fill="#ef4444" fillOpacity="0.08" />
                    {/* HFmrEF 40-49 */}
                    <rect x={margin.left} y={yScale(50)} width={innerWidth} height={yScale(40) - yScale(50)} fill="#f59e0b" fillOpacity="0.08" />
                    {/* HFpEF >= 50 */}
                    <rect x={margin.left} y={yScale(yMax)} width={innerWidth} height={yScale(50) - yScale(yMax)} fill="#22c55e" fillOpacity="0.08" />

                    {/* Zone Labels (Right side) */}
                    <text x={width - 5} y={yScale(30)} fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="end" opacity="0.6">HFrEF</text>
                    <text x={width - 5} y={yScale(45)} fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="end" opacity="0.6">HFmrEF</text>
                    <text x={width - 5} y={yScale(60)} fill="#22c55e" fontSize="9" fontWeight="bold" textAnchor="end" opacity="0.6">HFpEF</text>

                    {/* Y-Axis Grid & Labels */}
                    {[20, 30, 40, 50, 60, 70].map(tick => (
                        <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
                            <line x1={margin.left - 5} y1="0" x2={width - margin.right} stroke="#e5e7eb" strokeDasharray="2,2" className="dark:stroke-gray-700" />
                            <text x={margin.left - 8} y="0" dy="0.32em" textAnchor="end" fontSize="10" className="fill-gray-500 dark:fill-gray-400">
                                {tick}%
                            </text>
                        </g>
                    ))}

                    {/* X-Axis Date Labels */}
                    {sortedData.map((d, i) => (
                        <g key={`tick-${i}`} transform={`translate(${xScale(new Date(d.date).getTime())}, ${height - margin.bottom + 15})`}>
                             <text textAnchor="middle" fontSize="10" className="fill-gray-500 dark:fill-gray-400">
                                {formatDate(new Date(d.date).toISOString())}
                            </text>
                        </g>
                    ))}
                    {/* Projection Date Label */}
                    <g transform={`translate(${xScale(projectionDate)}, ${height - margin.bottom + 15})`}>
                         <text textAnchor="middle" fontSize="10" className="fill-blue-500 dark:fill-blue-400 font-semibold">
                            +1 Yr
                        </text>
                    </g>

                    {/* Historical Data Line */}
                    <path
                        d={generatePath(sortedData)}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    
                    {/* Projection Line */}
                    <line 
                        x1={xScale(new Date(lastPoint.date).getTime())}
                        y1={yScale(lastPoint.value)}
                        x2={xScale(projectionDate)}
                        y2={yScale(projectedValue)}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        opacity="0.6"
                    />

                    {/* Data Points */}
                    {sortedData.map((d, j) => (
                        <circle
                            key={j}
                            cx={xScale(new Date(d.date).getTime())}
                            cy={yScale(d.value)}
                            r="5"
                            className="fill-white stroke-blue-600 dark:stroke-blue-400 stroke-2 cursor-pointer hover:r-7 transition-all"
                            onMouseEnter={() => setHoveredPoint({
                                x: xScale(new Date(d.date).getTime()),
                                y: yScale(d.value),
                                value: `${d.value}%`,
                                date: formatDate(d.date)
                            })}
                        />
                    ))}

                    {/* Projection Point */}
                    <circle
                        cx={xScale(projectionDate)}
                        cy={yScale(projectedValue)}
                        r="5"
                        className="fill-blue-100 dark:fill-blue-900 stroke-blue-500 dark:stroke-blue-300 stroke-2 cursor-pointer border-dashed"
                        strokeDasharray="2,2"
                        onMouseEnter={() => setHoveredPoint({
                            x: xScale(projectionDate),
                            y: yScale(projectedValue),
                            value: `${projectedValue.toFixed(0)}%`,
                            date: "Projected (+1 Yr)",
                            label: "AI Projection"
                        })}
                    />

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
                                    strokeWidth="1.5" 
                                    strokeDasharray="3,3" 
                                    opacity="0.5"
                                />
                                <circle cx={xPos} cy={yBase} r="8" className="fill-purple-100 dark:fill-purple-900/50" />
                                <circle cx={xPos} cy={yBase} r="4" className="fill-purple-500" />
                                
                                {/* Tooltip logic for medications handled via group hover in standard SVG implies simplistic tooltips, 
                                    for better UX we use the same state-based hover system or keep simple SVG title/overlay */}
                                <title>{`${formatDate(event.date)}: ${event.details}`}</title>
                            </g>
                        );
                    })}

                    {/* Hover Tooltip */}
                    {hoveredPoint && (
                        <g transform={`translate(${hoveredPoint.x}, ${hoveredPoint.y - 10})`} className="pointer-events-none transition-opacity duration-200">
                            <path d="M0,0 L-6,-8 L-40,-8 L-40,-45 L40,-45 L40,-8 L6,-8 Z" className="fill-gray-900 dark:fill-gray-700 opacity-90 shadow-lg"/>
                            <text x="0" y="-30" textAnchor="middle" className="fill-white text-xs font-bold">{hoveredPoint.value}</text>
                            <text x="0" y="-18" textAnchor="middle" className="fill-gray-300 text-[10px]">{hoveredPoint.date}</text>
                            {hoveredPoint.label && <text x="0" y="-48" textAnchor="middle" className="fill-blue-300 text-[9px] uppercase tracking-wider">{hoveredPoint.label}</text>}
                        </g>
                    )}
                </svg>
            </div>
            
            <div className="flex flex-wrap items-center justify-between px-2 text-xs">
                 <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                        <span className="text-gray-600 dark:text-gray-300">Measured LVEF</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <div className="w-3 h-0.5 border-t-2 border-dashed border-blue-500"></div>
                        <span className="text-gray-600 dark:text-gray-300">Projected</span>
                    </div>
                 </div>
                 {visibleEvents.length > 0 && (
                    <div className="flex items-center space-x-1.5 mt-1 sm:mt-0">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">Medication/Event</span>
                    </div>
                )}
            </div>

            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-bold text-gray-800 dark:text-gray-100">AI Outlook</h4>
                <p>{renderTextWithBold(message.prediction)}</p>
            </div>
            {message.suggestedAction && onViewReport && (
                <SuggestedActionButton action={message.suggestedAction} onViewReport={onViewReport} />
            )}
        </div>
    );
});



import React from 'react';
import type { VitalTrendsMessage, TrendChartSeries, TrendChartDataPoint, MedicationEvent } from '../types';

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const VitalTrendsChart: React.FC<{ message: VitalTrendsMessage, medicationEvents?: MedicationEvent[] }> = React.memo(({ message, medicationEvents = [] }) => {
    const colors = {
        'Systolic BP': '#ef4444', // red-500
        'Diastolic BP': '#3b82f6', // blue-500
        'Heart Rate': '#10b981' // emerald-500
    };
    
    const width = 500;
    const height = 280; // Increased for timeline
    const margin = { top: 20, right: 50, bottom: 80, left: 50 }; // Increased bottom margin
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const allDates: number[] = message.series.flatMap((s: TrendChartSeries) => s.data.map((d: TrendChartDataPoint) => new Date(d.date).getTime()));
    medicationEvents.forEach(e => allDates.push(new Date(e.date).getTime()));

    const xMin = Math.min(...allDates);
    const xMax = Math.max(...allDates);
    const xRange = xMax - xMin || 1;
    const xPadding = xRange * 0.05;

    // BP Scale (Left Y-Axis)
    const bpValues: number[] = message.series.filter((s: TrendChartSeries) => s.unit === 'mmHg').flatMap((s: TrendChartSeries) => s.data.map((d: TrendChartDataPoint) => d.value));
    const yMinBp = Math.min(...bpValues) - 10;
    const yMaxBp = Math.max(...bpValues) + 10;

    // HR Scale (Right Y-Axis)
    const hrValues: number[] = message.series.filter((s: TrendChartSeries) => s.unit === 'bpm').flatMap((s: TrendChartSeries) => s.data.map((d: TrendChartDataPoint) => d.value));
    const yMinHr = Math.min(...hrValues) - 10;
    const yMaxHr = Math.max(...hrValues) + 10;

    const xScale = (date: number) => margin.left + ((date - (xMin - xPadding)) / (xRange + xPadding * 2)) * innerWidth;
    const yScaleBp = (value: number) => margin.top + innerHeight - ((value - yMinBp) / (yMaxBp - yMinBp)) * innerHeight;
    const yScaleHr = (value: number) => margin.top + innerHeight - ((value - yMinHr) / (yMaxHr - yMinHr)) * innerHeight;

    const xAxisTicks: number[] = Array.from(new Set<number>(message.series.flatMap((s: TrendChartSeries) => s.data.map((d: TrendChartDataPoint) => new Date(d.date).getTime())))).sort((a: number, b: number) => a - b);
    const yAxisTicksBp = Array.from({ length: 5 }, (_, i) => Math.round(yMinBp + (i * (yMaxBp - yMinBp) / 4)));
    const yAxisTicksHr = Array.from({ length: 5 }, (_, i) => Math.round(yMinHr + (i * (yMaxHr - yMinHr) / 4)));

    const visibleEvents = medicationEvents.filter(e => {
        const t = new Date(e.date).getTime();
        return t >= xMin && t <= xMax;
    });

    return (
        <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{message.title}</h3>
            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                    {/* Y-Axis Grid Lines */}
                    {yAxisTicksBp.map(tick => (
                        <g key={`grid-bp-${tick}`} transform={`translate(0, ${yScaleBp(tick)})`}>
                            <line x1={margin.left} y1="0" x2={width - margin.right} className="stroke-gray-200 dark:stroke-gray-700" strokeDasharray="2,2" />
                        </g>
                    ))}
                    
                    {/* Y-Axis (BP) */}
                    {yAxisTicksBp.map(tick => (
                        <g key={`tick-bp-${tick}`} transform={`translate(0, ${yScaleBp(tick)})`}>
                            <text x={margin.left - 8} y="0" dy="0.32em" textAnchor="end" fontSize="10" fill={colors['Diastolic BP']}>
                                {tick}
                            </text>
                        </g>
                    ))}
                    <text transform={`translate(15, ${height/2}) rotate(-90)`} textAnchor="middle" fontSize="10" fontWeight="bold" fill={colors['Diastolic BP']}>
                        Blood Pressure (mmHg)
                    </text>
                    
                    {/* Y-Axis (HR) */}
                    {yAxisTicksHr.map(tick => (
                        <g key={`tick-hr-${tick}`} transform={`translate(0, ${yScaleHr(tick)})`}>
                            <text x={width - margin.right + 8} y="0" dy="0.32em" textAnchor="start" fontSize="10" fill={colors['Heart Rate']}>
                                {tick}
                            </text>
                        </g>
                    ))}
                     <text transform={`translate(${width-15}, ${height/2}) rotate(-90)`} textAnchor="middle" fontSize="10" fontWeight="bold" fill={colors['Heart Rate']}>
                        Heart Rate (bpm)
                    </text>

                    {/* X-Axis */}
                    {xAxisTicks.map((tick, i) => (
                        <g key={`tick-x-${tick}-${i}`} transform={`translate(${xScale(tick)}, 0)`}>
                             <text x="0" y={height - margin.bottom + 15} textAnchor="middle" fontSize="10" className="fill-gray-500 dark:fill-gray-400">
                                {formatDate(new Date(tick).toISOString())}
                            </text>
                        </g>
                    ))}

                    {/* Data Lines & Points */}
                    {message.series.map((s: TrendChartSeries) => {
                         const yScale = s.unit === 'mmHg' ? yScaleBp : yScaleHr;
                         const color = colors[s.name as keyof typeof colors] || '#6b7281';
                         return(
                            <g key={s.name}>
                                <path
                                    d={`M ${s.data.map((d: TrendChartDataPoint) => `${xScale(new Date(d.date).getTime())},${yScale(d.value)}`).join(' L ')}`}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="2"
                                />
                                {s.data.map((d: TrendChartDataPoint, j: number) => (
                                    <circle
                                        key={j}
                                        cx={xScale(new Date(d.date).getTime())}
                                        cy={yScale(d.value)}
                                        r="3"
                                        fill={color}
                                    />
                                ))}
                            </g>
                         )
                    })}

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
                    {message.series.map((s) => (
                        <div key={s.name} className="flex items-center space-x-1.5">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[s.name as keyof typeof colors] }}></div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{s.name}</span>
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
            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                <h4 className="font-bold dark:text-gray-100">AI Interpretation</h4>
                <p>{message.interpretation}</p>
            </div>
        </div>
    );
});
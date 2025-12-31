import React, { useMemo, useState, useEffect } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import { getYear, getMonth, format, endOfWeek, eachWeekOfInterval, endOfMonth, isWithinInterval } from 'date-fns';
import { useChartData } from './hooks/useChartData';
import { Bar } from './components/Bar';
import type { SmartBarChartProps, DataPoint } from './types';
import { GeminiService } from './services/gemini';

export const SmartBarChart: React.FC<SmartBarChartProps> = ({
    data,
    view = 'month',
    variant = 'default',
    dataKeys = { date: 'date', value: 'value', label: 'label' },

    geminiConfig,
    colors,
    axisLabels,
    onViewChange,
    height = 400,
    width = '100%',
    className = '',
    theme
}) => {
    // Calendar / Filter State
    const [filterDate, setFilterDate] = useState<{ year: number | null, month: number | null, weekStartDate: Date | null }>({ year: null, month: null, weekStartDate: null });
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pickerMode, setPickerMode] = useState<'year' | 'month' | 'week'>('year');

    // Filter Raw Data BEFORE hooks
    const filteredRawData = useMemo(() => {
        if (!filterDate.year) return data;
        return data.filter(d => {
            const dateStr = d[dataKeys.date] as string;
            const date = new Date(dateStr);
            if (getYear(date) !== filterDate.year) return false;
            if (filterDate.month !== null && getMonth(date) !== filterDate.month) return false;

            if (filterDate.weekStartDate) {
                const start = filterDate.weekStartDate;
                const end = endOfWeek(start);
                return isWithinInterval(date, { start, end });
            }

            return true;
        });
    }, [data, filterDate, dataKeys.date]);

    // Derived Years for Picker
    const availableYears = useMemo(() => {
        const years = new Set(data.map(d => getYear(new Date(d[dataKeys.date] as string))));
        return Array.from(years).sort((a, b) => b - a);
    }, [data, dataKeys.date]);

    const fullChartData = useChartData({ data: filteredRawData, view, dataKeys, colors });
    const [activeItem, setActiveItem] = useState<DataPoint | null>(null);
    const [predictions, setPredictions] = useState<DataPoint[]>([]);
    const [isPredicting, setIsPredicting] = useState(false);

    // Navigation State
    const VISIBLE_COUNT = view === 'month' ? 12 : 7;
    const [windowOffset, setWindowOffset] = useState(0);

    useEffect(() => {
        setWindowOffset(0);
        setPredictions([]);

        // Auto-cleanup filters based on View hierarchy
        // If we switch to Month view, we shouldn't be filtered to a specific Month or Week.
        if (view === 'month') {
            setFilterDate(prev => {
                if (prev.month !== null || prev.weekStartDate !== null) {
                    return { ...prev, month: null, weekStartDate: null };
                }
                return prev;
            });
            setPickerMode('year'); // Reset picker to top level
        } else if (view === 'week') {
            setFilterDate(prev => {
                if (prev.weekStartDate !== null) {
                    return { ...prev, weekStartDate: null };
                }
                return prev;
            });
            setPickerMode('month'); // Reset picker to Month level
        }

    }, [view]);

    // Separate effect for filterDate so we don't create circular loops with the above
    useEffect(() => {
        setWindowOffset(0);
        setPredictions([]);
    }, [filterDate]);

    const handleYearSelect = (year: number) => {
        setFilterDate({ year, month: null, weekStartDate: null });
        setPickerMode('month');
        onViewChange?.('month');
    };

    const handleMonthSelect = (monthIndex: number) => {
        setFilterDate(prev => ({ ...prev, month: monthIndex, weekStartDate: null }));
        setPickerMode('week');
        onViewChange?.('week');
    };

    const handleWeekSelect = (weekStart: Date) => {
        setFilterDate(prev => ({ ...prev, weekStartDate: weekStart }));
        setIsPickerOpen(false);
        onViewChange?.('day');
    };

    const clearFilter = () => {
        setFilterDate({ year: null, month: null, weekStartDate: null });
        setPickerMode('year');
        setIsPickerOpen(false);
        onViewChange?.('month'); // Reset View
    };

    // Data Slicing
    const allData = useMemo(() => [...fullChartData, ...predictions], [fullChartData, predictions]);
    const visibleData = useMemo(() => {
        const totalLen = allData.length;
        const start = Math.max(0, totalLen - VISIBLE_COUNT - windowOffset);
        const end = Math.min(totalLen, totalLen - windowOffset);
        return allData.slice(start, end);
    }, [allData, windowOffset, VISIBLE_COUNT]);

    // Dimensions
    const margin = { top: 40, right: 20, bottom: 40, left: 40 };
    // Container height is shared, but we need to account for layout.
    // Let's assume height prop is for the chart area itself mostly.
    const internalWidth = 800; // SVG internal coord system
    const chartWidth = internalWidth - margin.left - margin.right;
    const chartHeight = (typeof height === 'number' ? height : 400) - margin.top - margin.bottom;

    // Scales
    const xScale = useMemo(() => {
        return scaleBand()
            .domain(visibleData.map(d => d.id))
            .range([0, chartWidth])
            .padding(0.3);
    }, [visibleData, chartWidth]);

    const yScale = useMemo(() => {
        const maxVal = Math.max(...visibleData.map(d => d.value), 0);
        return scaleLinear()
            .domain([0, maxVal * 1.1])
            .range([chartHeight, 0]);
    }, [visibleData, chartHeight]);

    const handlePredict = async () => {
        if (!geminiConfig?.apiKey) return;
        setIsPredicting(true);
        try {
            const service = new GeminiService(geminiConfig.apiKey, geminiConfig.model);
            const contextData = fullChartData.slice(-VISIBLE_COUNT);
            const preds = await service.predictNext(contextData, 3, view);
            setPredictions(preds);
            setWindowOffset(0);
        } catch (e) {
            console.error(e);
        } finally {
            setIsPredicting(false);
        }
    };

    const handleNext = () => {
        if (windowOffset > 0) setWindowOffset(c => Math.max(0, c - 1));
    }
    const handlePrev = () => {
        if (allData.length > VISIBLE_COUNT + windowOffset) setWindowOffset(c => c + 1);
    }

    const canGoBack = allData.length > VISIBLE_COUNT + windowOffset;
    const canGoForward = windowOffset > 0;

    // Theme defaults
    const bg = theme?.background || '#fff';
    const barRadius = theme?.bar?.radius ?? 4;
    const barOpacity = theme?.bar?.opacity ?? 1;
    const maxBarWidth = theme?.bar?.maxWidth ?? 60;

    const gridStroke = theme?.grid?.stroke || '#eee';
    const gridDash = theme?.grid?.strokeDasharray || '4 4';
    const gridVisible = theme?.grid?.visible !== false;

    const axisColor = theme?.axis?.labelColor || '#9ca3af';
    const tickColor = theme?.axis?.tickColor || '#9ca3af';
    const axisSize = theme?.axis?.fontSize || 10;

    return (
        <div className={`smart-bar-chart-wrapper ${className}`} style={{ width, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'sans-serif', background: bg, padding: 16, borderRadius: 12 }}>

            {/* Legend / Info / Predict Header */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: 40 }}>
                {/* Info Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 10 }}>
                    {activeItem ? (
                        <>
                            <div style={{ fontSize: 14, fontWeight: 'bold' }}>{activeItem.label}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>Total: {activeItem.value}</div>
                        </>
                    ) : (
                        <div style={{ fontSize: 12, color: '#999' }}>Detailed Info Area</div>
                    )}
                </div>

                {geminiConfig && (
                    <button
                        onClick={handlePredict}
                        disabled={isPredicting}
                        style={{ fontSize: 10, padding: '6px 12px', cursor: 'pointer', background: '#6366f1', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold' }}
                    >
                        {isPredicting ? 'Running...' : 'Predict AI'}
                    </button>
                )}

                {/* Calendar Button */}
                <button
                    onClick={() => setIsPickerOpen(!isPickerOpen)}
                    style={{
                        marginLeft: 10, padding: 6, cursor: 'pointer', background: '#fff', border: '1px solid #ddd', borderRadius: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                </button>

                {/* Calendar Picker Popup */}
                {isPickerOpen && (
                    <div style={{
                        position: 'absolute', top: 50, right: 0, width: 240, background: '#fff',
                        border: '1px solid #e0e0e0', borderRadius: 12,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 30, padding: 16,
                        fontFamily: 'sans-serif'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                            {pickerMode !== 'year' && (
                                <button
                                    onClick={() => setPickerMode(pickerMode === 'week' ? 'month' : 'year')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6366f1', fontWeight: 600 }}
                                >
                                    &lt; Back
                                </button>
                            )}
                            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1f2937', flex: 1, textAlign: pickerMode !== 'year' ? 'center' : 'left' }}>
                                {pickerMode === 'year' ? 'Select Year' : pickerMode === 'month' ? `${filterDate.year}` : `${format(new Date(filterDate.year!, filterDate.month!, 1), 'MMM yyyy')}`}
                            </div>
                            <button
                                onClick={() => { clearFilter(); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ef4444' }}
                            >
                                Reset
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: pickerMode === 'week' ? '1fr' : 'repeat(3, 1fr)', gap: 8 }}>
                            {pickerMode === 'year' && (
                                availableYears.map(year => (
                                    <button
                                        key={year}
                                        onClick={() => handleYearSelect(year)}
                                        style={{
                                            padding: '8px 4px', fontSize: 13,
                                            border: '1px solid',
                                            borderColor: filterDate.year === year ? '#6366f1' : '#eee',
                                            borderRadius: 6,
                                            background: filterDate.year === year ? '#e0e7ff' : '#fff',
                                            color: filterDate.year === year ? '#4338ca' : '#374151',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {year}
                                    </button>
                                ))
                            )}
                            {pickerMode === 'month' && (
                                Array.from({ length: 12 }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleMonthSelect(i)}
                                        style={{
                                            padding: '8px 4px', fontSize: 13,
                                            border: '1px solid',
                                            borderColor: filterDate.month === i ? '#6366f1' : '#eee',
                                            borderRadius: 6,
                                            background: filterDate.month === i ? '#e0e7ff' : '#fff',
                                            color: filterDate.month === i ? '#4338ca' : '#374151',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {format(new Date(2000, i, 1), 'MMM')}
                                    </button>
                                ))
                            )}
                            {pickerMode === 'week' && filterDate.year && filterDate.month !== null && (
                                eachWeekOfInterval({
                                    start: new Date(filterDate.year, filterDate.month, 1),
                                    end: endOfMonth(new Date(filterDate.year, filterDate.month, 1))
                                }).map((weekStart, i) => {
                                    // Only show weeks that actually overlap with the month meaningfully?
                                    // eachWeekOfInterval gives standard weeks.
                                    const weekEnd = endOfWeek(weekStart);
                                    const label = `${format(weekStart, 'd')} - ${format(weekEnd, 'd MMM')}`;
                                    return (
                                        <button
                                            key={weekStart.toISOString()}
                                            onClick={() => handleWeekSelect(weekStart)}
                                            style={{
                                                padding: '8px 12px', fontSize: 13,
                                                border: '1px solid',
                                                borderColor: '#eee',
                                                borderRadius: 6,
                                                background: '#fff',
                                                color: '#374151',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                textAlign: 'left'
                                            }}
                                        >
                                            Week {i + 1}: {label}
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
                {/* Left Button */}
                <button
                    onClick={handlePrev}
                    disabled={!canGoBack}
                    style={{
                        flexShrink: 0, width: 40, height: 40, borderRadius: '50%', border: '1px solid #ddd', background: '#fff',
                        cursor: canGoBack ? 'pointer' : 'default', opacity: canGoBack ? 1 : 0.3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#333', marginRight: 10
                    }}
                >
                    &lt;
                </button>

                {/* Chart Area */}
                <div style={{ flexGrow: 1, height: typeof height === 'number' ? height : 400, position: 'relative' }}>
                    <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 ${internalWidth} ${(typeof height === 'number' ? height : 400)}`}
                        preserveAspectRatio="none"
                        style={{ overflow: 'visible' }}
                        role="img"
                        aria-label="Bar chart showing data over time"
                    >
                        <g transform={`translate(${margin.left},${margin.top})`}>
                            {/* Gridlines & Y-Axis */}
                            {gridVisible && yScale.ticks(5).map(tickValue => (
                                <g key={`y-tick-${tickValue}`} transform={`translate(0, ${yScale(tickValue)})`}>
                                    <line x1={0} x2={chartWidth} stroke={gridStroke} strokeDasharray={gridDash} />
                                    <text x={-10} y={4} textAnchor="end" fontSize={axisSize} fill={tickColor}>
                                        {tickValue}
                                    </text>
                                </g>
                            ))}

                            {/* Axis Lines */}
                            <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke={gridStroke} />
                            <line x1={0} y1={0} x2={0} y2={chartHeight} stroke={gridStroke} />

                            {/* Custom Axis Labels */}
                            {axisLabels?.y && (
                                <text
                                    x={-30}
                                    y={chartHeight / 2}
                                    transform={`rotate(-90, -30, ${chartHeight / 2})`}
                                    textAnchor="middle"
                                    fill={axisColor}
                                    fontSize={12}
                                >
                                    {axisLabels.y}
                                </text>
                            )}
                            {axisLabels?.x && (
                                <text
                                    x={chartWidth / 2}
                                    y={chartHeight + 35}
                                    textAnchor="middle"
                                    fill={axisColor}
                                    fontSize={12}
                                >
                                    {axisLabels.x}
                                </text>
                            )}

                            {/* Bars */}
                            {visibleData.map((d) => {
                                const xBand = xScale(d.id);
                                const bandwidth = xScale.bandwidth();
                                const barWidth = Math.min(bandwidth, maxBarWidth);
                                const x = xBand! + (bandwidth - barWidth) / 2; // Center the bar

                                const yTotal = yScale(d.value);
                                const barHeightTotal = chartHeight - yTotal;

                                if (xBand === undefined) return null;

                                const isSelected = activeItem?.id === d.id;
                                const isDimmed = activeItem !== null && !isSelected;

                                // Stacked Rendering
                                if (variant === 'stacked' && d.stackedValues) {
                                    let currentY = chartHeight;
                                    return (
                                        <g key={d.id}
                                            onMouseEnter={() => setActiveItem(d)}
                                            onMouseLeave={() => setActiveItem(null)}
                                            onClick={() => setActiveItem(activeItem === d ? null : d)}
                                            style={{ opacity: isDimmed ? 0.3 : 1, transition: 'opacity 0.3s' }}
                                        >
                                            {d.stackedValues.map((stack, i) => {
                                                const segmentHeight = Math.abs(yScale(stack.value) - yScale(0));
                                                const segmentY = currentY - segmentHeight;
                                                const rect = (
                                                    <rect
                                                        key={`${d.id}-${i}`}
                                                        x={x}
                                                        y={segmentY}
                                                        width={barWidth}
                                                        height={segmentHeight}
                                                        fill={stack.color}
                                                        rx={barRadius}
                                                        opacity={barOpacity}
                                                        stroke={isSelected ? '#fff' : 'none'}
                                                        strokeWidth={isSelected ? 1 : 0}
                                                    />
                                                );
                                                currentY = segmentY;
                                                return rect;
                                            })}
                                            {/* Transparent overlay */}
                                            <rect x={x} y={yTotal} width={barWidth} height={barHeightTotal} fill="transparent" />
                                        </g>
                                    )
                                }

                                // Default Single Bar
                                return (
                                    <g key={d.id}>
                                        <Bar
                                            x={x}
                                            y={yTotal}
                                            width={barWidth}
                                            height={barHeightTotal}
                                            data={d}
                                            isActive={isSelected}
                                            isDimmed={isDimmed}
                                            onHover={setActiveItem}
                                            onClick={(item) => {
                                                setActiveItem(item === activeItem ? null : item);
                                            }}
                                            style={{ rx: barRadius, fillOpacity: barOpacity }}
                                            aria-label={`${d.label}: ${d.value}`}
                                            role="graphics-symbol"
                                        />
                                        {isSelected && (
                                            <text
                                                x={x + barWidth / 2}
                                                y={yTotal - 5}
                                                textAnchor="middle"
                                                fill="#333"
                                                fontSize={12}
                                                fontWeight="bold"
                                                pointerEvents="none"
                                            >
                                                {d.value}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            {/* X Axis Labels */}
                            {visibleData.map((d) => {
                                const x = xScale(d.id);
                                if (x === undefined) return null;
                                return (
                                    <text
                                        key={`label-${d.id}`}
                                        x={x + xScale.bandwidth() / 2}
                                        y={chartHeight + 15}
                                        textAnchor="middle"
                                        fill={tickColor}
                                        fontSize={axisSize}
                                    >
                                        {d.label}
                                    </text>
                                )
                            })}
                        </g>
                    </svg>
                </div>

                {/* Right Button */}
                <button
                    onClick={handleNext}
                    disabled={!canGoForward}
                    style={{
                        flexShrink: 0, width: 40, height: 40, borderRadius: '50%', border: '1px solid #ddd', background: '#fff',
                        cursor: canGoForward ? 'pointer' : 'default', opacity: canGoForward ? 1 : 0.3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#333', marginLeft: 10
                    }}
                >
                    &gt;
                </button>
            </div>
        </div>
    );
};

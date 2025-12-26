import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, ScrollView } from 'react-native';
import Svg, { G, Text as SvgText, Line, Rect } from 'react-native-svg';
import { scaleBand, scaleLinear } from 'd3-scale';
import { getYear, getMonth, format, endOfWeek, eachWeekOfInterval, endOfMonth, isWithinInterval } from 'date-fns';
import { useChartData } from './hooks/useChartData';
import { BarNative } from './components/BarNative';
import type { SmartBarChartProps, DataPoint } from './types';
import { GeminiService } from './services/gemini';

export const SmartBarChartNative: React.FC<SmartBarChartProps> = ({
    data,
    view = 'month',
    variant = 'default',
    dataKeys,
    geminiConfig,
    colors,
    axisLabels,
    onViewChange,
    height = 400,
    width = '100%',
}) => {
    // Calendar / Filter State
    const [filterDate, setFilterDate] = useState<{ year: number | null, month: number | null, weekStartDate: Date | null }>({ year: null, month: null, weekStartDate: null });
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [pickerMode, setPickerMode] = useState<'year' | 'month' | 'week'>('year');

    // Filter Raw Data
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

    // Available Years
    const availableYears = useMemo(() => {
        const years = new Set(data.map(d => getYear(new Date(d[dataKeys.date] as string))));
        return Array.from(years).sort((a, b) => b - a);
    }, [data, dataKeys.date]);

    const fullChartData = useChartData({ data: filteredRawData, view, dataKeys, colors });
    const [activeItem, setActiveItem] = useState<DataPoint | null>(null);
    const [predictions, setPredictions] = useState<DataPoint[]>([]);
    const [isPredicting, setIsPredicting] = useState(false);
    const [layoutWidth, setLayoutWidth] = useState(Dimensions.get('window').width - 40);

    // Navigation State
    const VISIBLE_COUNT = view === 'month' ? 12 : 7;
    const [windowOffset, setWindowOffset] = useState(0);

    useEffect(() => {
        setWindowOffset(0);
        setPredictions([]);

        if (view === 'month') {
            setFilterDate(prev => {
                if (prev.month !== null || prev.weekStartDate !== null) {
                    return { ...prev, month: null, weekStartDate: null };
                }
                return prev;
            });
            setPickerMode('year');
        } else if (view === 'week') {
            setFilterDate(prev => {
                if (prev.weekStartDate !== null) {
                    return { ...prev, weekStartDate: null };
                }
                return prev;
            });
            setPickerMode('month');
        }
    }, [view]);

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
        setIsPickerVisible(false);
        onViewChange?.('day');
    };

    const clearFilter = () => {
        setFilterDate({ year: null, month: null, weekStartDate: null });
        setPickerMode('year');
        setIsPickerVisible(false);
        onViewChange?.('month'); // Reset View
    };

    // Combine & Slice
    const allData = useMemo(() => [...fullChartData, ...predictions], [fullChartData, predictions]);
    const visibleData = useMemo(() => {
        const totalLen = allData.length;
        const start = Math.max(0, totalLen - VISIBLE_COUNT - windowOffset);
        const end = Math.min(totalLen, totalLen - windowOffset);
        return allData.slice(start, end);
    }, [allData, windowOffset, VISIBLE_COUNT]);

    // Dimensions
    const margin = { top: 40, right: 20, bottom: 40, left: 40 };
    const containerHeight = typeof height === 'number' ? height : 400;
    const chartHeight = containerHeight - margin.top - margin.bottom;
    const chartWidth = layoutWidth - margin.left - margin.right; // Need to account for button space in layout? 
    // Actually in Native, if we put buttons OUTSIDE, we decrease available width for main chart.
    // Simplifying: we'll just overlay specific buttons outside margin.

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

    return (
        <View style={{ width: width as any }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10, alignItems: 'center' }}>
                <View style={{ alignItems: 'flex-end', flex: 1, marginRight: 10 }}>
                    {activeItem ? (
                        <>
                            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{activeItem.label}</Text>
                            <Text style={{ fontSize: 12, color: '#666' }}>Total: {activeItem.value}</Text>
                        </>
                    ) : (
                        <Text style={{ fontSize: 12, color: '#999' }}>Detailed Info Area</Text>
                    )}
                </View>

                {geminiConfig && (
                    <TouchableOpacity
                        onPress={handlePredict}
                        disabled={isPredicting}
                        style={[styles.button, { backgroundColor: '#6366f1', borderWidth: 0 }]}
                        accessible={true}
                        accessibilityLabel="Predict future values"
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isPredicting }}
                    >
                        <Text style={[styles.buttonText, { color: '#fff', fontWeight: 'bold' }]}>
                            {isPredicting ? '...' : 'Predict'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Calendar Button */}
                <TouchableOpacity
                    onPress={() => setIsPickerVisible(true)}
                    style={{ marginLeft: 10, padding: 6, borderWidth: 1, borderColor: '#ddd', borderRadius: 4 }}
                    accessible={true}
                    accessibilityLabel="Open Date Picker"
                    accessibilityRole="button"
                >
                    <Text>📅</Text>
                </TouchableOpacity>

                {/* Picker Modal */}
                <Modal visible={isPickerVisible} transparent animationType="fade">
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#fff', width: 320, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
                                {pickerMode !== 'year' ? (
                                    <TouchableOpacity onPress={() => setPickerMode(pickerMode === 'week' ? 'month' : 'year')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Text style={{ color: '#6366f1', fontWeight: '600' }}>&lt; Back</Text>
                                    </TouchableOpacity>
                                ) : <View style={{ width: 40 }} />}

                                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1f2937' }}>
                                    {pickerMode === 'year' ? 'Select Year' : pickerMode === 'month' ? `${filterDate.year}` : `${format(new Date(filterDate.year!, filterDate.month!, 1), 'MMM yyyy')}`}
                                </Text>

                                <TouchableOpacity onPress={() => setIsPickerVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Text style={{ color: '#9ca3af', fontSize: 20 }}>×</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                                    {pickerMode === 'year' && (
                                        availableYears.map(year => (
                                            <TouchableOpacity
                                                key={year}
                                                onPress={() => handleYearSelect(year)}
                                                style={{
                                                    paddingVertical: 10,
                                                    width: '30%',
                                                    alignItems: 'center',
                                                    borderRadius: 8,
                                                    borderWidth: 1,
                                                    borderColor: filterDate.year === year ? '#6366f1' : '#e5e7eb',
                                                    backgroundColor: filterDate.year === year ? '#e0e7ff' : '#fff'
                                                }}
                                            >
                                                <Text style={{
                                                    color: filterDate.year === year ? '#4338ca' : '#374151',
                                                    fontWeight: filterDate.year === year ? 'bold' : 'normal'
                                                }}>{year}</Text>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                    {pickerMode === 'month' && (
                                        Array.from({ length: 12 }).map((_, i) => (
                                            <TouchableOpacity
                                                key={i}
                                                onPress={() => handleMonthSelect(i)}
                                                style={{
                                                    paddingVertical: 10,
                                                    width: '30%',
                                                    alignItems: 'center',
                                                    borderRadius: 8,
                                                    borderWidth: 1,
                                                    borderColor: filterDate.month === i ? '#6366f1' : '#e5e7eb',
                                                    backgroundColor: filterDate.month === i ? '#e0e7ff' : '#fff'
                                                }}
                                            >
                                                <Text style={{
                                                    color: filterDate.month === i ? '#4338ca' : '#374151',
                                                    fontWeight: filterDate.month === i ? 'bold' : 'normal'
                                                }}>{format(new Date(2000, i, 1), 'MMM')}</Text>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                    {pickerMode === 'week' && filterDate.year && filterDate.month !== null && (
                                        eachWeekOfInterval({
                                            start: new Date(filterDate.year, filterDate.month, 1),
                                            end: endOfMonth(new Date(filterDate.year, filterDate.month, 1))
                                        }).map((weekStart, i) => {
                                            const weekEnd = endOfWeek(weekStart);
                                            const label = `${format(weekStart, 'd')} - ${format(weekEnd, 'd MMM')}`;
                                            return (
                                                <TouchableOpacity
                                                    key={weekStart.toISOString()}
                                                    onPress={() => handleWeekSelect(weekStart)}
                                                    style={{
                                                        paddingVertical: 10,
                                                        paddingHorizontal: 15,
                                                        width: '100%',
                                                        borderRadius: 8,
                                                        borderWidth: 1,
                                                        borderColor: '#e5e7eb',
                                                        backgroundColor: '#fff',
                                                        marginBottom: 5
                                                    }}
                                                >
                                                    <Text style={{ color: '#374151' }}>Week {i + 1}: {label}</Text>
                                                </TouchableOpacity>
                                            )
                                        })
                                    )}
                                </View>
                            </ScrollView>

                            <TouchableOpacity onPress={clearFilter} style={{ marginTop: 20, alignItems: 'center', padding: 10 }}>
                                <Text style={{ color: '#ef4444', fontWeight: '500' }}>Reset Filter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', height: containerHeight }}>
                {/* Left Button */}
                <TouchableOpacity
                    onPress={handlePrev}
                    disabled={!canGoBack}
                    style={[styles.arrowBtn, { opacity: canGoBack ? 1 : 0.3 }]}
                    accessible={true}
                    accessibilityLabel="Previous Period"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canGoBack }}
                >
                    <Text style={{ fontSize: 20 }}>&lt;</Text>
                </TouchableOpacity>

                <View
                    style={{ flex: 1, height: '100%' }}
                    onLayout={(e) => {
                        setLayoutWidth(e.nativeEvent.layout.width);
                    }}
                >
                    <Svg width="100%" height="100%">
                        <G transform={`translate(${margin.left},${margin.top})`}>
                            {/* Gridlines & Y-Axis */}
                            {yScale.ticks(5).map(tickValue => (
                                <G key={`y-tick-${tickValue}`} transform={`translate(0, ${yScale(tickValue)})`}>
                                    <Line x1={0} x2={chartWidth} stroke="#eee" strokeDasharray="4 4" />
                                    <SvgText x={-10} y={4} textAnchor="end" fontSize={10} fill="#999">
                                        {tickValue}
                                    </SvgText>
                                </G>
                            ))}

                            {/* Axis Lines */}
                            <Line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#ccc" />
                            <Line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#ccc" />

                            {/* Custom Axis Labels */}
                            {axisLabels?.y && (
                                <SvgText
                                    x={-30}
                                    y={chartHeight / 2}
                                    rotation={-90}
                                    origin={`-30, ${chartHeight / 2}`}
                                    textAnchor="middle"
                                    fill="#999"
                                    fontSize={12}
                                >
                                    {axisLabels.y}
                                </SvgText>
                            )}
                            {axisLabels?.x && (
                                <SvgText
                                    x={chartWidth / 2}
                                    y={chartHeight + 35}
                                    textAnchor="middle"
                                    fill="#999"
                                    fontSize={12}
                                >
                                    {axisLabels.x}
                                </SvgText>
                            )}

                            {/* Bars */}
                            {visibleData.map((d) => {
                                const xBand = xScale(d.id);
                                const bandwidth = xScale.bandwidth();
                                const maxBarWidth = 60;
                                const barWidth = Math.min(bandwidth, maxBarWidth);
                                const x = xBand! + (bandwidth - barWidth) / 2;

                                const yTotal = yScale(d.value);
                                const barHeightTotal = chartHeight - yTotal;

                                if (xBand === undefined) return null;

                                const isSelected = activeItem?.id === d.id;
                                const isDimmed = activeItem !== null && !isSelected;

                                // Stacked Rendering
                                if (variant === 'stacked' && d.stackedValues) {
                                    let currentY = chartHeight;
                                    return (
                                        <G key={d.id}
                                            onPress={() => setActiveItem(activeItem === d ? null : d)}
                                            opacity={isDimmed ? 0.3 : 1}
                                        >
                                            {d.stackedValues.map((stack, i) => {
                                                const segmentHeight = Math.abs(yScale(stack.value) - yScale(0));
                                                const segmentY = currentY - segmentHeight;
                                                const rect = (
                                                    <Rect
                                                        key={`${d.id}-${i}`}
                                                        x={x}
                                                        y={segmentY}
                                                        width={barWidth}
                                                        height={segmentHeight}
                                                        fill={stack.color}
                                                        stroke={isSelected ? '#fff' : 'none'}
                                                        strokeWidth={isSelected ? 1 : 0}
                                                    />
                                                );
                                                currentY = segmentY;
                                                return rect;
                                            })}
                                            {/* Hitbox */}
                                            <Rect x={x} y={yTotal} width={barWidth} height={barHeightTotal} fill="transparent" onPress={() => setActiveItem(activeItem === d ? null : d)} />
                                        </G>
                                    )
                                }

                                return (
                                    <G key={d.id}>
                                        <BarNative
                                            x={x}
                                            y={yTotal}
                                            width={barWidth}
                                            height={barHeightTotal}
                                            data={d}
                                            isActive={isSelected}
                                            isDimmed={isDimmed}
                                            onClick={(item) => {
                                                setActiveItem(item === activeItem ? null : item);
                                            }}
                                            accessibilityLabel={`${d.label}, value ${d.value}`}
                                            accessibilityRole="image"
                                        />
                                        {isSelected && (
                                            <SvgText
                                                x={x + barWidth / 2}
                                                y={yTotal - 5}
                                                textAnchor="middle"
                                                fill="#333"
                                                fontSize={10}
                                                fontWeight="bold"
                                            >
                                                {d.value}
                                            </SvgText>
                                        )}
                                    </G>
                                );
                            })}

                            {/* X Axis Labels */}
                            {visibleData.map((d) => {
                                const x = xScale(d.id);
                                if (x === undefined) return null;
                                return (
                                    <SvgText
                                        key={`label-${d.id}`}
                                        x={x + xScale.bandwidth() / 2}
                                        y={chartHeight + 15}
                                        textAnchor="middle"
                                        fill="#666"
                                        fontSize={10}
                                    >
                                        {d.label}
                                    </SvgText>
                                )
                            })}
                        </G>
                    </Svg>
                </View>

                {/* Right Button */}
                <TouchableOpacity
                    onPress={handleNext}
                    disabled={!canGoForward}
                    style={[styles.arrowBtn, { opacity: canGoForward ? 1 : 0.3 }]}
                    accessible={true}
                    accessibilityLabel="Next Period"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canGoForward }}
                >
                    <Text style={{ fontSize: 20 }}>&gt;</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    buttonText: {
        fontSize: 12,
        color: '#333'
    },
    arrowBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        marginHorizontal: 5
    }
});

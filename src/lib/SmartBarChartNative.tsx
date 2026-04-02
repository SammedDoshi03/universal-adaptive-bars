import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, ScrollView } from 'react-native';
import Svg, { G, Text as SvgText, Line, Rect, Path } from 'react-native-svg';
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
    layout = 'vertical',
    missingDataStrategy = 'skip',
    valueFormatter = (val) => String(val),
    annotations = [],
    dataKeys,
    geminiConfig,
    colors,
    axisLabels,
    onViewChange,
    height = 400,
    width = '100%'
}) => {
    const getRoundedPath = (x: number, y: number, w: number, h: number, r: number, corners: { tl: boolean, tr: boolean, bl: boolean, br: boolean }) => {
        const tl = corners.tl ? r : 0;
        const tr = corners.tr ? r : 0;
        const bl = corners.bl ? r : 0;
        const br = corners.br ? r : 0;

        return `
        M ${x + tl} ${y}
        L ${x + w - tr} ${y}
        Q ${x + w} ${y} ${x + w} ${y + tr}
        L ${x + w} ${y + h - br}
        Q ${x + w} ${y + h} ${x + w - br} ${y + h}
        L ${x + bl} ${y + h}
        Q ${x} ${y + h} ${x} ${y + h - bl}
        L ${x} ${y + tl}
        Q ${x} ${y} ${x + tl} ${y}
        Z
        `;
    };
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

    const fullChartData = useChartData({ data: filteredRawData, view, dataKeys, colors, missingDataStrategy });
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
    const isHorizontal = layout === 'horizontal';

    const domainScale = useMemo(() => {
        return scaleBand()
            .domain(visibleData.map(d => d.id))
            .range(isHorizontal ? [0, chartHeight] : [0, chartWidth])
            .padding(0.3);
    }, [visibleData, chartWidth, chartHeight, isHorizontal]);

    const valueScale = useMemo(() => {
        const maxVal = Math.max(...visibleData.map(d => d.value), 0);
        return scaleLinear()
            .domain([0, maxVal * 1.1])
            .range(isHorizontal ? [0, chartWidth] : [chartHeight, 0]);
    }, [visibleData, chartWidth, chartHeight, isHorizontal]);

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
                            {/* Gridlines & Value Axis */}
                            {valueScale.ticks(5).map(tickValue => {
                                const valPos = valueScale(tickValue);
                                return (
                                    <G key={`y-tick-${tickValue}`} transform={isHorizontal ? `translate(${valPos}, 0)` : `translate(0, ${valPos})`}>
                                        <Line x1={0} y1={0} x2={isHorizontal ? 0 : chartWidth} y2={isHorizontal ? chartHeight : 0} stroke="#eee" strokeDasharray="4 4" />
                                        <SvgText x={isHorizontal ? 0 : -10} y={isHorizontal ? chartHeight + 15 : 4} textAnchor={isHorizontal ? "middle" : "end"} fontSize={10} fill="#999">
                                            {valueFormatter(tickValue)}
                                        </SvgText>
                                    </G>
                                )
                            })}

                            {/* Annotations */}
                            {annotations.map((ann, i) => {
                                const valPos = valueScale(ann.value);
                                if (isNaN(valPos)) return null;
                                return (
                                    <G key={`annotation-${i}`} transform={isHorizontal ? `translate(${valPos}, 0)` : `translate(0, ${valPos})`}>
                                        <Line 
                                            x1={0} y1={0}
                                            x2={isHorizontal ? 0 : chartWidth} 
                                            y2={isHorizontal ? chartHeight : 0} 
                                            stroke={ann.color || '#ef4444'} strokeDasharray={ann.strokeDasharray || '4 4'} strokeWidth={2} 
                                        />
                                        {ann.label && (
                                            <SvgText 
                                                x={isHorizontal ? 0 : chartWidth} 
                                                y={isHorizontal ? -5 : -5} 
                                                textAnchor={isHorizontal ? "middle" : "end"} 
                                                fill={ann.color || '#ef4444'} fontSize={10} fontWeight="bold"
                                            >
                                                {ann.label}
                                            </SvgText>
                                        )}
                                    </G>
                                );
                            })}

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
                                const bandPos = domainScale(d.id);
                                const bandwidth = domainScale.bandwidth();
                                const maxBarWidth = 60;
                                const barThickness = Math.min(bandwidth, maxBarWidth);
                                const orthogonalOffset = bandPos! + (bandwidth - barThickness) / 2;
                                
                                const valEndPos = valueScale(d.value);
                                const valZeroPos = valueScale(0);

                                if (bandPos === undefined) return null;

                                const isSelected = activeItem?.id === d.id;
                                const isDimmed = activeItem !== null && !isSelected;

                                const barLengthTotal = Math.abs(valZeroPos - valEndPos);
                                const xTotal = isHorizontal ? valZeroPos : orthogonalOffset;
                                const yTotal = isHorizontal ? orthogonalOffset : valEndPos;
                                const wTotal = isHorizontal ? barLengthTotal : barThickness;
                                const hTotal = isHorizontal ? barThickness : barLengthTotal;

                                // Stacked or Grouped Rendering
                                if ((variant === 'stacked' || variant === 'grouped') && d.stackedValues) {
                                    let currentStart = valZeroPos;
                                    const groupThickness = barThickness / d.stackedValues.length;

                                    return (
                                        <G key={d.id}
                                            onPress={() => setActiveItem(activeItem === d ? null : d)}
                                            opacity={isDimmed ? 0.3 : 1}
                                        >
                                            {d.stackedValues.map((stack, i) => {
                                                const segLength = Math.abs(valueScale(stack.value) - valueScale(0));
                                                
                                                let segmentX, segmentY, segmentW, segmentH;
                                                let corners = { tl: false, tr: false, bl: false, br: false };
                                                
                                                if (variant === 'stacked') {
                                                    if (isHorizontal) {
                                                        segmentX = currentStart;
                                                        segmentY = orthogonalOffset;
                                                        segmentW = segLength;
                                                        segmentH = barThickness;
                                                        
                                                        const isFirst = i === 0;
                                                        const isLast = i === d.stackedValues!.length - 1;
                                                        corners = { tl: isFirst, bl: isFirst, tr: isLast, br: isLast };
                                                        currentStart += segLength;
                                                    } else {
                                                        segmentH = segLength;
                                                        segmentY = currentStart - segLength;
                                                        segmentX = orthogonalOffset;
                                                        segmentW = barThickness;
                                                        
                                                        const isTop = i === d.stackedValues!.length - 1;
                                                        const isBottom = i === 0;
                                                        corners = { tl: isTop, tr: isTop, bl: isBottom, br: isBottom };
                                                        currentStart = segmentY;
                                                    }
                                                } else { // grouped
                                                    if (isHorizontal) {
                                                        segmentX = valZeroPos;
                                                        segmentY = orthogonalOffset + i * groupThickness;
                                                        segmentW = segLength;
                                                        segmentH = groupThickness;
                                                    } else {
                                                        segmentX = orthogonalOffset + i * groupThickness;
                                                        segmentY = valueScale(stack.value);
                                                        segmentW = groupThickness;
                                                        segmentH = segLength;
                                                    }
                                                    corners = { tl: !isHorizontal, tr: true, bl: isHorizontal, br: isHorizontal };
                                                }

                                                const pathD = getRoundedPath(segmentX, segmentY, segmentW, segmentH, 4, corners);

                                                return (
                                                    <Path
                                                        key={`${d.id}-${i}`}
                                                        d={pathD}
                                                        fill={stack.color}
                                                        stroke={isSelected ? '#fff' : 'none'}
                                                        strokeWidth={isSelected ? 1 : 0}
                                                    />
                                                );
                                            })}
                                            {/* Hitbox */}
                                            <Rect x={xTotal} y={yTotal} width={wTotal} height={hTotal} fill="transparent" onPress={() => setActiveItem(activeItem === d ? null : d)} />
                                        </G>
                                    )
                                }

                                return (
                                    <G key={d.id}>
                                        <BarNative
                                            x={xTotal}
                                            y={yTotal}
                                            width={wTotal}
                                            height={hTotal}
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
                                                x={isHorizontal ? xTotal + wTotal + 10 : xTotal + wTotal / 2}
                                                y={isHorizontal ? yTotal + hTotal / 2 + 4 : yTotal - 5}
                                                textAnchor={isHorizontal ? "start" : "middle"}
                                                fill="#333"
                                                fontSize={10}
                                                fontWeight="bold"
                                            >
                                                {valueFormatter(d.value)}
                                            </SvgText>
                                        )}
                                    </G>
                                );
                            })}

                            {/* Domain Axis Labels */}
                            {visibleData.map((d) => {
                                const bandPos = domainScale(d.id);
                                if (bandPos === undefined) return null;
                                return (
                                    <SvgText
                                        key={`label-${d.id}`}
                                        x={isHorizontal ? -10 : bandPos + domainScale.bandwidth() / 2}
                                        y={isHorizontal ? bandPos + domainScale.bandwidth() / 2 + 4 : chartHeight + 15}
                                        textAnchor={isHorizontal ? "end" : "middle"}
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

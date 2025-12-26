import { useMemo } from 'react';
import { parseISO, format, startOfWeek, endOfWeek, startOfMonth, isValid } from 'date-fns';
import type { DataPoint, ChartView, RawDataPoint } from '../types';

interface UseChartDataProps {
    data: RawDataPoint[];
    view: ChartView;
    dataKeys: {
        label: string;
        value: string | string[]; // Single key or array of keys
        date: string;
    };
    colors?: string[];
}

// Default Premium Palette
const DEFAULT_PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

export const useChartData = ({ data, view, dataKeys, colors = DEFAULT_PALETTE }: UseChartDataProps) => {
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const standardData: DataPoint[] = data.map((item, index) => {
            const dateRaw = item[dataKeys.date];
            const date = dateRaw instanceof Date ? dateRaw : parseISO(dateRaw as string);

            // Handle Stacked vs Single Value
            let totalValue = 0;
            let stackedValues: { key: string; value: number; color: string }[] = [];

            if (Array.isArray(dataKeys.value)) {
                // Stacked
                dataKeys.value.forEach((key, kIndex) => {
                    const val = Number(item[key]) || 0;
                    totalValue += val;
                    stackedValues.push({
                        key,
                        value: val,
                        color: colors[kIndex % colors.length]
                    });
                });
            } else {
                // Single
                totalValue = Number(item[dataKeys.value]) || 0;
            }

            return {
                id: (item.id as string) || `item-${index}`,
                label: (item[dataKeys.label] as string) || '',
                value: totalValue,
                stackedValues: stackedValues.length > 0 ? stackedValues : undefined,
                date: isValid(date) ? date : new Date(),
                color: stackedValues.length === 0 ? colors[0] : undefined // Default color for single bar
            } as DataPoint;
        });

        const sorted = standardData.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Helper for grouping
        const groupBy = <T>(array: T[], keyFn: (item: T) => string) => {
            return array.reduce((result: any, item: T) => {
                const key = keyFn(item);
                (result[key] = result[key] || []).push(item);
                return result;
            }, {});
        };

        // Aggregation Logic
        let aggregated: DataPoint[] = [];

        if (view === 'day') {
            const grouped = groupBy(sorted, (d) => format(d.date, 'yyyy-MM-dd'));
            aggregated = Object.entries(grouped).map(([key, group]) => {
                const dayGroup = group as DataPoint[];
                const first = dayGroup[0];
                const total = dayGroup.reduce((sum, item) => sum + item.value, 0);

                let mergedStack: any[] = [];
                if (first.stackedValues) {
                    const stackMap = new Map<string, number>();
                    dayGroup.forEach(d => {
                        d.stackedValues?.forEach(s => {
                            const current = stackMap.get(s.key) || 0;
                            stackMap.set(s.key, current + s.value);
                        });
                    });
                    mergedStack = Array.from(stackMap.entries()).map(([k, v], i) => ({
                        key: k,
                        value: v,
                        color: colors[i % colors.length]
                    }));
                }

                return {
                    ...first,
                    id: key,
                    label: format(first.date, 'E dd'),
                    value: total,
                    stackedValues: mergedStack.length > 0 ? mergedStack : undefined
                };
            });
        }
        else if (view === 'week') {
            const grouped = groupBy(sorted, (d) => format(startOfWeek(d.date), 'yyyy-MM-dd'));
            aggregated = Object.entries(grouped).map(([key, group]) => {
                const weekGroup = group as DataPoint[];
                const first = weekGroup[0];
                const total = weekGroup.reduce((sum, item) => sum + item.value, 0);

                let mergedStack: any[] = [];
                if (first.stackedValues) {
                    const stackMap = new Map<string, number>();
                    weekGroup.forEach(d => {
                        d.stackedValues?.forEach(s => {
                            const current = stackMap.get(s.key) || 0;
                            stackMap.set(s.key, current + s.value);
                        });
                    });
                    mergedStack = Array.from(stackMap.entries()).map(([k, v], i) => ({
                        key: k,
                        value: v,
                        color: colors[i % colors.length]
                    }));
                }

                const weekStart = startOfWeek(first.date);
                const weekEnd = endOfWeek(first.date);
                const label = `${format(weekStart, 'MMM dd')}-${format(weekEnd, 'MMM dd')}`;

                return {
                    ...first,
                    id: key,
                    label: label,
                    value: total,
                    stackedValues: mergedStack.length > 0 ? mergedStack : undefined
                };
            });
        }
        else if (view === 'month') {
            const grouped = groupBy(sorted, (d) => format(startOfMonth(d.date), 'yyyy-MM'));
            aggregated = Object.entries(grouped).map(([key, group]) => {
                const monthGroup = group as DataPoint[];
                const first = monthGroup[0];
                const total = monthGroup.reduce((sum, item) => sum + item.value, 0);

                let mergedStack: any[] = [];
                if (first.stackedValues) {
                    const stackMap = new Map<string, number>();
                    monthGroup.forEach(d => {
                        d.stackedValues?.forEach(s => {
                            const current = stackMap.get(s.key) || 0;
                            stackMap.set(s.key, current + s.value);
                        });
                    });
                    mergedStack = Array.from(stackMap.entries()).map(([k, v], i) => ({
                        key: k,
                        value: v,
                        color: colors[i % colors.length]
                    }));
                }

                return {
                    ...first,
                    id: key,
                    label: format(first.date, 'MMM yy'),
                    value: total,
                    stackedValues: mergedStack.length > 0 ? mergedStack : undefined
                };
            });
        }
        else if (view === 'year') {
            const grouped = groupBy(sorted, (d) => format(d.date, 'yyyy'));
            aggregated = Object.entries(grouped).map(([key, group]) => {
                const yearGroup = group as DataPoint[];
                const first = yearGroup[0];
                const total = yearGroup.reduce((sum, item) => sum + item.value, 0);

                let mergedStack: any[] = [];
                if (first.stackedValues) {
                    const stackMap = new Map<string, number>();
                    yearGroup.forEach(d => {
                        d.stackedValues?.forEach(s => {
                            const current = stackMap.get(s.key) || 0;
                            stackMap.set(s.key, current + s.value);
                        });
                    });
                    mergedStack = Array.from(stackMap.entries()).map(([k, v], i) => ({
                        key: k,
                        value: v,
                        color: colors[i % colors.length]
                    }));
                }

                return {
                    ...first,
                    id: key,
                    label: key, // '2023'
                    value: total,
                    stackedValues: mergedStack.length > 0 ? mergedStack : undefined
                };
            });
        }
        else {
            aggregated = sorted;
        }

        return aggregated;

    }, [data, view, dataKeys, colors]);

    return processedData;
};

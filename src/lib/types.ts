export interface DataPoint {
    id: string;
    label: string;
    value: number; // Total value (sum of stack)
    stackedValues?: { key: string; value: number; color: string }[];
    date: Date; // ISO string or Date object
    color?: string;
    tooltip?: string;
    isPrediction?: boolean;
}

export interface RawDataPoint {
    [key: string]: any;
}

export type ChartView = 'day' | 'week' | 'month' | 'year';

export interface ChartTheme {
    background?: string;
    bar?: {
        radius?: number;
        opacity?: number;
        maxWidth?: number;
    };
    grid?: {
        stroke?: string;
        strokeDasharray?: string;
        visible?: boolean;
    };
    axis?: {
        labelColor?: string;
        tickColor?: string;
        fontSize?: number;
    };
    tooltip?: {
        backgroundColor?: string;
        textColor?: string;
        borderRadius?: number;
    };
}

export interface SmartBarChartProps {
    data: RawDataPoint[];
    view?: ChartView;
    variant?: 'default' | 'stacked';
    colors?: string[];
    theme?: ChartTheme; // New
    axisLabels?: { x?: string; y?: string };
    onViewChange?: (view: ChartView) => void;
    dataKeys: {
        label: string;
        value: string | string[];
        date: string;
    };
    geminiConfig?: {
        apiKey?: string;
        model?: string;
    };
    onPredict?: (currentData: DataPoint[]) => Promise<DataPoint[]>;
    onAnalyze?: (currentData: DataPoint[]) => Promise<string>;
    height?: number;
    width?: number | string;
    className?: string;
}

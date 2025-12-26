import React, { useMemo } from 'react';
import { Rect } from 'react-native-svg';
import type { DataPoint } from '../types';

interface BarNativeProps {
    x: number;
    y: number;
    width: number;
    height: number;
    data: DataPoint;
    onClick?: (data: DataPoint) => void;
    isActive?: boolean;
    isDimmed?: boolean;
    accessibilityLabel?: string;
    accessibilityRole?: string;
}

export const BarNative: React.FC<BarNativeProps> = ({
    x, y, width, height, data, onClick, isActive, isDimmed, accessibilityLabel
}) => {
    const fillColor = useMemo(() => {
        if (data.isPrediction) return '#8e44ad';
        if (isActive) return '#e74c3c';
        return data.color || '#3498db';
    }, [data, isActive]);

    return (
        <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fillColor}
            rx={4}
            ry={4}
            onPress={() => onClick?.(data)}
            stroke={isActive ? '#c0392b' : 'none'}
            strokeWidth={isActive ? 2 : 0}
            opacity={isDimmed ? 0.3 : (data.isPrediction ? 0.7 : 1)}
            // @ts-ignore
            accessibilityLabel={accessibilityLabel}
        />
    );
};

import React, { useMemo } from 'react';
import type { DataPoint } from '../types';

interface BarProps extends Omit<React.SVGProps<SVGRectElement>, 'onClick' | 'onMouseOver' | 'onMouseOut'> {
    x: number;
    y: number;
    width: number;
    height: number;
    data: DataPoint;
    onClick?: (data: DataPoint) => void;
    onHover?: (data: DataPoint | null) => void;
    isActive?: boolean;
    isDimmed?: boolean;
    style?: React.CSSProperties;
}

export const Bar: React.FC<BarProps> = ({
    x, y, width, height, data, onClick, onHover, isActive, isDimmed, style, ...rest
}) => {
    const fillColor = useMemo(() => {
        if (data.isPrediction) return '#8e44ad'; // Purple for prediction
        if (isActive) return '#e74c3c'; // Red for active
        return data.color || '#3498db'; // Default blue
    }, [data, isActive]);

    return (
        <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fillColor}
            rx={4} // Rounded corners top
            ry={4}
            className="transition-all duration-300 cursor-pointer hover:opacity-80"
            onClick={() => onClick?.(data)}
            onMouseEnter={() => onHover?.(data)}
            onMouseLeave={() => onHover?.(null)}
            style={{
                opacity: isDimmed ? 0.3 : (data.isPrediction ? 0.7 : 1),
                stroke: isActive ? '#c0392b' : 'none',
                strokeWidth: isActive ? 2 : 0,
                transition: 'all 0.3s ease',
                ...style
            }}
            {...rest}
        />
    );
};

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { DataPoint } from '../types';

interface BarProps extends Omit<React.SVGProps<SVGRectElement>,
    'onClick' | 'onMouseOver' | 'onMouseOut' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'values'
> {
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
        <motion.rect
            initial={{ height: 0, y: y + height, x }}
            animate={{ height, y, x }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            width={width}
            fill={fillColor}
            rx={4}
            ry={4}
            className="cursor-pointer hover:opacity-80"
            onClick={() => onClick?.(data)}
            onMouseEnter={() => onHover?.(data)}
            onMouseLeave={() => onHover?.(null)}
            style={{
                opacity: isDimmed ? 0.3 : (data.isPrediction ? 0.7 : 1),
                stroke: isActive ? '#c0392b' : 'none',
                strokeWidth: isActive ? 2 : 0,
                ...style
            }}
            {...rest}
        />
    );
};

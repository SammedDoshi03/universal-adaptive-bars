import React from 'react';
import type { DataPoint } from '../types';

interface TooltipProps {
    data: DataPoint;
    position: { x: number; y: number };
}

export const Tooltip: React.FC<TooltipProps> = ({ data, position }) => {
    return (
        <div
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -100%)',
                marginBottom: '8px',
                backgroundColor: '#333',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                pointerEvents: 'none',
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
        >
            <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{data.label}</div>
            <div>Value: {data.value}</div>
            {data.isPrediction && (
                <div style={{ marginTop: 2, color: '#a29bfe', fontStyle: 'italic' }}>Prediction</div>
            )}
        </div>
    );
};

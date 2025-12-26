import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DataPoint } from '../types';

interface TooltipNativeProps {
    data: DataPoint;
    position: { x: number; y: number };
}

export const TooltipNative: React.FC<TooltipNativeProps> = ({ data, position }) => {
    return (
        <View
            style={[
                styles.tooltip,
                {
                    left: position.x,
                    top: position.y,
                    transform: [{ translateX: -50 }, { translateY: -100 }] as any, // React Native transform style
                }
            ]}
        >
            <Text style={styles.label}>{data.label}</Text>
            <Text style={styles.value}>Value: {data.value}</Text>
            {data.isPrediction && (
                <Text style={styles.prediction}>Prediction</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    tooltip: {
        position: 'absolute',
        backgroundColor: '#333',
        padding: 8,
        borderRadius: 4,
        zIndex: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    label: {
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 2,
        fontSize: 12
    },
    value: {
        color: '#fff',
        fontSize: 12
    },
    prediction: {
        marginTop: 2,
        color: '#a29bfe',
        fontStyle: 'italic',
        fontSize: 10
    }
});

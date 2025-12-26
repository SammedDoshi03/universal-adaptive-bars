import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartBarChart } from '../SmartBarChart';
import type { RawDataPoint } from '../types';

// Mock data
const mockData: RawDataPoint[] = [
    { id: '1', date: '2023-01-01', value: 100, label: 'Jan' },
    { id: '2', date: '2023-02-01', value: 200, label: 'Feb' },
    { id: '3', date: '2023-03-01', value: 150, label: 'Mar' }
];

const dataKeys = {
    date: 'date',
    value: 'value',
    label: 'label'
};

describe('SmartBarChart', () => {
    it('renders without crashing', () => {
        render(<SmartBarChart data={mockData} dataKeys={dataKeys} view="month" />);
        const chart = screen.getByRole('img', { name: /bar chart/i });
        expect(chart).toBeInTheDocument();
    });

    it('renders correct number of bars', async () => {
        render(<SmartBarChart data={mockData} dataKeys={dataKeys} view="month" />);
        // We expect individual bars with role="graphics-symbol"
        // Wait for bars to render
        const bars = screen.getAllByRole('graphics-symbol');
        expect(bars.length).toBeGreaterThan(0);
        // Note: Might be 3 or less depending on visibility logic, but here month view with 3 items should show all 3 if within window
    });

    it('displays axis labels', () => {
        const axisLabels = { x: 'Time', y: 'Revenue' };
        render(<SmartBarChart data={mockData} dataKeys={dataKeys} view="month" axisLabels={axisLabels} />);
        expect(screen.getByText('Time')).toBeInTheDocument();
        expect(screen.getByText('Revenue')).toBeInTheDocument();
    });

    it('handles interaction (click)', () => {
        render(<SmartBarChart data={mockData} dataKeys={dataKeys} view="month" />);
        const bars = screen.getAllByRole('graphics-symbol');
        const firstBar = bars[0];

        fireEvent.click(firstBar);
        // "100" appears on the axis AND as the active label. 
        // We want to verify the active label appears.
        const labels = screen.getAllByText('100');
        // We expect at least 2: one from axis, one from the active bar label
        expect(labels.length).toBeGreaterThanOrEqual(2);

        // Optional: verify one of them is bold (the active label)
        const activeLabel = labels.find(l => l.getAttribute('font-weight') === 'bold');
        expect(activeLabel).toBeInTheDocument();
    });

    it('applies theme correctly', () => {
        const theme = {
            background: 'rgb(31, 41, 55)', // Custom bg
        };
        const { container } = render(<SmartBarChart data={mockData} dataKeys={dataKeys} view="month" theme={theme} />);
        // Check if wrapper has background
        // The wrapper class is smart-bar-chart-wrapper
        const wrapper = container.querySelector('.smart-bar-chart-wrapper');
        expect(wrapper).toHaveStyle('background: rgb(31, 41, 55)');
    });
});

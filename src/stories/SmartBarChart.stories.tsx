import type { Meta, StoryObj } from '@storybook/react';
import { SmartBarChart } from '../lib';

const meta = {
    title: 'Charts/SmartBarChart',
    component: SmartBarChart,
    tags: ['autodocs'],
    argTypes: {
        view: {
            control: { type: 'select' },
            options: ['day', 'week', 'month', 'year']
        },
    },
} satisfies Meta<typeof SmartBarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockData = Array.from({ length: 100 }, (_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    value: Math.floor(Math.random() * 100) + 10,
    label: `Day ${i}`,
    id: `id-${i}`
}));

export const Default: Story = {
    args: {
        data: mockData,
        view: 'month',
        dataKeys: { label: 'label', value: 'value', date: 'date' },
        height: 400,
        axisLabels: { x: 'Date Timeline', y: 'Revenue ($)' }
    },
};

export const YearView: Story = {
    args: {
        ...Default.args,
        view: 'year',
    }
};

export const Stacked: Story = {
    args: {
        ...Default.args,
        variant: 'stacked',
        dataKeys: { label: 'label', value: ['value', 'value'], date: 'date' }, // Mocking stacked with same value
        colors: ['#3b82f6', '#10b981']
    }
};

export const DarkMode: Story = {
    args: {
        ...Default.args,
        theme: {
            background: '#1f2937',
            bar: { radius: 4, opacity: 0.9 },
            grid: { stroke: '#374151', visible: true },
            axis: { labelColor: '#9ca3af', tickColor: '#4b5563' }
        },
    }
};

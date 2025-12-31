import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SmartBarChart } from '../SmartBarChart';

describe('SmartBarChart Navigation', () => {
    const mockData = Array.from({ length: 24 }, (_, i) => {
        const year = 2023 + Math.floor(i / 12);
        const month = (i % 12) + 1;
        return {
            date: `${year}-${String(month).padStart(2, '0')}-01`,
            value: 100,
            label: `Item ${i}`
        };
    });

    it('enables prev button when data exceeds visible count', () => {
        render(<SmartBarChart data={mockData} view="month" />); // VISIBLE_COUNT = 12
        // mockData has 24 items. 
        // Initial window: last 12 items (indices 12-23).
        // Prev button should be enabled because we can go back to indices 0-11.

        const prevBtn = screen.getByText('<');
        const nextBtn = screen.getByText('>');

        expect(prevBtn).not.toBeDisabled();
        expect(nextBtn).toBeDisabled(); // Already at the end (newest)
    });

    it('updates window offset when prev button is clicked', () => {
        render(<SmartBarChart data={mockData} view="month" />);
        const prevBtn = screen.getByText('<');

        fireEvent.click(prevBtn);
        // Window moves back by 1.

        // Next button should now be enabled
        const nextBtn = screen.getByText('>');
        expect(nextBtn).not.toBeDisabled();
    });
});

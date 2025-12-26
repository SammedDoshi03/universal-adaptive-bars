import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DataPoint, ChartView } from '../types';
import { addDays, addWeeks, addMonths, format } from 'date-fns';

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: modelName });
    }

    async predictNext(data: DataPoint[], count: number = 3, view: ChartView = 'month'): Promise<DataPoint[]> {
        if (data.length === 0) return [];

        const prompt = `
      I have a time series data:
      ${data.map(d => `${d.label}: ${d.value}`).join('\n')}
      
      Predict the next ${count} values based on the trend.
      Return ONLY a JSON array of numbers. Example: [10, 12, 15].
      Do not include any explanation or markdown formatting.
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const predictedValues: number[] = JSON.parse(cleaned);

            const lastPoint = data[data.length - 1];
            const lastDate = lastPoint.date;

            return predictedValues.map((val, index) => {
                let newDate = lastDate;
                if (view === 'day') newDate = addDays(lastDate, index + 1);
                else if (view === 'week') newDate = addWeeks(lastDate, index + 1);
                else if (view === 'month') newDate = addMonths(lastDate, index + 1);

                let label = '';
                if (view === 'day') label = format(newDate, 'eee dd');
                else if (view === 'week') label = `W${index + 1}`;
                else if (view === 'month') label = format(newDate, 'MMM');
                else label = format(newDate, 'yyyy');

                return {
                    id: `prediction-${index}`,
                    label,
                    value: val,
                    date: newDate,
                    isPrediction: true,
                    color: '#8e44ad'
                } as DataPoint;
            });

        } catch (e) {
            console.error("Gemini Prediction Failed", e);
            return [];
        }
    }

    async analyze(data: DataPoint[]): Promise<string> {
        const prompt = `
      Analyze the following data trend:
      ${data.map(d => `${d.label}: ${d.value}`).join(', ')}
      
      Provide a short, insightful summary (max 2 sentences).
    `;
        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        } catch (e) {
            console.error("Gemini Analysis Failed", e);
            return "Analysis unavailable.";
        }
    }
}

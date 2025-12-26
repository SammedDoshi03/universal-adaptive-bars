import { useState } from 'react'
import { SmartBarChart } from '../lib'
import '../demo/App.css'

function App() {
  const [apiKey, setApiKey] = useState('AIzaSyAi_8VzcWEu-f4MkMKxA2ifGbKyuv_AswY');
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [variant, setVariant] = useState<'default' | 'stacked'>('default');

  // Generating a longer dataset for navigation demo with multiple values
  // Generating 36 items spanning multiple years to test 'MMM yy' labels and scrolling
  // Generating daily data for 2 years (2023-2024) to ensure drill-down works at all levels
  const [data] = useState(() => {
    const arr = [];
    const startDate = new Date(2023, 0, 1);
    const endDate = new Date(2024, 11, 31);

    // Helper to add days
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    }

    let currentDate = startDate;
    let i = 0;
    while (currentDate <= endDate) {
      arr.push({
        date: currentDate.toISOString().split('T')[0],
        valueA: Math.floor(Math.random() * 50) + 10, // More variance
        valueB: Math.floor(Math.random() * 30) + 5,
        label: `Day ${i}`
      });
      currentDate = addDays(currentDate, 1);
      i++;
    }
    return arr;
  });

  return (
    <div className="container" style={{ fontFamily: 'sans-serif' }}>
      <h1>Smart Bar Chart Demo</h1>

      {/* Controls */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label>API Key: </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ padding: '4px 8px' }}
          />
        </div>
        <div>
          <label>View: </label>
          <select value={view} onChange={(e) => setView(e.target.value as any)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        <div>
          <label>Variant: </label>
          <select value={variant} onChange={(e) => setVariant(e.target.value as any)}>
            <option value="default">Default</option>
            <option value="stacked">Stacked</option>
          </select>
        </div>
      </div>

      <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 8, background: '#fff' }}>
        <SmartBarChart
          data={data}
          view={view}
          variant={variant}
          dataKeys={{
            label: 'label',
            value: variant === 'stacked' ? ['valueA', 'valueB'] : 'valueA',
            date: 'date'
          }}
          height={400}
          geminiConfig={{ apiKey }}
          axisLabels={{ x: 'Date Timeline', y: 'Revenue ($)' }}
          onViewChange={(v) => {
            if (v !== 'year') setView(v);
          }}
        />
      </div>

      <div style={{ marginTop: 20, color: '#666', fontSize: 13 }}>
        <p><strong>Instructions:</strong></p>
        <ul>
          <li>Use <strong>&lt; / &gt;</strong> buttons (outside graph) to navigate. (Requires enough data).</li>
          <li>Data spans Jan 2023 to Dec 2025.</li>
          <li>Toggle <strong>Variant</strong> to "Stacked" to see multi-value bars.</li>
          <li>Click <strong>Predict</strong> to generate future data points.</li>
        </ul>
      </div>
    </div>
  )
}

export default App

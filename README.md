# Universal Adaptive Bars 📊

A highly customizable, interactive, and drill-down capable Bar Chart library for **React** and **React Native**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.0.5-green.svg)

📖 **Read the Story**: [Universal Adaptive Bars: The Smart Cross-Platform Charting Library You’ve Been Waiting For](https://sammeddoshi.medium.com/universal-adaptive-bars-the-smart-cross-platform-charting-library-youve-been-waiting-for-80501b0c0e3b)

## New in v0.0.5 🚀
- **Calendar Jump**: Selecting a date in the calendar now "jumps" to that date (scrolling the view) instead of filtering data, preserving your ability to navigate back and forth.
- **Smart Stacked Radius**: Stacked bars now intelligently apply rounded corners only to the top and bottom segments for a polished UI.
- **Improved Alignment**: Perfect X-axis alignment for both standard and stacked bars.

## Features

- 📅 **Time-based Drill Down**: Navigate seamlessly continuously from **Year** -> **Month** -> **Week** -> **Day**.
- 🎨 **Deep Customization**: Full control over colors, grid, axis, and bar styling via the `theme` prop.
- 📱 **React Native Support**: First-class support for Mobile via `react-native-svg`.
- 🥞 **Stacked Bars**: Support for multi-value data keys (Histogram style).
- ♿ **Accessible**: ARIA support for Web and Accessibility Props for Native.
- 🤖 **AI Ready**: Integrated interfaces for predictive analytics.

## Installation

```bash
npm install universal-adaptive-bars date-fns d3-scale clsx tailwind-merge
# Peer Dependencies for React Native
# npm install react-native-svg
```

## Usage (Web)

```tsx
import { SmartBarChart, DataPoint } from 'smart-bar-chart';

const data = [
  { date: '2023-01-01', value: 100, label: 'Jan' },
  { date: '2023-02-01', value: 200, label: 'Feb' },
  // ...
];

function App() {
  return (
    <SmartBarChart
      data={data}
      view="month"
      dataKeys={{ label: 'label', value: 'value', date: 'date' }}
      axisLabels={{ x: 'Date', y: 'Revenue' }}
      height={400}
      theme={{
          background: '#fff',
          bar: { radius: 4, opacity: 1 },
          grid: { stroke: '#eee', visible: true }
      }}
    />
  );
}
```

## Usage (React Native)

```tsx
import { SmartBarChartNative } from 'smart-bar-chart/native';

// ... usage is identical to Web component
<SmartBarChartNative
  data={data}
  view="month"
  dataKeys={{ label: 'label', value: 'value', date: 'date' }}
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `RawDataPoint[]` | Array of data objects. |
| `view` | `'day' \| 'week' \| 'month' \| 'year'` | Initial aggregation level. |
| `dataKeys` | `{ label: string, value: string \| string[], date: string }` | Keys to map data fields. |
| `theme` | `ChartTheme` | Custom styling object. |
| `onViewChange` | `(view: ChartView) => void` | Callback when drill-down occurs. |
| `geminiConfig` | `{ apiKey: string, model: string }` | Configuration for AI predictions. |

## Customization (Theme)

The `theme` prop allows you to override default styles:

```ts
interface ChartTheme {
    background?: string;
    bar?: {
        radius?: number;
        opacity?: number;
        maxWidth?: number;
    };
    grid?: {
        stroke?: string;
        strokeDasharray?: string;
        visible?: boolean;
    };
    axis?: {
        labelColor?: string;
        tickColor?: string;
        fontSize?: number;
    };
}
```

## Accessibility

- **Web**: Main chart has `role="img"` and proper ARIA labels. Bars are interactive.
- **Native**: Elements support `accessibilityLabel` and `accessibilityHint` compatible with TalkBack and VoiceOver.

---

Built with ❤️ using React & D3.

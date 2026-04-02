# Universal Adaptive Bars 📊

A highly customizable, interactive, and drill-down capable Bar Chart library for **React** and **React Native**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.0.6-green.svg)

📖 **Read the Story**: [Universal Adaptive Bars: The Smart Cross-Platform Charting Library You’ve Been Waiting For](https://sammeddoshi.medium.com/universal-adaptive-bars-the-smart-cross-platform-charting-library-youve-been-waiting-for-80501b0c0e3b)

## New in v0.1.0 🚀
- **Horizontal Layouts**: Flip the chart horizontally using `layout="horizontal"`. Works automatically on Web and Native.
- **Grouped Variant**: Introducing side-by-side grouped charts for multi-value datasets using `variant="grouped"`.
- **Zero-Day Auto Fill**: Setting `missingDataStrategy="zero"` automatically detects and inserts missing dates/months so your timelines flow continuously without skips.
- **Annotations**: Feed an array of `annotations={[{ value: 50, label: "Target" }]}` to draw persistent threshold lines across the chart.
- **Value Formatters**: Pass `valueFormatter={(val) => '$' + val}` to format the Y-axis and labels automatically.

## Features

- 📅 **Time-based Drill Down**: Navigate seamlessly continuously from **Year** -> **Month** -> **Week** -> **Day**.
- 📐 **Multiple Layouts**: Toggle between **vertical** and **horizontal** layout rendering instantly.
- 🎨 **Deep Customization**: Full control over colors, grid, axis, and bar styling via the `theme` prop.
- 📱 **React Native Support**: First-class support for Mobile via `react-native-svg` (100% parity with Web).
- 🥞 **Variants**: Support for `stacked` & `grouped` bars for multi-value data keys (Histogram style).
- ♿ **Accessible**: ARIA support for Web and Accessibility Props for Native.
- 🤖 **AI Ready**: Integrated interfaces for predictive analytics.

## Installation

```bash
npm install universal-adaptive-bars date-fns d3-scale
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
      layout="vertical"
      variant="grouped"
      missingDataStrategy="zero"
      valueFormatter={(val) => `$${val}`}
      annotations={[{ value: 150, label: 'Goal', color: 'green' }]}
      dataKeys={{ label: 'label', value: 'value', date: 'date' }}
      axisLabels={{ x: 'Date', y: 'Revenue' }}
      height={400}
    />
  );
}
```

## Usage (React Native)

```tsx
import { SmartBarChartNative } from 'smart-bar-chart/native';

// ... usage is identical to Web component (Horizontal, Grouped, Zero-Day fully supported!)
<SmartBarChartNative
  data={data}
...
/>
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `RawDataPoint[]` | Array of data objects. |
| `view` | `'day' \| 'week' \| 'month' \| 'year'` | Initial aggregation level. |
| `dataKeys` | `{ label: string, value: string \| string[], date: string }` | Keys to map data fields. |
| `variant` | `'default' \| 'stacked' \| 'grouped'` | The style architecture. |
| `layout` | `'vertical' \| 'horizontal'` | Flipped orientation. |
| `missingDataStrategy` | `'skip' \| 'zero'` | Strategy to deal with timeline skips. |
| `annotations` | `Array<{ value, label?, color?, strokeDasharray? }>` | Draws horizontal/vertical threshold lines. |
| `valueFormatter` | `(value: number) => string` | Custom formatting function. |
| `theme` | `ChartTheme` | Custom styling object. |

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

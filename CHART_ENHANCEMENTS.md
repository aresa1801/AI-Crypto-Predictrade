# Chart Enhancements Documentation

## Overview

PREDICTRADE now features professional-grade quantitative charts using Recharts with advanced analytics visualizations. All charts follow dark mode design system (#3B82F6 primary, #10B981 success, #EF4444 danger) and implement responsive design with proper resize handling.

## Chart Architecture

### 1. Chart Utilities (`lib/utils/chart-utils.ts`)

**Color System:**
- Primary: #3B82F6 (Blue) - Main data series
- Success: #10B981 (Emerald) - Bullish/Upward trends
- Danger: #EF4444 (Red) - Bearish/Downward trends
- Warning: #F59E0B (Amber) - Range-bound/sideways
- Border: #2D3748 (Dark Gray) - Grid lines
- Text: #9CA3AF (Gray) - Axis labels
- Surface: #111827 (Very Dark) - Tooltip background

**Number Formatters:**
- `numberFormatter`: Standard 2 decimal places
- `shortNumberFormatter`: Compact notation (1.2K, 1.5M)
- `percentFormatter`: Percentage with 2 decimals
- `currencyFormatter`: Currency with no decimals
- `formatCurrency()`: Returns "$1,234.56" format
- `formatPercent()`: Returns "12.34%" format

**Analytical Functions:**
- `getRegimeShiftMarkers()`: Detects bull/bear/chop regimes from price data
- `generateConfidenceBand()`: Creates upper/lower bounds with specified confidence level

### 2. Custom Tooltips (`components/charts/custom-tooltip.tsx`)

**PredictionTooltip:**
Displays enhanced analytics data including:
- Probability value
- Confidence Interval [low-high]
- Volume (formatted as billions)
- Model version

**SimpleTooltip:**
Basic tooltip for simple data series.

Both use consistent styling with dark mode background and colored text.

### 3. Sparklines (`components/charts/sparkline.tsx`)

Tiny inline charts for table cells showing 20-point price movements.

**Features:**
- Responsive width via ResizeObserver and useLayoutEffect
- Four color options: success, danger, primary, warning
- No animation (isAnimationActive={false}) for performance
- Automatic sizing based on container

**Usage:**
```tsx
<Sparkline
  data={priceHistory}
  dataKey="value"
  color="success"
  height={30}
  width={80}
/>
```

### 4. Enhanced Prediction Chart (`components/charts/enhanced-prediction-chart.tsx`)

Professional price analysis with:

**1. Confidence Bands (Opacity 20%)**
- Area shading around main price line
- Uses `ci_low` and `ci_high` data fields
- Gradient fill with 20% opacity

**2. Regime Shift Markers**
- Vertical reference lines at regime transitions
- Labels: BULL (green), BEAR (red), CHOP (amber)
- Tooltip shows timestamp and regime type
- Auto-detected from price patterns

**3. Technical Indicators**
- 20-Day Simple Moving Average (dashed green)
- Bollinger Bands upper/lower (dashed amber)
- Main price area (solid blue gradient)

**4. Custom Tooltips**
Shows all metrics: probability, CI, volume, model version

**5. Responsive**
- useLayoutEffect for resize detection
- Proper mobile spacing
- ResponsiveContainer for fluid width

### 5. Enhanced Backtest Chart (`components/charts/enhanced-backtest-chart.tsx`)

Equity curve visualization with:

**Features:**
- Dynamic Y-axis range with 10% padding
- Custom number formatting ($1,234.56)
- Smart X-axis interval calculation
- Responsive container sizing
- Smooth animations disabled for clarity

**Usage:**
```tsx
<EnhancedBacktestChart
  data={equityData}
  title="Equity Growth Projection"
/>
```

## Data Format Requirements

### Price Chart Data
```typescript
interface PriceData {
  time: string
  price: number
  ci_low?: number      // Confidence interval lower
  ci_high?: number     // Confidence interval upper
  volume?: number      // Trading volume
  sma20?: number       // 20-day simple moving average
  bb_upper?: number    // Bollinger Band upper
  bb_lower?: number    // Bollinger Band lower
}
```

### Backtest Data
```typescript
interface BacktestData {
  date: string
  value: number        // Account equity value
}
```

## Implementation Examples

### Using Enhanced Prediction Chart
```tsx
<EnhancedPredictionChart
  asset={prediction}
  data={priceChartData}
  modelVersion="2.1"
/>
```

### Using Sparkline in Table
```tsx
<table>
  <tbody>
    <tr>
      <td>{asset.symbol}</td>
      <td>
        <Sparkline
          data={generateSparklineData(asset.price)}
          color={asset.change24h >= 0 ? 'success' : 'danger'}
          height={30}
        />
      </td>
    </tr>
  </tbody>
</table>
```

### Using Custom Tooltip
```tsx
<Tooltip
  content={({ active, payload, label }) => (
    <PredictionTooltip
      active={active}
      payload={payload}
      label={label}
      confidence={{ low: 100, high: 200 }}
      volume={1500000000}
      modelVersion="2.1"
    />
  )}
/>
```

## Responsive Design

All charts use:
- `useLayoutEffect` for resize observation
- `ResizeObserver` for accurate container sizing
- `ResponsiveContainer` from Recharts for fluid layouts
- Proper margin/padding for mobile devices
- No horizontal overflow on small screens

## Dark Mode Colors

The chart system automatically adapts to dark mode:
- Background: #0B0F19
- Surfaces: #111827
- Text: #9CA3AF
- All chart colors use RGB with opacity values for Tailwind compatibility

## Performance Optimizations

- `isAnimationActive={false}` for large datasets
- Memoized color and formatter objects
- ResizeObserver for efficient resize handling
- Lazy data processing for regime detection

## Future Enhancements

- [ ] Candlestick charts for OHLC data
- [ ] Volume bars beneath price chart
- [ ] Multiple timeframe selection
- [ ] Chart export functionality
- [ ] Annotation tools for analysis
- [ ] Real-time data streaming

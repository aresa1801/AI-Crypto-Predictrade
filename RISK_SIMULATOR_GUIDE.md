# Risk & Scenario Simulator Guide

## Overview

The Interactive Risk & Scenario Simulator is a real-time tool for analyzing trading scenarios and calculating optimal position sizing using quantitative risk metrics.

## Features

### 1. Dynamic Parameter Control

**Volatility Multiplier (0.5x - 3x)**
- Adjusts market volatility assumptions
- 1.0 = baseline conditions
- Higher values increase drawdown estimates
- Real-time updates with 150ms debounce to prevent jank

**Volume Spike (-50% to +150%)**
- Models expected volume changes
- Negative values = lower liquidity scenarios
- Positive values = increased participation
- Affects expected value and confidence intervals

**Macro Shock Level (Low/Medium/High)**
- Discrete scenario selection
- Low: Normal market conditions (1.0x factor)
- Medium: Elevated uncertainty (1.25x factor)
- High: Crisis scenario (1.6x factor)

### 2. Real-Time Calculations

All metrics update in real-time as parameters change:

#### Probability Distribution
- **Mean**: Expected outcome of the scenario
- **Standard Deviation**: Volatility of outcomes
- **95% Confidence Interval**: Range containing 95% of possible outcomes

#### Expected Value
- Risk-adjusted expected profit/loss
- Combines win rate, avg win/loss, and scenario factors
- Penalty applied for increased volatility
- Bonus applied for increased volume

#### Optimal Position Size (Kelly %)
- Kelly Criterion: f* = (bp - q) / b
- Safe implementation: capped at 25% maximum
- b = win/loss ratio
- p = win probability, q = loss probability
- Prevents over-leveraging while optimizing capital growth

#### Max Drawdown Estimate
- Monte Carlo projection of peak-to-trough decline
- Based on volatility, Sharpe ratio, and trade count
- Helps determine risk tolerance
- Range: -50% to -1%

### 3. Advanced Metrics

**Return/Drawdown Ratio**
- Measures risk-adjusted returns
- Higher values = better risk/reward
- Helps compare different scenarios

**Risk-Adjusted Return**
- Expected Value / Absolute Drawdown
- Shows profit potential relative to downside risk

### 4. Export & Configuration

**Export Config**
- Downloads scenario as JSON file
- Includes parameters and calculated results
- Timestamped for tracking analysis history
- Format: `risk-scenario-{timestamp}.json`

## User Interface

### Accessible Sliders

All sliders follow WCAG accessibility standards:

```tsx
<AccessibleSlider
  label="Volatility Multiplier"
  value={1.0}
  min={0.5}
  max={3}
  step={0.1}
  unit="x"
  description="Market volatility adjustment factor"
  onChange={handleChange}
/>
```

Features:
- Full keyboard navigation (arrow keys, Home, End)
- Screen reader support with aria-valuenow, aria-valuemin, aria-valuemax
- Visual feedback during interaction
- Min/max labels for context
- Descriptive text below each control

### Macro Shock Selector

Radio-button-style selector with:
- Clear visual feedback of selected option
- Descriptive text explaining each level
- Keyboard accessible with arrow key navigation

## Mathematical Foundation

### Kelly Criterion Implementation

```
Optimal Fraction (f*) = (bp - q) / b

Where:
- b = Average Win / Average Loss (odds)
- p = Win Probability / 100
- q = 1 - p (Loss Probability)

Safety cap: min(f*, 0.25) - prevents >25% per trade
```

### Probability Distribution

Based on normal distribution with adjustments:

```
Adjusted Volatility = Base Volatility × Multiplier × MacroFactor

Confidence Interval = [Mean - 1.96 × StdDev, Mean + 1.96 × StdDev]
```

### Max Drawdown Estimate

Uses Monte Carlo approximation:

```
MaxDD = -SharpeRatio × Volatility × √(NumTrades)

Clamped to realistic range: [-50%, -1%]
```

## Performance Optimization

### Debouncing

- Input changes are debounced at 150ms
- Prevents calculation overhead while typing/adjusting
- Provides smooth UX without lag
- useDebounce hook handles state synchronization

### useReducer Pattern

- Centralized state management
- Predictable state transitions
- Clean separation of concerns
- Efficient re-renders

### Memoization

- Risk calculations only run when debounced state changes
- useMemo prevents unnecessary recalculations
- useCallback prevents handler function recreation

## Validation

All inputs are validated:

- **Volatility**: Constrained to 0.5x - 3x range
- **Volume**: Constrained to -50% to +150% range
- **Macro Shock**: Enum validation (low/medium/high)
- **Numbers**: Step-based input prevents invalid decimals

## Use Cases

1. **Pre-Trade Planning**
   - Adjust volatility based on market conditions
   - Determine optimal position size for given risk
   - Stress test strategy under different scenarios

2. **Risk Assessment**
   - Evaluate maximum acceptable drawdown
   - Compare scenarios (bear vs. bull)
   - Plan position sizing under macro uncertainty

3. **Portfolio Analysis**
   - Model portfolio exposure adjustments
   - Plan rebalancing during volatility spikes
   - Test recovery from drawdown scenarios

4. **Strategy Development**
   - Backtest assumptions under different conditions
   - Find optimal leverage points
   - Validate risk controls

## Examples

### Bullish Scenario
- Volatility: 0.8x (lower due to confidence)
- Volume: +50% (increased participation)
- Macro: Low (favorable conditions)
- Expected: Higher expected value, tighter confidence band

### Bear Market
- Volatility: 2.0x (increased uncertainty)
- Volume: -30% (reduced liquidity)
- Macro: High (crisis scenario)
- Expected: Lower expected value, wider confidence band, larger drawdown

### Crisis Mode
- Volatility: 3.0x (maximum)
- Volume: -50% (minimal liquidity)
- Macro: High (systemic risk)
- Expected: Severely reduced expected value, maximum drawdown

## Technical Implementation

### State Management

```tsx
type SimulatorAction =
  | { type: 'SET_VOLATILITY'; payload: number }
  | { type: 'SET_VOLUME_SPIKE'; payload: number }
  | { type: 'SET_MACRO_SHOCK'; payload: 'low' | 'medium' | 'high' }
  | { type: 'RESET' }
```

### Calculation Pipeline

1. User adjusts sliders → dispatch action
2. Reducer updates state
3. useDebounce delays state to avoid jank
4. useMemo triggers risk calculation
5. Results computed using risk-calculations.ts
6. UI re-renders with new values

## Future Enhancements

- Historical scenario comparison
- Custom base parameters per asset
- Correlation matrix for portfolio risk
- Backtesting against real historical data
- PDF report generation
- Scenario bookmarking and sharing

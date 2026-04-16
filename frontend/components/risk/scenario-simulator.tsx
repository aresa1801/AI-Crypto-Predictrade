'use client'

import { useReducer, useCallback, useMemo } from 'react'
import { AccessibleSlider } from '@/components/inputs/accessible-slider'
import { assessRisk } from '@/lib/utils/risk-calculations'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { Download, RotateCcw } from 'lucide-react'

interface SimulatorState {
  volatilityMultiplier: number
  volumeSpike: number
  macroShockLevel: 'low' | 'medium' | 'high'
  baseWinRate: number
  baseExpectedValue: number
  avgWin: number
  avgLoss: number
  numTrades: number
}

const initialState: SimulatorState = {
  volatilityMultiplier: 1.0,
  volumeSpike: 0,
  macroShockLevel: 'low',
  baseWinRate: 60,
  baseExpectedValue: 1.5,
  avgWin: 1.5,
  avgLoss: 1.0,
  numTrades: 100,
}

type SimulatorAction =
  | { type: 'SET_VOLATILITY'; payload: number }
  | { type: 'SET_VOLUME_SPIKE'; payload: number }
  | { type: 'SET_MACRO_SHOCK'; payload: 'low' | 'medium' | 'high' }
  | { type: 'RESET' }

function simulatorReducer(state: SimulatorState, action: SimulatorAction): SimulatorState {
  switch (action.type) {
    case 'SET_VOLATILITY':
      return { ...state, volatilityMultiplier: action.payload }
    case 'SET_VOLUME_SPIKE':
      return { ...state, volumeSpike: action.payload }
    case 'SET_MACRO_SHOCK':
      return { ...state, macroShockLevel: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export function ScenarioSimulator() {
  const [state, dispatch] = useReducer(simulatorReducer, initialState)
  const debouncedState = useDebounce(state, 150)

  // Calculate risk metrics with debounced values
  const riskResults = useMemo(() => {
    return assessRisk({
      volatilityMultiplier: debouncedState.volatilityMultiplier,
      volumeSpike: debouncedState.volumeSpike,
      macroShockLevel: debouncedState.macroShockLevel,
      baseWinRate: debouncedState.baseWinRate,
      baseExpectedValue: debouncedState.baseExpectedValue,
      avgWin: debouncedState.avgWin,
      avgLoss: debouncedState.avgLoss,
      numTrades: debouncedState.numTrades,
    })
  }, [debouncedState])

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const handleExportConfig = useCallback(() => {
    const config = {
      scenario: {
        volatilityMultiplier: state.volatilityMultiplier,
        volumeSpike: state.volumeSpike,
        macroShockLevel: state.macroShockLevel,
      },
      results: riskResults,
      timestamp: new Date().toISOString(),
    }

    const json = JSON.stringify(config, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `risk-scenario-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state, riskResults])

  const macroShockDescriptions = {
    low: 'Normal market conditions',
    medium: 'Elevated uncertainty',
    high: 'Crisis scenario',
  }

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <div className="card space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Scenario Parameters</h3>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
            aria-label="Reset all parameters"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Volatility Slider */}
        <AccessibleSlider
          label="Volatility Multiplier"
          value={state.volatilityMultiplier}
          min={0.5}
          max={3}
          step={0.1}
          unit="x"
          description="Market volatility adjustment factor"
          onChange={(value) => dispatch({ type: 'SET_VOLATILITY', payload: value })}
        />

        {/* Volume Spike Slider */}
        <AccessibleSlider
          label="Volume Spike"
          value={state.volumeSpike}
          min={-50}
          max={150}
          step={5}
          unit="%"
          description="Expected volume change from baseline"
          onChange={(value) => dispatch({ type: 'SET_VOLUME_SPIKE', payload: value })}
        />

        {/* Macro Shock Selector */}
        <div className="space-y-2">
          <label htmlFor="macro-shock" className="text-sm font-medium text-text-primary">
            Macro Shock Level
          </label>
          <p id="macro-shock-desc" className="text-xs text-text-secondary mb-3">
            {macroShockDescriptions[state.macroShockLevel]}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => dispatch({ type: 'SET_MACRO_SHOCK', payload: level })}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  state.macroShockLevel === level
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
                }`}
                aria-pressed={state.macroShockLevel === level}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Probability Distribution */}
        <div className="card">
          <h4 className="text-sm font-semibold text-text-primary mb-4">Probability Distribution</h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-text-secondary mb-1">Mean</p>
              <p className="text-lg font-semibold text-accent-blue">
                {riskResults.probabilityDistribution.mean.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">Standard Deviation</p>
              <p className="text-lg font-semibold text-accent-emerald">
                {riskResults.probabilityDistribution.stdDev.toFixed(2)}%
              </p>
            </div>
            <div className="pt-2 border-t border-border-color">
              <p className="text-xs text-text-secondary mb-2">95% Confidence Interval</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-accent-amber">
                  {riskResults.probabilityDistribution.confidence95[0].toFixed(1)}%
                </span>
                <span className="text-text-secondary">to</span>
                <span className="font-medium text-accent-amber">
                  {riskResults.probabilityDistribution.confidence95[1].toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="card space-y-4">
          <h4 className="text-sm font-semibold text-text-primary">Risk Metrics</h4>

          {/* Expected Value */}
          <div className="p-3 rounded-lg bg-surface-secondary">
            <p className="text-xs text-text-secondary mb-1">Expected Value</p>
            <p className={`text-lg font-semibold ${riskResults.expectedValue >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
              {riskResults.expectedValue.toFixed(2)}
            </p>
          </div>

          {/* Kelly % */}
          <div className="p-3 rounded-lg bg-surface-secondary">
            <p className="text-xs text-text-secondary mb-1">Optimal Position Size (Kelly %)</p>
            <p className="text-lg font-semibold text-accent-blue">{riskResults.kellyPercent.toFixed(2)}%</p>
            <p className="text-xs text-text-secondary mt-1">
              Recommended fraction of capital per trade
            </p>
          </div>

          {/* Max Drawdown */}
          <div className="p-3 rounded-lg bg-surface-secondary">
            <p className="text-xs text-text-secondary mb-1">Max Drawdown Estimate</p>
            <p className="text-lg font-semibold text-accent-red">{riskResults.maxDrawdownEstimate.toFixed(2)}%</p>
            <p className="text-xs text-text-secondary mt-1">Potential peak-to-trough decline</p>
          </div>
        </div>
      </div>

      {/* Advanced Metrics */}
      <div className="card">
        <h4 className="text-sm font-semibold text-text-primary mb-4">Risk-Adjusted Returns</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-surface-secondary">
            <p className="text-xs text-text-secondary mb-1">Return/Drawdown Ratio</p>
            <p className="text-lg font-semibold text-accent-emerald">
              {riskResults.riskAdjustedReturn.toFixed(2)}x
            </p>
          </div>
          <div className="p-3 rounded-lg bg-surface-secondary">
            <p className="text-xs text-text-secondary mb-1">Confidence Level</p>
            <p className="text-lg font-semibold text-accent-blue">95%</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleExportConfig}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-blue text-white font-medium hover:bg-blue-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Config
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { RiskSimulationParams } from '@/lib/types'

interface RiskSimulatorFormProps {
  initialParams: RiskSimulationParams
  onSimulate: (params: RiskSimulationParams) => void
}

export function RiskSimulatorForm({ initialParams, onSimulate }: RiskSimulatorFormProps) {
  const [params, setParams] = useState(initialParams)

  const handleChange = (key: keyof RiskSimulationParams, value: number) => {
    const newParams = { ...params, [key]: value }
    setParams(newParams)
    onSimulate(newParams)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-text-primary">Simulation Parameters</h3>

      <div className="space-y-4">
        {/* Initial Capital */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Initial Capital: ${params.initialCapital.toLocaleString()}
          </label>
          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={params.initialCapital}
            onChange={(e) => handleChange('initialCapital', Number(e.target.value))}
            className="w-full h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-accent-blue"
          />
          <p className="text-xs text-text-secondary mt-1">Starting account balance</p>
        </div>

        {/* Risk Per Trade */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Risk Per Trade: {params.riskPerTrade}%
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={params.riskPerTrade}
            onChange={(e) => handleChange('riskPerTrade', Number(e.target.value))}
            className="w-full h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-accent-blue"
          />
          <p className="text-xs text-text-secondary mt-1">Percentage of capital risked per trade</p>
        </div>

        {/* Win Rate */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Win Rate: {params.winRate}%
          </label>
          <input
            type="range"
            min="20"
            max="80"
            step="5"
            value={params.winRate}
            onChange={(e) => handleChange('winRate', Number(e.target.value))}
            className="w-full h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-accent-blue"
          />
          <p className="text-xs text-text-secondary mt-1">Percentage of winning trades</p>
        </div>

        {/* Average Win */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Average Win: {params.avgWin}R
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={params.avgWin}
            onChange={(e) => handleChange('avgWin', Number(e.target.value))}
            className="w-full h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-accent-blue"
          />
          <p className="text-xs text-text-secondary mt-1">Average winning trade in risk units</p>
        </div>

        {/* Average Loss */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Average Loss: {params.avgLoss}R
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={params.avgLoss}
            onChange={(e) => handleChange('avgLoss', Number(e.target.value))}
            className="w-full h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-accent-blue"
          />
          <p className="text-xs text-text-secondary mt-1">Average losing trade in risk units</p>
        </div>

        {/* Number of Trades */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Number of Trades: {params.numTrades}
          </label>
          <input
            type="range"
            min="10"
            max="500"
            step="10"
            value={params.numTrades}
            onChange={(e) => handleChange('numTrades', Number(e.target.value))}
            className="w-full h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer accent-accent-blue"
          />
          <p className="text-xs text-text-secondary mt-1">Total trades to simulate</p>
        </div>
      </div>
    </div>
  )
}

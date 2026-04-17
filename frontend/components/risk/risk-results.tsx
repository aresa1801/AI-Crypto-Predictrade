'use client'

import { RiskSimulationParams } from '@/lib/types'
import { EnhancedBacktestChart } from '@/components/charts/enhanced-backtest-chart'
import { TrendingUp, AlertCircle } from 'lucide-react'

interface RiskResultsProps {
  results: {
    riskPerTrade: number
    expectedValue: number
    expectedProfit: number
    finalCapital: number
    roi: number
  }
  params: RiskSimulationParams
}

export function RiskResults({ results, params }: RiskResultsProps) {
  // Generate drawdown simulation data
  const drawdownData = Array.from({ length: params.numTrades + 1 }, (_, i) => ({
    trade: i,
    equity: params.initialCapital + (results.expectedProfit / params.numTrades) * i,
    maxEquity: params.initialCapital + (results.expectedProfit / params.numTrades) * i,
  }))

  const profitFactor = params.avgWin / params.avgLoss
  const expectedValue = (params.winRate / 100) * params.avgWin - (1 - params.winRate / 100) * params.avgLoss
  const sharpeRatio = expectedValue / Math.sqrt((params.winRate / 100) * Math.pow(params.avgWin - expectedValue, 2) + (1 - params.winRate / 100) * Math.pow(params.avgLoss - expectedValue, 2))

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-text-primary">Simulation Results</h3>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-secondary rounded-lg p-4">
          <p className="text-xs text-text-secondary mb-1">Risk Per Trade</p>
          <p className="text-xl font-semibold text-accent-red">${Math.round(results.riskPerTrade)}</p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-4">
          <p className="text-xs text-text-secondary mb-1">Expected Value</p>
          <p className="text-xl font-semibold text-accent-emerald">${results.expectedValue.toFixed(2)}</p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-4">
          <p className="text-xs text-text-secondary mb-1">Expected Profit</p>
          <p className={`text-xl font-semibold ${results.expectedProfit >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
            ${results.expectedProfit.toFixed(2)}
          </p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-4">
          <p className="text-xs text-text-secondary mb-1">Final Capital</p>
          <p className="text-xl font-semibold text-text-primary">${results.finalCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* ROI */}
      <div className="bg-surface-secondary rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary mb-1">Return on Investment</p>
            <p className={`text-2xl font-bold ${results.roi >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
              {results.roi.toFixed(2)}%
            </p>
          </div>
          <TrendingUp className={`w-8 h-8 ${results.roi >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`} />
        </div>
      </div>

      {/* Strategy Metrics */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="bg-surface-secondary rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">Profit Factor</p>
          <p className="font-semibold text-text-primary">{profitFactor.toFixed(2)}</p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">Expected Value</p>
          <p className="font-semibold text-text-primary">{expectedValue.toFixed(3)}</p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-3">
          <p className="text-xs text-text-secondary mb-1">Sharpe Ratio</p>
          <p className="font-semibold text-text-primary">{sharpeRatio.toFixed(2)}</p>
        </div>
      </div>

      {/* Equity Curve */}
      <div className="border-t border-border-color pt-4">
        <EnhancedBacktestChart 
          data={drawdownData} 
          title="Equity Growth Projection" 
        />
      </div>

      {/* Warning */}
      {results.roi < 0 && (
        <div className="flex items-start gap-3 p-4 bg-accent-red/20 rounded-lg border border-accent-red/30">
          <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-accent-red">Negative Expected Value</p>
            <p className="text-sm text-accent-red/80 mt-1">Adjust your parameters. Consider increasing win rate or improving risk/reward ratio.</p>
          </div>
        </div>
      )}
    </div>
  )
}

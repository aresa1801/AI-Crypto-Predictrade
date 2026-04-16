'use client'

import { backtestData } from '@/lib/mock-data'
import { BacktestChart } from '@/components/backtest/backtest-chart'
import { BacktestMetrics } from '@/components/backtest/backtest-metrics'
import { TradeLog } from '@/components/backtest/trade-log'

export default function BacktestPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-text-primary">Strategy Backtest</h1>
        <p className="text-text-secondary">Historical performance analysis and trade-by-trade breakdown</p>
      </div>

      {/* Strategy Name */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary">{backtestData.strategyName}</h3>
        <p className="text-sm text-text-secondary mt-1">Last 100 trading days | BTC/USDT</p>
      </div>

      {/* Metrics */}
      <div>
        <BacktestMetrics data={backtestData} />
      </div>

      {/* Equity Curve */}
      <div className="card">
        <BacktestChart data={backtestData} />
      </div>

      {/* Trade Log */}
      <div>
        <TradeLog trades={backtestData.trades} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h4 className="text-sm text-text-secondary mb-3">Recovery Factor</h4>
          <p className="text-2xl font-bold text-accent-emerald">
            {Math.abs(backtestData.totalReturn / (backtestData.maxDrawdown * -1)).toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">Total return / Max drawdown</p>
        </div>
        <div className="card">
          <h4 className="text-sm text-text-secondary mb-3">Consecutive Wins</h4>
          <p className="text-2xl font-bold text-accent-emerald">8</p>
          <p className="text-xs text-text-secondary mt-1">Best winning streak</p>
        </div>
        <div className="card">
          <h4 className="text-sm text-text-secondary mb-3">Profit Factor</h4>
          <p className="text-2xl font-bold text-accent-emerald">{backtestData.profitFactor.toFixed(2)}</p>
          <p className="text-xs text-text-secondary mt-1">Gross profit / Gross loss</p>
        </div>
      </div>
    </div>
  )
}

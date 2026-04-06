'use client'

import { useState } from 'react'
import { backtestData } from '@/lib/mock/data'
import { BacktestChart } from '@/components/backtest/backtest-chart'
import { BacktestMetrics } from '@/components/backtest/backtest-metrics'
import { TradeLog } from '@/components/backtest/trade-log'

export default function BacktestPage() {
  const [selectedStrategy, setSelectedStrategy] = useState(backtestData.strategyName)

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Backtest</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Historical strategy performance analysis and trade-by-trade breakdown
        </p>
      </div>

      {/* Strategy Selector */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-text-primary">Strategy</h3>
            <p className="text-sm text-text-secondary">{selectedStrategy}</p>
          </div>
          <button className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 transition-colors duration-200">
            Configure Strategy
          </button>
        </div>
      </div>

      {/* Equity Curve Chart */}
      <div className="card">
        <BacktestChart data={backtestData} />
      </div>

      {/* Metrics Grid */}
      <div>
        <BacktestMetrics data={backtestData} />
      </div>

      {/* Trade Log */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Trade Log</h3>
        <TradeLog trades={backtestData.trades} />
      </div>
    </div>
  )
}

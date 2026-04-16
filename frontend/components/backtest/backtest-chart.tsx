'use client'

import { EnhancedBacktestChart } from '@/components/charts/enhanced-backtest-chart'
import { BacktestResult } from '@/lib/types'

export function BacktestChart({ data }: { data: BacktestResult }) {
  const chartData = data.equityPoints.map((point) => ({
    date: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: point.value,
  }))

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">Equity Curve</h3>

      <EnhancedBacktestChart data={chartData} title="Account Value" />

      <div className="pt-4 border-t border-border-color grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-text-secondary">Starting Capital</p>
          <p className="font-semibold text-text-primary">$10,000.00</p>
        </div>
        <div>
          <p className="text-text-secondary">Ending Capital</p>
          <p className="font-semibold text-accent-emerald">${data.equityPoints[data.equityPoints.length - 1].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-text-secondary">Total Return</p>
          <p className="font-semibold text-accent-emerald">{data.totalReturn.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  )
}

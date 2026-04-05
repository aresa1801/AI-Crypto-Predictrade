'use client'

import { BacktestResult } from '@/lib/types'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  color?: 'success' | 'warning' | 'danger' | 'neutral'
}

function MetricCard({ label, value, unit, icon, color = 'neutral' }: MetricCardProps) {
  const colorClasses = {
    success: 'text-accent-emerald',
    warning: 'text-accent-amber',
    danger: 'text-accent-red',
    neutral: 'text-text-primary',
  }

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        {icon}
      </div>
      <div className="space-y-1">
        <p className={`text-2xl font-bold ${colorClasses[color]}`}>
          {value}
          {unit && <span className="text-sm ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  )
}

export function BacktestMetrics({ data }: { data: BacktestResult }) {
  const getColor = (value: number, inverse: boolean = false): 'success' | 'warning' | 'danger' | 'neutral' => {
    if (inverse) {
      return value < 0 ? 'success' : value > -10 ? 'warning' : 'danger'
    }
    return value > 0 ? 'success' : value > -10 ? 'warning' : 'danger'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Trades"
        value={data.totalTrades}
        color="neutral"
      />
      <MetricCard
        label="Win Rate"
        value={data.winRate.toFixed(2)}
        unit="%"
        color={data.winRate > 50 ? 'success' : 'danger'}
        icon={data.winRate > 50 ? <TrendingUp className="w-4 h-4 text-accent-emerald" /> : <TrendingDown className="w-4 h-4 text-accent-red" />}
      />
      <MetricCard
        label="Profit Factor"
        value={data.profitFactor.toFixed(2)}
        color={data.profitFactor > 1.5 ? 'success' : data.profitFactor > 1 ? 'warning' : 'danger'}
      />
      <MetricCard
        label="Sharpe Ratio"
        value={data.sharpeRatio.toFixed(2)}
        color={data.sharpeRatio > 1 ? 'success' : data.sharpeRatio > 0.5 ? 'warning' : 'danger'}
      />
      <MetricCard
        label="Max Drawdown"
        value={Math.abs(data.maxDrawdown).toFixed(2)}
        unit="%"
        color={getColor(data.maxDrawdown, true)}
      />
      <MetricCard
        label="Total Return"
        value={data.totalReturn.toFixed(2)}
        unit="%"
        color={data.totalReturn > 0 ? 'success' : 'danger'}
      />
      <MetricCard
        label="Consecutive Wins"
        value="8"
        color="neutral"
      />
      <MetricCard
        label="Recovery Factor"
        value={(Math.abs(data.totalReturn / (data.maxDrawdown * -1))).toFixed(2)}
        color={Math.abs(data.totalReturn / (data.maxDrawdown * -1)) > 2 ? 'success' : 'warning'}
      />
    </div>
  )
}

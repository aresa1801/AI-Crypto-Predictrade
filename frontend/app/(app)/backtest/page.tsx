'use client'

import { backtestData } from '@/lib/mock-data'
import { BacktestChart } from '@/components/backtest/backtest-chart'
import { BacktestMetrics } from '@/components/backtest/backtest-metrics'
import { TradeLog } from '@/components/backtest/trade-log'
import { RotateCw, TrendingUp, Award, Target } from 'lucide-react'

export default function BacktestPage() {
  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header with gradient */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-teal flex items-center justify-center shadow-lg shadow-accent-cyan/30">
            <RotateCw className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold gradient-text-blue">Strategy Backtest</h1>
            <p className="text-sm lg:text-base text-text-secondary">Historical performance analysis and trade-by-trade breakdown</p>
          </div>
        </div>
      </div>

      {/* Strategy Name */}
      <div className="card-gradient">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-text-primary">{backtestData.strategyName}</h3>
            <p className="text-sm text-text-secondary mt-1">Last 100 trading days | BTC/USDT</p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent-emerald/20 to-accent-teal/20 border border-accent-emerald/30">
            <span className="text-accent-emerald font-bold text-lg">Active</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div>
        <BacktestMetrics data={backtestData} />
      </div>

      {/* Equity Curve */}
      <div className="card-gradient">
        <BacktestChart data={backtestData} />
      </div>

      {/* Trade Log */}
      <div>
        <TradeLog trades={backtestData.trades} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="card-gradient group hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-emerald to-accent-teal flex items-center justify-center shadow-lg group-hover:shadow-accent-emerald/50 transition-shadow duration-300">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-sm font-semibold text-text-secondary">Recovery Factor</h4>
          </div>
          <p className="text-4xl font-bold text-accent-emerald mb-2">
            {Math.abs(backtestData.totalReturn / (backtestData.maxDrawdown * -1)).toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary">Total return / Max drawdown</p>
        </div>
        
        <div className="card-gradient group hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-lg group-hover:shadow-accent-blue/50 transition-shadow duration-300">
              <Award className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-sm font-semibold text-text-secondary">Consecutive Wins</h4>
          </div>
          <p className="text-4xl font-bold text-accent-blue mb-2">8</p>
          <p className="text-xs text-text-secondary">Best winning streak</p>
        </div>
        
        <div className="card-gradient group hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-lg group-hover:shadow-accent-purple/50 transition-shadow duration-300">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-sm font-semibold text-text-secondary">Profit Factor</h4>
          </div>
          <p className="text-4xl font-bold gradient-text mb-2">{backtestData.profitFactor.toFixed(2)}</p>
          <p className="text-xs text-text-secondary">Gross profit / Gross loss</p>
        </div>
      </div>
    </div>
  )
}

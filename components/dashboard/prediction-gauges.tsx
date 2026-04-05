'use client'

import { predictions } from '@/lib/mock-data'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface GaugeProps {
  label: string
  confidence: number
  direction: 'up' | 'down'
  asset: string
}

function ConfidenceGauge({ label, confidence, direction, asset }: GaugeProps) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (confidence / 100) * circumference
  const color = direction === 'up' ? 'var(--accent-emerald)' : 'var(--accent-red)'

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-color)" strokeWidth="3" />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color }}>{confidence}%</span>
          <span className="text-xs text-text-secondary">{direction === 'up' ? '↑' : '↓'}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs sm:text-sm font-medium text-text-primary">{asset}</p>
        <p className="text-xs text-text-secondary">{label}</p>
      </div>
    </div>
  )
}

export function PredictionGauges({ loading }: { loading: boolean }) {
  if (loading) {
    return <div className="card animate-pulse h-80" />
  }

  const topPredictions = predictions
    .sort((a, b) => b.confidenceLevel - a.confidenceLevel)
    .slice(0, 4)

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">Top Predictions</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {topPredictions.map((pred) => (
          <ConfidenceGauge
            key={pred.id}
            label={`${pred.timeframe} Horizon`}
            confidence={pred.confidenceLevel}
            direction={pred.predictedDirection}
            asset={pred.asset.symbol}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-4 border-t border-border-color text-xs">
        <div className="flex items-center gap-2">
          <ArrowUp className="w-4 h-4 text-accent-emerald" />
          <span className="text-text-secondary">Bullish</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowDown className="w-4 h-4 text-accent-red" />
          <span className="text-text-secondary">Bearish</span>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { Prediction } from '@/lib/types'
import { fetchAIPredictions } from '@/lib/api/predictions'
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react'
import { CardSkeleton } from '@/components/skeletons'
import { ErrorBoundary } from '@/components/error-boundary'

interface GaugeProps {
  label: string
  confidence: number
  direction: 'up' | 'down'
  asset: string
  index: number
}

// Memoize the gauge component to prevent unnecessary re-renders
const ConfidenceGauge = memo(function ConfidenceGauge({ label, confidence, direction, asset, index }: GaugeProps) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (confidence / 100) * circumference
  
  // Different gradient colors for each gauge
  const gradients = [
    { from: '#A855F7', to: '#EC4899', glow: 'accent-purple' }, // purple to pink
    { from: '#3B82F6', to: '#06B6D4', glow: 'accent-blue' },   // blue to cyan
    { from: '#6366F1', to: '#A855F7', glow: 'accent-indigo' }, // indigo to purple
    { from: '#06B6D4', to: '#14B8A6', glow: 'accent-cyan' },   // cyan to teal
  ]
  
  const gradient = gradients[index % gradients.length]

  return (
    <div className="group flex flex-col items-center space-y-3 p-4 rounded-xl bg-surface-secondary/30 backdrop-blur-sm border border-border-color/30 hover:border-accent-purple/50 transition-all duration-300 hover:shadow-lg">
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36">
        {/* Outer glow effect */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-${gradient.glow}/20 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
        
        <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 100 100">
          <defs>
            <linearGradient id={`gauge-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradient.from} />
              <stop offset="100%" stopColor={gradient.to} />
            </linearGradient>
            <filter id={`glow-${index}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="var(--border-color)" 
            strokeWidth="4" 
            opacity="0.3"
          />
          
          {/* Progress circle with gradient */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={`url(#gauge-gradient-${index})`}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter={`url(#glow-${index})`}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center mb-1 shadow-lg ${
            direction === 'up' 
              ? 'from-accent-emerald to-accent-teal' 
              : 'from-accent-red to-accent-orange'
          }`}>
            {direction === 'up' ? (
              <ArrowUp className="w-6 h-6 text-white" />
            ) : (
              <ArrowDown className="w-6 h-6 text-white" />
            )}
          </div>
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent">
            {confidence}%
          </span>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-sm sm:text-base font-bold text-text-primary">{asset}</p>
        <p className="text-xs text-text-secondary mt-1">{label}</p>
      </div>
    </div>
  )
})

function PredictionGaugesContent() {
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error'
    data: Prediction[] | null
    error: Error | null
  }>({ status: 'loading', data: null, error: null })

  const loadData = useCallback(async () => {
    try {
      // Fetch real AI predictions from API
      const predictions = await fetchAIPredictions()
      
      // Sort by confidence and get top 4
      const topPredictions = predictions
        .sort((a, b) => (b.confidenceLevel || b.confidence) - (a.confidenceLevel || a.confidence))
        .slice(0, 4)
      
      setState({ status: 'success', data: topPredictions, error: null })
    } catch (error) {
      setState({
        status: 'error',
        data: null,
        error: error instanceof Error ? error : new Error('Failed to load predictions'),
      })
    }
  }, [])

  useEffect(() => {
    loadData()
    
    // Refresh predictions every 5 minutes
    const interval = setInterval(loadData, 300000)
    
    return () => clearInterval(interval)
  }, [loadData])

  if (state.status === 'loading') {
    return <CardSkeleton />
  }

  if (state.status === 'error') {
    return (
      <div className="card-gradient flex items-center justify-center py-8">
        <p className="text-accent-red">Failed to load predictions</p>
      </div>
    )
  }

  if (!state.data || state.data.length === 0) {
    return (
      <div className="card-gradient flex items-center justify-center py-8">
        <p className="text-text-secondary">No predictions available</p>
      </div>
    )
  }

  return (
    <div className="card-gradient space-y-5 h-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-purple flex items-center justify-center shadow-lg shadow-accent-indigo/30">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold gradient-text">Top AI Predictions</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {state.data.map((pred, index) => (
          <ConfidenceGauge
            key={pred.id}
            label={`${pred.timeframe} Horizon`}
            confidence={pred.confidenceLevel}
            direction={pred.predictedDirection}
            asset={pred.asset.symbol}
            index={index}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 pt-4 border-t border-border-color/50 text-xs">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-emerald/10 border border-accent-emerald/30">
          <ArrowUp className="w-4 h-4 text-accent-emerald" />
          <span className="text-accent-emerald font-medium">Bullish Signals</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-red/10 border border-accent-red/30">
          <ArrowDown className="w-4 h-4 text-accent-red" />
          <span className="text-accent-red font-medium">Bearish Signals</span>
        </div>
      </div>
    </div>
  )
}

export function PredictionGauges({ loading }: { loading?: boolean }) {
  if (loading) {
    return <CardSkeleton />
  }

  return (
    <ErrorBoundary>
      <PredictionGaugesContent />
    </ErrorBoundary>
  )
}

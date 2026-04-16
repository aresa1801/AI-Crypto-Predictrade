'use client'

import { useState } from 'react'
import { Prediction } from '@/lib/types'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PredictionCardProps {
  prediction: Prediction
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '4h' | '24h'>(
    prediction.timeframe === '1d' ? '24h' : prediction.timeframe === '1h' ? '1h' : '4h'
  )

  const { asset, confidence, confidenceLevel, direction, currentPrice, targetPrice, modelVersion } = prediction

  // Calculate signal score based on confidence and direction
  const signalScore = direction === 'bullish' 
    ? (confidence / 100) * 0.5 - 0.5 
    : -((confidence / 100) * 0.5 + 0.5)
  
  // Calculate probability up
  const probUp = direction === 'bullish' ? confidence : 100 - confidence

  // Determine action based on direction and confidence
  const getAction = () => {
    if (direction === 'bearish' && confidence > 70) return { label: 'STRONG SELL', color: 'bg-accent-red' }
    if (direction === 'bearish') return { label: 'SELL', color: 'bg-accent-red' }
    if (direction === 'bullish' && confidence > 70) return { label: 'STRONG BUY', color: 'bg-accent-emerald' }
    if (direction === 'bullish') return { label: 'BUY', color: 'bg-accent-emerald' }
    return { label: 'HOLD', color: 'bg-accent-amber' }
  }

  const action = getAction()

  // Determine market sentiment badges
  const getSentimentBadges = () => {
    const badges = []
    
    if (direction === 'bearish') {
      badges.push({ label: 'BEAR', color: 'bg-accent-red/30 text-accent-red border border-accent-red/50' })
    } else if (direction === 'bullish') {
      badges.push({ label: 'BULL', color: 'bg-accent-emerald/30 text-accent-emerald border border-accent-emerald/50' })
    } else {
      badges.push({ label: 'NEUTRAL', color: 'bg-accent-amber/30 text-accent-amber border border-accent-amber/50' })
    }

    // Second badge based on confidence
    if (confidence > 60 && confidence < 75) {
      badges.push({ label: 'DRIFTING', color: 'bg-accent-amber/30 text-accent-amber border border-accent-amber/50' })
    } else if (confidence >= 75) {
      badges.push({ label: 'STRONG', color: 'bg-accent-emerald/30 text-accent-emerald border border-accent-emerald/50' })
    } else if (confidence >= 50) {
      badges.push({ label: 'RETRAINED', color: 'bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/50' })
    } else {
      badges.push({ label: 'STABLE', color: 'bg-accent-emerald/30 text-accent-emerald border border-accent-emerald/50' })
    }

    return badges
  }

  const sentimentBadges = getSentimentBadges()

  // Calculate confidence interval (mock for now)
  const ciLower = (30 + Math.random() * 10).toFixed(1)
  const ciUpper = (40 + Math.random() * 15).toFixed(1)

  return (
    <div className="card-gradient border-border-color/50 hover:border-accent-cyan/50 transition-all duration-300">
      {/* Header with Asset Name and Timeframes */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-color/30">
        <div>
          <h3 className="text-2xl font-bold" style={{ color: getAssetColor(asset.symbol) }}>
            {asset.symbol}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">{asset.name}</p>
        </div>
        <div className="flex gap-1">
          {(['1h', '4h', '24h'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-2 py-1 text-xs rounded transition-all ${
                selectedTimeframe === tf
                  ? 'bg-accent-emerald/30 text-accent-emerald'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary/50'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Price and Action */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-3xl font-bold text-text-primary">
            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: currentPrice < 1 ? 6 : 2 })}
          </div>
          <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${
            asset.change24h >= 0 ? 'text-accent-emerald' : 'text-accent-red'
          }`}>
            {asset.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}% 24h
          </div>
        </div>
        <button className={`${action.color} text-white px-4 py-2 rounded-md text-sm font-bold hover:opacity-90 transition-opacity`}>
          {action.label}
        </button>
      </div>

      {/* Signal Score */}
      <div className="mb-4 pb-3 border-b border-border-color/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary uppercase tracking-wide">Signal Score</span>
          <span className={`text-sm font-mono font-bold ${signalScore >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
            {signalScore >= 0 ? '+' : ''}{signalScore.toFixed(3)}
          </span>
        </div>
        <div className="w-full h-1 bg-surface-secondary/50 rounded-full overflow-hidden">
          <div 
            className={`h-full ${signalScore >= 0 ? 'bg-accent-emerald' : 'bg-accent-red'}`}
            style={{ width: `${Math.abs(signalScore) * 100}%` }}
          />
        </div>
      </div>

      {/* Probability Up */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary uppercase tracking-wide">Prob Up</span>
          <span className={`text-2xl font-bold ${
            probUp >= 50 ? 'text-accent-emerald' : 'text-accent-red'
          }`}>
            {Math.round(probUp)}%
          </span>
        </div>
        <div className="w-full h-2 bg-surface-secondary/50 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              probUp >= 70 ? 'bg-accent-emerald' :
              probUp >= 50 ? 'bg-accent-amber' :
              'bg-accent-red'
            }`}
            style={{ width: `${probUp}%` }}
          />
        </div>
      </div>

      {/* CI and Model */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b border-border-color/30">
        <div>
          <div className="text-xs text-text-secondary mb-1">CI</div>
          <div className="text-sm font-mono text-text-primary">{ciLower}-{ciUpper}%</div>
        </div>
        <div>
          <div className="text-xs text-text-secondary mb-1">MODEL</div>
          <div className="text-sm font-mono text-text-primary">{modelVersion || 'v2.0.0-ense...'}</div>
        </div>
      </div>

      {/* Sentiment Badges */}
      <div className="flex gap-2 mb-3">
        {sentimentBadges.map((badge, index) => (
          <span
            key={index}
            className={`px-3 py-1 rounded text-xs font-bold uppercase ${badge.color}`}
          >
            {badge.label}
          </span>
        ))}
      </div>

      {/* Timestamp */}
      <div className="text-xs text-text-secondary text-right font-mono">
        {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </div>
    </div>
  )
}

// Helper function to get color for asset symbol
function getAssetColor(symbol: string): string {
  const colors: Record<string, string> = {
    BTC: '#F7931A',
    ETH: '#627EEA',
    XRP: '#00AAE4',
    BNB: '#F3BA2F',
    SOL: '#14F195',
    ADA: '#0033AD',
    DOGE: '#C2A633',
    DOT: '#E6007A',
    AVAX: '#E84142',
    TRX: '#FF060A',
    TON: '#0088CC',
  }
  return colors[symbol] || '#3B82F6'
}

'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Prediction } from '@/lib/types'
import { TrendingUp, TrendingDown, Zap, Wind, RefreshCw, Minus } from 'lucide-react'
import { useLivePrice } from '@/hooks/use-live-price'

// Interpolate color between red (#EF4444) → amber (#F59E0B) → green (#22C55E)
function interpolateProbColor(probUp: number): string {
  const r1 = 239, g1 = 68,  b1 = 68   // red
  const r2 = 245, g2 = 158, b2 = 11   // amber
  const r3 = 34,  g3 = 197, b3 = 94   // green
  let r, g, b
  if (probUp <= 50) {
    const t = probUp / 50
    r = Math.round(r1 + (r2 - r1) * t)
    g = Math.round(g1 + (g2 - g1) * t)
    b = Math.round(b1 + (b2 - b1) * t)
  } else {
    const t = (probUp - 50) / 50
    r = Math.round(r2 + (r3 - r2) * t)
    g = Math.round(g2 + (g3 - g2) * t)
    b = Math.round(b2 + (b3 - b2) * t)
  }
  return `rgb(${r}, ${g}, ${b})`
}

interface PredictionCardProps {
  prediction: Prediction
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '4h' | '24h'>(
    prediction.timeframe === '1d' ? '24h' : prediction.timeframe === '1h' ? '1h' : '4h'
  )

  const { asset, confidence, confidenceLevel, direction, targetPrice, modelVersion } = prediction
  
  // Use live price hook for real-time updates
  const { price: currentPrice, change24h: priceChange24h, priceDirection } = useLivePrice(
    asset.id,
    prediction.currentPrice,
    asset.change24h
  )

  // Calculate signal score based on confidence and direction
  const signalScore = direction === 'bullish' 
    ? (confidence / 100) * 0.5 - 0.5 
    : -((confidence / 100) * 0.5 + 0.5)
  
  // Calculate probability up
  const probUp = direction === 'bullish' ? confidence : 100 - confidence

  // Determine action based on direction and confidence
  const getAction = () => {
    if (direction === 'bearish' && confidence > 70) return { label: 'SPOT SELL', color: 'bg-accent-red' }
    if (direction === 'bearish') return { label: 'REDUCE', color: 'bg-accent-red' }
    if (direction === 'bullish' && confidence > 70) return { label: 'SPOT BUY', color: 'bg-accent-emerald' }
    if (direction === 'bullish') return { label: 'ACCUMULATE', color: 'bg-accent-emerald' }
    return { label: 'HOLD', color: 'bg-accent-amber' }
  }

  const action = getAction()

  // Determine market sentiment badges
  const getSentimentBadges = () => {
    const badges: { label: string; color: string; icon: ReactNode }[] = []

    if (direction === 'bearish') {
      badges.push({
        label: 'BEAR',
        color: 'bg-accent-red/20 text-accent-red border border-accent-red/60 shadow-[0_0_8px_rgba(239,68,68,0.25)]',
        icon: <TrendingDown className="w-3 h-3" />,
      })
    } else if (direction === 'bullish') {
      badges.push({
        label: 'BULL',
        color: 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/60 shadow-[0_0_8px_rgba(52,211,153,0.25)]',
        icon: <TrendingUp className="w-3 h-3" />,
      })
    } else {
      badges.push({
        label: 'NEUTRAL',
        color: 'bg-accent-amber/20 text-accent-amber border border-accent-amber/60',
        icon: <Minus className="w-3 h-3" />,
      })
    }

    // Second badge based on confidence
    if (confidence > 60 && confidence < 75) {
      badges.push({
        label: 'DRIFTING',
        color: 'bg-accent-amber/20 text-accent-amber border border-accent-amber/60 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
        icon: <Wind className="w-3 h-3" />,
      })
    } else if (confidence >= 75) {
      badges.push({
        label: 'STRONG',
        color: 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/60 shadow-[0_0_8px_rgba(52,211,153,0.2)]',
        icon: <Zap className="w-3 h-3" />,
      })
    } else if (confidence >= 50) {
      badges.push({
        label: 'RETRAINED',
        color: 'bg-violet-500/20 text-violet-400 border border-violet-500/60 shadow-[0_0_8px_rgba(139,92,246,0.2)]',
        icon: <RefreshCw className="w-3 h-3" />,
      })
    } else {
      badges.push({
        label: 'STABLE',
        color: 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/60 shadow-[0_0_8px_rgba(6,182,212,0.2)]',
        icon: <Minus className="w-3 h-3" />,
      })
    }

    return badges
  }

  const sentimentBadges = getSentimentBadges()

  // Calculate confidence interval (mock for now)
  const ciLower = (30 + Math.random() * 10).toFixed(1)
  const ciUpper = (40 + Math.random() * 15).toFixed(1)

  // Determine border animation class based on signal
  const getBorderClass = () => {
    if (action.label === 'SPOT BUY') return 'border-strong-buy'
    if (action.label === 'ACCUMULATE') return 'border-buy'
    return 'border-border-color/50 hover:border-accent-cyan/50'
  }

  return (
    <div className={`card-gradient transition-all duration-200 ${getBorderClass()}`}>
      {/* Header with Asset Name and Timeframes */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-color/30">
        <div>
          <h3 className="text-xl font-bold" style={{ color: getAssetColor(asset.symbol) }}>
            {asset.symbol}
          </h3>
          <p className="text-[10px] text-text-secondary mt-0.5">{asset.name}</p>
        </div>
        <div className="flex gap-0.5 bg-surface-secondary/40 rounded-lg p-0.5 border border-border-color/20">
          {(['1h', '4h', '24h'] as const).map((tf) => {
            const tfColors: Record<string, string> = {
              '1h': 'text-accent-cyan shadow-[0_0_6px_rgba(6,182,212,0.4)] bg-accent-cyan/20 border-accent-cyan/40',
              '4h': 'text-accent-amber shadow-[0_0_6px_rgba(245,158,11,0.4)] bg-accent-amber/20 border-accent-amber/40',
              '24h': 'text-accent-emerald shadow-[0_0_6px_rgba(52,211,153,0.4)] bg-accent-emerald/20 border-accent-emerald/40',
            }
            const isActive = selectedTimeframe === tf
            return (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all border ${
                  isActive
                    ? `${tfColors[tf]} border`
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary/60 border-transparent'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Price and Action */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className={`text-2xl font-bold text-text-primary ${priceDirection ? `price-change-${priceDirection}` : ''}`}>
            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: currentPrice < 1 ? 6 : 2 })}
          </div>
          <div className={`flex items-center gap-1 mt-0.5 text-xs font-medium ${
            priceChange24h >= 0 ? 'text-accent-emerald' : 'text-accent-red'
          }`}>
            {priceChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}% 24h
          </div>
        </div>
        <button className={`${action.color} text-white px-3 py-1.5 rounded-md text-xs font-bold hover:opacity-90 transition-opacity`}>
          {action.label}
        </button>
      </div>

      {/* Signal Score */}
      <div className="mb-3 pb-2 border-b border-border-color/30">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-text-secondary uppercase tracking-wide">Signal Score</span>
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
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-text-secondary uppercase tracking-wide">Prob Up</span>
          <span
            className="text-xl font-bold"
            style={{ color: interpolateProbColor(probUp) }}
          >
            {Math.round(probUp)}%
          </span>
        </div>
        {/* Gradient bar: full red→amber→green gradient, masked from probUp% to 100% */}
        <div className="relative w-full h-2 rounded-full overflow-hidden bg-surface-secondary/50">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(to right, #EF4444 0%, #F59E0B 50%, #22C55E 100%)' }}
          />
          <div
            className="absolute top-0 right-0 h-full rounded-r-full"
            style={{
              width: `${100 - probUp}%`,
              background: 'rgba(15, 23, 42, 0.75)',
            }}
          />
        </div>
      </div>

      {/* CI and Model */}
      <div className="grid grid-cols-2 gap-3 mb-3 pb-2 border-b border-border-color/30">
        <div>
          <div className="text-[10px] text-text-secondary mb-0.5">CI</div>
          <div className="text-xs font-mono text-text-primary">{ciLower}-{ciUpper}%</div>
        </div>
        <div>
          <div className="text-[10px] text-text-secondary mb-0.5">MODEL</div>
          <div className="text-xs font-mono text-text-primary truncate">{modelVersion || 'v2.0.0'}</div>
        </div>
      </div>

      {/* Sentiment Badges */}
      <div className="flex gap-1.5 mb-2">
        {sentimentBadges.map((badge, index) => (
          <span
            key={index}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badge.color}`}
          >
            {badge.icon}
            {badge.label}
          </span>
        ))}
      </div>

      {/* Timestamp */}
      <div className="text-[9px] text-text-secondary text-right font-mono">
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

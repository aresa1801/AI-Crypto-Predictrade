'use client'

import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Target, Shield, Zap, ChevronDown, ChevronUp,
  BarChart2, Brain, Activity, Info, Star, ArrowUpRight,
} from 'lucide-react'
import {
  OpportunityAsset, formatPrice, formatPct, getSignalBadgeStyle,
  getRiskBadgeStyle, getAssetColor,
} from '@/lib/api/opportunity-buy'

interface OpportunityCardProps {
  opportunity: OpportunityAsset
}

// Indicator bar component
function ScoreBar({ score, color = 'accent-emerald' }: { score: number; color?: string }) {
  const colorMap: Record<string, string> = {
    'accent-emerald': 'bg-accent-emerald',
    'accent-blue': 'bg-accent-blue',
    'accent-purple': 'bg-accent-purple',
    'accent-amber': 'bg-accent-amber',
    'accent-cyan': 'bg-accent-cyan',
  }
  const barColor = colorMap[color] || 'bg-accent-emerald'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-secondary/70 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-text-secondary w-7 text-right">{score}</span>
    </div>
  )
}

// Entry/Exit zone visualizer
function EntryExitZone({ opportunity }: { opportunity: OpportunityAsset }) {
  const { entryExit, asset } = opportunity
  const price = asset.price

  // Calculate relative positions for visualization
  const low = entryExit.stopLoss
  const high = entryExit.target3
  const range = high - low

  function pct(val: number) {
    return Math.max(0, Math.min(100, ((val - low) / range) * 100))
  }

  const zones = [
    { label: 'T3', value: entryExit.target3, pct: pct(entryExit.target3), color: '#14F195', alpha: '33' },
    { label: 'T2', value: entryExit.target2, pct: pct(entryExit.target2), color: '#10B981', alpha: '33' },
    { label: 'T1', value: entryExit.target1, pct: pct(entryExit.target1), color: '#3B82F6', alpha: '33' },
    { label: 'Entry High', value: entryExit.entryHigh, pct: pct(entryExit.entryHigh), color: '#F59E0B', alpha: '33' },
    { label: 'Entry Low', value: entryExit.entryLow, pct: pct(entryExit.entryLow), color: '#F59E0B', alpha: '44' },
    { label: 'Stop', value: entryExit.stopLoss, pct: pct(entryExit.stopLoss), color: '#EF4444', alpha: '33' },
  ]

  const currentPct = pct(price)

  return (
    <div className="space-y-2">
      {/* Visual bar */}
      <div className="relative h-8 rounded-lg overflow-hidden bg-surface-secondary/50 border border-border-color/30">
        {/* Stop zone */}
        <div
          className="absolute top-0 bottom-0 bg-accent-red/15"
          style={{ left: 0, width: `${pct(entryExit.entryLow)}%` }}
        />
        {/* Entry zone */}
        <div
          className="absolute top-0 bottom-0 bg-accent-amber/25 border-l border-r border-accent-amber/40"
          style={{
            left: `${pct(entryExit.entryLow)}%`,
            width: `${pct(entryExit.entryHigh) - pct(entryExit.entryLow)}%`
          }}
        />
        {/* Target zones */}
        <div
          className="absolute top-0 bottom-0 bg-accent-blue/15"
          style={{
            left: `${pct(entryExit.entryHigh)}%`,
            width: `${pct(entryExit.target1) - pct(entryExit.entryHigh)}%`
          }}
        />
        <div
          className="absolute top-0 bottom-0 bg-accent-emerald/15"
          style={{
            left: `${pct(entryExit.target1)}%`,
            width: `${pct(entryExit.target2) - pct(entryExit.target1)}%`
          }}
        />
        <div
          className="absolute top-0 bottom-0 bg-accent-teal/20"
          style={{
            left: `${pct(entryExit.target2)}%`,
            right: 0,
          }}
        />
        {/* Current price indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
          style={{ left: `${currentPct}%` }}
        />
        {/* Labels */}
        <div className="absolute inset-0 flex items-center px-1">
          <span className="text-[8px] text-accent-red/80 font-mono">SL</span>
          <div className="flex-1" />
          <span className="text-[8px] text-accent-amber font-mono font-bold">ENTRY</span>
          <div className="flex-1" />
          <span className="text-[8px] text-accent-emerald/80 font-mono">T1→T3</span>
        </div>
      </div>

      {/* Price levels table */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-accent-red/80">Stop Loss</span>
            <span className="text-[10px] font-mono text-accent-red">${formatPrice(entryExit.stopLoss)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-accent-amber">Entry Low</span>
            <span className="text-[10px] font-mono text-accent-amber">${formatPrice(entryExit.entryLow)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-accent-amber font-medium">Entry High</span>
            <span className="text-[10px] font-mono text-accent-amber font-medium">${formatPrice(entryExit.entryHigh)}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-accent-blue">Target 1</span>
            <span className="text-[10px] font-mono text-accent-blue">${formatPrice(entryExit.target1)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-accent-emerald">Target 2</span>
            <span className="text-[10px] font-mono text-accent-emerald">${formatPrice(entryExit.target2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-accent-teal font-medium">Target 3</span>
            <span className="text-[10px] font-mono text-accent-teal font-medium">${formatPrice(entryExit.target3)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Composite score ring
function ScoreRing({ score }: { score: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 78 ? '#10B981' : score >= 68 ? '#3B82F6' : '#6366F1'

  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="flex-shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(51,51,102,0.5)" strokeWidth="4" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
      />
      <text x="28" y="32" textAnchor="middle" fill={color} fontSize="11" fontWeight="700" fontFamily="monospace">
        {score}
      </text>
    </svg>
  )
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { asset, compositeScore, signalStrength, riskLevel, timeframe, entryExit, technical, sentiment, prediction, indicators, reasoning } = opportunity

  const assetColor = getAssetColor(asset.symbol)
  const priceChange = asset.change24h

  // R:R display for quick view
  const rrT2 = entryExit.riskRewardT2

  return (
    <div className={`card-gradient transition-all duration-300 border hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] ${
      signalStrength === 'STRONG_BUY'
        ? 'border-accent-emerald/40 hover:border-accent-emerald/70 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
        : signalStrength === 'BUY'
        ? 'border-accent-blue/40 hover:border-accent-blue/70'
        : 'border-accent-indigo/30 hover:border-accent-indigo/60'
    }`}>
      {/* ---- HEADER ---- */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Rank badge */}
          <div className="w-6 h-6 rounded-full bg-surface-secondary/80 border border-border-color/50 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-bold text-text-secondary">#{opportunity.rank}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold" style={{ color: assetColor }}>{asset.symbol}</span>
              {signalStrength === 'STRONG_BUY' && (
                <Star className="w-3.5 h-3.5 text-accent-amber fill-accent-amber" />
              )}
            </div>
            <p className="text-[10px] text-text-secondary">{asset.name}</p>
          </div>
        </div>
        <ScoreRing score={compositeScore} />
      </div>

      {/* ---- SIGNAL + RISK BADGES ---- */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getSignalBadgeStyle(signalStrength)}`}>
          {signalStrength === 'STRONG_BUY' ? '🔥 STRONG BUY' : signalStrength}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${getRiskBadgeStyle(riskLevel)}`}>
          {riskLevel} Risk
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-secondary/60 border border-border-color/40 text-text-secondary">
          {timeframe} TF
        </span>
      </div>

      {/* ---- PRICE + CHANGE ---- */}
      <div className="flex items-end justify-between mb-3 pb-3 border-b border-border-color/30">
        <div>
          <div className="text-xl font-bold text-text-primary font-mono">
            ${formatPrice(asset.price)}
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium ${priceChange >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
            {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatPct(priceChange)} 24h
          </div>
        </div>
        {/* Quick R:R indicator */}
        <div className="text-right">
          <div className="text-xs text-text-secondary">R:R Ratio</div>
          <div className="text-lg font-bold text-accent-emerald font-mono">{rrT2}:1</div>
        </div>
      </div>

      {/* ---- ENTRY / EXIT ZONE ---- */}
      <div className="mb-3 pb-3 border-b border-border-color/30">
        <div className="flex items-center gap-1.5 mb-2">
          <Target className="w-3.5 h-3.5 text-accent-amber" />
          <span className="text-[11px] font-semibold text-text-primary uppercase tracking-wide">Entry / Exit Zones</span>
        </div>
        <EntryExitZone opportunity={opportunity} />
      </div>

      {/* ---- QUICK METRICS ---- */}
      <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-border-color/30">
        <div className="text-center p-1.5 rounded-lg bg-surface-secondary/30">
          <div className="text-[9px] text-text-secondary mb-0.5">RSI</div>
          <div className={`text-sm font-bold font-mono ${indicators.rsi14 < 30 ? 'text-accent-emerald' : indicators.rsi14 < 50 ? 'text-accent-amber' : 'text-accent-red'}`}>
            {indicators.rsi14.toFixed(1)}
          </div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-surface-secondary/30">
          <div className="text-[9px] text-text-secondary mb-0.5">Confidence</div>
          <div className="text-sm font-bold font-mono text-accent-blue">
            {prediction.confidence}%
          </div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-surface-secondary/30">
          <div className="text-[9px] text-text-secondary mb-0.5">Vol×</div>
          <div className={`text-sm font-bold font-mono ${indicators.volumeRatio > 1.5 ? 'text-accent-emerald' : 'text-text-secondary'}`}>
            {indicators.volumeRatio.toFixed(1)}×
          </div>
        </div>
      </div>

      {/* ---- REASONING ---- */}
      <div className="mb-3 space-y-1">
        {reasoning.slice(0, expanded ? reasoning.length : 2).map((reason, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <ArrowUpRight className="w-3 h-3 text-accent-emerald flex-shrink-0 mt-0.5" />
            <span className="text-[10px] text-text-secondary leading-relaxed">{reason}</span>
          </div>
        ))}
      </div>

      {/* ---- EXPAND BUTTON ---- */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-1.5 rounded-lg bg-surface-secondary/30 hover:bg-surface-secondary/60 border border-border-color/30 hover:border-border-color/60 transition-all flex items-center justify-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Less Details</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>More Details</span>
          </>
        )}
      </button>

      {/* ---- EXPANDED DETAILS ---- */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border-color/30 space-y-4">
          {/* Technical Scores */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart2 className="w-3.5 h-3.5 text-accent-blue" />
              <span className="text-[11px] font-semibold text-text-primary">Technical Analysis</span>
              <span className="ml-auto text-[10px] font-mono text-accent-blue">{technical.composite}/100</span>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'RSI Signal', score: technical.rsiScore, color: 'accent-emerald' },
                { label: 'MACD', score: technical.macdScore, color: 'accent-blue' },
                { label: 'Bollinger Band', score: technical.bollingerScore, color: 'accent-cyan' },
                { label: 'EMA Alignment', score: technical.emaScore, color: 'accent-purple' },
                { label: 'Volume', score: technical.volumeScore, color: 'accent-amber' },
                { label: 'ADX Trend', score: technical.adxScore, color: 'accent-indigo' },
              ].map(({ label, score, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[10px] text-text-secondary">{label}</span>
                  </div>
                  <ScoreBar score={score} color={color} />
                </div>
              ))}
            </div>
          </div>

          {/* Sentiment Scores */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="w-3.5 h-3.5 text-accent-amber" />
              <span className="text-[11px] font-semibold text-text-primary">Market Sentiment</span>
              <span className="ml-auto text-[10px] font-mono text-accent-amber">{sentiment.composite}/100</span>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Fear & Greed (Contrarian)', score: sentiment.fearGreedScore, color: 'accent-amber' },
                { label: 'Momentum Reversal', score: sentiment.momentumScore, color: 'accent-emerald' },
                { label: 'Market Cap Reliability', score: sentiment.marketCapScore, color: 'accent-cyan' },
              ].map(({ label, score, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[10px] text-text-secondary">{label}</span>
                  </div>
                  <ScoreBar score={score} color={color} />
                </div>
              ))}
            </div>
          </div>

          {/* Prediction Scores */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Brain className="w-3.5 h-3.5 text-accent-purple" />
              <span className="text-[11px] font-semibold text-text-primary">AI Prediction</span>
              <span className="ml-auto text-[10px] font-mono text-accent-purple">{prediction.composite}/100</span>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Mean Reversion', score: prediction.meanReversionScore, color: 'accent-purple' },
                { label: 'Trend Alignment', score: prediction.trendScore, color: 'accent-blue' },
                { label: 'ML Model Score', score: prediction.mlScore, color: 'accent-cyan' },
              ].map(({ label, score, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[10px] text-text-secondary">{label}</span>
                  </div>
                  <ScoreBar score={score} color={color} />
                </div>
              ))}
            </div>
          </div>

          {/* Key Indicators */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="text-[11px] font-semibold text-text-primary">Key Indicators</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {[
                { label: 'RSI(14)', value: indicators.rsi14.toFixed(1) },
                { label: 'ADX(14)', value: indicators.adx14.toFixed(1) },
                { label: 'Stoch K', value: indicators.stochK.toFixed(1) },
                { label: 'Stoch D', value: indicators.stochD.toFixed(1) },
                { label: 'EMA20', value: `$${formatPrice(indicators.ema20)}` },
                { label: 'EMA50', value: `$${formatPrice(indicators.ema50)}` },
                { label: 'BB Upper', value: `$${formatPrice(indicators.bollingerUpper)}` },
                { label: 'BB Lower', value: `$${formatPrice(indicators.bollingerLower)}` },
                { label: 'ATR(14)', value: `$${formatPrice(indicators.atr14)}` },
                { label: 'Vol Ratio', value: `${indicators.volumeRatio.toFixed(2)}×` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[10px] text-text-secondary">{label}</span>
                  <span className="text-[10px] font-mono text-text-primary">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* R:R Summary */}
          <div className="p-2.5 rounded-lg bg-surface-secondary/30 border border-border-color/30">
            <div className="text-[11px] font-semibold text-text-primary mb-1.5">Risk/Reward Summary</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'T1 (Conservative)', rr: entryExit.riskRewardT1, color: 'text-accent-blue' },
                { label: 'T2 (Moderate)', rr: entryExit.riskRewardT2, color: 'text-accent-emerald' },
                { label: 'T3 (Aggressive)', rr: entryExit.riskRewardT3, color: 'text-accent-teal' },
              ].map(({ label, rr, color }) => (
                <div key={label}>
                  <div className={`text-base font-bold font-mono ${color}`}>{rr}:1</div>
                  <div className="text-[9px] text-text-secondary">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Model info */}
          <div className="text-[9px] text-text-secondary/50 text-right font-mono">
            {opportunity.modelVersion} • {opportunity.updatedAt.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  )
}

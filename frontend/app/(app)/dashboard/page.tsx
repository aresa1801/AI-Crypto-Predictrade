'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { TrendingUp, Activity, Zap } from 'lucide-react'
import { CardSkeleton } from '@/components/skeletons'
import { fetchAIPredictionsWithMeta } from '@/lib/api/predictions'
import { fetchGlobalMarketData } from '@/lib/api/coingecko'

// Lazy load heavy components
const MarketSnapshot = lazy(() => import('@/components/dashboard/market-snapshot').then(m => ({ default: m.MarketSnapshot })))
const PredictionGauges = lazy(() => import('@/components/dashboard/prediction-gauges').then(m => ({ default: m.PredictionGauges })))
const RecentPredictions = lazy(() => import('@/components/dashboard/recent-predictions').then(m => ({ default: m.RecentPredictions })))
const SpotPortfolio = lazy(() => import('@/components/dashboard/spot-portfolio').then(m => ({ default: m.SpotPortfolio })))
const PredictionMarkets = lazy(() => import('@/components/dashboard/prediction-markets').then(m => ({ default: m.PredictionMarkets })))

interface KpiData {
  predictionCount: number
  winRate: string
  btcDominance: string
  avgConfidence: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<KpiData | null>(null)

  useEffect(() => {
    const loadKpis = async () => {
      try {
        const [{ predictions }, globalData] = await Promise.all([
          fetchAIPredictionsWithMeta(),
          fetchGlobalMarketData(),
        ])

        const bullish   = predictions.filter(p => p.direction === 'bullish').length
        const winRate   = predictions.length > 0
          ? ((bullish / predictions.length) * 100).toFixed(1)
          : '—'
        const avgConf   = predictions.length > 0
          ? (predictions.reduce((s, p) => s + p.confidenceLevel, 0) / predictions.length).toFixed(0)
          : '—'

        setKpi({
          predictionCount: predictions.length,
          winRate: `${winRate}%`,
          btcDominance: `${globalData.btcDominance.toFixed(1)}%`,
          avgConfidence: `${avgConf}%`,
        })
      } catch {
        // Keep null – cards will show '—'
      } finally {
        setLoading(false)
      }
    }

    loadKpis()
  }, [])

  const kpiCards = [
    {
      label: 'Active Signals',
      value: kpi ? String(kpi.predictionCount) : '—',
      sub: 'AI predictions live',
      icon: Activity,
      color: 'text-accent-emerald',
      border: 'border-accent-emerald/20',
      bg: 'bg-accent-emerald/8',
    },
    {
      label: 'Bullish Ratio',
      value: kpi ? kpi.winRate : '—',
      sub: 'Bullish vs total signals',
      icon: Zap,
      color: 'text-accent-blue',
      border: 'border-accent-blue/20',
      bg: 'bg-accent-blue/8',
    },    {
      label: 'BTC Dominance',
      value: kpi ? kpi.btcDominance : '—',
      sub: 'Live global market share',
      icon: TrendingUp,
      color: 'text-accent-cyan',
      border: 'border-accent-cyan/20',
      bg: 'bg-accent-cyan/8',
    },
    {
      label: 'Avg AI Confidence',
      value: kpi ? kpi.avgConfidence : '—',
      sub: 'Across all signals',
      icon: Activity,
      color: 'text-accent-amber',
      border: 'border-accent-amber/20',
      bg: 'bg-accent-amber/8',
    },
  ]

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-lg shadow-accent-blue/25 flex-shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight gradient-text-blue">
              AI Spot Trading Dashboard
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Real-time spot market intelligence · AI predictions · Risk analysis
            </p>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map(({ label, value, sub, icon: Icon, color, border, bg }) => (
            <div
              key={label}
              className={`relative p-4 rounded-xl border ${border} bg-surface-primary/50 backdrop-blur-sm overflow-hidden`}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-text-secondary">{label}</p>
                <Icon className={`w-3.5 h-3.5 ${color} opacity-70 flex-shrink-0`} />
              </div>
              <p className={`text-2xl font-bold ${color} tracking-tight ${loading ? 'animate-pulse' : ''}`}>
                {loading ? '…' : value}
              </p>
              <p className="text-[10px] text-text-secondary/60 mt-1 font-medium">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Market Overview - Full Width */}
      <div>
        <Suspense fallback={<CardSkeleton />}>
          <MarketSnapshot loading={loading} />
        </Suspense>
      </div>

      {/* Middle Row - Spot Portfolio */}
      <div>
        <Suspense fallback={<CardSkeleton />}>
          <SpotPortfolio />
        </Suspense>
      </div>

      {/* AI Prediction Gauges */}
      <div>
        <Suspense fallback={<CardSkeleton />}>
          <PredictionGauges loading={loading} />
        </Suspense>
      </div>

      {/* Prediction Markets */}
      <div>
        <Suspense fallback={<CardSkeleton />}>
          <PredictionMarkets />
        </Suspense>
      </div>

      {/* Bottom Row - Recent Predictions */}
      <div>
        <Suspense fallback={<CardSkeleton />}>
          <RecentPredictions loading={loading} />
        </Suspense>
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { TrendingUp, Activity, Zap } from 'lucide-react'
import { CardSkeleton } from '@/components/skeletons'

// Lazy load heavy components
const MarketSnapshot = lazy(() => import('@/components/dashboard/market-snapshot').then(m => ({ default: m.MarketSnapshot })))
const PredictionGauges = lazy(() => import('@/components/dashboard/prediction-gauges').then(m => ({ default: m.PredictionGauges })))
const RecentPredictions = lazy(() => import('@/components/dashboard/recent-predictions').then(m => ({ default: m.RecentPredictions })))
const SpotPortfolio = lazy(() => import('@/components/dashboard/spot-portfolio').then(m => ({ default: m.SpotPortfolio })))
const CexApiSettings = lazy(() => import('@/components/dashboard/cex-api-settings').then(m => ({ default: m.CexApiSettings })))
const PredictionMarkets = lazy(() => import('@/components/dashboard/prediction-markets').then(m => ({ default: m.PredictionMarkets })))

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

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
          {[
            {
              label: 'Spot Holdings',
              value: '5',
              sub: 'Active Positions',
              icon: Activity,
              color: 'text-accent-emerald',
              border: 'border-accent-emerald/20',
              bg: 'bg-accent-emerald/8',
            },
            {
              label: 'AI Win Rate',
              value: '78.5%',
              sub: 'Last 30 Signals',
              icon: Zap,
              color: 'text-accent-blue',
              border: 'border-accent-blue/20',
              bg: 'bg-accent-blue/8',
            },
            {
              label: 'Portfolio Value',
              value: '$50,406',
              sub: '+12.4% this month',
              icon: TrendingUp,
              color: 'text-accent-cyan',
              border: 'border-accent-cyan/20',
              bg: 'bg-accent-cyan/8',
            },
            {
              label: 'AI Confidence',
              value: '92%',
              sub: 'Model Accuracy',
              icon: Activity,
              color: 'text-accent-amber',
              border: 'border-accent-amber/20',
              bg: 'bg-accent-amber/8',
            },
          ].map(({ label, value, sub, icon: Icon, color, border, bg }) => (
            <div
              key={label}
              className={`relative p-4 rounded-xl border ${border} bg-surface-primary/50 backdrop-blur-sm overflow-hidden`}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-text-secondary">{label}</p>
                <Icon className={`w-3.5 h-3.5 ${color} opacity-70 flex-shrink-0`} />
              </div>
              <p className={`text-2xl font-bold ${color} tracking-tight`}>{value}</p>
              <p className="text-[10px] text-text-secondary/60 mt-1 font-medium">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Row - Market Snapshot & Order Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1">
          <Suspense fallback={<CardSkeleton />}>
            <MarketSnapshot loading={loading} />
          </Suspense>
        </div>
        <div className="lg:col-span-2">
          <Suspense fallback={<CardSkeleton />}>
            <CexApiSettings />
          </Suspense>
        </div>
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

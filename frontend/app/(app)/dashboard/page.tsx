'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { TrendingUp, Activity, Zap } from 'lucide-react'
import { CardSkeleton } from '@/components/skeletons'

// Lazy load heavy components
const MarketSnapshot = lazy(() => import('@/components/dashboard/market-snapshot').then(m => ({ default: m.MarketSnapshot })))
const PredictionGauges = lazy(() => import('@/components/dashboard/prediction-gauges').then(m => ({ default: m.PredictionGauges })))
const RecentPredictions = lazy(() => import('@/components/dashboard/recent-predictions').then(m => ({ default: m.RecentPredictions })))
const SpotPortfolio = lazy(() => import('@/components/dashboard/spot-portfolio').then(m => ({ default: m.SpotPortfolio })))
const SpotOrderForm = lazy(() => import('@/components/dashboard/spot-order-form').then(m => ({ default: m.SpotOrderForm })))
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
      {/* Header with gradient */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-lg shadow-accent-purple/30">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold gradient-text">AI Spot Trading Dashboard</h1>
            <p className="text-sm lg:text-base text-text-secondary">Real-time spot market intelligence with AI predictions & market analysis</p>
          </div>
        </div>
        
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-accent-emerald/20 to-accent-teal/20 border border-accent-emerald/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-accent-emerald" />
              <span className="text-xs text-text-secondary">Spot Holdings</span>
            </div>
            <p className="text-2xl font-bold text-accent-emerald">5</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-cyan/20 border border-accent-blue/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-accent-blue" />
              <span className="text-xs text-text-secondary">AI Win Rate</span>
            </div>
            <p className="text-2xl font-bold text-accent-blue">78.5%</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-pink/20 border border-accent-purple/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-accent-purple" />
              <span className="text-xs text-text-secondary">Portfolio Value</span>
            </div>
            <p className="text-2xl font-bold text-accent-purple">$50,406</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-accent-indigo/20 to-accent-purple/20 border border-accent-indigo/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-accent-indigo" />
              <span className="text-xs text-text-secondary">AI Confidence</span>
            </div>
            <p className="text-2xl font-bold text-accent-indigo">92%</p>
          </div>
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
            <SpotOrderForm />
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

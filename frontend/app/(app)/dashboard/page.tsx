'use client'

import { useState, useEffect } from 'react'
import { MarketSnapshot } from '@/components/dashboard/market-snapshot'
import { PredictionGauges } from '@/components/dashboard/prediction-gauges'
import { RecentPredictions } from '@/components/dashboard/recent-predictions'

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
      <div className="space-y-2">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">AI Crypto Analysis Dashboard</h1>
        <p className="text-sm lg:text-base text-text-secondary">Real-time market intelligence and predictive insights</p>
      </div>

      {/* Top Row - Market Snapshot & Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1">
          <MarketSnapshot loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <PredictionGauges loading={loading} />
        </div>
      </div>

      {/* Bottom Row - Recent Predictions */}
      <div>
        <RecentPredictions loading={loading} />
      </div>
    </div>
  )
}

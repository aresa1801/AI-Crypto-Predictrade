'use client'

import { useState } from 'react'
import { MarketSnapshot } from '@/components/dashboard/market-snapshot'
import { PredictionGauges } from '@/components/dashboard/prediction-gauges'
import { RecentPredictions } from '@/components/dashboard/recent-predictions'
import { Watchlist } from '@/components/dashboard/watchlist'

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Real-time market intelligence and AI-powered trading predictions
        </p>
      </div>

      {/* Top Row - Market Snapshot & Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-1">
          <MarketSnapshot loading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <PredictionGauges loading={isLoading} />
        </div>
      </div>

      {/* Watchlist */}
      <div>
        <Watchlist />
      </div>

      {/* Recent Predictions Table */}
      <div>
        <RecentPredictions loading={isLoading} />
      </div>
    </div>
  )
}

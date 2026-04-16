'use client'

import { useState, useEffect } from 'react'
import { PredictionCard } from '@/components/predictions/prediction-card'
import { fetchAIPredictions } from '@/lib/api/predictions'
import { Prediction } from '@/lib/types'
import { Activity, TrendingUp } from 'lucide-react'

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPredictions = async () => {
      try {
        setLoading(true)
        const data = await fetchAIPredictions()
        setPredictions(data)
        setError(null)
      } catch (err) {
        setError('Failed to load predictions')
        console.error('Error loading predictions:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPredictions()
    
    // Refresh predictions every 5 minutes
    const interval = setInterval(loadPredictions, 300000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header with gradient */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-lg shadow-accent-blue/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold gradient-text-blue">TERMINAL.PREDICT</h1>
              <p className="text-sm lg:text-base text-text-secondary">Real-time AI predictions for all assets</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-emerald/20 border border-accent-emerald/30">
            <Activity className="w-4 h-4 text-accent-emerald animate-pulse" />
            <span className="text-sm font-medium text-accent-emerald">SYSTEM STATUS</span>
            <span className="text-accent-emerald font-bold">● ONLINE</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {[...Array(100)].map((_, i) => (
            <div key={i} className="card-gradient animate-pulse h-80" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="card-gradient text-center py-12">
          <p className="text-accent-red text-lg mb-2">{error}</p>
          <p className="text-text-secondary text-sm">Please try again later</p>
        </div>
      )}

      {/* Predictions Grid */}
      {!loading && !error && predictions.length > 0 && (
        <>
          <div className="text-sm text-text-secondary mb-2">
            Showing {predictions.length} cryptocurrencies (Top 100 by market cap, excluding stablecoins)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {predictions.map((prediction) => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && !error && predictions.length === 0 && (
        <div className="card-gradient text-center py-12">
          <p className="text-text-secondary">No predictions available</p>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-xs text-text-secondary font-mono">
        Last updated: {new Date().toLocaleTimeString()} • Auto-refresh: 5 min
      </div>
    </div>
  )
}

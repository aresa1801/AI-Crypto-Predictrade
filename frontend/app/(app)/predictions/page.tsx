'use client'

import { useState, useEffect, useCallback } from 'react'
import { PredictionCard } from '@/components/predictions/prediction-card'
import { fetchAIPredictionsWithMeta } from '@/lib/api/predictions'
import { Prediction } from '@/lib/types'
import { Activity, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react'

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stale, setStale] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPredictions = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const { predictions: data, stale: isStale } = await fetchAIPredictionsWithMeta()
      setPredictions(data)
      setStale(isStale)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      // fetchAIPredictionsWithMeta never throws, but guard just in case
      setError('Failed to load predictions')
      console.error('Error loading predictions:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadPredictions()
    
    // Refresh predictions every 5 minutes
    const interval = setInterval(() => loadPredictions(true), 300_000)
    
    return () => clearInterval(interval)
  }, [loadPredictions])

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
              <h1 className="text-2xl lg:text-3xl font-bold gradient-text-blue">AI SPOT TRADING SIGNALS</h1>
              <p className="text-sm lg:text-base text-text-secondary">Real-time AI predictions for spot market opportunities</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Manual refresh button */}
            <button
              onClick={() => loadPredictions(true)}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary/50 border border-border-color/50 hover:border-accent-blue/50 transition-all disabled:opacity-50"
              title="Refresh predictions"
            >
              <RefreshCw className={`w-4 h-4 text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs text-text-secondary hidden sm:inline">Refresh</span>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-emerald/20 border border-accent-emerald/30">
              <Activity className="w-4 h-4 text-accent-emerald animate-pulse" />
              <span className="text-sm font-medium text-accent-emerald">SYSTEM STATUS</span>
              <span className="text-accent-emerald font-bold">● ONLINE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stale data warning banner */}
      {stale && !loading && predictions.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent-amber/10 border border-accent-amber/30">
          <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0" />
          <p className="text-sm text-accent-amber">
            Showing cached data – live market feed temporarily unavailable. Data may be a few minutes old.
          </p>
          <button
            onClick={() => loadPredictions(true)}
            className="ml-auto text-xs text-accent-amber underline hover:no-underline flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State (initial load only) */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {[...Array(24)].map((_, i) => (
            <div key={i} className="card-gradient animate-pulse h-80" />
          ))}
        </div>
      )}

      {/* Error State – only shown when there are no predictions to fall back to */}
      {error && !loading && predictions.length === 0 && (
        <div className="card-gradient text-center py-12 space-y-4">
          <AlertTriangle className="w-10 h-10 text-accent-amber mx-auto" />
          <p className="text-text-primary text-lg font-semibold">{error}</p>
          <p className="text-text-secondary text-sm">The market data service is temporarily unavailable.</p>
          <button
            onClick={() => loadPredictions()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Predictions Grid (shown even while background refreshing) */}
      {!loading && predictions.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
            <span>Showing {predictions.length} spot trading opportunities (Top 100 by market cap, excluding stablecoins)</span>
            {refreshing && (
              <span className="flex items-center gap-1.5 text-accent-blue">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Updating…
              </span>
            )}
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
        {lastUpdated
          ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
          : 'Loading…'} • Auto-refresh: 5 min
      </div>
    </div>
  )
}

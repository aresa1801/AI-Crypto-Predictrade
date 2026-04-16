'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { Prediction } from '@/lib/types'
import { fetchAIPredictions } from '@/lib/api/predictions'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { TableSkeleton } from '@/components/skeletons'
import { ErrorBoundary } from '@/components/error-boundary'
import { EmptyState } from '@/components/empty-state'

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) return `${hours}h ago`
  return `${minutes}m ago`
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'correct':
      return 'bg-accent-emerald/20 text-accent-emerald'
    case 'incorrect':
      return 'bg-accent-red/20 text-accent-red'
    case 'expired':
      return 'bg-accent-amber/20 text-accent-amber'
    default:
      return 'bg-accent-blue/20 text-accent-blue'
  }
}

function RecentPredictionsContent() {
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error'
    data: Prediction[] | null
    error: Error | null
  }>({ status: 'loading', data: null, error: null })

  const loadData = useCallback(async () => {
    try {
      // Fetch real AI predictions from API
      const predictions = await fetchAIPredictions()
      setState({ status: 'success', data: predictions, error: null })
    } catch (error) {
      setState({
        status: 'error',
        data: null,
        error: error instanceof Error ? error : new Error('Failed to load predictions'),
      })
    }
  }, [])

  useEffect(() => {
    loadData()
    
    // Refresh predictions every 5 minutes
    const interval = setInterval(loadData, 300000)
    
    return () => clearInterval(interval)
  }, [loadData])

  if (state.status === 'loading') {
    return <TableSkeleton rows={5} />
  }

  if (state.status === 'error') {
    return (
      <EmptyState
        icon={<span className="text-3xl">⚠️</span>}
        title="Failed to Load Predictions"
        description={state.error?.message || 'Unable to fetch prediction data'}
        action={{
          label: 'Retry',
          onClick: () => window.location.reload(),
        }}
      />
    )
  }

  if (!state.data || state.data.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-3xl">📊</span>}
        title="No Predictions"
        description="No predictions available at the moment"
      />
    )
  }

  return (
    <div className="card-gradient">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-pink to-accent-orange flex items-center justify-center shadow-lg shadow-accent-pink/30">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-base lg:text-lg font-semibold gradient-text">Recent Predictions</h3>
      </div>

      <div className="overflow-x-auto -mx-4 sm:-mx-0">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border-color/50">
              <th className="text-left py-3 px-4 text-text-secondary font-semibold">Asset</th>
              <th className="text-left py-3 px-4 text-text-secondary font-semibold">Direction</th>
              <th className="text-right py-3 px-4 text-text-secondary font-semibold">Confidence</th>
              <th className="text-right py-3 px-4 text-text-secondary font-semibold">Target Price</th>
              <th className="text-right py-3 px-4 text-text-secondary font-semibold">Expected Value</th>
              <th className="text-left py-3 px-4 text-text-secondary font-semibold">Timeframe</th>
              <th className="text-left py-3 px-4 text-text-secondary font-semibold">Status</th>
              <th className="text-left py-3 px-4 text-text-secondary font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((pred) => (
              <tr
                key={pred.id}
                className="border-b border-border-color/30 hover:bg-surface-secondary/50 transition-all duration-200"
              >
                <td className="py-3 px-4">
                  <div>
                    <p className="font-semibold text-text-primary">{pred.asset.symbol}</p>
                    <p className="text-xs text-text-secondary">{pred.asset.name}</p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit ${
                    pred.predictedDirection === 'up'
                      ? 'bg-accent-emerald/20 border border-accent-emerald/30'
                      : 'bg-accent-red/20 border border-accent-red/30'
                  }`}>
                    {pred.predictedDirection === 'up' ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-accent-emerald" />
                        <span className="text-accent-emerald font-semibold">Long</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-accent-red" />
                        <span className="text-accent-red font-semibold">Short</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 bg-surface-secondary/50 rounded-full h-2.5 border border-border-color/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pred.confidenceLevel > 70
                            ? 'bg-gradient-to-r from-accent-emerald to-accent-teal'
                            : pred.confidenceLevel > 50
                            ? 'bg-gradient-to-r from-accent-amber to-accent-orange'
                            : 'bg-gradient-to-r from-accent-red to-accent-pink'
                        }`}
                        style={{ width: `${pred.confidenceLevel}%` }}
                      />
                    </div>
                    <span className="font-bold text-text-primary w-10">{pred.confidenceLevel}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <p className="font-bold text-text-primary">
                    ${pred.predictedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </td>
                <td className="py-3 px-4 text-right">
                  <p className={`font-bold ${pred.expectedValue >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
                    {pred.expectedValue >= 0 ? '+' : ''}${pred.expectedValue.toFixed(2)}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent-indigo/20 to-accent-purple/20 border border-accent-indigo/30 text-accent-indigo text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    {pred.timeframe}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`badge ${getStatusColor(pred.status)}`}>
                    {pred.status.charAt(0).toUpperCase() + pred.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4 text-text-secondary text-xs font-medium">
                  {formatTime(pred.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function RecentPredictions({ loading }: { loading?: boolean }) {
  if (loading) {
    return <TableSkeleton rows={5} />
  }

  return (
    <ErrorBoundary>
      <RecentPredictionsContent />
    </ErrorBoundary>
  )
}

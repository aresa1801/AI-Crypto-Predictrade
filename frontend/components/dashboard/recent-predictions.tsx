'use client'

import { useState, useEffect } from 'react'
import { Prediction } from '@/lib/types'
import { predictions as mockPredictions } from '@/lib/mock/data'
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

  useEffect(() => {
    const loadData = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 600 + 600))
        setState({ status: 'success', data: mockPredictions, error: null })
      } catch (error) {
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error : new Error('Failed to load predictions'),
        })
      }
    }

    loadData()
  }, [])

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
    <div className="card">
      <h3 className="text-base lg:text-lg font-semibold text-text-primary mb-4">All Predictions</h3>

      <div className="overflow-x-auto -mx-4 sm:-mx-0">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border-color">
              <th className="text-left py-3 px-4 text-text-secondary font-medium">Asset</th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">Direction</th>
              <th className="text-right py-3 px-4 text-text-secondary font-medium">Confidence</th>
              <th className="text-right py-3 px-4 text-text-secondary font-medium">Target Price</th>
              <th className="text-right py-3 px-4 text-text-secondary font-medium">Expected Value</th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">Timeframe</th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">Status</th>
              <th className="text-left py-3 px-4 text-text-secondary font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {state.data.map((pred) => (
              <tr
                key={pred.id}
                className="border-b border-border-color hover:bg-surface-secondary transition-colors"
              >
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-text-primary">{pred.asset.symbol}</p>
                    <p className="text-xs text-text-secondary">{pred.asset.name}</p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {pred.predictedDirection === 'up' ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-accent-emerald" />
                        <span className="text-accent-emerald font-medium">Long</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-accent-red" />
                        <span className="text-accent-red font-medium">Short</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-surface-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          pred.confidenceLevel > 70
                            ? 'bg-accent-emerald'
                            : pred.confidenceLevel > 50
                            ? 'bg-accent-amber'
                            : 'bg-accent-red'
                        }`}
                        style={{ width: `${pred.confidenceLevel}%` }}
                      />
                    </div>
                    <span className="font-medium text-text-primary w-10">{pred.confidenceLevel}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <p className="font-medium text-text-primary">
                    ${pred.predictedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </td>
                <td className="py-3 px-4 text-right">
                  <p className={`font-medium ${pred.expectedValue >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
                    ${pred.expectedValue.toFixed(2)}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-secondary text-text-secondary text-xs">
                    <Clock className="w-3 h-3" />
                    {pred.timeframe}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`badge ${getStatusColor(pred.status)}`}>
                    {pred.status.charAt(0).toUpperCase() + pred.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4 text-text-secondary text-xs">
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

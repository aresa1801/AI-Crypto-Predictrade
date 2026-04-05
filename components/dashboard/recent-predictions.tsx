'use client'

import { predictions } from '@/lib/mock-data'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'

function formatTime(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) return `${hours}h ago`
  return `${minutes}m ago`
}

function getStatusColor(status: string) {
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

export function RecentPredictions({ loading }: { loading: boolean }) {
  if (loading) {
    return <div className="card animate-pulse h-96" />
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
            {predictions.map((pred) => (
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
                  <p className="font-medium text-text-primary">${pred.predictedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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

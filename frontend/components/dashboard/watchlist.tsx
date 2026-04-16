'use client'

import { useState, useEffect } from 'react'
import { CryptoAsset } from '@/lib/types'
import { cryptoAssets } from '@/lib/mock/data'
import { Sparkline } from '@/components/charts/sparkline'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'

// Generate mock sparkline data
function generateSparklineData(baseValue: number): Array<{ value: number }> {
  const data: Array<{ value: number }> = []
  let value = baseValue
  for (let i = 0; i < 20; i++) {
    const change = (Math.random() - 0.48) * baseValue * 0.02
    value = Math.max(value + change, baseValue * 0.9)
    data.push({ value })
  }
  return data
}

interface WatchlistData {
  asset: CryptoAsset
  sparkline: Array<{ value: number }>
}

function WatchlistContent() {
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error'
    data: WatchlistData[] | null
    error: Error | null
  }>({ status: 'loading', data: null, error: null })

  useEffect(() => {
    const loadData = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 600 + 600))

        const watchlistData: WatchlistData[] = cryptoAssets.slice(0, 5).map((asset) => ({
          asset,
          sparkline: generateSparklineData(asset.price),
        }))

        setState({ status: 'success', data: watchlistData, error: null })
      } catch (error) {
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error : new Error('Failed to load watchlist'),
        })
      }
    }

    loadData()
  }, [])

  if (state.status === 'loading') {
    return <div className="animate-pulse h-64 bg-surface-secondary rounded-lg" />
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center justify-center py-8 text-accent-red">
        Failed to load watchlist
      </div>
    )
  }

  if (!state.data || state.data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-text-secondary">
        No assets in watchlist
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {state.data.map((item) => {
        const isGain = item.asset.change24h >= 0
        const color = isGain ? 'success' : 'danger'

        return (
          <div
            key={item.asset.id}
            className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg hover:bg-surface-primary transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.asset.symbol}</p>
                  <p className="text-xs text-text-secondary">${item.asset.price.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-20 h-8">
                <Sparkline
                  data={item.sparkline}
                  dataKey="value"
                  color={color}
                  height={32}
                  width={80}
                />
              </div>

              <div className="flex items-center gap-1 min-w-16 text-right">
                {isGain ? (
                  <TrendingUp className="w-4 h-4 text-accent-emerald flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-accent-red flex-shrink-0" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    isGain ? 'text-accent-emerald' : 'text-accent-red'
                  }`}
                >
                  {isGain ? '+' : ''}{item.asset.change24h.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Watchlist() {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Watchlist</h3>
      <ErrorBoundary>
        <WatchlistContent />
      </ErrorBoundary>
    </div>
  )
}

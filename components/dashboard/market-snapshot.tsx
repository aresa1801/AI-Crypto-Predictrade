'use client'

import { useState, useEffect } from 'react'
import { MarketSnapshot as MarketSnapshotType, CryptoAsset } from '@/lib/types'
import { marketSnapshot as mockMarketSnapshot, cryptoAssets as mockCryptoAssets } from '@/lib/mock/data'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { CardSkeleton } from '@/components/skeletons'
import { ErrorBoundary } from '@/components/error-boundary'

interface MarketSnapshotProps {
  loading?: boolean
}

function MarketSnapshotContent() {
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error'
    data: { market: MarketSnapshotType; assets: CryptoAsset[] } | null
    error: Error | null
  }>({ status: 'loading', data: null, error: null })

  useEffect(() => {
    const loadData = async () => {
      try {
        // Simulate async fetch with delay
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 600 + 600))
        setState({
          status: 'success',
          data: {
            market: mockMarketSnapshot,
            assets: mockCryptoAssets.slice(0, 3),
          },
          error: null,
        })
      } catch (error) {
        setState({
          status: 'error',
          data: null,
          error: error instanceof Error ? error : new Error('Failed to load market data'),
        })
      }
    }

    loadData()
  }, [])

  if (state.status === 'loading') {
    return <CardSkeleton />
  }

  if (state.status === 'error') {
    return (
      <div className="card flex items-center justify-center py-8">
        <p className="text-accent-red">Failed to load market snapshot</p>
      </div>
    )
  }

  if (!state.data) {
    return null
  }

  const { market, assets } = state.data

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">Market Snapshot</h3>

      {/* Market Stats */}
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-border-color">
          <span className="text-text-secondary text-sm">Total Market Cap</span>
          <span className="text-text-primary font-semibold">
            ${(market.totalMarketCap / 1e12).toFixed(2)}T
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border-color">
          <span className="text-text-secondary text-sm">BTC Dominance</span>
          <span className="text-text-primary font-semibold">{market.btcDominance.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-text-secondary text-sm">Volatility Index</span>
          <span className="text-accent-amber font-semibold">{market.volatilityIndex.toFixed(1)}</span>
        </div>
      </div>

      {/* Top Assets */}
      <div className="pt-4 border-t border-border-color space-y-2">
        <h4 className="text-sm font-medium text-text-primary">Top Assets</h4>
        {assets.map((asset) => (
          <div key={asset.id} className="flex items-center justify-between p-2 bg-surface-secondary rounded">
            <div>
              <p className="text-sm font-medium text-text-primary">{asset.symbol}</p>
              <p className="text-xs text-text-secondary">${asset.price.toFixed(2)}</p>
            </div>
            <div className={`flex items-center gap-1 ${asset.change24h >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
              {asset.change24h >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{Math.abs(asset.change24h).toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MarketSnapshot({ loading }: MarketSnapshotProps) {
  if (loading) {
    return <CardSkeleton />
  }

  return (
    <ErrorBoundary>
      <MarketSnapshotContent />
    </ErrorBoundary>
  )
}

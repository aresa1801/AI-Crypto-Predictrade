'use client'

import { marketSnapshot, cryptoAssets } from '@/lib/mock-data'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function MarketSnapshot({ loading }: { loading: boolean }) {
  if (loading) {
    return <div className="card animate-pulse h-80" />
  }

  const topAssets = cryptoAssets.slice(0, 3)

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">Market Snapshot</h3>

      {/* Market Stats */}
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-border-color">
          <span className="text-text-secondary text-sm">Total Market Cap</span>
          <span className="text-text-primary font-semibold">$1.85T</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border-color">
          <span className="text-text-secondary text-sm">BTC Dominance</span>
          <span className="text-text-primary font-semibold">{marketSnapshot.btcDominance.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-text-secondary text-sm">Volatility Index</span>
          <span className="text-accent-amber font-semibold">{marketSnapshot.volatilityIndex.toFixed(1)}</span>
        </div>
      </div>

      {/* Top Assets */}
      <div className="pt-4 border-t border-border-color space-y-2">
        <h4 className="text-sm font-medium text-text-primary">Top Assets</h4>
        {topAssets.map((asset) => (
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

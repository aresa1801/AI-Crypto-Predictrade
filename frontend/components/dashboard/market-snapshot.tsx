'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { MarketSnapshot as MarketSnapshotType, CryptoAsset } from '@/lib/types'
import { fetchGlobalMarketData, fetchCryptoMarketData } from '@/lib/api/coingecko'
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react'
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

  const loadData = useCallback(async () => {
    try {
      // Fetch real data from CoinGecko API
      const [marketData, assetsData] = await Promise.all([
        fetchGlobalMarketData(),
        fetchCryptoMarketData(),
      ])

      setState({
        status: 'success',
        data: {
          market: marketData,
          assets: assetsData.slice(0, 3), // Top 3 assets
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
  }, [])

  useEffect(() => {
    loadData()
    
    // Refresh data every 60 seconds
    const interval = setInterval(loadData, 60000)
    
    return () => clearInterval(interval)
  }, [loadData])

  if (state.status === 'loading') {
    return <CardSkeleton />
  }

  if (state.status === 'error') {
    return (
      <div className="card-gradient flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-accent-red mb-2">Failed to load market data</p>
          <p className="text-xs text-text-secondary">Using CoinGecko API - Check your connection</p>
        </div>
      </div>
    )
  }

  if (!state.data) {
    return null
  }

  const { market, assets } = state.data

  return (
    <div className="card-gradient space-y-4 h-full">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-lg shadow-accent-blue/30">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold gradient-text-blue">Spot Market Overview</h3>
          <p className="text-xs text-text-secondary">Live from CoinGecko</p>
        </div>
      </div>

      {/* Market Stats */}
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-accent-indigo/10 to-accent-purple/10 border border-accent-indigo/20">
          <span className="text-text-secondary text-sm">Total Market Cap</span>
          <span className="text-text-primary font-bold text-lg">
            ${(market.totalMarketCap / 1e12).toFixed(2)}T
          </span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-accent-cyan/10 to-accent-blue/10 border border-accent-cyan/20">
          <span className="text-text-secondary text-sm">BTC Dominance</span>
          <span className="text-accent-cyan font-bold text-lg">{market.btcDominance.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-accent-amber/10 to-accent-orange/10 border border-accent-amber/20">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-amber" />
            <span className="text-text-secondary text-sm">Volatility Index</span>
          </div>
          <span className="text-accent-amber font-bold text-lg">{market.volatilityIndex.toFixed(1)}</span>
        </div>
      </div>

      {/* Top Assets */}
      <div className="pt-4 border-t border-border-color/50 space-y-2">
        <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent-emerald" />
          Top Spot Trading Opportunities
        </h4>
        <div className="space-y-2">
          {assets.map((asset, index) => (
            <div key={asset.id} className="group p-3 bg-surface-secondary/50 backdrop-blur-sm rounded-lg border border-border-color/30 hover:border-accent-purple/30 transition-all duration-300 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-gradient-to-br from-accent-purple to-accent-pink text-white' :
                    index === 1 ? 'bg-gradient-to-br from-accent-blue to-accent-cyan text-white' :
                    'bg-gradient-to-br from-accent-indigo to-accent-purple text-white'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{asset.symbol}</p>
                    <p className="text-xs text-text-secondary">${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                  asset.change24h >= 0 
                    ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30' 
                    : 'bg-accent-red/20 text-accent-red border border-accent-red/30'
                }`}>
                  {asset.change24h >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span className="text-sm font-bold">{Math.abs(asset.change24h).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Last Updated */}
      <div className="text-xs text-text-secondary text-center pt-2 border-t border-border-color/30">
        Last updated: {new Date().toLocaleTimeString()}
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

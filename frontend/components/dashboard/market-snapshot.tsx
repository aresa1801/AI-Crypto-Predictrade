'use client'

import { useState, useEffect, useCallback } from 'react'
import { MarketSnapshot as MarketSnapshotType, CryptoAsset } from '@/lib/types'
import { fetchGlobalMarketData, fetchCryptoMarketData } from '@/lib/api/coingecko'
import { TrendingUp, TrendingDown, BarChart3, Activity, RefreshCw, DollarSign, Globe } from 'lucide-react'
import { CardSkeleton } from '@/components/skeletons'
import { ErrorBoundary } from '@/components/error-boundary'

interface MarketSnapshotProps {
  loading?: boolean
}

function formatVolume(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function MarketSnapshotContent() {
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error'
    data: { market: MarketSnapshotType; assets: CryptoAsset[] } | null
    error: Error | null
    lastUpdated: Date | null
  }>({ status: 'loading', data: null, error: null, lastUpdated: null })

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
          assets: assetsData.slice(0, 10), // Top 10 assets
        },
        error: null,
        lastUpdated: new Date(),
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: prev.data ? 'success' : 'error',
        error: error instanceof Error ? error : new Error('Failed to load market data'),
        lastUpdated: prev.lastUpdated,
      }))
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
          <button onClick={loadData} className="mt-3 flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg bg-surface-secondary/50 border border-border-color/40 transition-colors mx-auto">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    )
  }

  if (!state.data) {
    return null
  }

  const { market, assets } = state.data

  return (
    <div className="card-gradient space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-lg shadow-accent-blue/30">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold gradient-text-blue">Spot Market Overview</h3>
            <p className="text-xs text-text-secondary">Live from CoinGecko · Top 10 by market cap</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg bg-surface-secondary/50 border border-border-color/40 transition-colors"
          title="Refresh market data"
        >
          <RefreshCw className="w-3 h-3" />
          {state.lastUpdated ? state.lastUpdated.toLocaleTimeString() : 'Refresh'}
        </button>
      </div>

      {/* Global Market Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-accent-indigo/10 to-accent-purple/10 border border-accent-indigo/20">
          <div className="w-8 h-8 rounded-lg bg-accent-indigo/20 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-accent-indigo" />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">Total Market Cap</p>
            <p className="text-base font-bold text-text-primary">${(market.totalMarketCap / 1e12).toFixed(2)}T</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-accent-cyan/10 to-accent-blue/10 border border-accent-cyan/20">
          <div className="w-8 h-8 rounded-lg bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-4 h-4 text-accent-cyan" />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">BTC Dominance</p>
            <p className="text-base font-bold text-accent-cyan">{market.btcDominance.toFixed(1)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-accent-amber/10 to-accent-orange/10 border border-accent-amber/20">
          <div className="w-8 h-8 rounded-lg bg-accent-amber/20 flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-accent-amber" />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">Volatility Index</p>
            <p className="text-base font-bold text-accent-amber">{market.volatilityIndex.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="border border-border-color/40 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 bg-surface-secondary/50 border-b border-border-color/30">
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">#</span>
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Asset</span>
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider text-right">Price</span>
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider text-right">24h Change</span>
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider text-right hidden sm:block">Volume 24h</span>
        </div>
        {/* Asset rows */}
        <div className="divide-y divide-border-color/20">
          {assets.map((asset, index) => (
            <div
              key={asset.id}
              className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 hover:bg-surface-secondary/30 transition-colors duration-150 items-center"
            >
              <span className="text-xs font-medium text-text-secondary/60">{index + 1}</span>
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                  index === 0 ? 'bg-gradient-to-br from-accent-amber to-accent-orange' :
                  index === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                  index === 2 ? 'bg-gradient-to-br from-accent-orange to-accent-red' :
                  'bg-gradient-to-br from-accent-blue to-accent-indigo'
                }`}>
                  {asset.symbol.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{asset.symbol}</p>
                  <p className="text-[10px] text-text-secondary truncate hidden sm:block">{asset.name}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-text-primary text-right">
                ${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: asset.price >= 1 ? 2 : 6 })}
              </p>
              <div className={`flex items-center justify-end gap-1 px-2 py-1 rounded-lg w-fit ml-auto ${
                asset.change24h >= 0
                  ? 'bg-accent-emerald/15 text-accent-emerald'
                  : 'bg-accent-red/15 text-accent-red'
              }`}>
                {asset.change24h >= 0 ? (
                  <TrendingUp className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="text-xs font-bold whitespace-nowrap">{Math.abs(asset.change24h).toFixed(2)}%</span>
              </div>
              <p className="text-xs text-text-secondary text-right hidden sm:block">
                {asset.volume24h ? formatVolume(asset.volume24h) : '—'}
              </p>
            </div>
          ))}
        </div>
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

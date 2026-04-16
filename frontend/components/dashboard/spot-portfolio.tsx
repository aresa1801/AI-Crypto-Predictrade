'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Wallet, DollarSign, PieChart, Activity } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'

interface SpotHolding {
  symbol: string
  name: string
  quantity: number
  avgBuyPrice: number
  currentPrice: number
  value: number
  pnl: number
  pnlPercent: number
  allocation: number
}

function generateMockPortfolio(): SpotHolding[] {
  return [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      quantity: 0.5,
      avgBuyPrice: 42000,
      currentPrice: 45200,
      value: 22600,
      pnl: 1600,
      pnlPercent: 7.62,
      allocation: 45.2
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      quantity: 8,
      avgBuyPrice: 2200,
      currentPrice: 2450,
      value: 19600,
      pnl: 2000,
      pnlPercent: 11.36,
      allocation: 39.2
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      quantity: 45,
      avgBuyPrice: 95,
      currentPrice: 102,
      value: 4590,
      pnl: 315,
      pnlPercent: 7.37,
      allocation: 9.18
    },
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      quantity: 80,
      avgBuyPrice: 32,
      currentPrice: 35,
      value: 2800,
      pnl: 240,
      pnlPercent: 9.38,
      allocation: 5.6
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      quantity: 1200,
      avgBuyPrice: 0.70,
      currentPrice: 0.68,
      value: 816,
      pnl: -24,
      pnlPercent: -2.86,
      allocation: 1.63
    }
  ]
}

function SpotPortfolioContent() {
  const [holdings, setHoldings] = useState<SpotHolding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setHoldings(generateMockPortfolio())
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <div className="animate-pulse h-96 bg-surface-secondary/50 rounded-lg" />
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0)
  const totalPnL = holdings.reduce((sum, h) => sum + h.pnl, 0)
  const totalPnLPercent = (totalPnL / (totalValue - totalPnL)) * 100
  const totalInvested = totalValue - totalPnL

  return (
    <div className="card-gradient space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border-color/50">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-lg shadow-accent-purple/30">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold gradient-text">Spot Portfolio</h3>
          <p className="text-xs text-text-secondary">Current Holdings & Performance</p>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-accent-blue" />
            <span className="text-xs text-text-secondary">Total Value</span>
          </div>
          <p className="text-xl font-bold text-accent-blue">${totalValue.toLocaleString()}</p>
        </div>
        
        <div className="p-4 rounded-lg bg-gradient-to-br from-accent-indigo/10 to-accent-purple/10 border border-accent-indigo/20">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-accent-indigo" />
            <span className="text-xs text-text-secondary">Invested</span>
          </div>
          <p className="text-xl font-bold text-accent-indigo">${totalInvested.toLocaleString()}</p>
        </div>

        <div className={`p-4 rounded-lg bg-gradient-to-br ${totalPnL >= 0 ? 'from-accent-emerald/10 to-accent-teal/10 border-accent-emerald/20' : 'from-accent-red/10 to-accent-orange/10 border-accent-red/20'} border`}>
          <div className="flex items-center gap-2 mb-1">
            {totalPnL >= 0 ? <TrendingUp className="w-4 h-4 text-accent-emerald" /> : <TrendingDown className="w-4 h-4 text-accent-red" />}
            <span className="text-xs text-text-secondary">Total PnL</span>
          </div>
          <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}
          </p>
        </div>

        <div className={`p-4 rounded-lg bg-gradient-to-br ${totalPnLPercent >= 0 ? 'from-accent-emerald/10 to-accent-teal/10 border-accent-emerald/20' : 'from-accent-red/10 to-accent-orange/10 border-accent-red/20'} border`}>
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-4 h-4 text-accent-amber" />
            <span className="text-xs text-text-secondary">ROI</span>
          </div>
          <p className={`text-xl font-bold ${totalPnLPercent >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
            {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Holdings Breakdown</h4>
        <div className="space-y-2">
          {holdings.map((holding) => (
            <div 
              key={holding.symbol}
              className="group p-4 bg-surface-secondary/50 backdrop-blur-sm rounded-lg border border-border-color/30 hover:border-accent-cyan/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-purple flex items-center justify-center font-bold text-white text-sm">
                    {holding.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{holding.symbol}</p>
                    <p className="text-xs text-text-secondary">{holding.name}</p>
                  </div>
                </div>
                
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                  holding.pnlPercent >= 0 
                    ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30' 
                    : 'bg-accent-red/20 text-accent-red border border-accent-red/30'
                }`}>
                  {holding.pnlPercent >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span className="text-sm font-bold">
                    {holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-text-secondary mb-0.5">Quantity</p>
                  <p className="text-text-primary font-medium">{holding.quantity}</p>
                </div>
                <div>
                  <p className="text-text-secondary mb-0.5">Avg Price</p>
                  <p className="text-text-primary font-medium">${holding.avgBuyPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-text-secondary mb-0.5">Current</p>
                  <p className="text-text-primary font-medium">${holding.currentPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-text-secondary mb-0.5">Value</p>
                  <p className="text-text-primary font-medium">${holding.value.toLocaleString()}</p>
                </div>
              </div>

              {/* Allocation Bar */}
              <div className="mt-3 pt-3 border-t border-border-color/30">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-text-secondary">Portfolio Allocation</span>
                  <span className="text-xs font-medium text-text-primary">{holding.allocation.toFixed(2)}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-primary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent-cyan to-accent-blue"
                    style={{ width: `${holding.allocation}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendation */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-accent-purple/10 to-accent-pink/10 border border-accent-purple/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-accent-purple mb-1">AI Portfolio Insight</p>
            <p className="text-xs text-text-secondary">
              Your portfolio shows strong diversification with {holdings.length} assets. 
              Consider rebalancing to reduce BTC dominance from {holdings[0].allocation.toFixed(1)}% to maintain optimal risk distribution.
              {holdings.some(h => h.pnlPercent < 0) && ' Review underperforming positions for potential reallocation.'}
            </p>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-text-secondary text-center pt-2 border-t border-border-color/30">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  )
}

export function SpotPortfolio() {
  return (
    <ErrorBoundary>
      <SpotPortfolioContent />
    </ErrorBoundary>
  )
}

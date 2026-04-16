'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, CheckCircle } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'

interface PredictionMarket {
  id: string
  question: string
  category: string
  endDate: string
  totalVolume: number
  yesPrice: number
  noPrice: number
  participants: number
  aiRecommendation: 'YES' | 'NO' | 'NEUTRAL'
  aiConfidence: number
}

function generateMockMarkets(): PredictionMarket[] {
  return [
    {
      id: '1',
      question: 'Will Bitcoin reach $50,000 by end of Q2 2026?',
      category: 'Crypto',
      endDate: '2026-06-30',
      totalVolume: 125000,
      yesPrice: 0.67,
      noPrice: 0.33,
      participants: 1245,
      aiRecommendation: 'YES',
      aiConfidence: 72
    },
    {
      id: '2',
      question: 'Will Ethereum ETF get approved in 2026?',
      category: 'Crypto',
      endDate: '2026-12-31',
      totalVolume: 89000,
      yesPrice: 0.54,
      noPrice: 0.46,
      participants: 892,
      aiRecommendation: 'YES',
      aiConfidence: 65
    },
    {
      id: '3',
      question: 'Will SOL outperform ETH in H1 2026?',
      category: 'Crypto',
      endDate: '2026-06-30',
      totalVolume: 67000,
      yesPrice: 0.45,
      noPrice: 0.55,
      participants: 567,
      aiRecommendation: 'NO',
      aiConfidence: 58
    },
    {
      id: '4',
      question: 'Will total crypto market cap exceed $3T in 2026?',
      category: 'Crypto',
      endDate: '2026-12-31',
      totalVolume: 156000,
      yesPrice: 0.71,
      noPrice: 0.29,
      participants: 2145,
      aiRecommendation: 'YES',
      aiConfidence: 78
    }
  ]
}

function PredictionMarketContent() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMarkets(generateMockMarkets())
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <div className="animate-pulse h-96 bg-surface-secondary/50 rounded-lg" />
  }

  const getDaysRemaining = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="card-gradient space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-color/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-purple flex items-center justify-center shadow-lg shadow-accent-indigo/30">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold gradient-text-blue">Prediction Markets</h3>
            <p className="text-xs text-text-secondary">AI-powered crypto event trading via Polymarket</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-emerald/20 border border-accent-emerald/30">
          <CheckCircle className="w-3.5 h-3.5 text-accent-emerald" />
          <span className="text-xs font-medium text-accent-emerald">LIVE</span>
        </div>
      </div>

      {/* Markets Grid */}
      <div className="space-y-4">
        {markets.map((market) => {
          const daysRemaining = getDaysRemaining(market.endDate)
          const impliedProbYes = market.yesPrice * 100
          const aiMatch = market.aiRecommendation === 'YES' ? impliedProbYes > 50 : impliedProbYes < 50

          return (
            <div
              key={market.id}
              className="group p-4 bg-surface-secondary/50 backdrop-blur-sm rounded-lg border border-border-color/30 hover:border-accent-purple/30 transition-all duration-300 hover:shadow-lg"
            >
              {/* Question & Category */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-text-primary mb-1 group-hover:text-accent-cyan transition-colors">
                    {market.question}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
                      {market.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <Clock className="w-3 h-3" />
                      {daysRemaining} days left
                    </span>
                  </div>
                </div>
              </div>

              {/* Market Stats */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="p-2 rounded bg-surface-primary">
                  <p className="text-xs text-text-secondary mb-0.5">Volume</p>
                  <p className="text-sm font-semibold text-text-primary">
                    ${(market.totalVolume / 1000).toFixed(0)}k
                  </p>
                </div>
                <div className="p-2 rounded bg-surface-primary">
                  <p className="text-xs text-text-secondary mb-0.5">YES Price</p>
                  <p className="text-sm font-semibold text-accent-emerald">
                    ${market.yesPrice.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 rounded bg-surface-primary">
                  <p className="text-xs text-text-secondary mb-0.5">NO Price</p>
                  <p className="text-sm font-semibold text-accent-red">
                    ${market.noPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Probability Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-text-secondary">Market Probability</span>
                  <span className="text-xs font-medium text-text-primary">
                    {impliedProbYes.toFixed(0)}% YES / {(100 - impliedProbYes).toFixed(0)}% NO
                  </span>
                </div>
                <div className="w-full h-2 bg-accent-red/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-emerald transition-all duration-500"
                    style={{ width: `${impliedProbYes}%` }}
                  />
                </div>
              </div>

              {/* AI Recommendation */}
              <div className={`p-3 rounded-lg ${
                market.aiRecommendation === 'YES'
                  ? 'bg-accent-emerald/10 border border-accent-emerald/30'
                  : 'bg-accent-red/10 border border-accent-red/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${
                      market.aiRecommendation === 'YES'
                        ? 'bg-accent-emerald'
                        : 'bg-accent-red'
                    } flex items-center justify-center`}>
                      {market.aiRecommendation === 'YES' ? (
                        <TrendingUp className="w-4 h-4 text-white" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">AI Recommendation</p>
                      <p className={`text-sm font-bold ${
                        market.aiRecommendation === 'YES'
                          ? 'text-accent-emerald'
                          : 'text-accent-red'
                      }`}>
                        BET {market.aiRecommendation}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Confidence</p>
                    <p className="text-sm font-bold text-text-primary">{market.aiConfidence}%</p>
                  </div>
                </div>
                
                {aiMatch && (
                  <div className="mt-2 pt-2 border-t border-border-color/30">
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-accent-emerald" />
                      AI analysis aligns with market sentiment
                    </p>
                  </div>
                )}
              </div>

              {/* Participants */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-color/30">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Users className="w-3.5 h-3.5" />
                  {market.participants.toLocaleString()} participants
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent-purple to-accent-pink text-white text-xs font-medium hover:shadow-lg hover:shadow-accent-purple/30 transition-all">
                  Trade Now
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="text-xs text-text-secondary text-center pt-4 border-t border-border-color/50">
        <p>Powered by Polymarket • Updated in real-time</p>
      </div>
    </div>
  )
}

export function PredictionMarkets() {
  return (
    <ErrorBoundary>
      <PredictionMarketContent />
    </ErrorBoundary>
  )
}

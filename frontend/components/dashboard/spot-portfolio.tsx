'use client'

import { TrendingUp, Wallet, Link2, ExternalLink, Key } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'

function SpotPortfolioContent() {
  return (
    <div className="card-gradient space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border-color/50">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-lg shadow-accent-purple/30">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold gradient-text">Spot Portfolio</h3>
          <p className="text-xs text-text-secondary">Your live exchange holdings will appear here</p>
        </div>
      </div>

      {/* Connect Exchange CTA */}
      <div className="flex flex-col items-center justify-center py-10 gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-purple/20 to-accent-pink/20 border border-accent-purple/30 flex items-center justify-center">
          <Link2 className="w-9 h-9 text-accent-purple" />
        </div>

        <div className="text-center space-y-2">
          <h4 className="text-lg font-semibold text-text-primary">Connect Your Exchange</h4>
          <p className="text-sm text-text-secondary max-w-sm">
            Link your Binance, OKX, or Bybit account via read-only API keys to see your real spot
            holdings, PnL, and allocation in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-md">
          {[
            { name: 'Binance', url: 'https://www.binance.com/en/my/settings/api-management' },
            { name: 'OKX',     url: 'https://www.okx.com/account/my-api' },
            { name: 'Bybit',   url: 'https://www.bybit.com/app/user/api-management' },
          ].map(({ name, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/50 hover:border-accent-purple/50 text-sm text-text-primary font-medium transition-all hover:bg-surface-secondary"
            >
              <ExternalLink className="w-3.5 h-3.5 text-text-secondary" />
              {name}
            </a>
          ))}
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-accent-blue/10 border border-accent-blue/30 max-w-md w-full">
          <Key className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-accent-blue mb-1">Read-Only API Keys</p>
            <p className="text-xs text-text-secondary">
              Only enable <strong>Read</strong> permissions. Never share API keys with Withdraw or Trade
              permissions. Your funds always remain in your exchange account.
            </p>
          </div>
        </div>
      </div>

      {/* AI Portfolio Insight placeholder */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-accent-purple/10 to-accent-pink/10 border border-accent-purple/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-accent-purple mb-1">AI Portfolio Insight</p>
            <p className="text-xs text-text-secondary">
              Connect your exchange to receive real-time AI-driven portfolio insights, risk scoring,
              and rebalancing recommendations.
            </p>
          </div>
        </div>
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


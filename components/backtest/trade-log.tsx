'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

interface Trade {
  entryPrice: number
  exitPrice: number
  date: Date
  profit: number
  percentGain: number
}

export function TradeLog({ trades }: { trades: Trade[] }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Trades</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-color">
              <th className="text-left py-3 px-4 text-text-secondary font-medium">Date</th>
              <th className="text-right py-3 px-4 text-text-secondary font-medium">Entry Price</th>
              <th className="text-right py-3 px-4 text-text-secondary font-medium">Exit Price</th>
              <th className="text-center py-3 px-4 text-text-secondary font-medium">Direction</th>
              <th className="text-right py-3 px-4 text-text-secondary font-medium">Profit/Loss</th>
              <th className="text-right py-3 px-4 text-text-secondary font-medium">Return %</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <tr
                key={index}
                className="border-b border-border-color hover:bg-surface-secondary transition-colors"
              >
                <td className="py-3 px-4">
                  <span className="text-text-primary">
                    {trade.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-medium text-text-primary">
                  ${trade.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 text-right font-medium text-text-primary">
                  ${trade.exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {trade.profit > 0 ? (
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
                <td className={`py-3 px-4 text-right font-semibold ${trade.profit >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
                  {trade.profit >= 0 ? '+' : ''}${trade.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`py-3 px-4 text-right font-semibold ${trade.percentGain >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
                  {trade.percentGain >= 0 ? '+' : ''}{trade.percentGain.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

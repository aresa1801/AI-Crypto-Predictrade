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
    <div className="card-gradient">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-teal flex items-center justify-center shadow-lg shadow-accent-cyan/30">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold gradient-text-blue">Recent Trades</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-color/50">
              <th className="text-left py-3 px-4 text-text-secondary font-semibold">Date</th>
              <th className="text-right py-3 px-4 text-text-secondary font-semibold">Entry Price</th>
              <th className="text-right py-3 px-4 text-text-secondary font-semibold">Exit Price</th>
              <th className="text-center py-3 px-4 text-text-secondary font-semibold">Direction</th>
              <th className="text-right py-3 px-4 text-text-secondary font-semibold">Profit/Loss</th>
              <th className="text-right py-3 px-4 text-text-secondary font-semibold">Return %</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <tr
                key={index}
                className="border-b border-border-color/30 hover:bg-surface-secondary/50 transition-all duration-200"
              >
                <td className="py-3 px-4">
                  <span className="text-text-primary font-medium">
                    {trade.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-bold text-text-primary">
                  ${trade.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 text-right font-bold text-text-primary">
                  ${trade.exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 text-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    trade.profit > 0
                      ? 'bg-accent-emerald/20 border border-accent-emerald/30'
                      : 'bg-accent-red/20 border border-accent-red/30'
                  }`}>
                    {trade.profit > 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-accent-emerald" />
                        <span className="text-accent-emerald font-semibold">Long</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-accent-red" />
                        <span className="text-accent-red font-semibold">Short</span>
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

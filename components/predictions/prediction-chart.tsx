'use client'

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { priceChartData } from '@/lib/mock-data'
import { Prediction } from '@/lib/types'

export function PredictionChart({ asset, timeframe }: { asset: Prediction; timeframe: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{asset.asset.symbol} Price Analysis</h3>
        <p className="text-sm text-text-secondary">Current Price: ${asset.asset.price.toFixed(2)} | Predicted: ${asset.predictedPrice.toFixed(2)}</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={priceChartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-emerald)" stopOpacity={0.1} />
              <stop offset="95%" stopColor="var(--accent-emerald)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="time" stroke="var(--text-secondary)" />
          <YAxis stroke="var(--text-secondary)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
            formatter={(value: any) => `$${value.toFixed(2)}`}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="price"
            stroke="var(--accent-blue)"
            fill="url(#colorPrice)"
            dot={false}
            strokeWidth={2}
            name="Current Price"
          />
          <Line
            type="monotone"
            dataKey="sma20"
            stroke="var(--accent-emerald)"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={2}
            name="20-Day SMA"
          />
          <Line
            type="monotone"
            dataKey="bb_upper"
            stroke="var(--accent-amber)"
            strokeDasharray="3 3"
            dot={false}
            strokeWidth={1}
            name="Bollinger Upper"
          />
          <Line
            type="monotone"
            dataKey="bb_lower"
            stroke="var(--accent-amber)"
            strokeDasharray="3 3"
            dot={false}
            strokeWidth={1}
            name="Bollinger Lower"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border-color">
        <div>
          <p className="text-xs text-text-secondary mb-1">Current Price</p>
          <p className="text-lg font-semibold text-text-primary">${asset.asset.price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">24h Change</p>
          <p className={`text-lg font-semibold ${asset.asset.change24h >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
            {asset.asset.change24h >= 0 ? '+' : ''}{asset.asset.change24h.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Volume 24h</p>
          <p className="text-lg font-semibold text-text-primary">${(asset.asset.volume24h / 1e9).toFixed(1)}B</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Market Cap</p>
          <p className="text-lg font-semibold text-text-primary">${(asset.asset.marketCap / 1e9).toFixed(0)}B</p>
        </div>
      </div>
    </div>
  )
}

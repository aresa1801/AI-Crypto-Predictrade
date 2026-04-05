'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BacktestResult } from '@/lib/types'

export function BacktestChart({ data }: { data: BacktestResult }) {
  const chartData = data.equityPoints.map((point) => ({
    date: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: point.value,
  }))

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">Equity Curve</h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="date" stroke="var(--text-secondary)" />
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
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent-blue)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="Account Value"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="pt-4 border-t border-border-color flex justify-between text-sm">
        <div>
          <p className="text-text-secondary">Starting Capital</p>
          <p className="font-semibold text-text-primary">$10,000.00</p>
        </div>
        <div>
          <p className="text-text-secondary">Ending Capital</p>
          <p className="font-semibold text-accent-emerald">${data.equityPoints[data.equityPoints.length - 1].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-text-secondary">Total Return</p>
          <p className="font-semibold text-accent-emerald">{data.totalReturn.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  )
}

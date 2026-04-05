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
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
          <XAxis dataKey="date" stroke="#B0BAC9" />
          <YAxis stroke="#B0BAC9" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #2D3748',
              borderRadius: '8px',
              color: '#F5F7FA',
            }}
            formatter={(value: any) => `$${value.toFixed(2)}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3B82F6"
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

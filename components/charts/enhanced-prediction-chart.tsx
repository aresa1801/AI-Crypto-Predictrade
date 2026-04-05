'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Prediction } from '@/lib/types'
import { chartColors, getRegimeShiftMarkers, formatCurrency } from '@/lib/utils/chart-utils'
import { PredictionTooltip } from './custom-tooltip'

interface EnhancedPredictionChartProps {
  asset: Prediction
  data: Array<{ time: string; price: number; ci_low?: number; ci_high?: number; volume?: number; [key: string]: any }>
  modelVersion?: string
}

export function EnhancedPredictionChart({
  asset,
  data,
  modelVersion = '2.1',
}: EnhancedPredictionChartProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 400 })
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: 400,
        })
      }
    }

    handleResize()
    const resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  const regimeMarkers = getRegimeShiftMarkers(data)

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        No price data available
      </div>
    )
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {asset.asset.symbol} Price Analysis
        </h3>
        <p className="text-sm text-text-secondary">
          Current: {formatCurrency(asset.asset.price)} | Predicted: {formatCurrency(asset.predictedPrice)} | Confidence: {asset.confidenceLevel}%
        </p>
      </div>

      <ResponsiveContainer width="100%" height={containerSize.height}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.1} />
              <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
          <XAxis
            dataKey="time"
            stroke={chartColors.text}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke={chartColors.text}
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />

          <Tooltip
            content={({ active, payload, label }) => (
              <PredictionTooltip
                active={active}
                payload={payload}
                label={label}
                confidence={
                  payload?.[0]?.payload?.ci_low && payload[0].payload?.ci_high
                    ? {
                        low: payload[0].payload.ci_low,
                        high: payload[0].payload.ci_high,
                      }
                    : undefined
                }
                volume={payload?.[0]?.payload?.volume}
                modelVersion={modelVersion}
              />
            )}
          />

          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          {data[0]?.ci_low && data[0]?.ci_high && (
            <Area
              type="monotone"
              dataKey="ci_low"
              stackId="1"
              stroke="none"
              fill={chartColors.primary}
              fillOpacity={0.1}
              isAnimationActive={false}
              name="Confidence Interval"
            />
          )}

          <Area
            type="monotone"
            dataKey="price"
            stroke={chartColors.primary}
            fill="url(#priceGradient)"
            dot={false}
            strokeWidth={2.5}
            name="Current Price"
            isAnimationActive={false}
          />

          {data[0]?.sma20 && (
            <Line
              type="monotone"
              dataKey="sma20"
              stroke={chartColors.success}
              strokeDasharray="5 5"
              dot={false}
              strokeWidth={1.5}
              name="20-Day SMA"
              isAnimationActive={false}
            />
          )}

          {data[0]?.bb_upper && (
            <Line
              type="monotone"
              dataKey="bb_upper"
              stroke={chartColors.warning}
              strokeDasharray="3 3"
              dot={false}
              strokeWidth={1}
              name="Bollinger Upper"
              isAnimationActive={false}
            />
          )}

          {data[0]?.bb_lower && (
            <Line
              type="monotone"
              dataKey="bb_lower"
              stroke={chartColors.warning}
              strokeDasharray="3 3"
              dot={false}
              strokeWidth={1}
              name="Bollinger Lower"
              isAnimationActive={false}
            />
          )}

          {regimeMarkers.map((marker, idx) => {
            const regimeColors = {
              bull: chartColors.success,
              bear: chartColors.danger,
              chop: chartColors.warning,
            }
            return (
              <ReferenceLine
                key={idx}
                x={marker.x}
                stroke={regimeColors[marker.label]}
                strokeDasharray="2 2"
                strokeOpacity={0.5}
                label={{
                  value: marker.label.toUpperCase(),
                  position: 'top',
                  fill: regimeColors[marker.label],
                  fontSize: 10,
                }}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border-color text-sm">
        <div>
          <p className="text-xs text-text-secondary mb-1">Current Price</p>
          <p className="font-semibold text-text-primary">{formatCurrency(asset.asset.price)}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">24h Change</p>
          <p className={`font-semibold ${asset.asset.change24h >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
            {asset.asset.change24h >= 0 ? '+' : ''}{asset.asset.change24h.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Volume 24h</p>
          <p className="font-semibold text-text-primary">${(asset.asset.volume24h / 1e9).toFixed(1)}B</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Market Cap</p>
          <p className="font-semibold text-text-primary">${(asset.asset.marketCap / 1e9).toFixed(0)}B</p>
        </div>
      </div>
    </div>
  )
}

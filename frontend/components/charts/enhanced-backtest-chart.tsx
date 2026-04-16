'use client'

import { useLayoutEffect, useRef, useState, useMemo, memo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { chartColors, numberFormatter } from '@/lib/utils/chart-utils'
import { SimpleTooltip } from './custom-tooltip'

interface EnhancedBacktestChartProps {
  data: Array<{
    date: string
    value: number
    [key: string]: any
  }>
  title?: string
}

function EnhancedBacktestChartComponent({
  data,
  title = 'Equity Curve',
}: EnhancedBacktestChartProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 300 })
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: 300,
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

  // Memoize calculations to avoid re-computing on every render
  const { minValue, maxValue, padding, sampledData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { minValue: 0, maxValue: 0, padding: 0, sampledData: [] }
    }
    
    // Sample data if too many points (> 100) for better performance
    const sampledData = data.length > 100 
      ? data.filter((_, i) => i % Math.ceil(data.length / 100) === 0)
      : data
    
    const minValue = Math.min(...sampledData.map((d) => d.value))
    const maxValue = Math.max(...sampledData.map((d) => d.value))
    const range = maxValue - minValue
    const padding = range * 0.1
    
    return { minValue, maxValue, padding, sampledData }
  }, [data])

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        No backtest data available
      </div>
    )
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      <h4 className="text-sm font-medium text-text-primary">{title}</h4>

      <ResponsiveContainer width="100%" height={containerSize.height}>
        <LineChart
          data={sampledData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
          <XAxis
            dataKey="date"
            stroke={chartColors.text}
            style={{ fontSize: '12px' }}
            interval={Math.floor(sampledData.length / 6)}
          />
          <YAxis
            stroke={chartColors.text}
            style={{ fontSize: '12px' }}
            domain={[minValue - padding, maxValue + padding]}
            tickFormatter={(value) => `$${numberFormatter.format(value)}`}
          />
          <Tooltip
            content={({ active, payload, label }) => (
              <SimpleTooltip
                active={active}
                payload={payload?.map((p) => ({
                  ...p,
                  value:
                    typeof p.value === 'number'
                      ? numberFormatter.format(p.value)
                      : p.value,
                }))}
                label={label}
              />
            )}
            cursor={{ stroke: chartColors.border, strokeDasharray: '3 3' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
            height={30}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={chartColors.primary}
            dot={false}
            strokeWidth={2}
            name="Account Value"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const EnhancedBacktestChart = memo(EnhancedBacktestChartComponent)

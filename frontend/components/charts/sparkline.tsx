'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { chartColors } from '@/lib/utils/chart-utils'

interface SparklineProps {
  data: Array<{ value: number; [key: string]: any }>
  dataKey?: string
  color?: 'success' | 'danger' | 'primary' | 'warning'
  height?: number
  width?: number
}

export function Sparkline({
  data,
  dataKey = 'value',
  color = 'primary',
  height = 30,
  width = 80,
}: SparklineProps) {
  const [containerWidth, setContainerWidth] = useState(width)
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    handleResize()
    const resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  const colorMap: Record<string, string> = {
    success: chartColors.success,
    danger: chartColors.danger,
    primary: chartColors.primary,
    warning: chartColors.warning,
  }

  const lineColor = colorMap[color] || chartColors.primary

  if (!data || data.length === 0) {
    return <div style={{ width, height }} className="bg-surface-secondary rounded" />
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={lineColor}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

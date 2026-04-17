'use client'

import { useState, useEffect } from 'react'
import { Prediction } from '@/lib/types'
import { fetchHistoricalPriceData } from '@/lib/api/coingecko'
import { EnhancedPredictionChart } from '@/components/charts/enhanced-prediction-chart'

type ChartDataPoint = { time: string; price: number; ci_low?: number; ci_high?: number }

export function PredictionChart({ asset, timeframe }: { asset: Prediction; timeframe: string }) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const daysMap: Record<string, number> = { '1h': 1, '4h': 2, '1d': 7, '1w': 14 }
        const days = daysMap[timeframe] ?? 7
        const history = await fetchHistoricalPriceData(asset.asset.id, days)

        const mapped: ChartDataPoint[] = history.map(({ date, price }) => ({
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          price,
          ci_low:  price * 0.97,
          ci_high: price * 1.03,
        }))
        setChartData(mapped)
      } catch {
        setChartData([{
          time: new Date().toLocaleDateString(),
          price: asset.currentPrice,
        }])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [asset.asset.id, asset.currentPrice, timeframe])

  if (loading) {
    return <div className="animate-pulse h-64 bg-surface-secondary/50 rounded-lg" />
  }

  return (
    <EnhancedPredictionChart
      asset={asset}
      data={chartData}
      modelVersion="2.1"
    />
  )
}


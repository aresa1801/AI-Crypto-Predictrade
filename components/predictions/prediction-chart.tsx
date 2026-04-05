'use client'

import { priceChartData } from '@/lib/mock-data'
import { Prediction } from '@/lib/types'
import { EnhancedPredictionChart } from '@/components/charts/enhanced-prediction-chart'

export function PredictionChart({ asset, timeframe }: { asset: Prediction; timeframe: string }) {
  return (
    <EnhancedPredictionChart
      asset={asset}
      data={priceChartData}
      modelVersion="2.1"
    />
  )
}

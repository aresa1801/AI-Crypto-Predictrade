'use client'

import { useState } from 'react'
import { PredictionChart } from '@/components/predictions/prediction-chart'
import { PredictionFilters } from '@/components/predictions/prediction-filters'
import { predictions } from '@/lib/mock-data'

export default function PredictionsPage() {
  const [selectedAsset, setSelectedAsset] = useState(predictions[0])
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d' | '1w'>('1d')

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-text-primary">AI Predictions</h1>
        <p className="text-text-secondary">Detailed analysis and price predictions with confidence bands</p>
      </div>

      {/* Filters */}
      <div className="card">
        <PredictionFilters
          selectedAsset={selectedAsset}
          onAssetChange={setSelectedAsset}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />
      </div>

      {/* Chart */}
      <div className="card">
        <PredictionChart asset={selectedAsset} timeframe={timeframe} />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Confidence Level</h3>
          <p className="text-3xl font-bold text-accent-blue">{selectedAsset.confidenceLevel ?? selectedAsset.confidence}%</p>
          <p className="text-xs text-text-secondary mt-2">High confidence prediction</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Expected Value</h3>
          <p className={`text-3xl font-bold ${(selectedAsset.expectedValue ?? 0) >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
            ${(selectedAsset.expectedValue ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-2">Per trade</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Risk/Reward Ratio</h3>
          <p className="text-3xl font-bold text-accent-emerald">{(selectedAsset.riskReward ?? 0).toFixed(2)}:1</p>
          <p className="text-xs text-text-secondary mt-2">Favorable ratio</p>
        </div>
      </div>
    </div>
  )
}

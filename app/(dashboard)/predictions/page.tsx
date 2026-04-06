'use client'

import { useState } from 'react'
import { PredictionChart } from '@/components/predictions/prediction-chart'
import { PredictionFilters } from '@/components/predictions/prediction-filters'
import { predictions as mockPredictions } from '@/lib/mock/data'
import { Prediction } from '@/lib/types'

export default function PredictionsPage() {
  const [selectedAsset, setSelectedAsset] = useState<Prediction>(mockPredictions[0])
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d'>('1d')

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Predictions</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Detailed price analysis with technical indicators and confidence bands
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <PredictionFilters onAssetChange={setSelectedAsset} onTimeframeChange={setTimeframe} />
      </div>

      {/* Chart */}
      <div className="card">
        <PredictionChart asset={selectedAsset} timeframe={timeframe} />
      </div>

      {/* Prediction Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs text-text-secondary mb-2">Confidence Level</p>
          <p className="text-2xl font-bold text-accent-blue">{selectedAsset.confidenceLevel}%</p>
        </div>
        <div className="card">
          <p className="text-xs text-text-secondary mb-2">Target Price</p>
          <p className="text-2xl font-bold text-text-primary">
            ${selectedAsset.predictedPrice.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-text-secondary mb-2">Direction</p>
          <p className={`text-2xl font-bold ${selectedAsset.predictedDirection === 'up' ? 'text-accent-emerald' : 'text-accent-red'}`}>
            {selectedAsset.predictedDirection === 'up' ? '↑ LONG' : '↓ SHORT'}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-text-secondary mb-2">Risk/Reward Ratio</p>
          <p className="text-2xl font-bold text-text-primary">{selectedAsset.riskReward.toFixed(2)}x</p>
        </div>
      </div>
    </div>
  )
}

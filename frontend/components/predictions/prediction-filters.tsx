'use client'

import { Prediction } from '@/lib/types'

interface PredictionFiltersProps {
  predictions: Prediction[]
  selectedAsset: Prediction
  onAssetChange: (asset: Prediction) => void
  timeframe: '1h' | '4h' | '1d' | '1w'
  onTimeframeChange: (tf: '1h' | '4h' | '1d' | '1w') => void
}

export function PredictionFilters({
  predictions,
  selectedAsset,
  onAssetChange,
  timeframe,
  onTimeframeChange,
}: PredictionFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex-1">
        <label className="block text-sm font-medium text-text-secondary mb-2">Select Asset</label>
        <select
          value={selectedAsset.id}
          onChange={(e) => {
            const pred = predictions.find((p) => p.id === e.target.value)
            if (pred) onAssetChange(pred)
          }}
          className="w-full px-4 py-2 rounded-lg bg-surface-secondary border border-border-color text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
        >
          {predictions.map((pred) => (
            <option key={pred.id} value={pred.id}>
              {pred.asset.symbol} - {pred.asset.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Timeframe</label>
        <div className="flex gap-2">
          {(['1h', '4h', '1d', '1w'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-accent-blue text-white'
                  : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


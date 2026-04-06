'use client'

import { predictions, cryptoAssets } from '@/lib/mock-data'
import { Prediction } from '@/lib/types'

interface PredictionFiltersProps {
  onAssetChange: (asset: Prediction) => void
  onTimeframeChange: (tf: '1h' | '4h' | '1d') => void
}

export function PredictionFilters({
  onAssetChange,
  onTimeframeChange,
}: PredictionFiltersProps) {
  const selectedAsset = predictions[0]
  const timeframe = '1d' as const
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
          className="w-full px-4 py-2 rounded-lg bg-surface-secondary border border-border-color text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-1 focus:ring-offset-surface-secondary"
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
          {(['1h', '4h', '1d'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-1 focus:ring-offset-surface-secondary ${
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

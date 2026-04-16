'use client'

import { useState } from 'react'
import { PredictionChart } from '@/components/predictions/prediction-chart'
import { PredictionFilters } from '@/components/predictions/prediction-filters'
import { predictions } from '@/lib/mock-data'
import { TrendingUp, Target, Zap, Award } from 'lucide-react'

export default function PredictionsPage() {
  const [selectedAsset, setSelectedAsset] = useState(predictions[0])
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d' | '1w'>('1d')

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header with gradient */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-lg shadow-accent-blue/30">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold gradient-text-blue">AI Predictions</h1>
            <p className="text-sm lg:text-base text-text-secondary">Detailed analysis and price predictions with confidence bands</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-gradient">
        <PredictionFilters
          selectedAsset={selectedAsset}
          onAssetChange={setSelectedAsset}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
        />
      </div>

      {/* Chart */}
      <div className="card-gradient">
        <PredictionChart asset={selectedAsset} timeframe={timeframe} />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="card-gradient group hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center shadow-lg group-hover:shadow-accent-cyan/50 transition-shadow duration-300">
              <Award className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-text-secondary">Confidence Level</h3>
          </div>
          <p className="text-4xl font-bold gradient-text-blue mb-2">{selectedAsset.confidenceLevel ?? selectedAsset.confidence}%</p>
          <div className="w-full bg-surface-secondary/50 rounded-full h-2 border border-border-color/30 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-accent-cyan to-accent-blue rounded-full transition-all duration-500"
              style={{ width: `${selectedAsset.confidenceLevel ?? selectedAsset.confidence}%` }}
            />
          </div>
          <p className="text-xs text-accent-cyan mt-3 font-medium">High confidence prediction</p>
        </div>
        
        <div className="card-gradient group hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-shadow duration-300 ${
              (selectedAsset.expectedValue ?? 0) >= 0 
                ? 'bg-gradient-to-br from-accent-emerald to-accent-teal group-hover:shadow-accent-emerald/50' 
                : 'bg-gradient-to-br from-accent-red to-accent-pink group-hover:shadow-accent-red/50'
            }`}>
              <Target className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-text-secondary">Expected Value</h3>
          </div>
          <p className={`text-4xl font-bold mb-2 ${(selectedAsset.expectedValue ?? 0) >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
            {(selectedAsset.expectedValue ?? 0) >= 0 ? '+' : ''}${(selectedAsset.expectedValue ?? 0).toFixed(2)}
          </p>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-lg ${
              (selectedAsset.expectedValue ?? 0) >= 0
                ? 'bg-accent-emerald/20 border border-accent-emerald/30'
                : 'bg-accent-red/20 border border-accent-red/30'
            }`}>
              <span className={`text-xs font-medium ${(selectedAsset.expectedValue ?? 0) >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
                Per trade
              </span>
            </div>
          </div>
        </div>
        
        <div className="card-gradient group hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-lg group-hover:shadow-accent-purple/50 transition-shadow duration-300">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-text-secondary">Risk/Reward Ratio</h3>
          </div>
          <p className="text-4xl font-bold gradient-text mb-2">{(selectedAsset.riskReward ?? 0).toFixed(2)}:1</p>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-accent-emerald/20 border border-accent-emerald/30">
              <span className="text-xs font-medium text-accent-emerald">Favorable ratio</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

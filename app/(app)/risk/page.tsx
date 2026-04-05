'use client'

import { useState } from 'react'
import { RiskSimulatorForm } from '@/components/risk/risk-simulator-form'
import { RiskResults } from '@/components/risk/risk-results'

export interface RiskSimulationParams {
  initialCapital: number
  riskPerTrade: number
  winRate: number
  avgWin: number
  avgLoss: number
  numTrades: number
}

export default function RiskPage() {
  const [params, setParams] = useState<RiskSimulationParams>({
    initialCapital: 10000,
    riskPerTrade: 2,
    winRate: 60,
    avgWin: 1.5,
    avgLoss: 1.0,
    numTrades: 100,
  })

  const [results, setResults] = useState<any>(null)

  const handleSimulate = (newParams: RiskSimulationParams) => {
    setParams(newParams)
    // Calculate results
    const riskAmount = (newParams.initialCapital * newParams.riskPerTrade) / 100
    const expectedValue = (newParams.winRate / 100) * newParams.avgWin - (1 - newParams.winRate / 100) * newParams.avgLoss
    const expectedProfit = expectedValue * newParams.numTrades * riskAmount
    const finalCapital = newParams.initialCapital + expectedProfit

    setResults({
      riskPerTrade: riskAmount,
      expectedValue: expectedValue * riskAmount,
      expectedProfit: expectedProfit,
      finalCapital: finalCapital,
      roi: ((finalCapital - newParams.initialCapital) / newParams.initialCapital) * 100,
    })
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-text-primary">Risk Simulator</h1>
        <p className="text-text-secondary">Monte Carlo simulation for position sizing and drawdown analysis</p>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card">
          <RiskSimulatorForm initialParams={params} onSimulate={handleSimulate} />
        </div>

        {/* Results */}
        {results && (
          <div>
            <RiskResults results={results} params={params} />
          </div>
        )}
      </div>
    </div>
  )
}

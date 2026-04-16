'use client'

import { ScenarioSimulator } from '@/components/risk/scenario-simulator'

export default function RiskPage() {
  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Risk & Scenario Simulator</h1>
        <p className="text-sm lg:text-base text-text-secondary">
          Interactive analysis of trading scenarios with real-time probability distributions and position sizing
        </p>
      </div>

      {/* Simulator */}
      <ScenarioSimulator />
    </div>
  )
}

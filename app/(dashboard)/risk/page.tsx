'use client'

import { ScenarioSimulator } from '@/components/risk/scenario-simulator'

export default function RiskPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Risk & Scenario Simulator</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Interactive analysis of trading scenarios with real-time probability distributions and position sizing
        </p>
      </div>

      {/* Simulator */}
      <ScenarioSimulator />
    </div>
  )
}

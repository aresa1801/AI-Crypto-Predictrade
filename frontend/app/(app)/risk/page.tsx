'use client'

import { ScenarioSimulator } from '@/components/risk/scenario-simulator'
import { Calculator, Shield } from 'lucide-react'

export default function RiskPage() {
  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header with gradient */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-indigo to-accent-purple flex items-center justify-center shadow-lg shadow-accent-indigo/30">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Risk & Scenario Simulator</h1>
            <p className="text-sm lg:text-base text-text-secondary">
              Interactive analysis of trading scenarios with real-time probability distributions and position sizing
            </p>
          </div>
        </div>
        
        {/* Quick Info Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-accent-amber/10 to-accent-orange/10 border border-accent-amber/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-accent-amber flex-shrink-0" />
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-accent-amber">Risk Management:</span> Adjust parameters to simulate different market scenarios and optimize your position sizing
            </p>
          </div>
        </div>
      </div>

      {/* Simulator */}
      <ScenarioSimulator />
    </div>
  )
}

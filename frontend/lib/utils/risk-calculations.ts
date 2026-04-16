interface RiskInput {
  volatilityMultiplier: number
  volumeSpike: number
  macroShockLevel: 'low' | 'medium' | 'high'
  baseWinRate: number
  baseExpectedValue: number
  avgWin: number
  avgLoss: number
  numTrades: number
}

interface RiskResult {
  probabilityDistribution: {
    mean: number
    stdDev: number
    confidence95: [number, number]
  }
  expectedValue: number
  kellyPercent: number
  maxDrawdownEstimate: number
  riskAdjustedReturn: number
}

const macroShockMultipliers = {
  low: 1.0,
  medium: 1.5,
  high: 2.5,
}

export function assessRisk(input: RiskInput): RiskResult {
  const {
    volatilityMultiplier,
    volumeSpike,
    macroShockLevel,
    baseWinRate,
    baseExpectedValue,
    avgWin,
    avgLoss,
    numTrades,
  } = input

  const macroMultiplier = macroShockMultipliers[macroShockLevel]
  
  // Adjust win rate based on market conditions
  const volatilityImpact = (volatilityMultiplier - 1) * 5
  const volumeImpact = (volumeSpike / 100) * 2
  const adjustedWinRate = Math.max(0, Math.min(100, baseWinRate - volatilityImpact + volumeImpact))
  
  // Calculate expected value
  const winProb = adjustedWinRate / 100
  const lossProb = 1 - winProb
  const expectedValue = (winProb * avgWin) - (lossProb * avgLoss)
  
  // Calculate Kelly percentage
  const kellyPercent = Math.max(0, ((winProb * (avgWin / avgLoss) - lossProb) / (avgWin / avgLoss)) * 100)
  
  // Calculate probability distribution
  const mean = expectedValue * numTrades
  const baseStdDev = Math.sqrt(numTrades * winProb * lossProb) * (avgWin + avgLoss)
  const stdDev = baseStdDev * volatilityMultiplier * macroMultiplier
  
  const confidence95Low = mean - (1.96 * stdDev)
  const confidence95High = mean + (1.96 * stdDev)
  
  // Estimate max drawdown
  const maxDrawdownEstimate = Math.min(100, 
    (stdDev * 2 * volatilityMultiplier * macroMultiplier) / Math.max(1, mean) * 100
  )
  
  // Calculate risk-adjusted return
  const riskAdjustedReturn = maxDrawdownEstimate > 0 
    ? mean / maxDrawdownEstimate 
    : mean

  return {
    probabilityDistribution: {
      mean,
      stdDev,
      confidence95: [confidence95Low, confidence95High],
    },
    expectedValue,
    kellyPercent,
    maxDrawdownEstimate,
    riskAdjustedReturn,
  }
}

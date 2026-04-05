import { NormalDistribution } from '@/lib/types'

interface RiskScenarioParams {
  volatilityMultiplier: number
  volumeSpike: number
  macroShockLevel: 'low' | 'medium' | 'high'
  baseWinRate: number
  baseExpectedValue: number
}

interface RiskResults {
  probabilityDistribution: NormalDistribution
  expectedValue: number
  kellyPercent: number
  maxDrawdownEstimate: number
  riskAdjustedReturn: number
  confidenceInterval: [number, number]
}

const macroShockFactors = {
  low: 1.0,
  medium: 1.25,
  high: 1.6,
}

/**
 * Calculate probability distribution under scenario
 */
export function calculateProbabilityDistribution(params: RiskScenarioParams): NormalDistribution {
  const volatilityAdjustment = params.volatilityMultiplier
  const macroFactor = macroShockFactors[params.macroShockLevel]
  
  const adjustedVolatility = 15 * volatilityAdjustment * macroFactor
  const mean = params.baseExpectedValue * (1 + params.volumeSpike / 100)
  const stdDev = adjustedVolatility

  return {
    mean,
    stdDev,
    confidence95: [mean - 1.96 * stdDev, mean + 1.96 * stdDev],
  }
}

/**
 * Kelly Criterion: optimal position sizing
 * f* = (bp - q) / b, where:
 * b = odds, p = win probability, q = loss probability
 */
export function calculateKellyPercent(winRate: number, avgWin: number, avgLoss: number): number {
  const p = winRate / 100
  const q = 1 - p
  const b = avgWin / avgLoss

  const kelly = (b * p - q) / b
  const safeFraction = Math.max(0, Math.min(kelly, 0.25)) * 100

  return safeFraction
}

/**
 * Expected value calculation with scenario adjustments
 */
export function calculateExpectedValue(
  baseWinRate: number,
  baseExpectedValue: number,
  volumeSpike: number,
  volatilityMultiplier: number,
  macroShockLevel: 'low' | 'medium' | 'high'
): number {
  const macroFactor = macroShockFactors[macroShockLevel]
  const volumeAdjustment = 1 + volumeSpike / 100
  const volatilityPenalty = 1 - (volatilityMultiplier - 1) * 0.1

  return baseExpectedValue * volumeAdjustment * volatilityPenalty / macroFactor
}

/**
 * Maximum drawdown estimate using Monte Carlo approach
 */
export function estimateMaxDrawdown(
  volatility: number,
  sharpeRatio: number = 1.0,
  numTrades: number = 100
): number {
  const z = Math.sqrt(numTrades)
  const volatilityAdjusted = volatility / 100
  const maxDD = -sharpeRatio * volatilityAdjusted * z

  return Math.max(-50, Math.min(-1, maxDD * 100))
}

/**
 * Confidence interval at 95% confidence level
 */
export function calculateConfidenceInterval(mean: number, stdDev: number): [number, number] {
  return [
    mean - 1.96 * stdDev,
    mean + 1.96 * stdDev,
  ]
}

/**
 * Full risk assessment
 */
export function assessRisk(params: RiskScenarioParams & { avgWin: number; avgLoss: number; numTrades: number }): RiskResults {
  const distribution = calculateProbabilityDistribution(params)
  const expectedValue = calculateExpectedValue(
    params.baseWinRate,
    params.baseExpectedValue,
    params.volumeSpike,
    params.volatilityMultiplier,
    params.macroShockLevel
  )
  const kellyPercent = calculateKellyPercent(params.baseWinRate, params.avgWin, params.avgLoss)
  const maxDrawdown = estimateMaxDrawdown(
    distribution.stdDev * params.volatilityMultiplier,
    expectedValue,
    params.numTrades
  )
  const riskAdjustedReturn = expectedValue / (Math.abs(maxDrawdown) || 1)

  return {
    probabilityDistribution: distribution,
    expectedValue,
    kellyPercent,
    maxDrawdownEstimate: maxDrawdown,
    riskAdjustedReturn,
    confidenceInterval: distribution.confidence95,
  }
}

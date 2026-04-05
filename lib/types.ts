export interface CryptoAsset {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h: number
  marketCap: number
}

export interface Prediction {
  id: string
  asset: CryptoAsset
  confidenceLevel: number // 0-100
  predictedDirection: 'up' | 'down'
  predictedPrice: number
  timeframe: '1h' | '4h' | '1d' | '1w'
  expectedValue: number
  riskReward: number
  createdAt: Date
  expiresAt: Date
  status: 'active' | 'expired' | 'correct' | 'incorrect'
}

export interface MarketSnapshot {
  timestamp: Date
  btcPrice: number
  ethPrice: number
  totalMarketCap: number
  btcDominance: number
  volatilityIndex: number
}

export interface RiskScenario {
  drawdown: number
  winRate: number
  expectedValue: number
  sharpeRatio: number
  maxLoss: number
}

export interface BacktestResult {
  strategyName: string
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  profitFactor: number
  maxDrawdown: number
  sharpeRatio: number
  totalReturn: number
  equityPoints: Array<{ date: Date; value: number }>
  trades: Array<{
    entryPrice: number
    exitPrice: number
    date: Date
    profit: number
    percentGain: number
  }>
}

export interface UserSettings {
  apiKey?: string
  modelPreference: 'fast' | 'balanced' | 'accurate'
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  notificationsEnabled: boolean
  theme: 'dark' | 'light'
}

export interface NormalDistribution {
  mean: number
  stdDev: number
  confidence95: [number, number]
}

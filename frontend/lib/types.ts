export interface CryptoAsset {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h?: number
  marketCap?: number
}

export interface MarketSnapshot {
  totalMarketCap: number
  btcDominance: number
  volatilityIndex: number
  timestamp?: Date
}

export interface Prediction {
  id: string
  asset: CryptoAsset
  direction: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  targetPrice: number
  currentPrice: number
  timeframe: '1h' | '4h' | '1d' | '1w'
  timestamp: Date
  modelVersion?: string
}

export interface Trade {
  entryPrice: number
  exitPrice: number
  date: Date
  profit: number
  percentGain: number
}

export interface EquityPoint {
  date: Date
  value: number
}

export interface BacktestResult {
  strategyName: string
  totalTrades: number
  winRate: number
  profitFactor: number
  sharpeRatio: number
  maxDrawdown: number
  totalReturn: number
  equityPoints: EquityPoint[]
  trades: Trade[]
}

export interface PriceChartDataPoint {
  date: string
  price: number
  predicted?: number
  volume?: number
  confidenceLow?: number
  confidenceHigh?: number
}

import { CryptoAsset, Prediction, MarketSnapshot, BacktestResult } from '../types'

// ==================== CRYPTO ASSETS ====================
export const cryptoAssets: CryptoAsset[] = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 45230.50,
    change24h: 2.34,
    volume24h: 28500000000,
    marketCap: 890000000000,
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 2456.80,
    change24h: 1.87,
    volume24h: 15200000000,
    marketCap: 295000000000,
  },
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    price: 98.45,
    change24h: 3.21,
    volume24h: 2100000000,
    marketCap: 42000000000,
  },
  {
    id: 'xrp',
    symbol: 'XRP',
    name: 'Ripple',
    price: 2.34,
    change24h: -0.45,
    volume24h: 1800000000,
    marketCap: 128000000000,
  },
  {
    id: 'bnb',
    symbol: 'BNB',
    name: 'Binance Coin',
    price: 612.50,
    change24h: 1.56,
    volume24h: 2500000000,
    marketCap: 94000000000,
  },
]

// ==================== PREDICTIONS ====================
export const predictions: Prediction[] = [
  {
    id: 'pred-1',
    asset: cryptoAssets[0],
    confidenceLevel: 78,
    predictedDirection: 'up',
    predictedPrice: 47500,
    timeframe: '1d',
    expectedValue: 2270,
    riskReward: 2.1,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000),
    status: 'active',
  },
  {
    id: 'pred-2',
    asset: cryptoAssets[1],
    confidenceLevel: 65,
    predictedDirection: 'up',
    predictedPrice: 2650,
    timeframe: '4h',
    expectedValue: 193.60,
    riskReward: 1.8,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    status: 'active',
  },
  {
    id: 'pred-3',
    asset: cryptoAssets[2],
    confidenceLevel: 72,
    predictedDirection: 'down',
    predictedPrice: 92.30,
    timeframe: '1h',
    expectedValue: -6.15,
    riskReward: 1.5,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    status: 'active',
  },
  {
    id: 'pred-4',
    asset: cryptoAssets[3],
    confidenceLevel: 58,
    predictedDirection: 'up',
    predictedPrice: 2.50,
    timeframe: '1d',
    expectedValue: 0.16,
    riskReward: 1.3,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000),
    status: 'active',
  },
  {
    id: 'pred-5',
    asset: cryptoAssets[4],
    confidenceLevel: 82,
    predictedDirection: 'up',
    predictedPrice: 650,
    timeframe: '1d',
    expectedValue: 37.50,
    riskReward: 2.3,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
    status: 'active',
  },
]

// ==================== MARKET SNAPSHOT ====================
export const marketSnapshot: MarketSnapshot = {
  timestamp: new Date(),
  btcPrice: 45230.50,
  ethPrice: 2456.80,
  totalMarketCap: 1850000000000,
  btcDominance: 48.2,
  volatilityIndex: 32.5,
}

// ==================== BACKTEST RESULTS ====================
function generateEquityCurve() {
  const points = []
  let equity = 10000
  for (let i = 0; i <= 100; i++) {
    const dailyReturn = (Math.random() - 0.48) * 0.02
    equity = equity * (1 + dailyReturn)
    points.push({
      date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
      value: Math.round(equity * 100) / 100,
    })
  }
  return points
}

export const backtestData: BacktestResult = {
  strategyName: 'AI Momentum + RSI',
  totalTrades: 156,
  wins: 98,
  losses: 58,
  winRate: 62.82,
  profitFactor: 2.14,
  maxDrawdown: -12.34,
  sharpeRatio: 1.87,
  totalReturn: 124.56,
  equityPoints: generateEquityCurve(),
  trades: [
    {
      entryPrice: 43000,
      exitPrice: 44500,
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      profit: 1500,
      percentGain: 3.49,
    },
    {
      entryPrice: 44800,
      exitPrice: 43200,
      date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      profit: -1600,
      percentGain: -3.57,
    },
    {
      entryPrice: 42500,
      exitPrice: 45200,
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      profit: 2700,
      percentGain: 6.35,
    },
  ],
}

// ==================== PRICE CHART DATA ====================
export interface PriceChartPoint {
  time: string
  price: number
  sma20: number
  bb_upper: number
  bb_lower: number
}

export const priceChartData: PriceChartPoint[] = [
  { time: '00:00', price: 45000, sma20: 44800, bb_upper: 46200, bb_lower: 43800 },
  { time: '04:00', price: 45100, sma20: 44850, bb_upper: 46250, bb_lower: 43850 },
  { time: '08:00', price: 45300, sma20: 44950, bb_upper: 46350, bb_lower: 43950 },
  { time: '12:00', price: 45150, sma20: 44900, bb_upper: 46300, bb_lower: 43900 },
  { time: '16:00', price: 45400, sma20: 45050, bb_upper: 46450, bb_lower: 44050 },
  { time: '20:00', price: 45250, sma20: 45000, bb_upper: 46400, bb_lower: 44000 },
  { time: '24:00', price: 45230, sma20: 44950, bb_upper: 46350, bb_lower: 43950 },
]

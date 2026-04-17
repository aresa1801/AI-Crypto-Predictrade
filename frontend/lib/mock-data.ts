import { CryptoAsset, Prediction, MarketSnapshot, BacktestResult, PriceChartDataPoint } from '@/lib/types'

export const cryptoAssets: CryptoAsset[] = [
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin', price: 67890.50, change24h: 2.34, volume24h: 28500000000, marketCap: 1330000000000 },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', price: 3456.78, change24h: -1.23, volume24h: 15200000000, marketCap: 415000000000 },
  { id: 'sol', symbol: 'SOL', name: 'Solana', price: 178.90, change24h: 5.67, volume24h: 3800000000, marketCap: 78000000000 },
  { id: 'bnb', symbol: 'BNB', name: 'BNB', price: 612.34, change24h: 0.89, volume24h: 1200000000, marketCap: 94000000000 },
  { id: 'xrp', symbol: 'XRP', name: 'XRP', price: 0.5234, change24h: -0.45, volume24h: 890000000, marketCap: 28000000000 },
]

export const marketSnapshot: MarketSnapshot = {
  totalMarketCap: 2.65e12,
  btcDominance: 52.4,
  volatilityIndex: 24.5,
  timestamp: new Date(),
}

export const predictions: Prediction[] = [
  {
    id: 'pred-btc-1',
    asset: cryptoAssets[0],
    direction: 'bullish',
    confidence: 78,
    confidenceLevel: 78,
    targetPrice: 72500,
    currentPrice: 67890.50,
    predictedPrice: 72500,
    predictedDirection: 'up',
    expectedValue: 2340.50,
    riskReward: 2.4,
    timeframe: '1d',
    timestamp: new Date(),
    createdAt: new Date(),
    status: 'active',
    modelVersion: '2.1.0',
  },
  {
    id: 'pred-eth-1',
    asset: cryptoAssets[1],
    direction: 'neutral',
    confidence: 65,
    confidenceLevel: 65,
    targetPrice: 3500,
    currentPrice: 3456.78,
    predictedPrice: 3500,
    predictedDirection: 'up',
    expectedValue: 128.50,
    riskReward: 1.5,
    timeframe: '1d',
    timestamp: new Date(),
    createdAt: new Date(),
    status: 'active',
    modelVersion: '2.1.0',
  },
  {
    id: 'pred-sol-1',
    asset: cryptoAssets[2],
    direction: 'bullish',
    confidence: 82,
    confidenceLevel: 82,
    targetPrice: 195,
    currentPrice: 178.90,
    predictedPrice: 195,
    predictedDirection: 'up',
    expectedValue: 456.75,
    riskReward: 3.2,
    timeframe: '1d',
    timestamp: new Date(),
    createdAt: new Date(),
    status: 'correct',
    modelVersion: '2.1.0',
  },
]

// Generate price chart data
function generatePriceChartData(basePrice: number, days: number = 30): PriceChartDataPoint[] {
  const data: PriceChartDataPoint[] = []
  let price = basePrice * 0.85
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (days - i))
    
    const change = (Math.random() - 0.45) * 0.03 * price
    price += change
    
    const predicted = price * (1 + (Math.random() - 0.5) * 0.02)
    const volume = Math.random() * 5000000000 + 1000000000
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Math.round(price * 100) / 100,
      predicted: Math.round(predicted * 100) / 100,
      volume,
      confidenceLow: price * 0.97,
      confidenceHigh: price * 1.03,
    })
  }
  
  return data
}

export const priceChartData = generatePriceChartData(67890.50)

// Generate backtest data
function generateBacktestData(): BacktestResult {
  const trades = []
  let equity = 10000
  const equityPoints = []
  
  for (let i = 0; i < 100; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (100 - i))
    
    const entryPrice = 65000 + Math.random() * 5000
    const isWin = Math.random() > 0.4
    const percentChange = isWin 
      ? Math.random() * 3 + 0.5 
      : -(Math.random() * 2 + 0.5)
    
    const exitPrice = entryPrice * (1 + percentChange / 100)
    const profit = (equity * 0.1) * (percentChange / 100)
    
    equity += profit
    
    if (i % 5 === 0 || i === 99) {
      trades.push({
        entryPrice,
        exitPrice,
        date,
        profit,
        percentGain: percentChange,
      })
    }
    
    equityPoints.push({
      date,
      value: equity,
    })
  }
  
  const finalReturn = ((equity - 10000) / 10000) * 100
  
  return {
    strategyName: 'AI Momentum Strategy v2.1',
    totalTrades: trades.length,
    winRate: 60,
    profitFactor: 1.8,
    sharpeRatio: 1.45,
    maxDrawdown: -12.5,
    totalReturn: finalReturn,
    equityPoints,
    trades,
  }
}

export const backtestData = generateBacktestData()

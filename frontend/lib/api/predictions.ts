/**
 * Polymarket API Service
 * Note: Polymarket doesn't have a traditional REST API
 * This service provides mock predictions based on real crypto data
 * For production, integrate with backend AI prediction service
 */

import { Prediction } from '../types'
import { fetchCryptoMarketData, isMarketDataFresh } from './coingecko'

export interface PredictionResult {
  predictions: Prediction[]
  /** True when data was served from cache/fallback rather than a live API response. */
  stale: boolean
}

/**
 * Generate AI predictions based on real market data.
 * Never throws – returns whatever data is available (live, cached, or fallback).
 */
export async function fetchAIPredictions(): Promise<Prediction[]> {
  // fetchCryptoMarketData never throws – it falls back gracefully
  const cryptoAssets = await fetchCryptoMarketData()
  
  // Generate predictions based on market data
  const predictions: Prediction[] = cryptoAssets.map((asset, index) => {
    const direction = asset.change24h > 0 ? ('bullish' as const) : ('bearish' as const)
    const confidence = Math.min(95, Math.abs(asset.change24h) * 10 + 50 + Math.random() * 20)
    const predictedPriceChange = (Math.random() * 0.15 + 0.02) * (direction === 'bullish' ? 1 : -1)
    const targetPrice = asset.price * (1 + predictedPriceChange)
    
    const potentialGain = Math.abs(targetPrice - asset.price)
    const risk = potentialGain * 0.5
    const expectedValue = (confidence / 100) * potentialGain - ((100 - confidence) / 100) * risk
    const riskReward = potentialGain / risk

    return {
      id: `pred-${asset.id}-${Date.now()}-${index}`,
      asset,
      direction,
      confidence,
      confidenceLevel: Math.round(confidence),
      targetPrice,
      currentPrice: asset.price,
      predictedPrice: targetPrice,
      predictedDirection: direction === 'bullish' ? 'up' : 'down',
      expectedValue,
      riskReward,
      timeframe: (['1h', '4h', '1d', '1w'] as const)[Math.floor(Math.random() * 4)],
      timestamp: new Date(),
      createdAt: new Date(Date.now() - Math.random() * 3_600_000),
      status: (['active', 'active', 'active', 'correct'] as const)[Math.floor(Math.random() * 4)],
      modelVersion: 'v2.1.0',
    }
  })

  return predictions
}

/**
 * Fetch AI predictions and indicate whether the underlying data is stale.
 * Use this when you want to show a "data may be outdated" banner.
 */
export async function fetchAIPredictionsWithMeta(): Promise<PredictionResult> {
  const predictions = await fetchAIPredictions()
  return { predictions, stale: !isMarketDataFresh() }
}

/**
 * Generate prediction chart data with confidence bands
 */
export async function fetchPredictionChartData(
  asset: CryptoAsset,
  timeframe: '1h' | '4h' | '1d' | '1w'
): Promise<{
  historical: { date: Date; price: number }[]
  predicted: { date: Date; price: number; upper: number; lower: number }[]
}> {
  try {
    // In production, fetch from backend API
    // For now, generate sample data based on current price
    const now = new Date()
    const historical: { date: Date; price: number }[] = []
    const predicted: { date: Date; price: number; upper: number; lower: number }[] = []

    // Generate historical data (last 30 points)
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 3600000) // Hourly
      const volatility = 0.02
      const price = asset.price * (1 + (Math.random() - 0.5) * volatility)
      historical.push({ date, price })
    }

    // Generate predicted data (next 24 points)
    const trend = asset.change24h > 0 ? 0.001 : -0.001
    let lastPrice = historical[historical.length - 1].price

    for (let i = 1; i <= 24; i++) {
      const date = new Date(now.getTime() + i * 3600000)
      const price = lastPrice * (1 + trend + (Math.random() - 0.5) * 0.01)
      const confidence = 0.05 // 5% confidence band
      const upper = price * (1 + confidence)
      const lower = price * (1 - confidence)
      
      predicted.push({ date, price, upper, lower })
      lastPrice = price
    }

    return { historical, predicted }
  } catch (error) {
    console.error('Error fetching prediction chart data:', error)
    throw error
  }
}

/**
 * Get prediction statistics
 */
export async function fetchPredictionStats(): Promise<{
  totalPredictions: number
  accuracy: number
  avgConfidence: number
  profitFactor: number
}> {
  // In production, fetch from backend
  return {
    totalPredictions: 245,
    accuracy: 78.5,
    avgConfidence: 72.3,
    profitFactor: 2.45,
  }
}

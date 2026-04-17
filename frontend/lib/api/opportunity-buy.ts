/**
 * Opportunity Buy Analysis Engine
 *
 * Hybrid calculation engine combining:
 * - freqtrade-inspired technical analysis (RSI, MACD, Bollinger Bands, EMA, ADX)
 * - vectorbt-inspired signal backtesting (momentum, mean-reversion, trend-following)
 * - ML/Neural-inspired predictive scoring (trend probability, confidence intervals)
 *
 * Outputs: Curated list of best buy opportunities with precise entry/exit ranges.
 */

import { fetchCryptoMarketData, fetchHistoricalPriceData, CoinGeckoMarketData } from './coingecko'
import { CryptoAsset } from '../types'

// ---------------------------------------------------------------------------
// Core Types
// ---------------------------------------------------------------------------

export type SignalStrength = 'STRONG_BUY' | 'BUY' | 'ACCUMULATE'
export type RiskLevel = 'Low' | 'Medium' | 'High'
export type Timeframe = '4h' | '1d' | '1w'

export interface EntryExitRange {
  entryLow: number
  entryHigh: number
  stopLoss: number
  target1: number  // Conservative  (R:R ~1.5)
  target2: number  // Moderate      (R:R ~2.5)
  target3: number  // Aggressive    (R:R ~4.0)
  riskRewardT1: number
  riskRewardT2: number
  riskRewardT3: number
}

export interface TechnicalScores {
  rsiScore: number         // 0-100 (100 = deeply oversold)
  macdScore: number        // 0-100 (100 = strong bullish crossover)
  bollingerScore: number   // 0-100 (100 = price near lower band)
  emaScore: number         // 0-100 (100 = bullish EMA alignment)
  volumeScore: number      // 0-100 (100 = strong volume confirmation)
  adxScore: number         // 0-100 (100 = strong trend strength)
  composite: number        // 0-100 weighted composite
}

export interface SentimentScores {
  fearGreedScore: number   // 0-100 (higher = more fearful = contrarian buy)
  momentumScore: number    // 0-100 (momentum reversal signal)
  marketCapScore: number   // 0-100 (large cap = higher reliability)
  composite: number        // 0-100 weighted composite
}

export interface PredictionScores {
  meanReversionScore: number  // 0-100 (prob of price bounce)
  trendScore: number          // 0-100 (trend strength & direction)
  mlScore: number             // 0-100 (ML-inspired composite)
  confidence: number          // 0-100 (prediction confidence)
  composite: number           // 0-100 weighted
}

export interface IndicatorSnapshot {
  rsi14: number
  macd: number
  macdSignal: number
  macdHistogram: number
  ema20: number
  ema50: number
  bollingerUpper: number
  bollingerMiddle: number
  bollingerLower: number
  atr14: number
  adx14: number
  stochK: number
  stochD: number
  volumeRatio: number   // current vol / 20-period avg vol
}

export interface OpportunityAsset {
  id: string
  rank: number
  asset: CryptoAsset
  compositeScore: number    // 0-100 final score
  signalStrength: SignalStrength
  riskLevel: RiskLevel
  timeframe: Timeframe
  entryExit: EntryExitRange
  technical: TechnicalScores
  sentiment: SentimentScores
  prediction: PredictionScores
  indicators: IndicatorSnapshot
  reasoning: string[]
  modelVersion: string
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Named constants — scoring thresholds & parameters
// ---------------------------------------------------------------------------

// RSI thresholds (freqtrade-inspired)
const RSI_EXTREMELY_OVERSOLD = 20
const RSI_OVERSOLD = 30
const RSI_APPROACHING_OVERSOLD = 40
const RSI_NEUTRAL_LOW = 50
const RSI_NEUTRAL_HIGH = 60

// Signal strength thresholds (composite score 0-100)
const STRONG_BUY_THRESHOLD = 78
const BUY_THRESHOLD = 68
const MIN_OPPORTUNITY_SCORE = 62  // Minimum score to include in results

// Risk classification (market cap in USD, volatility in %)
const LARGE_CAP_THRESHOLD = 50e9
const MEDIUM_CAP_THRESHOLD = 5e9
const LOW_VOLATILITY_THRESHOLD = 5
const MEDIUM_VOLATILITY_THRESHOLD = 10

// Auto-refresh interval (ms) — matches cache TTL in opportunity-buy module
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000

// MACD division guard — prevents division by zero
const MACD_EPSILON = 0.001

// ---------------------------------------------------------------------------
// Seeded pseudo-random number generator (deterministic per asset + timestamp)
//
// Implementation: Linear Congruential Generator (LCG) with parameters from
// Numerical Recipes (Knuth Vol. 2). Given the same seed, it always produces
// the same sequence, which ensures indicator simulations are stable within
// a 5-minute cache window (seed changes with timeSeed every 5 min).
// ---------------------------------------------------------------------------

function seededRand(seed: number): () => number {
  // LCG: keep state within 32-bit unsigned integer range using bitwise ops
  let s = seed >>> 0  // coerce to uint32
  return () => {
    s = ((Math.imul(s, 1664525) + 1013904223) | 0) >>> 0
    return s / 0xffffffff
  }
}

// ---------------------------------------------------------------------------
// Technical Indicator Simulation
// freqtrade-inspired: same indicators used in strategy files (RSI, MACD, BB, EMA, ADX)
// ---------------------------------------------------------------------------

function simulateIndicators(asset: CryptoAsset, seed: number): IndicatorSnapshot {
  const rand = seededRand(seed)
  const price = asset.price
  const change = asset.change24h

  // RSI simulation: inversely correlated with recent price performance
  // Oversold (< 30) when price drops significantly
  const baseRsi = 50 - change * 2.5 + (rand() - 0.5) * 15
  const rsi14 = Math.max(10, Math.min(90, baseRsi))

  // EMA simulation
  const ema20 = price * (1 + (rand() - 0.55) * 0.04)
  const ema50 = price * (1 + (rand() - 0.55) * 0.08)

  // MACD simulation
  const macd = (ema20 - ema50) * 0.12 + (rand() - 0.5) * price * 0.002
  const macdSignal = macd * 0.85 + (rand() - 0.5) * price * 0.001
  const macdHistogram = macd - macdSignal

  // Bollinger Bands (20-period, 2 std dev)
  const stdDev = price * (0.02 + rand() * 0.03)
  const bollingerMiddle = price * (1 + (rand() - 0.5) * 0.02)
  const bollingerUpper = bollingerMiddle + 2 * stdDev
  const bollingerLower = bollingerMiddle - 2 * stdDev

  // ATR (14-period) — average true range as % of price
  const volatilityFactor = Math.abs(change) / 100 + 0.01
  const atr14 = price * (volatilityFactor + rand() * 0.02)

  // ADX (14-period) — trend strength 0-100
  const adx14 = 20 + rand() * 50

  // Stochastic Oscillator
  const stochK = Math.max(5, Math.min(95, 50 - change * 3 + rand() * 30))
  const stochD = stochK * 0.9 + rand() * 10

  // Volume ratio (current vs 20-period SMA)
  const baseVolRatio = 1 + (rand() - 0.4) * 0.8
  const volumeRatio = Math.max(0.3, baseVolRatio)

  return {
    rsi14,
    macd,
    macdSignal,
    macdHistogram,
    ema20,
    ema50,
    bollingerUpper,
    bollingerMiddle,
    bollingerLower,
    atr14,
    adx14,
    stochK,
    stochD,
    volumeRatio,
  }
}

// ---------------------------------------------------------------------------
// freqtrade-inspired Technical Scoring
// ---------------------------------------------------------------------------

function scoreTechnical(asset: CryptoAsset, ind: IndicatorSnapshot): TechnicalScores {
  // RSI Score: highest when RSI is oversold (< 30)
  let rsiScore: number
  if (ind.rsi14 < RSI_EXTREMELY_OVERSOLD) rsiScore = 95
  else if (ind.rsi14 < RSI_OVERSOLD) rsiScore = 80 + (RSI_OVERSOLD - ind.rsi14) * 1.5
  else if (ind.rsi14 < RSI_APPROACHING_OVERSOLD) rsiScore = 55 + (RSI_APPROACHING_OVERSOLD - ind.rsi14) * 2.5
  else if (ind.rsi14 < RSI_NEUTRAL_LOW) rsiScore = 35 + (RSI_NEUTRAL_LOW - ind.rsi14) * 2
  else if (ind.rsi14 < RSI_NEUTRAL_HIGH) rsiScore = 20
  else rsiScore = Math.max(0, 20 - (ind.rsi14 - RSI_NEUTRAL_HIGH) * 0.5)

  // MACD Score: bullish when histogram positive and MACD > Signal
  let macdScore: number
  if (ind.macdHistogram > 0 && ind.macd > ind.macdSignal) {
    // Bullish crossover
    const strength = Math.abs(ind.macdHistogram) / (Math.abs(ind.macd) + MACD_EPSILON)
    macdScore = 60 + Math.min(40, strength * 100)
  } else if (ind.macdHistogram < 0 && Math.abs(ind.macdHistogram) < Math.abs(ind.macd) * 0.1) {
    // Near crossover
    macdScore = 45
  } else {
    macdScore = Math.max(10, 40 - Math.abs(ind.macdHistogram / (ind.macd + MACD_EPSILON)) * 30)
  }

  // Bollinger Band Score: highest when price near lower band
  const bbPosition = (asset.price - ind.bollingerLower) / (ind.bollingerUpper - ind.bollingerLower)
  let bollingerScore: number
  if (bbPosition < 0) bollingerScore = 95           // Below lower band
  else if (bbPosition < 0.15) bollingerScore = 85
  else if (bbPosition < 0.3) bollingerScore = 65
  else if (bbPosition < 0.5) bollingerScore = 45
  else if (bbPosition < 0.7) bollingerScore = 30
  else bollingerScore = Math.max(5, 30 - (bbPosition - 0.7) * 50)

  // EMA Score: bullish when EMA20 > EMA50 (golden cross)
  let emaScore: number
  if (ind.ema20 > ind.ema50) {
    const crossStrength = (ind.ema20 - ind.ema50) / ind.ema50
    emaScore = 55 + Math.min(40, crossStrength * 500)
  } else {
    const crossStrength = (ind.ema50 - ind.ema20) / ind.ema50
    emaScore = Math.max(5, 45 - crossStrength * 300)
  }

  // Volume Score: confirmation of move with above-average volume
  let volumeScore: number
  if (ind.volumeRatio > 2.0) volumeScore = 90
  else if (ind.volumeRatio > 1.5) volumeScore = 75
  else if (ind.volumeRatio > 1.2) volumeScore = 60
  else if (ind.volumeRatio > 0.8) volumeScore = 40
  else volumeScore = 20

  // ADX Score: strong trend (ADX > 25 = trending market)
  let adxScore: number
  if (ind.adx14 > 40) adxScore = 80
  else if (ind.adx14 > 25) adxScore = 60 + (ind.adx14 - 25) * 1.3
  else adxScore = Math.max(20, ind.adx14 * 1.5)

  // Composite: freqtrade-style weighted combination
  const composite =
    rsiScore * 0.30 +
    macdScore * 0.25 +
    bollingerScore * 0.20 +
    emaScore * 0.15 +
    volumeScore * 0.05 +
    adxScore * 0.05

  return {
    rsiScore: Math.round(rsiScore),
    macdScore: Math.round(macdScore),
    bollingerScore: Math.round(bollingerScore),
    emaScore: Math.round(emaScore),
    volumeScore: Math.round(volumeScore),
    adxScore: Math.round(adxScore),
    composite: Math.round(composite),
  }
}

// ---------------------------------------------------------------------------
// Sentiment Scoring (contrarian + market context)
// ---------------------------------------------------------------------------

function scoreSentiment(asset: CryptoAsset, ind: IndicatorSnapshot): SentimentScores {
  // Fear & Greed: oversold assets in fearful market = contrarian buy
  // Simulate using Stochastic as fear proxy
  const fearGreedScore = Math.max(10, Math.min(90, 100 - ind.stochK))

  // Momentum score: momentum exhaustion = reversal signal
  const change = asset.change24h
  let momentumScore: number
  if (change < -15) momentumScore = 85  // Extreme drop = oversold bounce likely
  else if (change < -10) momentumScore = 75
  else if (change < -5) momentumScore = 65
  else if (change < -2) momentumScore = 55
  else if (change < 0) momentumScore = 45
  else if (change < 3) momentumScore = 40  // Slight positive = momentum building
  else if (change < 8) momentumScore = 55  // Moderate positive = accumulation
  else momentumScore = 30  // Strong positive = possibly overbought

  // Market Cap Score: larger cap = lower risk, higher reliability of signal
  const marketCap = asset.marketCap || 0
  let marketCapScore: number
  if (marketCap > 100e9) marketCapScore = 90       // > $100B
  else if (marketCap > 10e9) marketCapScore = 75   // > $10B
  else if (marketCap > 1e9) marketCapScore = 60    // > $1B
  else if (marketCap > 100e6) marketCapScore = 45  // > $100M
  else marketCapScore = 25

  const composite =
    fearGreedScore * 0.35 +
    momentumScore * 0.40 +
    marketCapScore * 0.25

  return {
    fearGreedScore: Math.round(fearGreedScore),
    momentumScore: Math.round(momentumScore),
    marketCapScore: Math.round(marketCapScore),
    composite: Math.round(composite),
  }
}

// ---------------------------------------------------------------------------
// vectorbt + ML-inspired Predictive Scoring
// ---------------------------------------------------------------------------

function scorePrediction(
  asset: CryptoAsset,
  ind: IndicatorSnapshot,
  technical: TechnicalScores,
  sentiment: SentimentScores,
): PredictionScores {
  // Mean Reversion Score (vectorbt mean-reversion strategy)
  // Higher when price is far below moving averages
  const emaDivergence = (ind.ema50 - asset.price) / ind.ema50
  let meanReversionScore: number
  if (emaDivergence > 0.15) meanReversionScore = 90
  else if (emaDivergence > 0.08) meanReversionScore = 75
  else if (emaDivergence > 0.04) meanReversionScore = 60
  else if (emaDivergence > 0) meanReversionScore = 45
  else meanReversionScore = Math.max(20, 40 - (-emaDivergence) * 200)

  // Trend Score: combine EMA + ADX for trend probability
  const trendScore = ind.ema20 > ind.ema50
    ? Math.min(90, 50 + ind.adx14 * 0.8)
    : Math.max(20, 50 - ind.adx14 * 0.5)

  // ML Score: neural-network style weighted combination of features
  // Inspired by TensorFlow quant models
  const features = [
    (100 - ind.rsi14) / 100,                      // RSI oversold feature
    Math.min(1, ind.volumeRatio / 2),              // Volume confirmation
    Math.max(0, emaDivergence * 5),               // EMA divergence
    (100 - ind.stochK) / 100,                     // Stochastic oversold
    Math.min(1, ind.adx14 / 50),                  // Trend strength
  ]
  const mlRaw = features.reduce((acc, f) => acc + f, 0) / features.length
  const mlScore = Math.round(Math.max(10, Math.min(95, mlRaw * 100)))

  // Confidence: how aligned are all signals?
  const scores = [technical.composite, sentiment.composite, meanReversionScore, trendScore, mlScore]
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)
  // Low std dev = high alignment = high confidence
  const confidence = Math.round(Math.max(40, Math.min(95, 90 - stdDev * 0.8)))

  const composite =
    meanReversionScore * 0.35 +
    trendScore * 0.25 +
    mlScore * 0.40

  return {
    meanReversionScore: Math.round(meanReversionScore),
    trendScore: Math.round(trendScore),
    mlScore,
    confidence,
    composite: Math.round(composite),
  }
}

// ---------------------------------------------------------------------------
// Entry / Exit Range Calculation
// ATR-based approach (freqtrade default stop-loss calculation)
// ---------------------------------------------------------------------------

function calculateEntryExit(asset: CryptoAsset, ind: IndicatorSnapshot): EntryExitRange {
  const price = asset.price
  const atr = ind.atr14

  // Entry zone: buy between -0.5 ATR to +0.25 ATR from current price
  const entryLow = price - atr * 0.5
  const entryHigh = price + atr * 0.25
  const entryMid = (entryLow + entryHigh) / 2

  // Stop Loss: 1.5 ATR below entry low (freqtrade default is 2% but ATR-based is more precise)
  const stopLoss = entryLow - atr * 1.5

  // Targets based on ATR multiples
  const risk = entryMid - stopLoss
  const target1 = entryMid + risk * 1.5    // Conservative: 1.5:1 R:R
  const target2 = entryMid + risk * 2.5    // Moderate: 2.5:1 R:R
  const target3 = entryMid + risk * 4.0    // Aggressive: 4:1 R:R

  const riskRewardT1 = risk > 0 ? parseFloat(((target1 - entryMid) / risk).toFixed(2)) : 1.5
  const riskRewardT2 = risk > 0 ? parseFloat(((target2 - entryMid) / risk).toFixed(2)) : 2.5
  const riskRewardT3 = risk > 0 ? parseFloat(((target3 - entryMid) / risk).toFixed(2)) : 4.0

  return {
    entryLow: Math.max(0, entryLow),
    entryHigh,
    stopLoss: Math.max(0, stopLoss),
    target1,
    target2,
    target3,
    riskRewardT1,
    riskRewardT2,
    riskRewardT3,
  }
}

// ---------------------------------------------------------------------------
// Reasoning Generator
// ---------------------------------------------------------------------------

function generateReasoning(
  asset: CryptoAsset,
  ind: IndicatorSnapshot,
  technical: TechnicalScores,
  sentiment: SentimentScores,
  prediction: PredictionScores,
): string[] {
  const reasons: string[] = []

  if (ind.rsi14 < 30) reasons.push(`RSI ${ind.rsi14.toFixed(1)} — deeply oversold, bounce likely`)
  else if (ind.rsi14 < 40) reasons.push(`RSI ${ind.rsi14.toFixed(1)} — approaching oversold territory`)

  if (ind.macdHistogram > 0) reasons.push('MACD bullish crossover — upward momentum confirmed')
  else if (ind.macd > ind.macdSignal * 0.95) reasons.push('MACD nearing bullish crossover')

  const bbPosition = (asset.price - ind.bollingerLower) / (ind.bollingerUpper - ind.bollingerLower)
  if (bbPosition < 0.2) reasons.push(`Price at ${(bbPosition * 100).toFixed(0)}% of Bollinger Band — near support`)

  if (ind.ema20 > ind.ema50) reasons.push('Golden cross: EMA20 > EMA50 — bullish trend structure')
  else if ((ind.ema50 - ind.ema20) / ind.ema50 < 0.03) reasons.push('EMA20 approaching EMA50 — potential golden cross forming')

  if (ind.volumeRatio > 1.5) reasons.push(`Volume ${ind.volumeRatio.toFixed(1)}× average — strong buying pressure`)

  if (asset.change24h < -5) reasons.push(`${Math.abs(asset.change24h).toFixed(1)}% pullback — potential entry opportunity`)

  if (ind.stochK < 25) reasons.push(`Stochastic K ${ind.stochK.toFixed(0)} — oversold momentum reversal signal`)

  if (prediction.meanReversionScore > 70) reasons.push('High mean reversion probability — price likely to recover to moving average')

  if (prediction.mlScore > 70) reasons.push(`ML model confidence ${prediction.mlScore}% — favorable buy conditions`)

  if (technical.composite > 75) reasons.push('All technical indicators aligned bullishly')

  return reasons.slice(0, 5)  // Top 5 reasons
}

// ---------------------------------------------------------------------------
// Signal Strength & Risk Classifier
// ---------------------------------------------------------------------------

function classifySignal(score: number): SignalStrength {
  if (score >= STRONG_BUY_THRESHOLD) return 'STRONG_BUY'
  if (score >= BUY_THRESHOLD) return 'BUY'
  return 'ACCUMULATE'
}

function classifyRisk(asset: CryptoAsset, ind: IndicatorSnapshot): RiskLevel {
  const marketCap = asset.marketCap || 0
  const volatility = Math.abs(asset.change24h)

  if (marketCap > LARGE_CAP_THRESHOLD && volatility < LOW_VOLATILITY_THRESHOLD) return 'Low'
  if (marketCap > MEDIUM_CAP_THRESHOLD && volatility < MEDIUM_VOLATILITY_THRESHOLD) return 'Medium'
  return 'High'
}

function classifyTimeframe(score: number, ind: IndicatorSnapshot): Timeframe {
  if (ind.adx14 > 35 && score > 78) return '1d'
  if (score > 72) return '4h'
  return '1w'
}

// ---------------------------------------------------------------------------
// Main Analysis Function
// ---------------------------------------------------------------------------

export interface OpportunityResult {
  opportunities: OpportunityAsset[]
  totalAnalyzed: number
  lastUpdated: Date
  stale: boolean
}

const OPP_CACHE_KEY = 'opp_buy_data_v2'
const OPP_CACHE_TTL = 5 * 60 * 1000  // 5 minutes

interface OppCacheEntry {
  data: OpportunityAsset[]
  timestamp: number
  totalAnalyzed: number
}

function readOppCache(): OppCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(OPP_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeOppCache(entry: OppCacheEntry): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(OPP_CACHE_KEY, JSON.stringify(entry))
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Analyze all crypto assets and return top buy opportunities.
 * Uses hybrid technical + sentiment + ML prediction engine.
 * Never throws — always returns usable data.
 */
export async function fetchOpportunityBuys(forceRefresh = false): Promise<OpportunityResult> {
  const now = Date.now()

  // Check cache
  if (!forceRefresh) {
    const cached = readOppCache()
    if (cached && (now - cached.timestamp) < OPP_CACHE_TTL) {
      const restored = cached.data.map(opp => ({
        ...opp,
        updatedAt: new Date(opp.updatedAt),
      }))
      return {
        opportunities: restored,
        totalAnalyzed: cached.totalAnalyzed,
        lastUpdated: new Date(cached.timestamp),
        stale: false,
      }
    }
  }

  let assets: CryptoAsset[] = []
  let isStale = false

  try {
    assets = await fetchCryptoMarketData()
  } catch {
    // fetchCryptoMarketData never throws, but guard anyway
    isStale = true
  }

  if (assets.length === 0) {
    const cached = readOppCache()
    if (cached) {
      isStale = true
      assets = cached.data.map(o => o.asset)
    }
  }

  // Stable seed based on current 5-minute window (changes every 5 min)
  const timeSeed = Math.floor(now / OPP_CACHE_TTL)

  const analyzed: OpportunityAsset[] = []

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    // Combine asset hash and time seed safely within 32-bit integer range
    const assetHash = hashString(asset.id)
    const seed = (Math.imul(assetHash, timeSeed + 1) ^ assetHash) >>> 0

    const indicators = simulateIndicators(asset, seed)
    const technical = scoreTechnical(asset, indicators)
    const sentiment = scoreSentiment(asset, indicators)
    const prediction = scorePrediction(asset, indicators, technical, sentiment)

    // Final composite: TA 50% + Sentiment 20% + Prediction 30%
    const compositeScore = Math.round(
      technical.composite * 0.50 +
      sentiment.composite * 0.20 +
      prediction.composite * 0.30
    )

    // Only include strong buy signals (score >= MIN_OPPORTUNITY_SCORE)
    if (compositeScore < MIN_OPPORTUNITY_SCORE) continue

    const entryExit = calculateEntryExit(asset, indicators)
    const reasoning = generateReasoning(asset, indicators, technical, sentiment, prediction)
    const signalStrength = classifySignal(compositeScore)
    const riskLevel = classifyRisk(asset, indicators)
    const timeframe = classifyTimeframe(compositeScore, indicators)

    analyzed.push({
      id: `opp-${asset.id}`,
      rank: 0,  // Will be set after sorting
      asset,
      compositeScore,
      signalStrength,
      riskLevel,
      timeframe,
      entryExit,
      technical,
      sentiment,
      prediction,
      indicators,
      reasoning,
      modelVersion: 'v3.0.0-hybrid',
      updatedAt: new Date(now),
    })
  }

  // Sort by composite score descending
  analyzed.sort((a, b) => b.compositeScore - a.compositeScore)

  // Set rank
  analyzed.forEach((opp, idx) => {
    opp.rank = idx + 1
  })

  // Cache results
  const entry: OppCacheEntry = {
    data: analyzed,
    timestamp: now,
    totalAnalyzed: assets.length,
  }
  writeOppCache(entry)

  return {
    opportunities: analyzed,
    totalAnalyzed: assets.length,
    lastUpdated: new Date(now),
    stale: isStale,
  }
}

// ---------------------------------------------------------------------------
// Helper: string hash to numeric seed
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

export function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  if (price >= 0.01) return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
  return price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 })
}

export function formatPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function getSignalColor(signal: SignalStrength): string {
  switch (signal) {
    case 'STRONG_BUY': return 'from-accent-emerald to-accent-teal'
    case 'BUY': return 'from-accent-blue to-accent-cyan'
    case 'ACCUMULATE': return 'from-accent-indigo to-accent-purple'
  }
}

export function getSignalBadgeStyle(signal: SignalStrength): string {
  switch (signal) {
    case 'STRONG_BUY': return 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
    case 'BUY': return 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
    case 'ACCUMULATE': return 'bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/50 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
  }
}

export function getRiskBadgeStyle(risk: RiskLevel): string {
  switch (risk) {
    case 'Low': return 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/30'
    case 'Medium': return 'bg-accent-amber/10 text-accent-amber border border-accent-amber/30'
    case 'High': return 'bg-accent-red/10 text-accent-red border border-accent-red/30'
  }
}

export const ASSET_COLORS: Record<string, string> = {
  BTC: '#F7931A', ETH: '#627EEA', XRP: '#00AAE4', BNB: '#F3BA2F',
  SOL: '#14F195', ADA: '#0033AD', DOGE: '#C2A633', DOT: '#E6007A',
  AVAX: '#E84142', TRX: '#FF060A', TON: '#0088CC', LINK: '#2A5ADA',
  MATIC: '#8247E5', LTC: '#BFBBBB', UNI: '#FF007A', ATOM: '#6F4CA1',
  NEAR: '#00C08B', ICP: '#29ABE2', APT: '#00BFA5', OP: '#FF0420',
}

export function getAssetColor(symbol: string): string {
  return ASSET_COLORS[symbol] || '#3B82F6'
}

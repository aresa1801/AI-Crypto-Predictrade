/**
 * Backtest Engine
 *
 * Fetches real BTC historical price data from CoinGecko and runs a simple
 * momentum-based strategy (EMA crossover) to produce genuine backtest metrics.
 *
 * Strategy: Buy when the 5-day EMA crosses above the 20-day EMA,
 *           Sell when the 5-day EMA crosses below the 20-day EMA.
 *           Risk 10% of portfolio per trade.
 */

import { fetchHistoricalPriceData } from './coingecko'
import { BacktestResult, EquityPoint, Trade } from '../types'

const BT_CACHE_KEY = 'bt_result_v1'
const BT_CACHE_TTL = 15 * 60 * 1000 // 15 minutes

interface CacheEntry<T> { data: T; timestamp: number }

function readCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null
  } catch { return null }
}

function writeCache<T>(key: string, data: T): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
    }
  } catch { /* ignore */ }
}

function isFresh<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp < BT_CACHE_TTL
}

function computeEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const ema: number[] = []
  let prev = prices.slice(0, period).reduce((s, v) => s + v, 0) / period
  ema[period - 1] = prev
  for (let i = period; i < prices.length; i++) {
    prev = prices[i] * k + prev * (1 - k)
    ema[i] = prev
  }
  return ema
}

function sharpe(returns: number[]): number {
  if (returns.length < 2) return 0
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length
  const std  = Math.sqrt(returns.map(r => (r - mean) ** 2).reduce((s, v) => s + v, 0) / returns.length)
  return std === 0 ? 0 : (mean / std) * Math.sqrt(252)
}

export async function fetchBacktestResult(coin = 'bitcoin', days = 120): Promise<BacktestResult> {
  // Serve from cache if fresh
  const cached = readCache<BacktestResult>(BT_CACHE_KEY)
  if (cached && isFresh(cached)) return deserializeBacktest(cached.data)

  try {
    const history = await fetchHistoricalPriceData(coin, days)
    if (history.length < 30) throw new Error('Not enough data')

    const prices = history.map(h => h.price)
    const dates  = history.map(h => new Date(h.date))
    const ema5   = computeEMA(prices, 5)
    const ema20  = computeEMA(prices, 20)

    const INITIAL = 10_000
    let equity = INITIAL
    const equityPoints: EquityPoint[] = [{ date: dates[0], value: equity }]
    const trades: Trade[] = []
    const tradeReturns: number[] = []

    let inPosition = false
    let entryPrice = 0
    let entryEquity = 0
    let entryDate = dates[0]

    let wins = 0, losses = 0
    let grossProfit = 0, grossLoss = 0
    let maxEquity = equity, maxDrawdown = 0

    for (let i = 21; i < prices.length; i++) {
      const crossedUp   = ema5[i] > ema20[i] && ema5[i - 1] <= ema20[i - 1]
      const crossedDown  = ema5[i] < ema20[i] && ema5[i - 1] >= ema20[i - 1]

      if (!inPosition && crossedUp) {
        // Enter long
        inPosition  = true
        entryPrice  = prices[i]
        entryEquity = equity
        entryDate   = dates[i]
      } else if (inPosition && (crossedDown || i === prices.length - 1)) {
        // Exit long
        const exitPrice   = prices[i]
        const pctChange   = (exitPrice - entryPrice) / entryPrice
        const profit      = entryEquity * 0.1 * pctChange   // risk 10%

        equity += profit
        inPosition = false

        const isWin = profit > 0
        if (isWin) { wins++; grossProfit += profit }
        else        { losses++; grossLoss += Math.abs(profit) }

        tradeReturns.push(pctChange)

        trades.push({
          entryPrice,
          exitPrice,
          date: entryDate,
          profit,
          percentGain: pctChange * 100,
        })

        if (equity > maxEquity) maxEquity = equity
        const drawdown = (maxEquity - equity) / maxEquity * 100
        if (drawdown > maxDrawdown) maxDrawdown = drawdown
      }

      equityPoints.push({ date: dates[i], value: equity })
    }

    const totalReturn    = ((equity - INITIAL) / INITIAL) * 100
    const totalTrades    = wins + losses
    const winRate        = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
    const profitFactor   = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0
    const sharpeRatio    = sharpe(tradeReturns)

    const result: BacktestResult = {
      strategyName: 'AI EMA Crossover (5/20) – BTC/USDT Spot',
      totalTrades,
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown: -maxDrawdown,
      totalReturn,
      equityPoints,
      trades,
    }

    writeCache(BT_CACHE_KEY, result)
    return result
  } catch (error) {
    console.warn('fetchBacktestResult: live computation failed, using cache.', error)

    if (cached) return deserializeBacktest(cached.data)
    throw error
  }
}

/**
 * Dates are serialised as strings in localStorage – restore them as Date objects.
 */
function deserializeBacktest(raw: BacktestResult): BacktestResult {
  return {
    ...raw,
    equityPoints: raw.equityPoints.map(ep => ({ ...ep, date: new Date(ep.date) })),
    trades:       raw.trades.map(t => ({ ...t, date: new Date(t.date) })),
  }
}

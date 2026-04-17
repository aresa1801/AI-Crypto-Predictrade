/**
 * CoinGecko API Service
 * Free API for cryptocurrency market data
 * API Docs: https://www.coingecko.com/en/api/documentation
 */

import { CryptoAsset, MarketSnapshot } from '../types'

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3'

// ---------------------------------------------------------------------------
// Resilience helpers: timeout, retry, persistent cache, fallback data
// ---------------------------------------------------------------------------

const MARKET_CACHE_KEY = 'cg_market_data_v1'
const GLOBAL_CACHE_KEY = 'cg_global_data_v1'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes – data considered "fresh"
const REQUEST_TIMEOUT_MS = 12_000   // 12 s timeout per attempt
const MAX_RETRIES = 3

interface CacheEntry<T> {
  data: T
  timestamp: number
}

/** Returns true if the entry is within the freshness window. */
function isFresh<T>(entry: CacheEntry<T>): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS
}

/** Returns how many seconds ago the market data cache was written (or null if no cache). */
export function getMarketDataCacheAge(): number | null {
  const entry = readCache<CoinGeckoMarketData[]>(MARKET_CACHE_KEY)
  if (!entry) return null
  return Math.floor((Date.now() - entry.timestamp) / 1000)
}

/** Returns true when the cached market data is still within the freshness window. */
export function isMarketDataFresh(): boolean {
  const entry = readCache<CoinGeckoMarketData[]>(MARKET_CACHE_KEY)
  return entry !== null && isFresh(entry)
}

function readCache<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
    }
  } catch {
    // Storage might be full or unavailable – ignore silently
  }
}

/** fetch() with an AbortController-based timeout. */
async function fetchWithTimeout(url: string, timeout = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

const RATE_LIMIT_FIRST_DELAY_MS = 10_000  // 10 s pause on first 429 hit
const RATE_LIMIT_RETRY_DELAY_MS = 30_000  // 30 s pause on subsequent 429 hits

/**
 * Fetch a URL with automatic retries and exponential back-off.
 * 429 (rate-limit) responses trigger a longer pause before retrying.
 */
async function fetchWithRetry(url: string, maxRetries = MAX_RETRIES): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(url)
      if (res.status === 429) {
        // Rate-limited – wait longer before retrying
        const delay = attempt === 0 ? RATE_LIMIT_FIRST_DELAY_MS : RATE_LIMIT_RETRY_DELAY_MS
        await new Promise((r) => setTimeout(r, delay))
        lastError = new Error('CoinGecko rate limit (429)')
        continue
      }
      return res
    } catch (err) {
      lastError = err
      if (attempt < maxRetries - 1) {
        // Exponential back-off: 1 s, 2 s, 4 s …
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1_000))
      }
    }
  }
  throw lastError
}

// ---------------------------------------------------------------------------
// Static fallback data – last-resort placeholder shown when both the live API
// and localStorage cache are unavailable.  Prices are hardcoded approximations
// and will become stale over time; they exist purely to keep the UI functional.
// ---------------------------------------------------------------------------

const FALLBACK_ASSETS: CryptoAsset[] = [
  { id: 'bitcoin',  symbol: 'BTC', name: 'Bitcoin',  price: 67_000,  change24h:  1.2, volume24h: 28_000_000_000, marketCap: 1_320_000_000_000 },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price:  3_400,  change24h: -0.8, volume24h: 14_000_000_000, marketCap:   410_000_000_000 },
  { id: 'solana',   symbol: 'SOL', name: 'Solana',   price:    170,  change24h:  3.1, volume24h:  3_500_000_000, marketCap:    75_000_000_000 },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB',   price:    600,  change24h:  0.5, volume24h:  1_100_000_000, marketCap:    92_000_000_000 },
  { id: 'ripple',   symbol: 'XRP', name: 'XRP',      price:   0.52,  change24h: -0.3, volume24h:    850_000_000, marketCap:    27_000_000_000 },
  { id: 'cardano',  symbol: 'ADA', name: 'Cardano',  price:   0.45,  change24h:  0.7, volume24h:    400_000_000, marketCap:    16_000_000_000 },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', price: 35, change24h:  2.0, volume24h:    600_000_000, marketCap:    14_000_000_000 },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.12,  change24h:  1.5, volume24h:    900_000_000, marketCap:    17_000_000_000 },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', price:   7.50, change24h: -1.0, volume24h:    300_000_000, marketCap:    10_000_000_000 },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', price: 14, change24h:  1.8, volume24h:    500_000_000, marketCap:     8_000_000_000 },
]

// Stablecoins to exclude from predictions
const STABLECOIN_IDS = [
  'tether', 'usd-coin', 'binance-usd', 'dai', 'frax', 'true-usd', 'paxos-standard',
  'gemini-dollar', 'liquity-usd', 'stasis-eurs', 'neutrino', 'fei-usd', 'terrausd',
  'magic-internet-money', 'frax-share', 'alchemix-usd', 'usdx', 'reserve', 
  'usdd', 'first-digital-usd', 'paypal-usd', 'ethena-usde'
]

const STABLECOIN_SYMBOLS = [
  'USDT', 'USDC', 'BUSD', 'DAI', 'FRAX', 'TUSD', 'USDP', 'GUSD', 'LUSD', 
  'EURT', 'USDN', 'FEI', 'UST', 'MIM', 'FXS', 'ALUSD', 'USDX', 'RSV',
  'USDD', 'FDUSD', 'PYUSD', 'USDE'
]

export interface CoinGeckoMarketData {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
  total_volume: number
  market_cap: number
  image: string
  sparkline_in_7d?: { price: number[] }
}

export interface CoinGeckoGlobalData {
  data: {
    total_market_cap: {
      usd: number
    }
    market_cap_percentage: {
      btc: number
    }
    total_volume: {
      usd: number
    }
  }
}

/** Parse raw CoinGecko market response into CryptoAsset[]. */
function parseCoinGeckoMarketData(data: CoinGeckoMarketData[]): CryptoAsset[] {
  return data
    .filter(coin => {
      if (STABLECOIN_IDS.includes(coin.id)) return false
      if (STABLECOIN_SYMBOLS.includes(coin.symbol.toUpperCase())) return false
      const lowerName = coin.name.toLowerCase()
      if (lowerName.includes('usd') && (lowerName.includes('stable') || lowerName.includes('dollar'))) return false
      return true
    })
    .slice(0, 100)
    .map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
    }))
}

/**
 * Fetch market data for multiple cryptocurrencies.
 *
 * Strategy:
 *  1. Try live API (with timeout + retries).
 *  2. On failure, serve localStorage-cached data (even if stale).
 *  3. If no cache exists, serve static fallback data.
 *
 * This function never throws – callers always receive usable data.
 * Check the `stale` field on the returned object to know the data origin.
 */
export async function fetchCryptoMarketData(): Promise<CryptoAsset[]> {
  const url =
    `${COINGECKO_API_BASE}/coins/markets?` +
    new URLSearchParams({
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: '150',
      page: '1',
      sparkline: 'false',
      price_change_percentage: '24h',
    })

  try {
    const response = await fetchWithRetry(url)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const raw: CoinGeckoMarketData[] = await response.json()
    const assets = parseCoinGeckoMarketData(raw)

    // Persist successful response for future fallback
    writeCache<CoinGeckoMarketData[]>(MARKET_CACHE_KEY, raw)

    return assets
  } catch (error) {
    console.warn('fetchCryptoMarketData: live fetch failed, using fallback.', error)

    // Try persistent cache (may be stale but better than nothing)
    const cached = readCache<CoinGeckoMarketData[]>(MARKET_CACHE_KEY)
    if (cached) {
      console.info('fetchCryptoMarketData: serving from localStorage cache.')
      return parseCoinGeckoMarketData(cached.data)
    }

    // Last resort: static fallback data
    console.info('fetchCryptoMarketData: serving static fallback data.')
    return FALLBACK_ASSETS
  }
}

/**
 * Fetch top N cryptocurrencies including 7-day sparkline price arrays.
 * Used by the Watchlist component for mini charts.
 * Falls back to cached data or FALLBACK_ASSETS on error.
 */
export interface CryptoAssetWithSparkline extends CryptoAsset {
  sparkline7d: number[]
}

const SPARKLINE_CACHE_KEY = 'cg_sparkline_data_v1'

export async function fetchCryptoMarketDataWithSparklines(limit = 10): Promise<CryptoAssetWithSparkline[]> {
  const url =
    `${COINGECKO_API_BASE}/coins/markets?` +
    new URLSearchParams({
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: String(limit + 20), // fetch extra to account for stablecoin filtering
      page: '1',
      sparkline: 'true',
      price_change_percentage: '24h',
    })

  try {
    const response = await fetchWithRetry(url)
    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`)

    const raw: CoinGeckoMarketData[] = await response.json()

    const assets: CryptoAssetWithSparkline[] = raw
      .filter(coin => {
        if (STABLECOIN_IDS.includes(coin.id)) return false
        if (STABLECOIN_SYMBOLS.includes(coin.symbol.toUpperCase())) return false
        const lowerName = coin.name.toLowerCase()
        if (lowerName.includes('usd') && (lowerName.includes('stable') || lowerName.includes('dollar'))) return false
        return true
      })
      .slice(0, limit)
      .map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h || 0,
        volume24h: coin.total_volume,
        marketCap: coin.market_cap,
        sparkline7d: coin.sparkline_in_7d?.price ?? [],
      }))

    writeCache<CryptoAssetWithSparkline[]>(SPARKLINE_CACHE_KEY, assets)
    return assets
  } catch (error) {
    console.warn('fetchCryptoMarketDataWithSparklines: live fetch failed, using fallback.', error)

    const cached = readCache<CryptoAssetWithSparkline[]>(SPARKLINE_CACHE_KEY)
    if (cached) return cached.data

    // Return fallback assets with empty sparklines
    return FALLBACK_ASSETS.slice(0, limit).map(a => ({ ...a, sparkline7d: [] }))
  }
}

/**
 * Fetch a single cryptocurrency data.
 * Falls back to localStorage cache or a matching FALLBACK_ASSETS entry on error.
 */
export async function fetchSingleCryptoData(coinId: string): Promise<CryptoAsset> {
  const url =
    `${COINGECKO_API_BASE}/coins/markets?` +
    new URLSearchParams({
      vs_currency: 'usd',
      ids: coinId,
      order: 'market_cap_desc',
      per_page: '1',
      page: '1',
      sparkline: 'false',
      price_change_percentage: '24h',
    })

  try {
    const response = await fetchWithRetry(url)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data: CoinGeckoMarketData[] = await response.json()
    const coin = data[0]

    return {
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
    }
  } catch (error) {
    console.warn(`fetchSingleCryptoData: failed for ${coinId}, using fallback.`, error)

    // Try to find in market cache first
    const cached = readCache<CoinGeckoMarketData[]>(MARKET_CACHE_KEY)
    if (cached) {
      const found = cached.data.find((c) => c.id === coinId)
      if (found) {
        return {
          id: found.id,
          symbol: found.symbol.toUpperCase(),
          name: found.name,
          price: found.current_price,
          change24h: found.price_change_percentage_24h || 0,
          volume24h: found.total_volume,
          marketCap: found.market_cap,
        }
      }
    }

    // Static fallback
    const fallback = FALLBACK_ASSETS.find((a) => a.id === coinId)
    if (fallback) return fallback

    throw new Error(`No data available for ${coinId}`)
  }
}

/**
 * Fetch global market data.
 * Falls back to localStorage cache or a reasonable static snapshot on error.
 */
export async function fetchGlobalMarketData(): Promise<MarketSnapshot> {
  try {
    const response = await fetchWithRetry(`${COINGECKO_API_BASE}/global`)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const { data }: CoinGeckoGlobalData = await response.json()

    const volatilityIndex = 100 - data.market_cap_percentage.btc
    const snapshot: MarketSnapshot = {
      totalMarketCap: data.total_market_cap.usd,
      btcDominance: data.market_cap_percentage.btc,
      volatilityIndex,
      timestamp: new Date(),
    }

    writeCache<MarketSnapshot>(GLOBAL_CACHE_KEY, snapshot)
    return snapshot
  } catch (error) {
    console.warn('fetchGlobalMarketData: live fetch failed, using fallback.', error)

    const cached = readCache<MarketSnapshot>(GLOBAL_CACHE_KEY)
    if (cached) {
      return { ...cached.data, timestamp: new Date(cached.timestamp) }
    }

    // Static fallback
    return {
      totalMarketCap: 2.65e12,
      btcDominance: 52.4,
      volatilityIndex: 47.6,
      timestamp: new Date(),
    }
  }
}

/**
 * Fetch historical price data for a cryptocurrency
 * @param coinId - CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
 * @param days - Number of days of historical data (1, 7, 14, 30, 90, 180, 365, max)
 */
export async function fetchHistoricalPriceData(
  coinId: string,
  days: number = 30
): Promise<{ date: Date; price: number }[]> {
  try {
    const response = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/${coinId}/market_chart?` +
      new URLSearchParams({
        vs_currency: 'usd',
        days: days.toString(),
        interval: days <= 1 ? 'hourly' : 'daily',
      })
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()

    return data.prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp),
      price,
    }))
  } catch (error) {
    console.error(`Error fetching historical data for ${coinId}:`, error)
    throw error
  }
}

/**
 * Search for cryptocurrencies by name or symbol
 */
export async function searchCryptocurrencies(query: string): Promise<CryptoAsset[]> {
  try {
    const response = await fetchWithRetry(`${COINGECKO_API_BASE}/search?query=${encodeURIComponent(query)}`)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Get market data for the search results
    const coinIds = data.coins.slice(0, 10).map((coin: any) => coin.id).join(',')
    
    if (!coinIds) return []

    const marketResponse = await fetchWithRetry(
      `${COINGECKO_API_BASE}/coins/markets?` +
      new URLSearchParams({
        vs_currency: 'usd',
        ids: coinIds,
        order: 'market_cap_desc',
        per_page: '10',
        page: '1',
        sparkline: 'false',
        price_change_percentage: '24h',
      })
    )

    if (!marketResponse.ok) {
      throw new Error(`CoinGecko API error: ${marketResponse.status}`)
    }

    const marketData: CoinGeckoMarketData[] = await marketResponse.json()

    return marketData.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
    }))
  } catch (error) {
    console.error('Error searching cryptocurrencies:', error)
    throw error
  }
}

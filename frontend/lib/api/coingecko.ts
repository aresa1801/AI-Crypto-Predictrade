/**
 * CoinGecko API Service
 * Free API for cryptocurrency market data
 * API Docs: https://www.coingecko.com/en/api/documentation
 */

import { CryptoAsset, MarketSnapshot } from '../types'

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3'

// Popular cryptocurrencies to track
const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'cardano', 'ripple', 'polkadot', 'avalanche-2', 'chainlink']

export interface CoinGeckoMarketData {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h: number
  total_volume: number
  market_cap: number
  image: string
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

/**
 * Fetch market data for multiple cryptocurrencies
 */
export async function fetchCryptoMarketData(): Promise<CryptoAsset[]> {
  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/markets?` +
      new URLSearchParams({
        vs_currency: 'usd',
        ids: CRYPTO_IDS.join(','),
        order: 'market_cap_desc',
        per_page: '10',
        page: '1',
        sparkline: 'false',
        price_change_percentage: '24h',
      })
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data: CoinGeckoMarketData[] = await response.json()

    return data.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
    }))
  } catch (error) {
    console.error('Error fetching crypto market data:', error)
    throw error
  }
}

/**
 * Fetch a single cryptocurrency data
 */
export async function fetchSingleCryptoData(coinId: string): Promise<CryptoAsset> {
  try {
    const response = await fetch(
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
    )

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
    console.error(`Error fetching crypto data for ${coinId}:`, error)
    throw error
  }
}

/**
 * Fetch global market data
 */
export async function fetchGlobalMarketData(): Promise<MarketSnapshot> {
  try {
    const response = await fetch(`${COINGECKO_API_BASE}/global`)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const { data }: CoinGeckoGlobalData = await response.json()

    // Calculate volatility index based on BTC dominance changes
    // Lower BTC dominance typically means higher altcoin volatility
    const volatilityIndex = 100 - data.market_cap_percentage.btc

    return {
      totalMarketCap: data.total_market_cap.usd,
      btcDominance: data.market_cap_percentage.btc,
      volatilityIndex,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('Error fetching global market data:', error)
    throw error
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
    const response = await fetch(
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
    const response = await fetch(`${COINGECKO_API_BASE}/search?query=${encodeURIComponent(query)}`)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Get market data for the search results
    const coinIds = data.coins.slice(0, 10).map((coin: any) => coin.id).join(',')
    
    if (!coinIds) return []

    const marketResponse = await fetch(
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

/**
 * Polymarket Gamma API Service
 * Public API – no authentication required.
 * Docs: https://docs.polymarket.com/
 */

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'
const CLOB_API_BASE  = 'https://clob.polymarket.com'

const PM_CACHE_KEY  = 'pm_markets_v1'
const PM_CACHE_TTL  = 5 * 60 * 1000   // 5 minutes
const REQUEST_TIMEOUT = 12_000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PolymarketToken {
  token_id: string
  outcome: string
  price: number
  winner?: boolean
}

export interface PolymarketMarket {
  id: string
  question: string
  category: string
  endDate: string
  totalVolume: number
  yesPrice: number
  noPrice: number
  participants: number
  aiRecommendation: 'YES' | 'NO' | 'NEUTRAL'
  aiConfidence: number
  conditionId: string
  active: boolean
}

interface GammaMarket {
  id: string
  question: string
  end_date_iso?: string
  volume?: string | number
  active?: boolean
  closed?: boolean
  tags?: { label: string }[]
  tokens: GammaToken[]
  /** number of unique traders */
  unique_traders_count?: number
}

interface GammaToken {
  token_id: string
  outcome: string
  price: number
  winner?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  return Date.now() - entry.timestamp < PM_CACHE_TTL
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    })
  } finally {
    clearTimeout(id)
  }
}

// ---------------------------------------------------------------------------
// Derive AI recommendation from market price
// Pure function based on market probabilities – no random values.
// ---------------------------------------------------------------------------
function deriveAIRecommendation(
  yesPrice: number,
): { aiRecommendation: 'YES' | 'NO' | 'NEUTRAL'; aiConfidence: number } {
  if (yesPrice >= 0.65) return { aiRecommendation: 'YES', aiConfidence: Math.round(yesPrice * 100) }
  if (yesPrice <= 0.35) return { aiRecommendation: 'NO',  aiConfidence: Math.round((1 - yesPrice) * 100) }
  return { aiRecommendation: 'NEUTRAL', aiConfidence: 50 }
}

// ---------------------------------------------------------------------------
// Parse Gamma API response
// ---------------------------------------------------------------------------
function parseGammaMarkets(markets: GammaMarket[]): PolymarketMarket[] {
  return markets
    .filter(m => m.tokens && m.tokens.length >= 2)
    .map(m => {
      const yesToken = m.tokens.find(t => t.outcome.toUpperCase() === 'YES') ?? m.tokens[0]
      const noToken  = m.tokens.find(t => t.outcome.toUpperCase() === 'NO')  ?? m.tokens[1]

      const yesPrice = Math.max(0, Math.min(1, yesToken.price ?? 0.5))
      const noPrice  = Math.max(0, Math.min(1, noToken.price ?? (1 - yesPrice)))

      const totalVolume = typeof m.volume === 'string'
        ? parseFloat(m.volume) || 0
        : (m.volume ?? 0)

      const category = m.tags?.[0]?.label ?? 'Crypto'
      const { aiRecommendation, aiConfidence } = deriveAIRecommendation(yesPrice)

      return {
        id: m.id,
        question: m.question,
        category,
        endDate: m.end_date_iso ?? '',
        totalVolume,
        yesPrice,
        noPrice,
        participants: m.unique_traders_count ?? 0,
        aiRecommendation,
        aiConfidence,
        conditionId: m.id,
        active: m.active !== false && !m.closed,
      }
    })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch live crypto prediction markets from Polymarket Gamma API.
 * Returns up to `limit` open markets tagged with crypto-related topics.
 * Falls back to localStorage cache then an empty array.
 * Never throws.
 */
export async function fetchPolymarketCryptoMarkets(limit = 6): Promise<PolymarketMarket[]> {
  // Serve from cache if still fresh
  const cached = readCache<PolymarketMarket[]>(PM_CACHE_KEY)
  if (cached && isFresh(cached)) return cached.data.slice(0, limit)

  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    tag_slug: 'crypto',
    limit: String(limit + 10),
    order: 'volume',
    ascending: 'false',
  })

  try {
    const res = await fetchWithTimeout(`${GAMMA_API_BASE}/markets?${params}`)

    if (!res.ok) throw new Error(`Polymarket API error: ${res.status}`)

    const data: GammaMarket[] = await res.json()
    const markets = parseGammaMarkets(data).slice(0, limit)

    writeCache(PM_CACHE_KEY, markets)
    return markets
  } catch (error) {
    console.warn('fetchPolymarketCryptoMarkets: live fetch failed, using cache.', error)

    if (cached) return cached.data.slice(0, limit)
    return []
  }
}

/**
 * Supabase data-access layer for the Live Trading feature.
 *
 * Stores CEX API keys, live trades, trading settings, and auto-trade logs
 * in dedicated tables that are completely separate from the Demo Account.
 *
 * A `session_id` (UUID persisted in localStorage) scopes all data to the
 * current browser session. If Supabase is not configured every function
 * returns a safe no-op / empty result so the page still renders.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Session management (shared key with demo to keep same user identity)
// ---------------------------------------------------------------------------

const LIVE_SESSION_KEY = 'live_trading_session_id'

export function getLiveSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(LIVE_SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(LIVE_SESSION_KEY, id)
  }
  return id
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LiveTradeStatus = 'open' | 'closed_tp' | 'closed_sl' | 'closed_manual'
export type LiveTradeMode = 'manual' | 'auto'

export interface LiveApiKey {
  id: string
  sessionId: string
  exchange: string
  apiKey: string
  apiSecret: string
  passphrase: string
  label: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface LiveTrade {
  id: string
  exchange: string
  asset: string
  symbol: string
  entryPrice: number
  exitPrice: number
  capitalUsed: number
  quantity: number
  pnl: number
  pnlPct: number
  status: LiveTradeStatus
  tradeMode: LiveTradeMode
  targetExit: number
  stopLoss: number
  signal: string
  openedAt: Date
  closedAt?: Date
  fees: number
  orderId?: string
}

export interface LiveTradingSettings {
  capital: number
  pctPerTrade: number
  defaultExchange: string
  riskLevel: 'low' | 'medium' | 'high'
  enableAutoTrade: boolean
  maxOpenTrades: number
}

export interface LiveAutoLogEntry {
  id: string
  timestamp: Date
  message: string
  type: 'info' | 'success' | 'error' | 'skip' | 'warning'
  exchange?: string
  symbol?: string
}

// ---------------------------------------------------------------------------
// live_trading_settings
// ---------------------------------------------------------------------------

export async function saveLiveTradingSettings(settings: LiveTradingSettings): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sessionId = getLiveSessionId()
  await supabase.from('live_trading_settings').upsert(
    {
      session_id: sessionId,
      capital: settings.capital,
      pct_per_trade: settings.pctPerTrade,
      default_exchange: settings.defaultExchange,
      risk_level: settings.riskLevel,
      enable_auto_trade: settings.enableAutoTrade,
      max_open_trades: settings.maxOpenTrades,
    },
    { onConflict: 'session_id' },
  )
}

export async function loadLiveTradingSettings(): Promise<LiveTradingSettings | null> {
  if (!isSupabaseConfigured()) return null
  const sessionId = getLiveSessionId()
  const { data, error } = await supabase
    .from('live_trading_settings')
    .select('capital, pct_per_trade, default_exchange, risk_level, enable_auto_trade, max_open_trades')
    .eq('session_id', sessionId)
    .single()
  if (error || !data) return null
  return {
    capital: Number(data.capital),
    pctPerTrade: Number(data.pct_per_trade),
    defaultExchange: data.default_exchange ?? 'binance',
    riskLevel: (data.risk_level ?? 'medium') as LiveTradingSettings['riskLevel'],
    enableAutoTrade: Boolean(data.enable_auto_trade),
    maxOpenTrades: Number(data.max_open_trades ?? 3),
  }
}

// ---------------------------------------------------------------------------
// live_api_keys
// ---------------------------------------------------------------------------

export async function saveLiveApiKey(key: Omit<LiveApiKey, 'sessionId' | 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sessionId = getLiveSessionId()
  await supabase.from('live_api_keys').upsert(
    {
      id: key.id,
      session_id: sessionId,
      exchange: key.exchange,
      api_key: key.apiKey,
      api_secret: key.apiSecret,
      passphrase: key.passphrase,
      label: key.label,
      is_active: key.isActive,
    },
    { onConflict: 'id' },
  )
}

export async function loadLiveApiKeys(): Promise<LiveApiKey[]> {
  if (!isSupabaseConfigured()) return []
  const sessionId = getLiveSessionId()
  const { data, error } = await supabase
    .from('live_api_keys')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map(row => ({
    id: row.id,
    sessionId: row.session_id,
    exchange: row.exchange,
    apiKey: row.api_key,
    apiSecret: row.api_secret,
    passphrase: row.passphrase ?? '',
    label: row.label ?? '',
    isActive: Boolean(row.is_active),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }))
}

export async function deleteLiveApiKey(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  await supabase.from('live_api_keys').delete().eq('id', id)
}

// ---------------------------------------------------------------------------
// live_trades
// ---------------------------------------------------------------------------

export async function saveLiveTrade(trade: LiveTrade): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sessionId = getLiveSessionId()
  await supabase.from('live_trades').upsert(
    {
      id: trade.id,
      session_id: sessionId,
      exchange: trade.exchange,
      asset: trade.asset,
      symbol: trade.symbol,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      capital_used: trade.capitalUsed,
      quantity: trade.quantity,
      pnl: trade.pnl,
      pnl_pct: trade.pnlPct,
      status: trade.status,
      trade_mode: trade.tradeMode,
      target_exit: trade.targetExit,
      stop_loss: trade.stopLoss,
      signal: trade.signal,
      opened_at: trade.openedAt.toISOString(),
      closed_at: trade.closedAt?.toISOString() ?? null,
      fees: trade.fees,
      order_id: trade.orderId ?? null,
    },
    { onConflict: 'id' },
  )
}

export async function updateLiveTrade(
  id: string,
  patch: Partial<Pick<LiveTrade, 'pnl' | 'pnlPct' | 'status' | 'exitPrice' | 'closedAt' | 'fees'>>,
): Promise<void> {
  if (!isSupabaseConfigured()) return
  const update: Record<string, unknown> = {}
  if (patch.pnl !== undefined) update.pnl = patch.pnl
  if (patch.pnlPct !== undefined) update.pnl_pct = patch.pnlPct
  if (patch.status !== undefined) update.status = patch.status
  if (patch.exitPrice !== undefined) update.exit_price = patch.exitPrice
  if (patch.closedAt !== undefined) update.closed_at = patch.closedAt?.toISOString() ?? null
  if (patch.fees !== undefined) update.fees = patch.fees
  await supabase.from('live_trades').update(update).eq('id', id)
}

export async function deleteLiveTrade(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  await supabase.from('live_trades').delete().eq('id', id)
}

export async function loadLiveTrades(): Promise<LiveTrade[]> {
  if (!isSupabaseConfigured()) return []
  const sessionId = getLiveSessionId()
  const { data, error } = await supabase
    .from('live_trades')
    .select('*')
    .eq('session_id', sessionId)
    .order('opened_at', { ascending: false })
  if (error || !data) return []
  return data.map(row => ({
    id: row.id,
    exchange: row.exchange,
    asset: row.asset,
    symbol: row.symbol,
    entryPrice: Number(row.entry_price),
    exitPrice: Number(row.exit_price),
    capitalUsed: Number(row.capital_used),
    quantity: Number(row.quantity),
    pnl: Number(row.pnl),
    pnlPct: Number(row.pnl_pct),
    status: row.status as LiveTradeStatus,
    tradeMode: row.trade_mode as LiveTradeMode,
    targetExit: Number(row.target_exit),
    stopLoss: Number(row.stop_loss),
    signal: row.signal ?? '',
    openedAt: new Date(row.opened_at),
    closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
    fees: Number(row.fees ?? 0),
    orderId: row.order_id ?? undefined,
  }))
}

// ---------------------------------------------------------------------------
// live_auto_logs
// ---------------------------------------------------------------------------

export async function saveLiveAutoLog(entry: LiveAutoLogEntry): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sessionId = getLiveSessionId()
  await supabase.from('live_auto_logs').insert({
    id: entry.id,
    session_id: sessionId,
    message: entry.message,
    log_type: entry.type,
    exchange: entry.exchange ?? null,
    symbol: entry.symbol ?? null,
    created_at: entry.timestamp.toISOString(),
  })
}

export async function loadLiveAutoLogs(): Promise<LiveAutoLogEntry[]> {
  if (!isSupabaseConfigured()) return []
  const sessionId = getLiveSessionId()
  const { data, error } = await supabase
    .from('live_auto_logs')
    .select('id, message, log_type, exchange, symbol, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error || !data) return []
  return data.map(row => ({
    id: row.id,
    timestamp: new Date(row.created_at),
    message: row.message,
    type: row.log_type as LiveAutoLogEntry['type'],
    exchange: row.exchange ?? undefined,
    symbol: row.symbol ?? undefined,
  }))
}

export async function clearLiveAutoLogs(): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sessionId = getLiveSessionId()
  await supabase.from('live_auto_logs').delete().eq('session_id', sessionId)
}

// ---------------------------------------------------------------------------
// SQL Editor — execute arbitrary SQL against the live trading tables
// ---------------------------------------------------------------------------

/**
 * Executes a raw SQL query using Supabase's rpc endpoint.
 * Requires a `execute_sql` Postgres function to be created in the database.
 * Only SELECT statements are allowed from the client side.
 */
export async function executeLiveSql(sql: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' }
  }
  try {
    const { data, error } = await supabase.rpc('execute_sql', { query: sql })
    if (error) return { error: error.message }
    if (!data || !Array.isArray(data) || data.length === 0) return { columns: [], rows: [] }
    const columns = Object.keys(data[0])
    return { columns, rows: data as Record<string, unknown>[] }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/**
 * Supabase data-access layer for the Demo Account feature.
 *
 * All operations are scoped to a `session_id` (a UUID generated once per
 * browser and stored in localStorage) so different visitors never share data.
 *
 * If Supabase is not configured (env vars missing) every function returns a
 * safe no-op / empty result so the page keeps working with in-memory state.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { DemoTrade, AutoTradeLogEntry } from '@/app/(app)/demo-account/page'

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

const SESSION_KEY = 'demo_session_id'

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

// ---------------------------------------------------------------------------
// demo_accounts — capital settings
// ---------------------------------------------------------------------------

export interface DemoAccountSettings {
  capital: number
  pctPerTrade: number
  maxAutoTrades: number
  riskLevel: 'low' | 'medium' | 'high'
  scanIntervalSeconds: number
  minSignalFilter: 'STRONG_BUY' | 'BUY'
}

/** Upsert capital settings for the current session. */
export async function saveDemoAccountSettings(settings: DemoAccountSettings): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sessionId = getSessionId()
  await supabase.from('demo_accounts').upsert(
    {
      session_id: sessionId,
      capital: settings.capital,
      pct_per_trade: settings.pctPerTrade,
      max_auto_trades: settings.maxAutoTrades,
      risk_level: settings.riskLevel,
      scan_interval_seconds: settings.scanIntervalSeconds,
      min_signal_filter: settings.minSignalFilter,
    },
    { onConflict: 'session_id' },
  )
}

/** Load capital settings for the current session. Returns null when not found. */
export async function loadDemoAccountSettings(): Promise<DemoAccountSettings | null> {
  if (!isSupabaseConfigured()) return null
  const sessionId = getSessionId()
  const { data, error } = await supabase
    .from('demo_accounts')
    .select('capital, pct_per_trade, max_auto_trades, risk_level, scan_interval_seconds, min_signal_filter')
    .eq('session_id', sessionId)
    .single()
  if (error || !data) return null
  return {
    capital: Number(data.capital),
    pctPerTrade: Number(data.pct_per_trade),
    maxAutoTrades: Number(data.max_auto_trades ?? 3),
    riskLevel: (data.risk_level ?? 'medium') as 'low' | 'medium' | 'high',
    scanIntervalSeconds: Number(data.scan_interval_seconds ?? 300),
    minSignalFilter: (data.min_signal_filter ?? 'STRONG_BUY') as 'STRONG_BUY' | 'BUY',
  }
}

// ---------------------------------------------------------------------------
// demo_trades
// ---------------------------------------------------------------------------

/** Persist a new trade row. Ensures the parent demo_account row exists first. */
export async function saveDemoTrade(trade: DemoTrade): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sessionId = getSessionId()

  // Ensure the session row exists (upsert is a no-op when already present)
  await supabase.from('demo_accounts').upsert(
    { session_id: sessionId },
    { onConflict: 'session_id', ignoreDuplicates: true },
  )

  await supabase.from('demo_trades').upsert({
    id: trade.id,
    session_id: sessionId,
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
  })
}

/** Update mutable fields of an existing trade (pnl, status, closed_at). */
export async function updateDemoTrade(
  id: string,
  patch: Pick<DemoTrade, 'pnl' | 'pnlPct' | 'status' | 'exitPrice' | 'closedAt'>,
): Promise<void> {
  if (!isSupabaseConfigured()) return
  await supabase
    .from('demo_trades')
    .update({
      pnl: patch.pnl,
      pnl_pct: patch.pnlPct,
      status: patch.status,
      exit_price: patch.exitPrice,
      closed_at: patch.closedAt?.toISOString() ?? null,
    })
    .eq('id', id)
}

/** Delete a trade by id. */
export async function deleteDemoTrade(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  await supabase.from('demo_trades').delete().eq('id', id)
}

/** Load all trades for the current session, newest first. */
export async function loadDemoTrades(): Promise<DemoTrade[]> {
  if (!isSupabaseConfigured()) return []
  const sessionId = getSessionId()
  const { data, error } = await supabase
    .from('demo_trades')
    .select('*')
    .eq('session_id', sessionId)
    .order('opened_at', { ascending: false })
  if (error || !data) return []

  return data.map(row => ({
    id: row.id,
    asset: row.asset,
    symbol: row.symbol,
    entryPrice: Number(row.entry_price),
    exitPrice: Number(row.exit_price),
    capitalUsed: Number(row.capital_used),
    quantity: Number(row.quantity),
    pnl: Number(row.pnl),
    pnlPct: Number(row.pnl_pct),
    status: row.status as DemoTrade['status'],
    tradeMode: row.trade_mode as DemoTrade['tradeMode'],
    targetExit: Number(row.target_exit),
    stopLoss: Number(row.stop_loss),
    signal: row.signal ?? '',
    openedAt: new Date(row.opened_at),
    closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
  }))
}

// ---------------------------------------------------------------------------
// demo_auto_logs
// ---------------------------------------------------------------------------

/** Append an auto-trade log entry. */
export async function saveAutoLog(entry: AutoTradeLogEntry): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sessionId = getSessionId()

  await supabase.from('demo_accounts').upsert(
    { session_id: sessionId },
    { onConflict: 'session_id', ignoreDuplicates: true },
  )

  await supabase.from('demo_auto_logs').insert({
    id: entry.id,
    session_id: sessionId,
    message: entry.message,
    log_type: entry.type,
    created_at: entry.timestamp.toISOString(),
  })
}

/** Load the last 100 auto-trade log entries for the current session. */
export async function loadAutoLogs(): Promise<AutoTradeLogEntry[]> {
  if (!isSupabaseConfigured()) return []
  const sessionId = getSessionId()
  const { data, error } = await supabase
    .from('demo_auto_logs')
    .select('id, message, log_type, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error || !data) return []

  return data.map(row => ({
    id: row.id,
    timestamp: new Date(row.created_at),
    message: row.message,
    type: row.log_type as AutoTradeLogEntry['type'],
  }))
}

/** Clear all auto-trade logs for the current session. */
export async function clearAutoLogs(): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sessionId = getSessionId()
  await supabase.from('demo_auto_logs').delete().eq('session_id', sessionId)
}

// ---------------------------------------------------------------------------
// Backend bot integration
// ---------------------------------------------------------------------------

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? ''

/** Start the server-side auto-trade bot. Returns true on success. */
export async function startServerBot(opts: {
  capital: number
  pctPerTrade: number
  maxAutoTrades: number
}): Promise<boolean> {
  if (!BACKEND_URL) return false
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/demo/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        capital: opts.capital,
        pct_per_trade: opts.pctPerTrade,
        max_auto_trades: opts.maxAutoTrades,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Stop the server-side auto-trade bot. Returns true on success. */
export async function stopServerBot(): Promise<boolean> {
  if (!BACKEND_URL) return false
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/demo/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: getSessionId() }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Get server-side bot status. */
export async function getServerBotStatus(): Promise<{ is_running: boolean; started_at: string | null } | null> {
  if (!BACKEND_URL) return null
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/demo/status/${getSessionId()}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

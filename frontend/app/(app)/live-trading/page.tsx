'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Rocket, TrendingDown, DollarSign, Percent,
  ShoppingCart, History, Trophy, Target, AlertTriangle, Plus,
  CheckCircle2, XCircle, Clock, RefreshCw, Wallet, BarChart2,
  ArrowUpRight, ArrowDownRight, X, Bot, Play, Square, Activity,
  ChevronRight, Zap, Key, Eye, EyeOff, Trash2, Database,
  Terminal, Copy, Check, Shield, AlertCircle, Settings, StopCircle,
  Radio, Timer, Filter,
} from 'lucide-react'
import { fetchOpportunityBuys, OpportunityAsset, formatPrice } from '@/lib/api/opportunity-buy'
import { fetchAIPredictionsWithMeta } from '@/lib/api/predictions'
import { fetchGlobalMarketData } from '@/lib/api/coingecko'
import {
  loadLiveTrades,
  saveLiveTrade,
  updateLiveTrade,
  deleteLiveTrade,
  loadLiveTradingSettings,
  saveLiveTradingSettings,
  loadLiveAutoLogs,
  saveLiveAutoLog,
  clearLiveAutoLogs,
  loadLiveApiKeys,
  saveLiveApiKey,
  deleteLiveApiKey,
  executeLiveSql,
  LiveTrade,
  LiveAutoLogEntry,
  LiveApiKey,
  LiveTradingSettings,
} from '@/lib/api/live-trading'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CEX_LIST = [
  { id: 'binance',  name: 'Binance',  logo: '🟡', color: 'from-yellow-500/20 to-yellow-400/10 border-yellow-500/30 text-yellow-400', needsPassphrase: false },
  { id: 'bybit',    name: 'Bybit',    logo: '🟠', color: 'from-orange-500/20 to-orange-400/10 border-orange-500/30 text-orange-400', needsPassphrase: false },
  { id: 'okx',      name: 'OKX',      logo: '⚫', color: 'from-slate-500/20 to-slate-400/10 border-slate-400/30 text-slate-300',     needsPassphrase: true  },
  { id: 'kraken',   name: 'Kraken',   logo: '🟣', color: 'from-purple-500/20 to-purple-400/10 border-purple-500/30 text-purple-400', needsPassphrase: false },
  { id: 'coinbase', name: 'Coinbase', logo: '🔵', color: 'from-blue-500/20 to-blue-400/10 border-blue-500/30 text-blue-400',         needsPassphrase: true  },
  { id: 'kucoin',   name: 'KuCoin',   logo: '🟢', color: 'from-emerald-500/20 to-emerald-400/10 border-emerald-500/30 text-emerald-400', needsPassphrase: true },
  { id: 'gateio',   name: 'Gate.io',  logo: '🔴', color: 'from-red-500/20 to-red-400/10 border-red-500/30 text-red-400',             needsPassphrase: false },
  { id: 'mexc',     name: 'MEXC',     logo: '🔷', color: 'from-cyan-500/20 to-cyan-400/10 border-cyan-500/30 text-cyan-400',         needsPassphrase: false },
  { id: 'bitget',   name: 'Bitget',   logo: '🟦', color: 'from-indigo-500/20 to-indigo-400/10 border-indigo-500/30 text-indigo-400', needsPassphrase: true  },
]

const SQL_EXAMPLES = [
  {
    label: 'All Live Trades',
    sql: 'SELECT id, exchange, symbol, status, entry_price, exit_price, pnl, pnl_pct, opened_at FROM live_trades ORDER BY opened_at DESC LIMIT 50',
  },
  {
    label: 'Open Trades',
    sql: "SELECT id, exchange, symbol, capital_used, quantity, target_exit, stop_loss, opened_at FROM live_trades WHERE status = 'open' ORDER BY opened_at DESC",
  },
  {
    label: 'PnL Summary',
    sql: "SELECT exchange, COUNT(*) AS trades, SUM(pnl) AS total_pnl, AVG(pnl_pct) AS avg_pnl_pct FROM live_trades WHERE status != 'open' GROUP BY exchange ORDER BY total_pnl DESC",
  },
  {
    label: 'API Keys',
    sql: "SELECT id, exchange, label, is_active, created_at FROM live_api_keys ORDER BY created_at DESC",
  },
  {
    label: 'Recent Logs',
    sql: "SELECT created_at, log_type, exchange, symbol, message FROM live_auto_logs ORDER BY created_at DESC LIMIT 100",
  },
  {
    label: 'Win/Loss by Exchange',
    sql: "SELECT exchange, COUNT(*) FILTER (WHERE status = 'closed_tp') AS wins, COUNT(*) FILTER (WHERE status = 'closed_sl') AS losses FROM live_trades GROUP BY exchange",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUSDT(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}
function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, sub, gradient, valueColor }: {
  icon: React.ElementType; label: string; value: string; sub?: string; gradient: string; valueColor?: string
}) {
  return (
    <div className="card-gradient flex items-center gap-4 p-4">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className={`text-xl font-bold ${valueColor ?? 'text-text-primary'}`}>{value}</div>
        <div className="text-xs text-text-secondary">{label}</div>
        {sub && <div className="text-[10px] text-text-secondary/60 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function WinRateRing({ rate }: { rate: number }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const fill = (rate / 100) * circ
  const color = rate >= 60 ? '#00C182' : rate >= 45 ? '#EAA000' : '#F83C54'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(22 42 78 / 0.8)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform="rotate(-90 40 40)" />
        <text x="40" y="44" textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="monospace">
          {rate.toFixed(0)}%
        </text>
      </svg>
      <span className="text-xs text-text-secondary">Win Rate</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
type Tab = 'trading' | 'api-keys' | 'sql-editor'

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function LiveTradingPage() {
  // Active tab
  const [activeTab, setActiveTab] = useState<Tab>('trading')

  // Settings
  const [capital, setCapital] = useState(1000)
  const [capitalInput, setCapitalInput] = useState('1000')
  const [pctPerTrade, setPctPerTrade] = useState(5)
  const [pctInput, setPctInput] = useState('5')
  const [defaultExchange, setDefaultExchange] = useState('binance')
  const [riskLevel, setRiskLevel] = useState<LiveTradingSettings['riskLevel']>('medium')

  // Trades
  const [trades, setTrades] = useState<LiveTrade[]>([])

  // Trade mode
  const [tradeMode, setTradeMode] = useState<'manual' | 'auto'>('manual')

  // Opportunity Buy data
  const [opportunities, setOpportunities] = useState<OpportunityAsset[]>([])
  const [loadingOpp, setLoadingOpp] = useState(true)

  // Dashboard market data
  const [marketData, setMarketData] = useState<{ btcDominance: string; totalMarketCap: string } | null>(null)

  // AI Predictions
  const [predictions, setPredictions] = useState<{ total: number; bullish: number; avgConf: string } | null>(null)

  // Manual trade
  const [selectedOpp, setSelectedOpp] = useState<OpportunityAsset | null>(null)
  const [exitPrice, setExitPrice] = useState('')
  const [execError, setExecError] = useState('')

  // Auto Trade (one-shot helper flag — reused internally)
  const [autoRunning, setAutoRunning] = useState(false)
  const [maxAutoTrades, setMaxAutoTrades] = useState(3)
  const [autoLog, setAutoLog] = useState<LiveAutoLogEntry[]>([])

  // Auto Trade Bot (continuous mode)
  const [autoBotActive, setAutoBotActive] = useState(false)
  const [botScanning, setBotScanning] = useState(false)
  const [nextCheckIn, setNextCheckIn] = useState(0)
  const [scanInterval, setScanInterval] = useState(60) // seconds
  const [minSignalFilter, setMinSignalFilter] = useState<'STRONG_BUY' | 'BUY'>('STRONG_BUY')

  // API Keys
  const [apiKeys, setApiKeys] = useState<LiveApiKey[]>([])
  const [showAddKey, setShowAddKey] = useState(false)
  const [newKeyExchange, setNewKeyExchange] = useState('')
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [newKeyApi, setNewKeyApi] = useState('')
  const [newKeySecret, setNewKeySecret] = useState('')
  const [newKeyPassphrase, setNewKeyPassphrase] = useState('')
  const [showNewSecret, setShowNewSecret] = useState(false)
  const [showNewPassphrase, setShowNewPassphrase] = useState(false)
  const [keyVisibility, setKeyVisibility] = useState<Record<string, boolean>>({})

  // SQL Editor
  const [sqlQuery, setSqlQuery] = useState(SQL_EXAMPLES[0].sql)
  const [sqlResult, setSqlResult] = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null)
  const [sqlError, setSqlError] = useState('')
  const [sqlRunning, setSqlRunning] = useState(false)
  const [sqlCopied, setSqlCopied] = useState(false)

  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoBotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoBotActiveRef = useRef(false)
  const tradesRef = useRef<LiveTrade[]>([])
  const scanningRef = useRef(false)

  // Keep refs in sync with state
  useEffect(() => { tradesRef.current = trades }, [trades])

  // ---------------------------------------------------------------------------
  // Hydrate from Supabase
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function hydrate() {
      const [settings, persistedTrades, persistedLogs, keys] = await Promise.all([
        loadLiveTradingSettings(),
        loadLiveTrades(),
        loadLiveAutoLogs(),
        loadLiveApiKeys(),
      ])
      if (settings) {
        setCapital(settings.capital)
        setCapitalInput(String(settings.capital))
        setPctPerTrade(settings.pctPerTrade)
        setPctInput(String(settings.pctPerTrade))
        setDefaultExchange(settings.defaultExchange)
        setRiskLevel(settings.riskLevel)
        setMaxAutoTrades(settings.maxOpenTrades)
      }
      if (persistedTrades.length > 0) setTrades(persistedTrades)
      if (persistedLogs.length > 0) setAutoLog(persistedLogs)
      setApiKeys(keys)
    }
    hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------
  const closedTrades = trades.filter(t => t.status !== 'open')
  const openTrades = trades.filter(t => t.status === 'open')
  const winners = closedTrades.filter(t => t.status === 'closed_tp')
  const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0
  const totalPnL = closedTrades.reduce((s, t) => s + t.pnl, 0)
  const avgPnLPct = closedTrades.length > 0
    ? closedTrades.reduce((s, t) => s + t.pnlPct, 0) / closedTrades.length : 0
  const lockedCapital = openTrades.reduce((s, t) => s + t.capitalUsed, 0)
  const availableCapital = capital + totalPnL - lockedCapital
  const capitalPerTrade = capital * (pctPerTrade / 100)
  const totalReturn = capital > 0 ? (totalPnL / capital) * 100 : 0
  const profitFactor = (() => {
    const gains = winners.reduce((s, t) => s + t.pnl, 0)
    const losses = closedTrades.filter(t => t.status !== 'closed_tp').reduce((s, t) => s + Math.abs(t.pnl), 0)
    return losses > 0 ? gains / losses : gains > 0 ? Infinity : 0
  })()
  const maxDrawdown = (() => {
    let peak = capital, maxDD = 0, running = capital
    trades.forEach(t => {
      if (t.status !== 'open') {
        running += t.pnl
        if (running > peak) peak = running
        const dd = (peak - running) / peak * 100
        if (dd > maxDD) maxDD = dd
      }
    })
    return maxDD
  })()

  // ---------------------------------------------------------------------------
  // Load market data from Dashboard API
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchGlobalMarketData().then(d => {
      setMarketData({
        btcDominance: `${d.btcDominance.toFixed(1)}%`,
        totalMarketCap: `$${(d.totalMarketCap / 1e12).toFixed(2)}T`,
      })
    }).catch(() => {})
  }, [])

  // Load AI predictions
  useEffect(() => {
    fetchAIPredictionsWithMeta().then(({ predictions: preds }) => {
      const bull = preds.filter(p => p.direction === 'bullish').length
      const avgConf = preds.length > 0
        ? (preds.reduce((s, p) => s + p.confidenceLevel, 0) / preds.length).toFixed(0)
        : '—'
      setPredictions({ total: preds.length, bullish: bull, avgConf: `${avgConf}%` })
    }).catch(() => {})
  }, [])

  // ---------------------------------------------------------------------------
  // Load Opportunity Buy
  // ---------------------------------------------------------------------------
  const loadOpportunities = useCallback(async () => {
    setLoadingOpp(true)
    try {
      const data = await fetchOpportunityBuys(false, '4h')
      setOpportunities(data.opportunities.slice(0, 10))
      setSelectedOpp(prev => {
        if (!prev && data.opportunities.length > 0) {
          setExitPrice(data.opportunities[0].entryExit.target2.toFixed(
            data.opportunities[0].asset.price > 100 ? 2 : 4,
          ))
          return data.opportunities[0]
        }
        return prev
      })
    } catch { /* silently */ } finally {
      setLoadingOpp(false)
    }
  }, [])

  useEffect(() => { loadOpportunities() }, [loadOpportunities])

  useEffect(() => {
    if (selectedOpp) {
      setExitPrice(selectedOpp.entryExit.target2.toFixed(selectedOpp.asset.price > 100 ? 2 : 4))
      setExecError('')
    }
  }, [selectedOpp])

  // ---------------------------------------------------------------------------
  // Settings persistence
  // ---------------------------------------------------------------------------
  function persistSettings(overrides: Partial<LiveTradingSettings>) {
    if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current)
    settingsSaveTimer.current = setTimeout(() => {
      saveLiveTradingSettings({
        capital,
        pctPerTrade,
        defaultExchange,
        riskLevel,
        enableAutoTrade: false,
        maxOpenTrades: maxAutoTrades,
        ...overrides,
      })
    }, 1000)
  }

  function handleCapitalChange(val: string) {
    setCapitalInput(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) { setCapital(n); persistSettings({ capital: n }) }
  }
  function handlePctChange(val: string) {
    setPctInput(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0 && n <= 100) { setPctPerTrade(n); persistSettings({ pctPerTrade: n }) }
  }

  // ---------------------------------------------------------------------------
  // Trade helpers
  // ---------------------------------------------------------------------------
  function executeBuy() {
    if (!selectedOpp) { setExecError('Please select an asset.'); return }
    const targetExit = parseFloat(exitPrice)
    if (isNaN(targetExit) || targetExit <= 0) { setExecError('Enter a valid exit price.'); return }
    if (capitalPerTrade > availableCapital) { setExecError('Insufficient available capital.'); return }
    const entry = (selectedOpp.entryExit.entryLow + selectedOpp.entryExit.entryHigh) / 2
    const qty = capitalPerTrade / entry
    const trade: LiveTrade = {
      id: `live-${Date.now()}`,
      exchange: defaultExchange,
      asset: selectedOpp.asset.name,
      symbol: selectedOpp.asset.symbol,
      entryPrice: entry,
      exitPrice: targetExit,
      capitalUsed: capitalPerTrade,
      quantity: qty,
      pnl: 0,
      pnlPct: 0,
      status: 'open',
      openedAt: new Date(),
      targetExit,
      stopLoss: selectedOpp.entryExit.stopLoss,
      signal: selectedOpp.signalStrength,
      tradeMode: 'manual',
      fees: 0,
    }
    setTrades(prev => [trade, ...prev])
    saveLiveTrade(trade)
    setExecError('')
  }

  function closeTrade(id: string, closeType: 'tp' | 'sl' | 'manual') {
    setTrades(prev => prev.map(t => {
      if (t.id !== id) return t
      const closePrice = closeType === 'tp' ? t.targetExit : t.stopLoss
      const pnl = (closePrice - t.entryPrice) * t.quantity
      const pnlPct = ((closePrice - t.entryPrice) / t.entryPrice) * 100
      const status: LiveTrade['status'] = closeType === 'tp' ? 'closed_tp' : closeType === 'sl' ? 'closed_sl' : 'closed_manual'
      const updated = { ...t, exitPrice: closePrice, pnl, pnlPct, status, closedAt: new Date() }
      updateLiveTrade(id, { pnl, pnlPct, status, exitPrice: closePrice, closedAt: updated.closedAt })
      return updated
    }))
  }

  function removeTrade(id: string) {
    setTrades(prev => prev.filter(t => t.id !== id))
    deleteLiveTrade(id)
  }

  // ---------------------------------------------------------------------------
  // Auto Trade
  // ---------------------------------------------------------------------------
  async function executeAutoTrades() {
    if (autoRunning) return
    setAutoRunning(true)
    const addLog = (message: string, type: LiveAutoLogEntry['type'], extra?: { exchange?: string; symbol?: string }) => {
      const entry: LiveAutoLogEntry = {
        id: `livelog-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        message,
        type,
        ...extra,
      }
      setAutoLog(prev => [entry, ...prev])
      saveLiveAutoLog(entry)
    }
    addLog('Live Auto Trade started — fetching signals…', 'info', { exchange: defaultExchange })
    let freshOpp = opportunities
    try {
      const data = await fetchOpportunityBuys(true, '4h')
      freshOpp = data.opportunities
      addLog(`Fetched ${freshOpp.length} Opportunity Buy signals.`, 'info')
    } catch {
      addLog('Could not refresh opportunities — using cached data.', 'warning')
    }
    const candidates = freshOpp.slice(0, maxAutoTrades)
    let remaining = availableCapital
    let executed = 0
    const newTrades: LiveTrade[] = []
    for (const opp of candidates) {
      if (remaining < capitalPerTrade) {
        addLog(`Skipped ${opp.asset.symbol}: insufficient capital ($${formatUSDT(remaining)} < $${formatUSDT(capitalPerTrade)}).`, 'skip', { symbol: opp.asset.symbol })
        continue
      }
      const entry = (opp.entryExit.entryLow + opp.entryExit.entryHigh) / 2
      const targetExit = opp.entryExit.target1
      const sl = opp.entryExit.stopLoss
      const qty = capitalPerTrade / entry
      const trade: LiveTrade = {
        id: `live-auto-${Date.now()}-${Math.random()}`,
        exchange: defaultExchange,
        asset: opp.asset.name,
        symbol: opp.asset.symbol,
        entryPrice: entry,
        exitPrice: targetExit,
        capitalUsed: capitalPerTrade,
        quantity: qty,
        pnl: 0,
        pnlPct: 0,
        status: 'open',
        openedAt: new Date(),
        targetExit,
        stopLoss: sl,
        signal: opp.signalStrength,
        tradeMode: 'auto',
        fees: 0,
      }
      newTrades.push(trade)
      remaining -= capitalPerTrade
      executed++
      addLog(
        `✅ Auto-bought ${opp.asset.symbol} @ $${formatPrice(entry)} | Exit (T1): $${formatPrice(targetExit)} | SL: $${formatPrice(sl)} | Capital: $${formatUSDT(capitalPerTrade)}`,
        'success',
        { exchange: defaultExchange, symbol: opp.asset.symbol },
      )
    }
    if (newTrades.length > 0) {
      setTrades(prev => [...newTrades].reverse().concat(prev))
      await Promise.all(newTrades.map(t => saveLiveTrade(t)))
    }
    if (executed === 0) {
      addLog('No trades were executed. Check capital or available opportunities.', 'error')
    } else {
      addLog(`Auto Trade complete — ${executed} trade(s) opened on ${defaultExchange}.`, 'info', { exchange: defaultExchange })
    }
    setAutoRunning(false)
  }

  // ---------------------------------------------------------------------------
  // Auto Trade Bot — continuous scanning loop
  // ---------------------------------------------------------------------------
  const runAutoScan = useCallback(async (
    opts: {
      exchange: string
      capitalPerTrade: number
      availableCapital: number
      maxOpenTrades: number
      minSignal: 'STRONG_BUY' | 'BUY'
    }
  ) => {
    if (scanningRef.current) return
    scanningRef.current = true
    setBotScanning(true)

    const addLog = (message: string, type: LiveAutoLogEntry['type'], extra?: { exchange?: string; symbol?: string }) => {
      const entry: LiveAutoLogEntry = {
        id: `livelog-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        message,
        type,
        ...extra,
      }
      setAutoLog(prev => [entry, ...prev])
      saveLiveAutoLog(entry)
    }

    addLog('🤖 Auto Trade Bot scanning for opportunities…', 'info', { exchange: opts.exchange })

    let freshOpps: OpportunityAsset[] = []
    try {
      const data = await fetchOpportunityBuys(true, '4h')
      freshOpps = data.opportunities
      addLog(`Fetched ${freshOpps.length} signals from Opportunity Buy engine.`, 'info')
    } catch {
      addLog('⚠️ Could not refresh opportunities — skipping this cycle.', 'warning')
      scanningRef.current = false
      setBotScanning(false)
      return
    }

    // Filter by minimum signal strength
    const signalOrder: Record<string, number> = { STRONG_BUY: 2, BUY: 1, ACCUMULATE: 0 }
    const minStrength = signalOrder[opts.minSignal] ?? 2
    const qualified = freshOpps.filter(opp => (signalOrder[opp.signalStrength] ?? 0) >= minStrength)

    if (qualified.length === 0) {
      addLog(`No ${opts.minSignal.replace('_', ' ')} signals found — will check again next cycle.`, 'info')
      scanningRef.current = false
      setBotScanning(false)
      return
    }

    // Skip assets already in an open trade
    const openSymbols = new Set(tradesRef.current.filter(t => t.status === 'open').map(t => t.symbol))
    const openCount = openSymbols.size
    const slotsAvailable = Math.max(0, opts.maxOpenTrades - openCount)

    if (slotsAvailable === 0) {
      addLog(`Max open trades (${opts.maxOpenTrades}) reached — waiting for positions to close.`, 'info')
      scanningRef.current = false
      setBotScanning(false)
      return
    }

    const candidates = qualified
      .filter(opp => !openSymbols.has(opp.asset.symbol))
      .slice(0, slotsAvailable)

    if (candidates.length === 0) {
      addLog('All qualified assets are already in open positions — skipping.', 'info')
      scanningRef.current = false
      setBotScanning(false)
      return
    }

    let remaining = opts.availableCapital
    let executed = 0
    const newTrades: LiveTrade[] = []

    for (const opp of candidates) {
      if (remaining < opts.capitalPerTrade) {
        addLog(`⏭ Skipped ${opp.asset.symbol}: insufficient capital ($${formatUSDT(remaining)} < $${formatUSDT(opts.capitalPerTrade)}).`, 'skip', { symbol: opp.asset.symbol })
        continue
      }
      const entry = (opp.entryExit.entryLow + opp.entryExit.entryHigh) / 2
      const targetExit = opp.entryExit.target1     // Auto sets T1 as exit
      const sl = opp.entryExit.stopLoss            // System-calculated stop loss
      const qty = opts.capitalPerTrade / entry
      const trade: LiveTrade = {
        id: `live-auto-${Date.now()}-${Math.random()}`,
        exchange: opts.exchange,
        asset: opp.asset.name,
        symbol: opp.asset.symbol,
        entryPrice: entry,
        exitPrice: targetExit,
        capitalUsed: opts.capitalPerTrade,
        quantity: qty,
        pnl: 0,
        pnlPct: 0,
        status: 'open',
        openedAt: new Date(),
        targetExit,
        stopLoss: sl,
        signal: opp.signalStrength,
        tradeMode: 'auto',
        fees: 0,
      }
      newTrades.push(trade)
      remaining -= opts.capitalPerTrade
      executed++
      addLog(
        `✅ Bot bought ${opp.asset.symbol} @ $${formatPrice(entry)} | T1: $${formatPrice(targetExit)} | SL: $${formatPrice(sl)} | Capital: $${formatUSDT(opts.capitalPerTrade)}`,
        'success',
        { exchange: opts.exchange, symbol: opp.asset.symbol },
      )
    }

    if (newTrades.length > 0) {
      setTrades(prev => [...newTrades].reverse().concat(prev))
      await Promise.all(newTrades.map(t => saveLiveTrade(t)))
    }

    if (executed === 0) {
      addLog('No new trades executed this cycle — insufficient capital or all slots full.', 'info')
    } else {
      addLog(`🤖 Bot opened ${executed} trade(s) on ${opts.exchange}.`, 'info', { exchange: opts.exchange })
    }

    scanningRef.current = false
    setBotScanning(false)
  }, [])  // no state deps — reads via closure params & refs

  function stopAutoBot() {
    if (autoBotIntervalRef.current) { clearInterval(autoBotIntervalRef.current); autoBotIntervalRef.current = null }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
    autoBotActiveRef.current = false
    setAutoBotActive(false)
    setNextCheckIn(0)
    setBotScanning(false)
    scanningRef.current = false
    const stopEntry: LiveAutoLogEntry = {
      id: `livelog-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      message: '🛑 Auto Trade Bot stopped by user.',
      type: 'info',
    }
    setAutoLog(prev => [stopEntry, ...prev])
    saveLiveAutoLog(stopEntry)
  }

  function startAutoBot(opts: {
    exchange: string
    capitalPerTrade: number
    availableCapital: number
    maxOpenTrades: number
    minSignal: 'STRONG_BUY' | 'BUY'
    intervalSec: number
  }) {
    if (autoBotActiveRef.current) return
    autoBotActiveRef.current = true
    setAutoBotActive(true)

    const startEntry: LiveAutoLogEntry = {
      id: `livelog-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      message: `🤖 Auto Trade Bot started — scanning every ${opts.intervalSec}s for ${opts.minSignal.replace('_', ' ')} signals on ${opts.exchange}.`,
      type: 'info',
      exchange: opts.exchange,
    }
    setAutoLog(prev => [startEntry, ...prev])
    saveLiveAutoLog(startEntry)

    // Run immediately, then on interval
    runAutoScan(opts)
    setNextCheckIn(opts.intervalSec)

    countdownIntervalRef.current = setInterval(() => {
      setNextCheckIn(prev => {
        if (prev <= 1) return opts.intervalSec
        return prev - 1
      })
    }, 1000)

    autoBotIntervalRef.current = setInterval(() => {
      if (!autoBotActiveRef.current) return
      runAutoScan(opts)
      setNextCheckIn(opts.intervalSec)
    }, opts.intervalSec * 1000)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoBotIntervalRef.current) clearInterval(autoBotIntervalRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [])


  async function handleAddApiKey() {
    if (!newKeyExchange || !newKeyApi || !newKeySecret) return
    const key: LiveApiKey = {
      id: uid(),
      sessionId: '',
      exchange: newKeyExchange,
      label: newKeyLabel || newKeyExchange,
      apiKey: newKeyApi,
      apiSecret: newKeySecret,
      passphrase: newKeyPassphrase,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await saveLiveApiKey(key)
    setApiKeys(prev => [key, ...prev])
    setNewKeyExchange(''); setNewKeyLabel(''); setNewKeyApi(''); setNewKeySecret(''); setNewKeyPassphrase('')
    setShowAddKey(false)
  }

  async function handleDeleteApiKey(id: string) {
    await deleteLiveApiKey(id)
    setApiKeys(prev => prev.filter(k => k.id !== id))
  }

  // ---------------------------------------------------------------------------
  // SQL Editor
  // ---------------------------------------------------------------------------
  async function runSql() {
    if (!sqlQuery.trim()) return
    setSqlRunning(true)
    setSqlError('')
    setSqlResult(null)
    const result = await executeLiveSql(sqlQuery)
    if ('error' in result) {
      setSqlError(result.error)
    } else {
      setSqlResult(result)
    }
    setSqlRunning(false)
  }

  function copySql() {
    navigator.clipboard.writeText(sqlQuery).then(() => {
      setSqlCopied(true)
      setTimeout(() => setSqlCopied(false), 1500)
    })
  }

  // ---------------------------------------------------------------------------
  // Tab bar
  // ---------------------------------------------------------------------------
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'trading',    label: 'Live Trading',  icon: Rocket   },
    { id: 'api-keys',   label: 'API Keys',      icon: Key      },
    { id: 'sql-editor', label: 'SQL Editor',    icon: Database },
  ]

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-4 lg:p-8 space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-red to-accent-orange flex items-center justify-center shadow-lg shadow-accent-red/30">
          <Rocket className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
            <span className="bg-gradient-to-r from-accent-red to-accent-orange bg-clip-text text-transparent">Live Trading</span>
          </h1>
          <p className="text-sm text-text-secondary">Real trades — connected to Dashboard, Risk, Predictions & Opportunity Buy data</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-red px-3 py-1.5 rounded-full bg-accent-red/10 border border-accent-red/30">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
            LIVE MODE
          </span>
        </div>
      </div>

      {/* ── Warning Banner ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-accent-amber/5 border border-accent-amber/30">
        <AlertTriangle className="w-5 h-5 text-accent-amber flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-accent-amber">Real Funds at Risk</p>
          <p className="text-xs text-text-secondary mt-0.5">
            Live Trading involves real capital. Ensure your API keys have <strong>spot-trading only</strong> permissions and
            withdrawal access <strong>disabled</strong>. Always validate signals with the Risk and Prediction pages before executing.
          </p>
        </div>
      </div>

      {/* ── Market Context (from Dashboard API) ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-gradient px-4 py-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">BTC Dominance</div>
          <div className="text-lg font-bold text-text-primary">{marketData?.btcDominance ?? '—'}</div>
        </div>
        <div className="card-gradient px-4 py-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total Mkt Cap</div>
          <div className="text-lg font-bold text-text-primary">{marketData?.totalMarketCap ?? '—'}</div>
        </div>
        <div className="card-gradient px-4 py-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">AI Signals</div>
          <div className="text-lg font-bold text-text-primary">
            {predictions ? `${predictions.bullish}/${predictions.total}` : '—'}
          </div>
          <div className="text-[10px] text-text-secondary">Bullish signals</div>
        </div>
        <div className="card-gradient px-4 py-3">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Avg Confidence</div>
          <div className="text-lg font-bold text-accent-blue">{predictions?.avgConf ?? '—'}</div>
          <div className="text-[10px] text-text-secondary">AI prediction</div>
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-secondary/50 border border-border-color/40 w-full sm:w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-accent-red/20 border border-accent-red/50 text-accent-red shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB: LIVE TRADING                                                      */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'trading' && (
        <>
          {/* Stats */}
          <section>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent-amber" /> Trade Stats
            </h2>
            <div className="card-gradient p-6 mb-4">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <WinRateRing rate={winRate} />
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                  <div className="text-center">
                    <div className="text-xl font-bold text-text-primary">{closedTrades.length}</div>
                    <div className="text-xs text-text-secondary">Total Trades</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${totalPnL >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
                      {totalPnL >= 0 ? '+' : ''}${formatUSDT(totalPnL)}
                    </div>
                    <div className="text-xs text-text-secondary">Total P&L</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${totalReturn >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
                      {formatPct(totalReturn)}
                    </div>
                    <div className="text-xs text-text-secondary">Return on Capital</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${avgPnLPct >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
                      {formatPct(avgPnLPct)}
                    </div>
                    <div className="text-xs text-text-secondary">Avg Trade Return</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Wallet} label="Available Capital" value={`$${formatUSDT(availableCapital)}`} sub="USDT free to trade"
                gradient="from-accent-blue to-accent-cyan" valueColor={availableCapital >= capital * 0.5 ? 'text-text-primary' : 'text-accent-amber'} />
              <StatCard icon={BarChart2} label="Profit Factor" value={isFinite(profitFactor) ? profitFactor.toFixed(2) : '∞'}
                sub="Gross gain / gross loss" gradient="from-accent-emerald to-accent-teal"
                valueColor={profitFactor >= 1.5 ? 'text-accent-emerald' : profitFactor < 1 ? 'text-accent-red' : 'text-accent-amber'} />
              <StatCard icon={TrendingDown} label="Max Drawdown" value={`${maxDrawdown.toFixed(1)}%`} sub="From peak equity"
                gradient="from-accent-red to-accent-orange"
                valueColor={maxDrawdown < 10 ? 'text-text-primary' : maxDrawdown < 25 ? 'text-accent-amber' : 'text-accent-red'} />
              <StatCard icon={CheckCircle2} label="Winners / Losers" value={`${winners.length} / ${closedTrades.length - winners.length}`}
                sub="Closed trades" gradient="from-accent-purple to-accent-indigo" />
            </div>
          </section>

          {/* Capital + Exchange Config */}
          <section className="card-gradient p-6">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-accent-blue" /> Trading Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">USDT Capital</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                  <input type="number" min="100" step="100" value={capitalInput}
                    onChange={e => handleCapitalChange(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 transition-all" />
                </div>
                <p className="text-[11px] text-text-secondary/60 mt-1">Per-trade: ${formatUSDT(capitalPerTrade)}</p>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Capital per Trade (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
                  <input type="number" min="1" max="100" step="1" value={pctInput}
                    onChange={e => handlePctChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 transition-all" />
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[2, 5, 10, 20].map(p => (
                    <button key={p} onClick={() => { setPctPerTrade(p); setPctInput(String(p)); persistSettings({ pctPerTrade: p }) }}
                      className={`text-[11px] px-2 py-1 rounded-md border transition-all ${pctPerTrade === p ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue font-semibold' : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-accent-blue/30'}`}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Default Exchange</label>
                <select value={defaultExchange}
                  onChange={e => { setDefaultExchange(e.target.value); persistSettings({ defaultExchange: e.target.value }) }}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm focus:outline-none focus:border-accent-blue/60 transition-all">
                  {CEX_LIST.map(c => <option key={c.id} value={c.id}>{c.logo} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Risk Level</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(r => (
                    <button key={r} onClick={() => { setRiskLevel(r); persistSettings({ riskLevel: r }) }}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition-all ${
                        riskLevel === r
                          ? r === 'low' ? 'bg-accent-emerald/20 border-accent-emerald/50 text-accent-emerald'
                            : r === 'medium' ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber'
                            : 'bg-accent-red/20 border-accent-red/50 text-accent-red'
                          : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-border-color'
                      }`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Trade Mode */}
          <section className="card-gradient p-6">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-secondary/50 border border-border-color/40 mb-6 w-full sm:w-fit">
              <button onClick={() => setTradeMode('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tradeMode === 'manual' ? 'bg-accent-blue/20 border border-accent-blue/50 text-accent-blue shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
                <ShoppingCart className="w-4 h-4" /> Manual Trade
              </button>
              <button onClick={() => setTradeMode('auto')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tradeMode === 'auto' ? 'bg-accent-red/20 border border-accent-red/50 text-accent-red shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
                <Bot className="w-4 h-4" /> Auto Trade
              </button>
            </div>

            {loadingOpp ? (
              <div className="flex items-center gap-2 text-text-secondary text-sm py-4">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading Opportunity Buy signals…
              </div>
            ) : tradeMode === 'manual' ? (
              /* ── Manual ──────────────────────────────────────────────────────── */
              <>
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-4 h-4 text-accent-blue" />
                  <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Manual Live Trade</h2>
                  <span className="ml-auto text-[10px] normal-case text-text-secondary/50">Uses Opportunity Buy + Prediction + Risk data</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Asset list from Opportunity Buy */}
                  <div>
                    <label className="block text-xs text-text-secondary mb-1.5">
                      Select Asset <span className="text-text-secondary/50">(from Opportunity Buy engine)</span>
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {opportunities.length === 0 ? (
                        <p className="text-text-secondary text-sm">No opportunities available.</p>
                      ) : opportunities.map(opp => {
                        const isSelected = selectedOpp?.id === opp.id
                        const sigColor = opp.signalStrength === 'STRONG_BUY'
                          ? 'text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10'
                          : opp.signalStrength === 'BUY'
                          ? 'text-accent-blue border-accent-blue/40 bg-accent-blue/10'
                          : 'text-accent-amber border-accent-amber/40 bg-accent-amber/10'
                        return (
                          <button key={opp.id} onClick={() => setSelectedOpp(opp)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${isSelected ? 'bg-surface-secondary/80 border-accent-red/50 shadow-sm' : 'bg-surface-secondary/30 border-border-color/40 hover:border-accent-red/30'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-text-primary">{opp.asset.symbol}</span>
                                <span className="text-xs text-text-secondary">{opp.asset.name}</span>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sigColor}`}>
                                {opp.signalStrength.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex gap-4 mt-1">
                              <span className="text-[11px] text-text-secondary">Price: <span className="font-mono text-text-primary">${formatPrice(opp.asset.price)}</span></span>
                              <span className="text-[11px] text-text-secondary">Score: <span className="text-accent-blue font-semibold">{opp.compositeScore}</span></span>
                              <span className="text-[11px] text-text-secondary">R:R <span className="text-accent-emerald font-semibold">{opp.entryExit.riskRewardT2.toFixed(1)}x</span></span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Trade params */}
                  <div className="space-y-4">
                    {selectedOpp && (
                      <>
                        <div className="rounded-lg bg-surface-secondary/50 border border-border-color/40 p-4 space-y-2">
                          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Entry Details</h3>
                          <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <span className="text-text-secondary text-xs">Entry Low</span>
                            <span className="font-mono text-accent-amber text-xs text-right">${formatPrice(selectedOpp.entryExit.entryLow)}</span>
                            <span className="text-text-secondary text-xs">Entry High</span>
                            <span className="font-mono text-accent-amber text-xs text-right">${formatPrice(selectedOpp.entryExit.entryHigh)}</span>
                            <span className="text-text-secondary text-xs">Avg Entry</span>
                            <span className="font-mono text-text-primary text-xs text-right font-semibold">
                              ${formatPrice((selectedOpp.entryExit.entryLow + selectedOpp.entryExit.entryHigh) / 2)}
                            </span>
                            <span className="text-text-secondary text-xs">Stop Loss</span>
                            <span className="font-mono text-accent-red text-xs text-right">${formatPrice(selectedOpp.entryExit.stopLoss)}</span>
                            <span className="text-text-secondary text-xs">Target 1 / 2 / 3</span>
                            <span className="font-mono text-accent-emerald text-xs text-right">
                              ${formatPrice(selectedOpp.entryExit.target1)} / ${formatPrice(selectedOpp.entryExit.target2)} / ${formatPrice(selectedOpp.entryExit.target3)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1.5">Exit Price <span className="text-text-secondary/50">(your target exit)</span></label>
                          <div className="relative">
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
                            <input type="number" step="any" value={exitPrice}
                              onChange={e => setExitPrice(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-emerald/60 focus:ring-1 focus:ring-accent-emerald/30 transition-all" />
                          </div>
                          <div className="flex gap-2 mt-2">
                            {[
                              { label: 'T1', val: selectedOpp.entryExit.target1 },
                              { label: 'T2', val: selectedOpp.entryExit.target2 },
                              { label: 'T3', val: selectedOpp.entryExit.target3 },
                              { label: 'SL', val: selectedOpp.entryExit.stopLoss },
                            ].map(({ label, val }) => (
                              <button key={label}
                                onClick={() => setExitPrice(val.toFixed(selectedOpp.asset.price > 100 ? 2 : 4))}
                                className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${label === 'SL' ? 'bg-accent-red/10 border-accent-red/40 text-accent-red hover:bg-accent-red/20' : 'bg-accent-emerald/10 border-accent-emerald/40 text-accent-emerald hover:bg-accent-emerald/20'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {(() => {
                          const entry = (selectedOpp.entryExit.entryLow + selectedOpp.entryExit.entryHigh) / 2
                          const exit = parseFloat(exitPrice)
                          if (isNaN(exit) || exit <= 0 || entry <= 0) return null
                          const qty = capitalPerTrade / entry
                          const pnl = (exit - entry) * qty
                          const pnlPct = ((exit - entry) / entry) * 100
                          const isProfit = pnl >= 0
                          return (
                            <div className={`rounded-lg border p-3 ${isProfit ? 'bg-accent-emerald/5 border-accent-emerald/30' : 'bg-accent-red/5 border-accent-red/30'}`}>
                              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Trade Preview</div>
                              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                                <span className="text-text-secondary">Exchange</span>
                                <span className="font-mono text-text-primary text-right capitalize">{defaultExchange}</span>
                                <span className="text-text-secondary">Capital Used</span>
                                <span className="font-mono text-text-primary text-right">${formatUSDT(capitalPerTrade)}</span>
                                <span className="text-text-secondary">Quantity</span>
                                <span className="font-mono text-text-primary text-right">{qty.toFixed(6)} {selectedOpp.asset.symbol}</span>
                                <span className="text-text-secondary">Est. P&L</span>
                                <span className={`font-mono font-bold text-right ${isProfit ? 'text-accent-emerald' : 'text-accent-red'}`}>
                                  {isProfit ? '+' : ''}${formatUSDT(pnl)} ({formatPct(pnlPct)})
                                </span>
                              </div>
                            </div>
                          )
                        })()}
                        {execError && (
                          <div className="flex items-center gap-2 text-accent-red text-xs bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {execError}
                          </div>
                        )}
                        <button onClick={executeBuy}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-red to-accent-orange text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-accent-red/20 flex items-center justify-center gap-2">
                          <Plus className="w-4 h-4" /> Execute Live Trade
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* ── Auto ────────────────────────────────────────────────────────── */
              <>
                {/* Bot status bar */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 transition-all ${
                  autoBotActive
                    ? 'bg-accent-red/10 border-accent-red/40'
                    : 'bg-surface-secondary/40 border-border-color/40'
                }`}>
                  <div className="relative flex-shrink-0">
                    <Bot className={`w-5 h-5 ${autoBotActive ? 'text-accent-red' : 'text-text-secondary'}`} />
                    {autoBotActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-red animate-ping" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${autoBotActive ? 'text-accent-red' : 'text-text-secondary'}`}>
                        {autoBotActive ? 'Auto Trade Bot — RUNNING' : 'Auto Trade Bot — STOPPED'}
                      </span>
                      {autoBotActive && botScanning && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-accent-amber px-2 py-0.5 rounded-full bg-accent-amber/10 border border-accent-amber/30">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Scanning…
                        </span>
                      )}
                      {autoBotActive && !botScanning && nextCheckIn > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-text-secondary/70 px-2 py-0.5 rounded-full bg-surface-secondary/60 border border-border-color/40">
                          <Timer className="w-2.5 h-2.5" /> Next scan in {nextCheckIn}s
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary/60 mt-0.5">
                      {autoBotActive
                        ? `Scanning ${defaultExchange} for ${minSignalFilter.replace('_', ' ')} signals · ${minSignalFilter === 'STRONG_BUY' ? 'Only strongest signals' : 'BUY+ signals'}`
                        : 'Configure settings below and press Start to activate the bot'}
                    </p>
                  </div>
                  {autoBotActive && (
                    <Radio className="w-4 h-4 text-accent-red animate-pulse flex-shrink-0" />
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Bot className="w-4 h-4 text-accent-red" />
                  <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Auto Live Trade</h2>
                  <span className="ml-auto text-[10px] normal-case text-text-secondary/50">
                    System buys top Opportunity Buy assets on {defaultExchange}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {/* How it works */}
                    <div className="rounded-lg bg-accent-red/5 border border-accent-red/20 p-4 space-y-1.5">
                      <div className="flex items-center gap-2 text-accent-red text-xs font-semibold">
                        <Zap className="w-3.5 h-3.5" /> How Auto Trade Bot works
                      </div>
                      <ul className="space-y-1 text-[11px] text-text-secondary">
                        <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-red flex-shrink-0" /> Runs continuously — scans on your chosen interval</li>
                        <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-red flex-shrink-0" /> Only buys assets with the selected minimum signal strength</li>
                        <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-red flex-shrink-0" /> Auto-sets <strong className="text-text-primary">Target 1</strong> as exit and system-calculated <strong className="text-text-primary">Stop Loss</strong></li>
                        <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-red flex-shrink-0" /> Skips assets already in open positions to avoid duplicates</li>
                        <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-red flex-shrink-0" /> Stops only when you press <strong className="text-text-primary">Stop Auto Trade</strong></li>
                        <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-red flex-shrink-0" /> <span className="text-accent-amber font-semibold">Note:</span> real orders require valid CEX API keys</li>
                      </ul>
                    </div>

                    {/* Max open trades */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5">Max simultaneous open trades</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 5].map(n => (
                          <button key={n}
                            disabled={autoBotActive}
                            onClick={() => { setMaxAutoTrades(n); persistSettings({ maxOpenTrades: n }) }}
                            className={`text-[11px] px-3 py-1.5 rounded-md border font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${maxAutoTrades === n ? 'bg-accent-red/20 border-accent-red/50 text-accent-red' : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-accent-red/30'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-text-secondary/60 mt-1.5">
                        Capital/trade: ${formatUSDT(capitalPerTrade)} · Available: ${formatUSDT(availableCapital)}
                      </p>
                    </div>

                    {/* Scan interval */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5 flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5" /> Scan interval
                      </label>
                      <div className="flex gap-2">
                        {[{ label: '30s', val: 30 }, { label: '1 min', val: 60 }, { label: '5 min', val: 300 }, { label: '15 min', val: 900 }].map(opt => (
                          <button key={opt.val}
                            disabled={autoBotActive}
                            onClick={() => setScanInterval(opt.val)}
                            className={`text-[11px] px-3 py-1.5 rounded-md border font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${scanInterval === opt.val ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue' : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-accent-blue/30'}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Minimum signal strength */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5" /> Minimum signal strength
                      </label>
                      <div className="flex gap-2">
                        <button
                          disabled={autoBotActive}
                          onClick={() => setMinSignalFilter('STRONG_BUY')}
                          className={`text-[11px] px-3 py-1.5 rounded-md border font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${minSignalFilter === 'STRONG_BUY' ? 'bg-accent-emerald/20 border-accent-emerald/50 text-accent-emerald' : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-accent-emerald/30'}`}>
                          ⚡ STRONG BUY only
                        </button>
                        <button
                          disabled={autoBotActive}
                          onClick={() => setMinSignalFilter('BUY')}
                          className={`text-[11px] px-3 py-1.5 rounded-md border font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${minSignalFilter === 'BUY' ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue' : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-accent-blue/30'}`}>
                          BUY +
                        </button>
                      </div>
                      <p className="text-[11px] text-text-secondary/60 mt-1">
                        {minSignalFilter === 'STRONG_BUY' ? 'Bot only acts on the strongest signals.' : 'Bot acts on BUY and STRONG BUY signals.'}
                      </p>
                    </div>

                    {/* Start / Stop button */}
                    {!autoBotActive ? (
                      <button
                        disabled={opportunities.length === 0 || availableCapital < capitalPerTrade}
                        onClick={() => startAutoBot({
                          exchange: defaultExchange,
                          capitalPerTrade,
                          availableCapital,
                          maxOpenTrades: maxAutoTrades,
                          minSignal: minSignalFilter,
                          intervalSec: scanInterval,
                        })}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-red to-accent-orange text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-accent-red/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Play className="w-4 h-4" /> Start Auto Trade
                      </button>
                    ) : (
                      <button
                        onClick={stopAutoBot}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all border border-accent-red/40 flex items-center justify-center gap-2">
                        <StopCircle className="w-4 h-4 text-accent-red" /> Stop Auto Trade
                      </button>
                    )}

                    {autoLog.length > 0 && (
                      <button onClick={() => { setAutoLog([]); clearLiveAutoLogs() }}
                        className="text-[11px] text-text-secondary/60 hover:text-text-secondary transition-all underline underline-offset-2">
                        Clear activity log
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Eligible signals preview */}
                    {opportunities.length > 0 && (
                      <div>
                        <p className="text-xs text-text-secondary mb-2">
                          {minSignalFilter === 'STRONG_BUY' ? 'STRONG BUY' : 'BUY+'} assets eligible for auto-buy (top {Math.min(maxAutoTrades, opportunities.filter(o => minSignalFilter === 'BUY' || o.signalStrength === 'STRONG_BUY').length)}):
                        </p>
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {opportunities
                            .filter(o => minSignalFilter === 'BUY' || o.signalStrength === 'STRONG_BUY')
                            .slice(0, maxAutoTrades)
                            .map((opp, i) => {
                              const entry = (opp.entryExit.entryLow + opp.entryExit.entryHigh) / 2
                              const alreadyOpen = trades.some(t => t.status === 'open' && t.symbol === opp.asset.symbol)
                              return (
                                <div key={opp.id} className={`rounded-lg border px-3 py-2.5 ${alreadyOpen ? 'bg-surface-secondary/20 border-border-color/30 opacity-50' : 'bg-surface-secondary/40 border-border-color/40'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-text-secondary/50">#{i + 1}</span>
                                      <span className="font-bold text-sm text-text-primary">{opp.asset.symbol}</span>
                                      <span className="text-xs text-text-secondary">{opp.asset.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {alreadyOpen && <span className="text-[9px] font-semibold text-accent-amber px-1.5 py-0.5 rounded bg-accent-amber/10 border border-accent-amber/30">Open</span>}
                                      <span className={`text-[10px] font-semibold ${opp.signalStrength === 'STRONG_BUY' ? 'text-accent-emerald' : 'text-accent-blue'}`}>
                                        {opp.signalStrength.replace('_', ' ')}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                                    <span className="text-text-secondary">Entry: <span className="font-mono text-text-primary">${formatPrice(entry)}</span></span>
                                    <span className="text-text-secondary">T1: <span className="font-mono text-accent-emerald">${formatPrice(opp.entryExit.target1)}</span></span>
                                    <span className="text-text-secondary">SL: <span className="font-mono text-accent-red">${formatPrice(opp.entryExit.stopLoss)}</span></span>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                        {opportunities.filter(o => minSignalFilter === 'BUY' || o.signalStrength === 'STRONG_BUY').length === 0 && (
                          <p className="text-[11px] text-text-secondary/60 py-2">No {minSignalFilter.replace('_', ' ')} signals in current data.</p>
                        )}
                      </div>
                    )}

                    {/* Activity Log */}
                    {autoLog.length > 0 && (
                      <div>
                        <p className="text-xs text-text-secondary mb-2 flex items-center gap-1.5"><Activity className="w-3 h-3" /> Activity Log</p>
                        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                          {autoLog.map(entry => (
                            <div key={entry.id} className={`text-[11px] px-3 py-1.5 rounded-lg border flex items-start gap-2 ${
                              entry.type === 'success' ? 'bg-accent-emerald/5 border-accent-emerald/20 text-accent-emerald' :
                              entry.type === 'error'   ? 'bg-accent-red/5 border-accent-red/20 text-accent-red' :
                              entry.type === 'skip'    ? 'bg-accent-amber/5 border-accent-amber/20 text-accent-amber' :
                              entry.type === 'warning' ? 'bg-accent-amber/5 border-accent-amber/20 text-accent-amber' :
                                                        'bg-surface-secondary/40 border-border-color/30 text-text-secondary'
                            }`}>
                              <span className="font-mono text-[10px] opacity-60 flex-shrink-0 mt-0.5">{entry.timestamp.toLocaleTimeString()}</span>
                              <span>{entry.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Trade History */}
          <section>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-accent-purple" /> Live Trade History
              <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-secondary/70 border border-border-color/50 text-[10px] text-text-secondary">{trades.length} trades</span>
            </h2>
            {trades.length === 0 ? (
              <div className="card-gradient flex flex-col items-center justify-center py-16 text-center">
                <Rocket className="w-12 h-12 text-text-secondary/30 mb-3" />
                <p className="text-text-secondary font-medium">No live trades yet</p>
                <p className="text-text-secondary/60 text-sm mt-1">Execute a live trade above to track your positions here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trades.map(trade => {
                  const isOpen = trade.status === 'open'
                  const isWin = trade.status === 'closed_tp'
                  const isAutoTrade = trade.tradeMode === 'auto'
                  return (
                    <div key={trade.id} className={`card-gradient p-4 border-l-4 ${isOpen ? 'border-l-accent-blue' : isWin ? 'border-l-accent-emerald' : 'border-l-accent-red'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {isOpen ? <Clock className="w-5 h-5 text-accent-blue flex-shrink-0" />
                            : isWin ? <CheckCircle2 className="w-5 h-5 text-accent-emerald flex-shrink-0" />
                            : <XCircle className="w-5 h-5 text-accent-red flex-shrink-0" />}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-text-primary">{trade.symbol}</span>
                              <span className="text-xs text-text-secondary capitalize">{trade.exchange}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                isOpen ? 'text-accent-blue border-accent-blue/40 bg-accent-blue/10'
                                  : isWin ? 'text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10'
                                  : 'text-accent-red border-accent-red/40 bg-accent-red/10'
                              }`}>
                                {isOpen ? 'Open' : isWin ? '✓ TP Hit' : trade.status === 'closed_sl' ? '✗ SL Hit' : '✗ Closed'}
                              </span>
                              {isAutoTrade && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-accent-red border-accent-red/40 bg-accent-red/10 flex items-center gap-1">
                                  <Bot className="w-2.5 h-2.5" /> Auto
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                              <span className="text-[11px] text-text-secondary">Entry: <span className="font-mono text-text-primary">${formatPrice(trade.entryPrice)}</span></span>
                              {!isOpen && <span className="text-[11px] text-text-secondary">Exit: <span className="font-mono text-text-primary">${formatPrice(trade.exitPrice)}</span></span>}
                              {isOpen && <>
                                <span className="text-[11px] text-text-secondary">Target: <span className="font-mono text-accent-emerald">${formatPrice(trade.targetExit)}</span></span>
                                <span className="text-[11px] text-text-secondary">SL: <span className="font-mono text-accent-red">${formatPrice(trade.stopLoss)}</span></span>
                              </>}
                              <span className="text-[11px] text-text-secondary">Capital: <span className="font-mono text-text-primary">${formatUSDT(trade.capitalUsed)}</span></span>
                              <span className="text-[11px] text-text-secondary">Qty: <span className="font-mono text-text-primary">{trade.quantity.toFixed(6)}</span></span>
                              <span className="text-[11px] text-text-secondary">{trade.closedAt ? `Closed: ${trade.closedAt.toLocaleTimeString()}` : `Opened: ${trade.openedAt.toLocaleTimeString()}`}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {!isOpen && (
                            <div className="text-right">
                              <div className={`font-bold text-base ${trade.pnl >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
                                {trade.pnl >= 0 ? <ArrowUpRight className="inline w-4 h-4" /> : <ArrowDownRight className="inline w-4 h-4" />}
                                {trade.pnl >= 0 ? '+' : ''}${formatUSDT(trade.pnl)}
                              </div>
                              <div className={`text-xs ${trade.pnlPct >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>{formatPct(trade.pnlPct)}</div>
                            </div>
                          )}
                          {isOpen && (
                            <div className="flex gap-2">
                              <button onClick={() => closeTrade(trade.id, 'tp')} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-accent-emerald/10 border border-accent-emerald/40 text-accent-emerald hover:bg-accent-emerald/20 transition-all">TP Hit</button>
                              <button onClick={() => closeTrade(trade.id, 'sl')} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-accent-red/10 border border-accent-red/40 text-accent-red hover:bg-accent-red/20 transition-all">SL Hit</button>
                              <button onClick={() => closeTrade(trade.id, 'manual')} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-surface-secondary/50 border border-border-color/50 text-text-secondary hover:text-text-primary transition-all">Close</button>
                            </div>
                          )}
                          <button onClick={() => removeTrade(trade.id)} className="p-1.5 rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all" aria-label="Remove trade">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB: API KEYS                                                          */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'api-keys' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-blue/5 border border-accent-blue/20">
            <Shield className="w-5 h-5 text-accent-blue flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-accent-blue">API Key Security</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Keys are stored in your private Supabase session (scoped by session ID). Only grant <strong>Spot Trading</strong> permissions.
                Never enable withdrawal permissions. Keys are not transmitted to any third-party service.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-accent-blue" /> CEX API Keys
              <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-secondary/70 border border-border-color/50 text-[10px] text-text-secondary">{apiKeys.length} keys</span>
            </h2>
            <button onClick={() => setShowAddKey(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue/10 border border-accent-blue/40 text-accent-blue text-sm font-semibold hover:bg-accent-blue/20 transition-all">
              <Plus className="w-4 h-4" /> Add API Key
            </button>
          </div>

          {/* Add Key Form */}
          {showAddKey && (
            <div className="card-gradient p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Plus className="w-4 h-4 text-accent-blue" /> New API Key</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Exchange</label>
                  <select value={newKeyExchange} onChange={e => setNewKeyExchange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm focus:outline-none focus:border-accent-blue/60 transition-all">
                    <option value="">Select exchange…</option>
                    {CEX_LIST.map(c => <option key={c.id} value={c.id}>{c.logo} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Label <span className="text-text-secondary/50">(optional nickname)</span></label>
                  <input type="text" placeholder="e.g. Main Binance Account" value={newKeyLabel}
                    onChange={e => setNewKeyLabel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm focus:outline-none focus:border-accent-blue/60 transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">API Key</label>
                  <input type="text" placeholder="Paste your API key…" value={newKeyApi}
                    onChange={e => setNewKeyApi(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue/60 transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">API Secret</label>
                  <div className="relative">
                    <input type={showNewSecret ? 'text' : 'password'} placeholder="Paste your API secret…" value={newKeySecret}
                      onChange={e => setNewKeySecret(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue/60 transition-all" />
                    <button onClick={() => setShowNewSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-all">
                      {showNewSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {newKeyExchange && CEX_LIST.find(c => c.id === newKeyExchange)?.needsPassphrase && (
                  <div>
                    <label className="block text-xs text-text-secondary mb-1.5">Passphrase</label>
                    <div className="relative">
                      <input type={showNewPassphrase ? 'text' : 'password'} placeholder="Exchange passphrase…" value={newKeyPassphrase}
                        onChange={e => setNewKeyPassphrase(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue/60 transition-all" />
                      <button onClick={() => setShowNewPassphrase(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-all">
                        {showNewPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddApiKey}
                  disabled={!newKeyExchange || !newKeyApi || !newKeySecret}
                  className="px-6 py-2.5 rounded-lg bg-accent-blue/20 border border-accent-blue/50 text-accent-blue font-semibold text-sm hover:bg-accent-blue/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  <Key className="w-4 h-4" /> Save API Key
                </button>
                <button onClick={() => setShowAddKey(false)} className="px-6 py-2.5 rounded-lg bg-surface-secondary/40 border border-border-color/50 text-text-secondary font-semibold text-sm hover:text-text-primary transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Key List */}
          {apiKeys.length === 0 ? (
            <div className="card-gradient flex flex-col items-center justify-center py-16 text-center">
              <Key className="w-12 h-12 text-text-secondary/30 mb-3" />
              <p className="text-text-secondary font-medium">No API keys added yet</p>
              <p className="text-text-secondary/60 text-sm mt-1">Click "Add API Key" to connect your exchange account</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map(key => {
                const cex = CEX_LIST.find(c => c.id === key.exchange)
                const showSecret = keyVisibility[key.id]
                return (
                  <div key={key.id} className={`card-gradient p-4 border bg-gradient-to-r ${cex?.color ?? ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{cex?.logo ?? '🔑'}</span>
                          <span className="font-bold text-text-primary">{cex?.name ?? key.exchange}</span>
                          {key.label && key.label !== key.exchange && (
                            <span className="text-xs text-text-secondary border border-border-color/40 rounded px-1.5 py-0.5">{key.label}</span>
                          )}
                          <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${key.isActive ? 'text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10' : 'text-text-secondary border-border-color/40'}`}>
                            {key.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-text-secondary w-20 flex-shrink-0">API Key</span>
                            <span className="font-mono text-[11px] text-text-primary truncate">{key.apiKey.slice(0, 8)}{'•'.repeat(16)}{key.apiKey.slice(-4)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-text-secondary w-20 flex-shrink-0">Secret</span>
                            <span className="font-mono text-[11px] text-text-primary">
                              {showSecret ? key.apiSecret : '•'.repeat(20)}
                            </span>
                            <button onClick={() => setKeyVisibility(prev => ({ ...prev, [key.id]: !showSecret }))} className="text-text-secondary hover:text-text-primary transition-all ml-1">
                              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          {key.passphrase && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-text-secondary w-20 flex-shrink-0">Passphrase</span>
                              <span className="font-mono text-[11px] text-text-primary">{'•'.repeat(12)}</span>
                            </div>
                          )}
                          <div className="text-[10px] text-text-secondary/60">Added: {key.createdAt.toLocaleDateString()}</div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteApiKey(key.id)} className="p-2 rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all flex-shrink-0" aria-label="Delete API key">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TAB: SQL EDITOR                                                         */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'sql-editor' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-surface-secondary/50 border border-border-color/40">
            <Database className="w-5 h-5 text-accent-purple flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Live Trading SQL Editor</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Run <strong>SELECT</strong> queries against the live trading database tables:
                <code className="ml-1 px-1.5 py-0.5 rounded bg-surface-secondary text-accent-blue text-[10px] font-mono">live_trades</code>
                <code className="ml-1 px-1.5 py-0.5 rounded bg-surface-secondary text-accent-blue text-[10px] font-mono">live_api_keys</code>
                <code className="ml-1 px-1.5 py-0.5 rounded bg-surface-secondary text-accent-blue text-[10px] font-mono">live_trading_settings</code>
                <code className="ml-1 px-1.5 py-0.5 rounded bg-surface-secondary text-accent-blue text-[10px] font-mono">live_auto_logs</code>
              </p>
              <p className="text-xs text-text-secondary/60 mt-1">
                Requires the <code className="font-mono text-[10px]">execute_sql</code> RPC function from <code className="font-mono text-[10px]">live_trading_schema.sql</code>.
                Only SELECT statements are permitted.
              </p>
            </div>
          </div>

          {/* Example Queries */}
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-2 font-semibold">Example Queries</p>
            <div className="flex flex-wrap gap-2">
              {SQL_EXAMPLES.map(ex => (
                <button key={ex.label} onClick={() => setSqlQuery(ex.sql)}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-surface-secondary/50 border border-border-color/40 text-text-secondary hover:text-accent-purple hover:border-accent-purple/30 transition-all">
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="rounded-xl border border-border-color/60 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-secondary/60 border-b border-border-color/40">
              <Terminal className="w-4 h-4 text-accent-purple" />
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">SQL Query</span>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={copySql} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded bg-surface-secondary border border-border-color/50 text-text-secondary hover:text-text-primary transition-all">
                  {sqlCopied ? <Check className="w-3 h-3 text-accent-emerald" /> : <Copy className="w-3 h-3" />}
                  {sqlCopied ? 'Copied' : 'Copy'}
                </button>
                <button onClick={() => setSqlQuery('')} className="text-[11px] px-2.5 py-1 rounded bg-surface-secondary border border-border-color/50 text-text-secondary hover:text-accent-red transition-all">Clear</button>
                <button onClick={runSql} disabled={sqlRunning || !sqlQuery.trim()}
                  className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded bg-accent-purple/20 border border-accent-purple/40 text-accent-purple font-semibold hover:bg-accent-purple/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {sqlRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  {sqlRunning ? 'Running…' : 'Run Query'}
                </button>
              </div>
            </div>
            {/* Textarea */}
            <textarea
              value={sqlQuery}
              onChange={e => setSqlQuery(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runSql() } }}
              rows={8}
              spellCheck={false}
              className="w-full px-4 py-3 bg-surface-primary/80 text-text-primary text-sm font-mono resize-y focus:outline-none placeholder-text-secondary/40 leading-relaxed"
              placeholder="SELECT * FROM live_trades ORDER BY opened_at DESC LIMIT 20;"
            />
            <div className="px-4 py-1.5 bg-surface-secondary/30 border-t border-border-color/30 text-[10px] text-text-secondary/50 font-mono">
              Ctrl+Enter / Cmd+Enter to run · SELECT only
            </div>
          </div>

          {/* Error */}
          {sqlError && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-accent-red/5 border border-accent-red/30">
              <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-accent-red">Query Error</p>
                <p className="text-xs text-text-secondary mt-1 font-mono">{sqlError}</p>
              </div>
            </div>
          )}

          {/* Results Table */}
          {sqlResult && (
            <div className="rounded-xl border border-border-color/60 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-secondary/60 border-b border-border-color/40">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                <span className="text-xs font-semibold text-accent-emerald">
                  {sqlResult.rows.length} row{sqlResult.rows.length !== 1 ? 's' : ''} returned
                </span>
                {sqlResult.columns.length > 0 && (
                  <span className="text-[10px] text-text-secondary/60 ml-2">{sqlResult.columns.join(', ')}</span>
                )}
              </div>
              {sqlResult.rows.length === 0 ? (
                <div className="px-4 py-8 text-center text-text-secondary text-sm">No results</div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      <tr className="bg-surface-secondary/80 border-b border-border-color/40">
                        {sqlResult.columns.map(col => (
                          <th key={col} className="text-left px-3 py-2 text-text-secondary font-semibold uppercase tracking-wider whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlResult.rows.map((row, i) => (
                        <tr key={i} className={`border-b border-border-color/20 ${i % 2 === 0 ? 'bg-surface-primary/30' : 'bg-surface-secondary/20'} hover:bg-surface-secondary/40 transition-colors`}>
                          {sqlResult.columns.map(col => {
                            const val = row[col]
                            return (
                              <td key={col} className="px-3 py-2 font-mono text-text-primary whitespace-nowrap max-w-xs truncate">
                                {val === null || val === undefined ? <span className="text-text-secondary/40 italic">null</span>
                                  : typeof val === 'boolean' ? <span className={val ? 'text-accent-emerald' : 'text-accent-red'}>{String(val)}</span>
                                  : String(val)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Schema Reference */}
          <div className="card-gradient p-6">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-accent-purple" /> Schema Reference
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {[
                {
                  table: 'live_trades',
                  cols: ['id TEXT', 'session_id TEXT', 'exchange TEXT', 'asset TEXT', 'symbol TEXT', 'entry_price NUMERIC', 'exit_price NUMERIC', 'capital_used NUMERIC', 'quantity NUMERIC', 'pnl NUMERIC', 'pnl_pct NUMERIC', 'status TEXT', 'trade_mode TEXT', 'target_exit NUMERIC', 'stop_loss NUMERIC', 'signal TEXT', 'opened_at TIMESTAMPTZ', 'closed_at TIMESTAMPTZ', 'fees NUMERIC', 'order_id TEXT'],
                },
                {
                  table: 'live_api_keys',
                  cols: ['id UUID', 'session_id TEXT', 'exchange TEXT', 'api_key TEXT', 'api_secret TEXT', 'passphrase TEXT', 'label TEXT', 'is_active BOOLEAN', 'created_at TIMESTAMPTZ', 'updated_at TIMESTAMPTZ'],
                },
                {
                  table: 'live_trading_settings',
                  cols: ['id UUID', 'session_id TEXT', 'capital NUMERIC', 'pct_per_trade NUMERIC', 'default_exchange TEXT', 'risk_level TEXT', 'enable_auto_trade BOOLEAN', 'max_open_trades INTEGER', 'created_at TIMESTAMPTZ', 'updated_at TIMESTAMPTZ'],
                },
                {
                  table: 'live_auto_logs',
                  cols: ['id TEXT', 'session_id TEXT', 'message TEXT', 'log_type TEXT', 'exchange TEXT', 'symbol TEXT', 'created_at TIMESTAMPTZ'],
                },
              ].map(({ table, cols }) => (
                <div key={table} className="rounded-lg bg-surface-secondary/40 border border-border-color/40 p-3">
                  <div className="font-bold text-accent-purple font-mono mb-2">{table}</div>
                  <div className="space-y-0.5">
                    {cols.map(col => {
                      const [name, type] = col.split(' ')
                      return (
                        <div key={col} className="flex gap-2">
                          <span className="font-mono text-text-primary">{name}</span>
                          <span className="text-text-secondary/60">{type}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

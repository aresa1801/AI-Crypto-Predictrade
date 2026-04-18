'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FlaskConical, TrendingDown, DollarSign, Percent,
  ShoppingCart, History, Trophy, Target, AlertTriangle, Plus,
  CheckCircle2, XCircle, Clock, RefreshCw, Wallet, BarChart2,
  ArrowUpRight, ArrowDownRight, X, Bot, Play, Square, Activity,
  ChevronRight, Zap, Settings, Shield, Timer, Filter,
} from 'lucide-react'
import { fetchOpportunityBuys, OpportunityAsset, formatPrice } from '@/lib/api/opportunity-buy'
import {
  loadDemoTrades,
  saveDemoTrade,
  updateDemoTrade,
  deleteDemoTrade,
  loadDemoAccountSettings,
  saveDemoAccountSettings,
  loadAutoLogs,
  saveAutoLog,
  clearAutoLogs,
  startServerBot,
  stopServerBot,
  getServerBotStatus,
} from '@/lib/api/demo-account'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DemoTrade {
  id: string
  asset: string
  symbol: string
  entryPrice: number
  exitPrice: number
  capitalUsed: number         // USDT allocated
  quantity: number            // coins bought
  pnl: number                 // USDT profit/loss
  pnlPct: number              // %
  status: 'correct' | 'failed' | 'open'
  openedAt: Date
  closedAt?: Date
  targetExit: number
  stopLoss: number
  signal: string
  tradeMode: 'manual' | 'auto'
}

export interface AutoTradeLogEntry {
  id: string
  timestamp: Date
  message: string
  type: 'info' | 'success' | 'error' | 'skip'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUSDT(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

const AUTO_TRADE_POLL_MS = 5 * 60 * 1000 // 5 minutes between scan cycles

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  valueColor,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  gradient: string
  valueColor?: string
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
        <circle
          cx="40" cy="40" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="44" textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="monospace">
          {rate.toFixed(0)}%
        </text>
      </svg>
      <span className="text-xs text-text-secondary">Win Rate</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DemoAccountPage() {
  // Capital config
  const [capital, setCapital] = useState<number>(10000)
  const [capitalInput, setCapitalInput] = useState('10000')
  const [pctPerTrade, setPctPerTrade] = useState<number>(10)
  const [pctInput, setPctInput] = useState('10')

  // Available USDT (starts = capital, shrinks as open trades lock funds)
  const [trades, setTrades] = useState<DemoTrade[]>([])

  // Trade mode: manual or auto
  const [tradeMode, setTradeMode] = useState<'manual' | 'auto'>('manual')

  // Opportunity Buy data
  const [opportunities, setOpportunities] = useState<OpportunityAsset[]>([])
  const [loadingOpp, setLoadingOpp] = useState(true)

  // Execution Buy form (manual)
  const [selectedOpp, setSelectedOpp] = useState<OpportunityAsset | null>(null)
  const [exitPrice, setExitPrice] = useState('')
  const [execError, setExecError] = useState('')

  // Auto Trade state
  const [autoRunning, setAutoRunning] = useState(false)
  const [maxAutoTrades, setMaxAutoTrades] = useState(3)
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [scanInterval, setScanInterval] = useState(300) // seconds (default 5 min)
  const [minSignalFilter, setMinSignalFilter] = useState<'STRONG_BUY' | 'BUY'>('STRONG_BUY')
  const [autoLog, setAutoLog] = useState<AutoTradeLogEntry[]>([])
  const [nextScanAt, setNextScanAt] = useState<Date | null>(null)
  const [serverBotRunning, setServerBotRunning] = useState(false)

  // Save confirmation
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Debounce timer ref for capital settings persistence
  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Interval ref for Auto Trade bot
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Live ref so interval callbacks always see the latest state values
  const liveRef = useRef({ trades: [] as DemoTrade[], availableCapital: 0, capitalPerTrade: 0, maxAutoTrades: 3, minSignalFilter: 'STRONG_BUY' as 'STRONG_BUY' | 'BUY' })

  // ---------------------------------------------------------------------------
  // Load persisted data from Supabase on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function hydrateFromSupabase() {
      const [settings, persistedTrades, persistedLogs] = await Promise.all([
        loadDemoAccountSettings(),
        loadDemoTrades(),
        loadAutoLogs(),
      ])
      if (settings) {
        setCapital(settings.capital)
        setCapitalInput(String(settings.capital))
        setPctPerTrade(settings.pctPerTrade)
        setPctInput(String(settings.pctPerTrade))
        if (settings.maxAutoTrades) setMaxAutoTrades(settings.maxAutoTrades)
        setRiskLevel(settings.riskLevel)
        setScanInterval(settings.scanIntervalSeconds)
        setMinSignalFilter(settings.minSignalFilter)
      }
      if (persistedTrades.length > 0) setTrades(persistedTrades)
      if (persistedLogs.length > 0) setAutoLog(persistedLogs)
    }
    hydrateFromSupabase()
    // Check whether the server bot is already running for this session
    getServerBotStatus().then(status => {
      if (status?.is_running) setServerBotRunning(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------

  const closedTrades = trades.filter(t => t.status !== 'open')
  const openTrades = trades.filter(t => t.status === 'open')
  const winners = closedTrades.filter(t => t.status === 'correct')
  const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0
  const totalPnL = closedTrades.reduce((s, t) => s + t.pnl, 0)
  const avgPnLPct = closedTrades.length > 0
    ? closedTrades.reduce((s, t) => s + t.pnlPct, 0) / closedTrades.length
    : 0
  const lockedCapital = openTrades.reduce((s, t) => s + t.capitalUsed, 0)
  const availableCapital = capital + totalPnL - lockedCapital
  const capitalPerTrade = capital * (pctPerTrade / 100)
  const totalReturn = capital > 0 ? ((totalPnL / capital) * 100) : 0
  const profitFactor = (() => {
    const gains = winners.reduce((s, t) => s + t.pnl, 0)
    const losses = closedTrades.filter(t => t.status === 'failed').reduce((s, t) => s + Math.abs(t.pnl), 0)
    return losses > 0 ? gains / losses : gains > 0 ? Infinity : 0
  })()
  const maxDrawdown = (() => {
    let peak = capital
    let maxDD = 0
    let running = capital
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
  // Load opportunities
  // ---------------------------------------------------------------------------

  const loadOpportunities = useCallback(async () => {
    setLoadingOpp(true)
    try {
      const data = await fetchOpportunityBuys(false, '4h')
      setOpportunities(data.opportunities.slice(0, 10))
      setSelectedOpp(prev => {
        if (!prev && data.opportunities.length > 0) {
          setExitPrice(data.opportunities[0].entryExit.target2.toFixed(
            data.opportunities[0].asset.price > 100 ? 2 : 4
          ))
          return data.opportunities[0]
        }
        return prev
      })
    } catch {
      // silently use empty list
    } finally {
      setLoadingOpp(false)
    }
  }, [])

  useEffect(() => {
    loadOpportunities()
  }, [loadOpportunities])

  // Keep liveRef in sync with the latest derived values so the interval
  // callback never captures a stale closure.
  useEffect(() => {
    liveRef.current = { trades, availableCapital, capitalPerTrade, maxAutoTrades, minSignalFilter }
  }, [trades, availableCapital, capitalPerTrade, maxAutoTrades, minSignalFilter])

  // Clear the polling interval when the component unmounts.
  useEffect(() => {
    return () => { if (autoIntervalRef.current) clearInterval(autoIntervalRef.current) }
  }, [])

  // When selected opportunity changes, pre-fill exit price
  useEffect(() => {
    if (selectedOpp) {
      const decimals = selectedOpp.asset.price > 100 ? 2 : 4
      setExitPrice(selectedOpp.entryExit.target2.toFixed(decimals))
      setExecError('')
    }
  }, [selectedOpp])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function persistDemoSettings(overrides: Partial<{ capital: number; pctPerTrade: number; maxAutoTrades: number; riskLevel: 'low' | 'medium' | 'high'; scanIntervalSeconds: number; minSignalFilter: 'STRONG_BUY' | 'BUY' }>) {
    if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current)
    settingsSaveTimer.current = setTimeout(() => {
      saveDemoAccountSettings({
        capital,
        pctPerTrade,
        maxAutoTrades,
        riskLevel,
        scanIntervalSeconds: scanInterval,
        minSignalFilter,
        ...overrides,
      })
    }, 1000)
  }

  function handleCapitalChange(val: string) {
    setCapitalInput(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) {
      setCapital(n)
      persistDemoSettings({ capital: n })
    }
  }

  function handlePctChange(val: string) {
    setPctInput(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0 && n <= 100) {
      setPctPerTrade(n)
      persistDemoSettings({ pctPerTrade: n })
    }
  }

  function saveSettingsNow() {
    if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current)
    saveDemoAccountSettings({ capital, pctPerTrade, maxAutoTrades, riskLevel, scanIntervalSeconds: scanInterval, minSignalFilter })
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  function tradeStatus(exitPrice: number, entryPrice: number, targetExit: number, stopLoss: number): DemoTrade['status'] {
    if (exitPrice >= targetExit) return 'correct'
    if (exitPrice <= stopLoss) return 'failed'
    // between stop and target: correct if above entry, failed if below
    return exitPrice >= entryPrice ? 'correct' : 'failed'
  }

  function executeBuy() {
    if (!selectedOpp) { setExecError('Please select an asset.'); return }
    const targetExit = parseFloat(exitPrice)
    if (isNaN(targetExit) || targetExit <= 0) { setExecError('Enter a valid exit price.'); return }
    if (capitalPerTrade > availableCapital) { setExecError('Insufficient available capital.'); return }

    const entry = (selectedOpp.entryExit.entryLow + selectedOpp.entryExit.entryHigh) / 2
    const qty = capitalPerTrade / entry

    const trade: DemoTrade = {
      id: `trade-${Date.now()}`,
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
    }

    setTrades(prev => [trade, ...prev])
    saveDemoTrade(trade)
    setExecError('')
  }

  function closeOpenTrade(id: string, asWin: boolean) {
    setTrades(prev => prev.map(t => {
      if (t.id !== id) return t
      const closePrice = asWin ? t.targetExit : t.stopLoss
      const pnl = (closePrice - t.entryPrice) * t.quantity
      const pnlPct = ((closePrice - t.entryPrice) / t.entryPrice) * 100
      const status = tradeStatus(closePrice, t.entryPrice, t.targetExit, t.stopLoss)
      const updated = { ...t, exitPrice: closePrice, pnl, pnlPct, status, closedAt: new Date() }
      updateDemoTrade(id, { pnl, pnlPct, status, exitPrice: closePrice, closedAt: updated.closedAt })
      return updated
    }))
  }

  function removeTrade(id: string) {
    setTrades(prev => prev.filter(t => t.id !== id))
    deleteDemoTrade(id)
  }

  // ---------------------------------------------------------------------------
  // Auto Trade — continuous bot
  // ---------------------------------------------------------------------------

  function addAutoLog(message: string, type: AutoTradeLogEntry['type']) {
    const entry: AutoTradeLogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      message,
      type,
    }
    setAutoLog(prev => [entry, ...prev])
    saveAutoLog(entry)
  }

  async function runAutoTradeCycle() {
    const {
      trades: currentTrades,
      availableCapital: currentCap,
      capitalPerTrade: perTrade,
      maxAutoTrades: maxTrades,
      minSignalFilter: signal,
    } = liveRef.current

    addAutoLog(`🤖 Scanning for ${signal.replace('_', ' ')} signals…`, 'info')

    let freshOpportunities: OpportunityAsset[] = []
    try {
      const data = await fetchOpportunityBuys(true, '4h')
      freshOpportunities = data.opportunities
      addAutoLog(`Fetched ${freshOpportunities.length} opportunities from engine.`, 'info')
    } catch {
      addAutoLog('Failed to fetch opportunities — will retry next cycle.', 'error')
      return
    }

    // Filter by minimum signal strength
    const qualified = signal === 'STRONG_BUY'
      ? freshOpportunities.filter(opp => opp.signalStrength === 'STRONG_BUY')
      : freshOpportunities.filter(opp => opp.signalStrength === 'STRONG_BUY' || opp.signalStrength === 'BUY')
    if (qualified.length === 0) {
      addAutoLog(`No ${signal.replace('_', ' ')} signals found — waiting for next scan.`, 'skip')
      return
    }

    // Skip assets already held in an open position to avoid duplication
    const openSymbols = new Set(currentTrades.filter(t => t.status === 'open').map(t => t.symbol))
    const candidates = qualified.filter(opp => !openSymbols.has(opp.asset.symbol)).slice(0, maxTrades)

    if (candidates.length === 0) {
      addAutoLog(
        `${qualified.length} ${signal.replace('_', ' ')} signal(s) found but already holding open positions — skipping.`,
        'skip',
      )
      return
    }

    let remainingCapital = currentCap
    const newTrades: DemoTrade[] = []

    for (const opp of candidates) {
      if (remainingCapital < perTrade) {
        addAutoLog(
          `Skipped ${opp.asset.symbol}: insufficient available capital ($${formatUSDT(remainingCapital)} < $${formatUSDT(perTrade)}).`,
          'skip',
        )
        continue
      }

      const entry = (opp.entryExit.entryLow + opp.entryExit.entryHigh) / 2
      const targetExit = opp.entryExit.target1
      const sl = opp.entryExit.stopLoss
      const qty = perTrade / entry

      const trade: DemoTrade = {
        id: `auto-${Date.now()}-${Math.random()}`,
        asset: opp.asset.name,
        symbol: opp.asset.symbol,
        entryPrice: entry,
        exitPrice: targetExit,
        capitalUsed: perTrade,
        quantity: qty,
        pnl: 0,
        pnlPct: 0,
        status: 'open',
        openedAt: new Date(),
        targetExit,
        stopLoss: sl,
        signal: opp.signalStrength,
        tradeMode: 'auto',
      }

      newTrades.push(trade)
      remainingCapital -= perTrade

      addAutoLog(
        `✅ Auto-bought ${opp.asset.symbol} @ $${formatPrice(entry)} | T1: $${formatPrice(targetExit)} | SL: $${formatPrice(sl)} | Capital: $${formatUSDT(perTrade)}`,
        'success',
      )
    }

    if (newTrades.length > 0) {
      setTrades(prev => [...newTrades].reverse().concat(prev))
      await Promise.all(newTrades.map(t => saveDemoTrade(t)))
      addAutoLog(`${newTrades.length} trade(s) opened automatically.`, 'info')
    }
  }

  function startAutoTrade() {
    if (autoRunning) return
    // Sync liveRef with current values before the first cycle runs
    liveRef.current = { trades, availableCapital, capitalPerTrade, maxAutoTrades, minSignalFilter }
    setAutoRunning(true)
    const intervalMs = scanInterval * 1000
    const nextTime = new Date(Date.now() + intervalMs)
    setNextScanAt(nextTime)
    const intervalLabel = scanInterval < 60 ? `${scanInterval}s` : scanInterval < 3600 ? `${Math.round(scanInterval / 60)} min` : `${Math.round(scanInterval / 3600)}h`
    addAutoLog(`🤖 Auto Trade bot STARTED — scanning every ${intervalLabel} for ${minSignalFilter.replace('_', ' ')} opportunities.`, 'info')
    // Run first cycle immediately, then schedule recurring scans
    runAutoTradeCycle()
    autoIntervalRef.current = setInterval(() => {
      const next = new Date(Date.now() + intervalMs)
      setNextScanAt(next)
      runAutoTradeCycle()
    }, intervalMs)

    // Also start the server-side bot so it keeps running when browser is closed
    startServerBot({ capital, pctPerTrade, maxAutoTrades }).then(ok => {
      if (ok) {
        setServerBotRunning(true)
        addAutoLog('☁️ Server bot started — trading continues even when this page is closed.', 'info')
      }
    })
  }

  function stopAutoTrade() {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current)
      autoIntervalRef.current = null
    }
    setAutoRunning(false)
    setNextScanAt(null)
    addAutoLog('🛑 Auto Trade bot STOPPED by user.', 'info')

    // Stop server-side bot as well
    stopServerBot().then(ok => {
      if (ok) setServerBotRunning(false)
    })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 lg:p-8 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-indigo to-accent-purple flex items-center justify-center shadow-lg shadow-accent-indigo/30">
          <FlaskConical className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text-blue">Demo Trade</h1>
          <p className="text-sm text-text-secondary">Paper-trade with virtual USDT — no real funds at risk</p>
        </div>
      </div>

      {/* ── Trade Stats ─────────────────────────────────────────────────────── */}
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
          <StatCard
            icon={Wallet}
            label="Available Capital"
            value={`$${formatUSDT(availableCapital)}`}
            sub="USDT free to trade"
            gradient="from-accent-blue to-accent-cyan"
            valueColor={availableCapital >= capital * 0.5 ? 'text-text-primary' : 'text-accent-amber'}
          />
          <StatCard
            icon={BarChart2}
            label="Profit Factor"
            value={isFinite(profitFactor) ? profitFactor.toFixed(2) : '∞'}
            sub="Gross gain / gross loss"
            gradient="from-accent-emerald to-accent-teal"
            valueColor={profitFactor >= 1.5 ? 'text-accent-emerald' : profitFactor < 1 ? 'text-accent-red' : 'text-accent-amber'}
          />
          <StatCard
            icon={TrendingDown}
            label="Max Drawdown"
            value={`${maxDrawdown.toFixed(1)}%`}
            sub="From peak equity"
            gradient="from-accent-red to-accent-orange"
            valueColor={maxDrawdown < 10 ? 'text-text-primary' : maxDrawdown < 25 ? 'text-accent-amber' : 'text-accent-red'}
          />
          <StatCard
            icon={CheckCircle2}
            label="Winners / Losers"
            value={`${winners.length} / ${closedTrades.length - winners.length}`}
            sub="Closed trades"
            gradient="from-accent-purple to-accent-indigo"
          />
        </div>
      </section>

      {/* ── Capital Config ───────────────────────────────────────────────────── */}
      <section className="card-gradient p-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-accent-blue" /> Trading Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* USDT to Trade */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              USDT to Trade <span className="text-text-secondary/50">(starting balance)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
              <input
                type="number"
                min="100"
                step="100"
                value={capitalInput}
                onChange={e => handleCapitalChange(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 transition-all"
              />
            </div>
            <p className="text-[11px] text-text-secondary/60 mt-1">Per-trade allocation: ${formatUSDT(capitalPerTrade)} USDT</p>
          </div>

          {/* % per trade */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              Capital per Trade <span className="text-text-secondary/50">(%)</span>
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={pctInput}
                onChange={e => handlePctChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 transition-all"
              />
            </div>
            <div className="flex gap-1.5 mt-2">
              {[5, 10, 20, 25, 50].map(p => (
                <button
                  key={p}
                  onClick={() => { setPctPerTrade(p); setPctInput(String(p)); persistDemoSettings({ pctPerTrade: p }) }}
                  className={`text-[11px] px-2 py-1 rounded-md border transition-all ${
                    pctPerTrade === p
                      ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue font-semibold'
                      : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-accent-blue/30'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Risk Level */}
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Risk Level</span>
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => { setRiskLevel(r); persistDemoSettings({ riskLevel: r }) }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition-all ${
                    riskLevel === r
                      ? r === 'low' ? 'bg-accent-emerald/20 border-accent-emerald/50 text-accent-emerald'
                        : r === 'medium' ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber'
                        : 'bg-accent-red/20 border-accent-red/50 text-accent-red'
                      : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-border-color'
                  }`}
                >{r}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveSettingsNow}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue/20 border border-accent-blue/50 text-accent-blue text-xs font-semibold hover:bg-accent-blue/30 transition-all">
            {settingsSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
            {settingsSaved ? 'Saved!' : 'Save Settings'}
          </button>
          {settingsSaved && <span className="text-[11px] text-accent-emerald">Settings saved to database.</span>}
        </div>
      </section>

      {/* ── Trade Mode Tabs ─────────────────────────────────────────────────── */}
      <section className="card-gradient p-6">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-secondary/50 border border-border-color/40 mb-6 w-full sm:w-fit">
          <button
            onClick={() => setTradeMode('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tradeMode === 'manual'
                ? 'bg-accent-blue/20 border border-accent-blue/50 text-accent-blue shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Manual Trade
          </button>
          <button
            onClick={() => setTradeMode('auto')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tradeMode === 'auto'
                ? 'bg-accent-emerald/20 border border-accent-emerald/50 text-accent-emerald shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Bot className="w-4 h-4" /> Auto Trade
          </button>
        </div>

        {loadingOpp ? (
          <div className="flex items-center gap-2 text-text-secondary text-sm py-4">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading opportunities…
          </div>
        ) : tradeMode === 'manual' ? (
          /* ── Manual Trade ─────────────────────────────────────────────────── */
          <>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-4 h-4 text-accent-blue" />
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Manual Trade</h2>
              <span className="ml-auto text-[10px] normal-case font-normal text-text-secondary/50">
                Pick an asset &amp; set your exit
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Asset selector */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Select Asset (from Opportunity Buy)</label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {opportunities.length === 0 ? (
                    <p className="text-text-secondary text-sm">No opportunities available.</p>
                  ) : opportunities.map(opp => {
                    const isSelected = selectedOpp?.id === opp.id
                    const signalColor =
                      opp.signalStrength === 'STRONG_BUY' ? 'text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10' :
                      opp.signalStrength === 'BUY'         ? 'text-accent-blue border-accent-blue/40 bg-accent-blue/10' :
                                                            'text-accent-amber border-accent-amber/40 bg-accent-amber/10'
                    return (
                      <button
                        key={opp.id}
                        onClick={() => setSelectedOpp(opp)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-surface-secondary/80 border-accent-blue/50 shadow-sm'
                            : 'bg-surface-secondary/30 border-border-color/40 hover:border-accent-blue/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text-primary">{opp.asset.symbol}</span>
                            <span className="text-xs text-text-secondary">{opp.asset.name}</span>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${signalColor}`}>
                            {opp.signalStrength.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1">
                          <span className="text-[11px] text-text-secondary">
                            Price: <span className="font-mono text-text-primary">${formatPrice(opp.asset.price)}</span>
                          </span>
                          <span className="text-[11px] text-text-secondary">
                            Score: <span className="text-accent-blue font-semibold">{opp.compositeScore}</span>
                          </span>
                          <span className="text-[11px] text-text-secondary">
                            R:R <span className="text-accent-emerald font-semibold">{opp.entryExit.riskRewardT2.toFixed(1)}x</span>
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Trade parameters */}
              <div className="space-y-4">
                {selectedOpp && (
                  <>
                    {/* Entry info */}
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

                    {/* Exit point input */}
                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5">
                        Exit Price <span className="text-text-secondary/50">(your target exit)</span>
                      </label>
                      <div className="relative">
                        <Target className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary w-4 h-4" />
                        <input
                          type="number"
                          step="any"
                          value={exitPrice}
                          onChange={e => setExitPrice(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-surface-secondary/60 border border-border-color/60 text-text-primary text-sm font-mono focus:outline-none focus:border-accent-emerald/60 focus:ring-1 focus:ring-accent-emerald/30 transition-all"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        {[
                          { label: 'T1', val: selectedOpp.entryExit.target1 },
                          { label: 'T2', val: selectedOpp.entryExit.target2 },
                          { label: 'T3', val: selectedOpp.entryExit.target3 },
                          { label: 'SL', val: selectedOpp.entryExit.stopLoss },
                        ].map(({ label, val }) => (
                          <button
                            key={label}
                            onClick={() => setExitPrice(val.toFixed(selectedOpp.asset.price > 100 ? 2 : 4))}
                            className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                              label === 'SL'
                                ? 'bg-accent-red/10 border-accent-red/40 text-accent-red hover:bg-accent-red/20'
                                : 'bg-accent-emerald/10 border-accent-emerald/40 text-accent-emerald hover:bg-accent-emerald/20'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Trade preview */}
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

                    <button
                      onClick={executeBuy}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-indigo text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-accent-blue/20 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Execute Demo Trade
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ── Auto Trade ───────────────────────────────────────────────────── */
          <>
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-accent-emerald" />
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Auto Trade</h2>
              {autoRunning && (
                <span className="flex items-center gap-1.5 ml-2 text-[10px] font-semibold text-accent-emerald">
                  <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" /> BOT ACTIVE
                </span>
              )}
              {serverBotRunning && (
                <span className="flex items-center gap-1.5 ml-1 text-[10px] font-semibold text-accent-blue">
                  <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" /> SERVER BOT ON
                </span>
              )}
              <span className="ml-auto text-[10px] normal-case font-normal text-text-secondary/50">
                Exit = T1 · SL = System
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: config + action */}
              <div className="space-y-4">
                {/* Info banner */}
                <div className="rounded-lg bg-accent-emerald/5 border border-accent-emerald/20 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-accent-emerald text-xs font-semibold">
                    <Zap className="w-3.5 h-3.5" /> How Auto Trade works
                  </div>
                  <ul className="space-y-1 text-[11px] text-text-secondary">
                    <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-emerald flex-shrink-0" /> Runs continuously — scanning for signals on the configured interval</li>
                    <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-emerald flex-shrink-0" /> Skips assets already held in open trades to avoid duplicate positions</li>
                    <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-emerald flex-shrink-0" /> Sets <span className="text-accent-emerald font-semibold">Exit = Target 1</span> and <span className="text-accent-red font-semibold">Stop Loss</span> automatically from system data</li>
                    <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-blue flex-shrink-0" /> ☁️ <span className="text-accent-blue font-semibold">Server bot</span> keeps trading even when this browser tab is closed</li>
                    <li className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 text-accent-emerald flex-shrink-0" /> Stops only when you click <span className="font-semibold">Stop Auto Trade</span></li>
                  </ul>
                </div>

                {/* Max trades selector */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">
                    Max simultaneous open trades
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 5].map(n => (
                      <button
                        key={n}
                        disabled={autoRunning}
                        onClick={() => { setMaxAutoTrades(n); persistDemoSettings({ maxAutoTrades: n }) }}
                        className={`text-[11px] px-3 py-1.5 rounded-md border transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                          maxAutoTrades === n
                            ? 'bg-accent-emerald/20 border-accent-emerald/50 text-accent-emerald'
                            : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-accent-emerald/30'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-text-secondary/60 mt-1.5">
                    Capital per trade: ${formatUSDT(capitalPerTrade)} USDT · Available: ${formatUSDT(availableCapital)} USDT
                  </p>
                </div>

                {/* Scan interval */}
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5 flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5" /> Scan interval
                  </label>
                  <div className="flex gap-2">
                    {[{ label: '1 min', val: 60 }, { label: '5 min', val: 300 }, { label: '15 min', val: 900 }, { label: '30 min', val: 1800 }].map(opt => (
                      <button key={opt.val}
                        disabled={autoRunning}
                        onClick={() => { setScanInterval(opt.val); persistDemoSettings({ scanIntervalSeconds: opt.val }) }}
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
                      disabled={autoRunning}
                      onClick={() => { setMinSignalFilter('STRONG_BUY'); persistDemoSettings({ minSignalFilter: 'STRONG_BUY' }) }}
                      className={`text-[11px] px-3 py-1.5 rounded-md border font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${minSignalFilter === 'STRONG_BUY' ? 'bg-accent-emerald/20 border-accent-emerald/50 text-accent-emerald' : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-accent-emerald/30'}`}>
                      ⚡ STRONG BUY only
                    </button>
                    <button
                      disabled={autoRunning}
                      onClick={() => { setMinSignalFilter('BUY'); persistDemoSettings({ minSignalFilter: 'BUY' }) }}
                      className={`text-[11px] px-3 py-1.5 rounded-md border font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${minSignalFilter === 'BUY' ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue' : 'bg-surface-secondary/40 border-border-color/50 text-text-secondary hover:border-accent-blue/30'}`}>
                      BUY +
                    </button>
                  </div>
                  <p className="text-[11px] text-text-secondary/60 mt-1">
                    {minSignalFilter === 'STRONG_BUY' ? 'Bot only acts on the strongest signals.' : 'Bot acts on BUY and STRONG BUY signals.'}
                  </p>
                </div>

                {/* Start / Stop Auto Trade button */}
                {autoRunning ? (
                  <button
                    onClick={stopAutoTrade}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-red to-accent-orange text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-accent-red/20 flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4" /> Stop Auto Trade
                  </button>
                ) : (
                  <button
                    onClick={startAutoTrade}
                    disabled={opportunities.length === 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-emerald to-accent-teal text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-accent-emerald/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" /> Start Auto Trade
                  </button>
                )}

                {/* Running indicator */}
                {autoRunning && nextScanAt && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary bg-surface-secondary/40 border border-border-color/40 rounded-lg px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse flex-shrink-0" />
                    Bot running · Next scan at <span className="font-mono text-text-primary">{nextScanAt.toLocaleTimeString()}</span>
                  </div>
                )}

                {/* Server bot status indicator */}
                {serverBotRunning && (
                  <div className="flex items-center gap-2 text-xs text-accent-blue bg-accent-blue/5 border border-accent-blue/20 rounded-lg px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse flex-shrink-0" />
                    ☁️ Server bot active — trading continues when browser is closed
                  </div>
                )}

                {/* Clear log */}
                {autoLog.length > 0 && (
                  <button
                    onClick={() => { setAutoLog([]); clearAutoLogs() }}
                    className="text-[11px] text-text-secondary/60 hover:text-text-secondary transition-all underline underline-offset-2"
                  >
                    Clear activity log
                  </button>
                )}
              </div>

              {/* Right: preview of STRONG_BUY candidates + activity log */}
              <div className="space-y-4">
                {/* Preview assets */}
                {(() => {
                  const strongBuyOpps = opportunities.filter(opp => opp.signalStrength === 'STRONG_BUY').slice(0, maxAutoTrades)
                  const openSymbols = new Set(openTrades.map(t => t.symbol))
                  return strongBuyOpps.length > 0 ? (
                    <div>
                      <p className="text-xs text-text-secondary mb-2">
                        STRONG_BUY assets eligible for auto-trade (top {Math.min(maxAutoTrades, strongBuyOpps.length)}):
                      </p>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {strongBuyOpps.map((opp, i) => {
                          const entry = (opp.entryExit.entryLow + opp.entryExit.entryHigh) / 2
                          const alreadyOpen = openSymbols.has(opp.asset.symbol)
                          return (
                            <div
                              key={opp.id}
                              className={`rounded-lg border px-3 py-2.5 transition-opacity ${
                                alreadyOpen
                                  ? 'bg-surface-secondary/20 border-border-color/20 opacity-50'
                                  : 'bg-surface-secondary/40 border-border-color/40'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-text-secondary/50">#{i + 1}</span>
                                  <span className="font-bold text-sm text-text-primary">{opp.asset.symbol}</span>
                                  <span className="text-xs text-text-secondary">{opp.asset.name}</span>
                                </div>
                                {alreadyOpen ? (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-text-secondary border-border-color/40 bg-surface-secondary/40">
                                    Already open
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10">
                                    STRONG BUY
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[11px]">
                                <span className="text-text-secondary">
                                  Entry: <span className="font-mono text-text-primary">${formatPrice(entry)}</span>
                                </span>
                                <span className="text-text-secondary">
                                  T1: <span className="font-mono text-accent-emerald">${formatPrice(opp.entryExit.target1)}</span>
                                </span>
                                <span className="text-text-secondary">
                                  SL: <span className="font-mono text-accent-red">${formatPrice(opp.entryExit.stopLoss)}</span>
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-surface-secondary/30 border border-border-color/40 p-4 text-center">
                      <p className="text-xs text-text-secondary">No STRONG_BUY signals currently detected.</p>
                      <p className="text-[11px] text-text-secondary/60 mt-1">
                        {autoRunning ? 'Bot will buy automatically when a strong signal appears.' : 'Start the bot to monitor and buy automatically.'}
                      </p>
                    </div>
                  )
                })()}

                {/* Activity log */}
                {autoLog.length > 0 && (
                  <div>
                    <p className="text-xs text-text-secondary mb-2 flex items-center gap-1.5">
                      <Activity className="w-3 h-3" /> Activity Log
                    </p>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {autoLog.map(entry => (
                        <div
                          key={entry.id}
                          className={`text-[11px] px-3 py-1.5 rounded-lg border flex items-start gap-2 ${
                            entry.type === 'success' ? 'bg-accent-emerald/5 border-accent-emerald/20 text-accent-emerald' :
                            entry.type === 'error'   ? 'bg-accent-red/5 border-accent-red/20 text-accent-red' :
                            entry.type === 'skip'    ? 'bg-accent-amber/5 border-accent-amber/20 text-accent-amber' :
                                                      'bg-surface-secondary/40 border-border-color/30 text-text-secondary'
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-60 flex-shrink-0 mt-0.5">
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
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

      {/* ── Trade History ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-accent-purple" /> Trade History
          <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-secondary/70 border border-border-color/50 text-[10px] text-text-secondary">
            {trades.length} trades
          </span>
        </h2>

        {trades.length === 0 ? (
          <div className="card-gradient flex flex-col items-center justify-center py-16 text-center">
            <History className="w-12 h-12 text-text-secondary/30 mb-3" />
            <p className="text-text-secondary font-medium">No trades yet</p>
            <p className="text-text-secondary/60 text-sm mt-1">Execute a demo trade above to see your history here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map(trade => {
              const isOpen = trade.status === 'open'
              const isWin = trade.status === 'correct'
              const isAutoTrade = trade.tradeMode === 'auto'
              return (
                <div
                  key={trade.id}
                  className={`card-gradient p-4 border-l-4 ${
                    isOpen ? 'border-l-accent-blue' :
                    isWin  ? 'border-l-accent-emerald' : 'border-l-accent-red'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {isOpen ? (
                        <Clock className="w-5 h-5 text-accent-blue flex-shrink-0" />
                      ) : isWin ? (
                        <CheckCircle2 className="w-5 h-5 text-accent-emerald flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-accent-red flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-text-primary">{trade.symbol}</span>
                          <span className="text-xs text-text-secondary truncate">{trade.asset}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isOpen
                              ? 'text-accent-blue border-accent-blue/40 bg-accent-blue/10'
                              : isWin
                              ? 'text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10'
                              : 'text-accent-red border-accent-red/40 bg-accent-red/10'
                          }`}>
                            {isOpen ? 'Open' : isWin ? '✓ Correct Prediction' : '✗ Failed Prediction'}
                          </span>
                          {isAutoTrade && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-accent-emerald border-accent-emerald/40 bg-accent-emerald/10 flex items-center gap-1">
                              <Bot className="w-2.5 h-2.5" /> Auto
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                          <span className="text-[11px] text-text-secondary">
                            Entry: <span className="font-mono text-text-primary">${formatPrice(trade.entryPrice)}</span>
                          </span>
                          {!isOpen && (
                            <span className="text-[11px] text-text-secondary">
                              Exit: <span className="font-mono text-text-primary">${formatPrice(trade.exitPrice)}</span>
                            </span>
                          )}
                          {isOpen && (
                            <>
                              <span className="text-[11px] text-text-secondary">
                                Target: <span className="font-mono text-accent-emerald">${formatPrice(trade.targetExit)}</span>
                              </span>
                              <span className="text-[11px] text-text-secondary">
                                SL: <span className="font-mono text-accent-red">${formatPrice(trade.stopLoss)}</span>
                              </span>
                            </>
                          )}
                          <span className="text-[11px] text-text-secondary">
                            Capital: <span className="font-mono text-text-primary">${formatUSDT(trade.capitalUsed)}</span>
                          </span>
                          <span className="text-[11px] text-text-secondary">
                            Qty: <span className="font-mono text-text-primary">{trade.quantity.toFixed(6)}</span>
                          </span>
                          <span className="text-[11px] text-text-secondary">
                            {trade.closedAt
                              ? `Closed: ${trade.closedAt.toLocaleTimeString()}`
                              : `Opened: ${trade.openedAt.toLocaleTimeString()}`}
                          </span>
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
                          <div className={`text-xs ${trade.pnlPct >= 0 ? 'text-accent-emerald' : 'text-accent-red'}`}>
                            {formatPct(trade.pnlPct)}
                          </div>
                        </div>
                      )}

                      {isOpen && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => closeOpenTrade(trade.id, true)}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-accent-emerald/10 border border-accent-emerald/40 text-accent-emerald hover:bg-accent-emerald/20 transition-all"
                          >
                            TP Hit
                          </button>
                          <button
                            onClick={() => closeOpenTrade(trade.id, false)}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-accent-red/10 border border-accent-red/40 text-accent-red hover:bg-accent-red/20 transition-all"
                          >
                            SL Hit
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => removeTrade(trade.id)}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all"
                        aria-label="Remove trade"
                      >
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

    </div>
  )
}

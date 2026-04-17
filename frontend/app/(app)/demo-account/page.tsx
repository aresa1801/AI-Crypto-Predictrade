'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FlaskConical, TrendingDown, DollarSign, Percent,
  ShoppingCart, History, Trophy, Target, AlertTriangle, Plus,
  CheckCircle2, XCircle, Clock, RefreshCw, Wallet, BarChart2,
  ArrowUpRight, ArrowDownRight, X,
} from 'lucide-react'
import { fetchOpportunityBuys, OpportunityAsset, formatPrice } from '@/lib/api/opportunity-buy'

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

  // Opportunity Buy data
  const [opportunities, setOpportunities] = useState<OpportunityAsset[]>([])
  const [loadingOpp, setLoadingOpp] = useState(true)

  // Execution Buy form
  const [selectedOpp, setSelectedOpp] = useState<OpportunityAsset | null>(null)
  const [exitPrice, setExitPrice] = useState('')
  const [execError, setExecError] = useState('')

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

  function handleCapitalChange(val: string) {
    setCapitalInput(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0) setCapital(n)
  }

  function handlePctChange(val: string) {
    setPctInput(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n > 0 && n <= 100) setPctPerTrade(n)
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
    }

    setTrades(prev => [trade, ...prev])
    setExecError('')
  }

  function closeOpenTrade(id: string, asWin: boolean) {
    setTrades(prev => prev.map(t => {
      if (t.id !== id) return t
      const closePrice = asWin ? t.targetExit : t.stopLoss
      const pnl = (closePrice - t.entryPrice) * t.quantity
      const pnlPct = ((closePrice - t.entryPrice) / t.entryPrice) * 100
      const status = tradeStatus(closePrice, t.entryPrice, t.targetExit, t.stopLoss)
      return { ...t, exitPrice: closePrice, pnl, pnlPct, status, closedAt: new Date() }
    }))
  }

  function removeTrade(id: string) {
    setTrades(prev => prev.filter(t => t.id !== id))
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
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text-blue">Demo Account</h1>
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
          <DollarSign className="w-4 h-4 text-accent-blue" /> Capital Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="flex gap-2 mt-2">
              {[5, 10, 20, 25, 50].map(p => (
                <button
                  key={p}
                  onClick={() => { setPctPerTrade(p); setPctInput(String(p)) }}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
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
        </div>
      </section>

      {/* ── Execution Buy ───────────────────────────────────────────────────── */}
      <section className="card-gradient p-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-accent-emerald" /> Execution Buy
          <span className="ml-auto text-[10px] normal-case font-normal text-text-secondary/50">
            Signals from Opportunity Buy
          </span>
        </h2>

        {loadingOpp ? (
          <div className="flex items-center gap-2 text-text-secondary text-sm py-4">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading opportunities…
          </div>
        ) : (
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
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-emerald to-accent-teal text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-accent-emerald/20 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Execute Demo Trade
                  </button>
                </>
              )}
            </div>
          </div>
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

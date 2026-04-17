'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart, RefreshCw, AlertTriangle, Activity, TrendingUp, Shield,
  Brain, Zap, Filter, Search, SortAsc, BarChart2, Star, ChevronDown,
} from 'lucide-react'
import { OpportunityCard } from '@/components/opportunity-buy/opportunity-card'
import { fetchOpportunityBuys, OpportunityAsset, SignalStrength, RiskLevel } from '@/lib/api/opportunity-buy'

type SortKey = 'score' | 'rr' | 'confidence' | 'rsi'

// Keep in sync with OPP_CACHE_TTL in opportunity-buy.ts
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000

const SIGNAL_LABELS: Record<SignalStrength, string> = {
  STRONG_BUY: '🔥 Strong Buy',
  BUY: 'Buy',
  ACCUMULATE: 'Accumulate',
}

const RISK_LABELS: Record<RiskLevel, string> = {
  Low: 'Low Risk',
  Medium: 'Medium Risk',
  High: 'High Risk',
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  gradient: string
}) {
  return (
    <div className="card-gradient flex items-center gap-4 p-4">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className="text-xl font-bold text-text-primary">{value}</div>
        <div className="text-xs text-text-secondary">{label}</div>
        {sub && <div className="text-[10px] text-text-secondary/60 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function OpportunityBuyPage() {
  const [opportunities, setOpportunities] = useState<OpportunityAsset[]>([])
  const [filtered, setFiltered] = useState<OpportunityAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stale, setStale] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [totalAnalyzed, setTotalAnalyzed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [signalFilter, setSignalFilter] = useState<SignalStrength | 'ALL'>('ALL')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [showFilters, setShowFilters] = useState(false)

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const result = await fetchOpportunityBuys(isRefresh)
      setOpportunities(result.opportunities)
      setTotalAnalyzed(result.totalAnalyzed)
      setStale(result.stale)
      setLastUpdated(result.lastUpdated)
      setError(null)
    } catch (err) {
      setError('Failed to load opportunities')
      console.error('Error loading opportunities:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => loadData(true), AUTO_REFRESH_INTERVAL_MS) // 5 min
    return () => clearInterval(interval)
  }, [loadData])

  // Apply filters & sort
  useEffect(() => {
    let result = [...opportunities]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(o =>
        o.asset.symbol.toLowerCase().includes(q) ||
        o.asset.name.toLowerCase().includes(q)
      )
    }

    if (signalFilter !== 'ALL') {
      result = result.filter(o => o.signalStrength === signalFilter)
    }

    if (riskFilter !== 'ALL') {
      result = result.filter(o => o.riskLevel === riskFilter)
    }

    result.sort((a, b) => {
      switch (sortKey) {
        case 'score': return b.compositeScore - a.compositeScore
        case 'rr': return b.entryExit.riskRewardT2 - a.entryExit.riskRewardT2
        case 'confidence': return b.prediction.confidence - a.prediction.confidence
        case 'rsi': return a.indicators.rsi14 - b.indicators.rsi14 // lowest RSI first
        default: return 0
      }
    })

    setFiltered(result)
  }, [opportunities, search, signalFilter, riskFilter, sortKey])

  // Stats
  const strongBuys = opportunities.filter(o => o.signalStrength === 'STRONG_BUY').length
  const avgScore = opportunities.length > 0
    ? Math.round(opportunities.reduce((acc, o) => acc + o.compositeScore, 0) / opportunities.length)
    : 0
  const avgConf = opportunities.length > 0
    ? Math.round(opportunities.reduce((acc, o) => acc + o.prediction.confidence, 0) / opportunities.length)
    : 0
  const avgRR = opportunities.length > 0
    ? (opportunities.reduce((acc, o) => acc + o.entryExit.riskRewardT2, 0) / opportunities.length).toFixed(1)
    : '0'

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ---- PAGE HEADER ---- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-emerald to-accent-teal flex items-center justify-center shadow-lg shadow-accent-emerald/30">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold" style={{
                background: 'linear-gradient(to right, #10B981, #14B8A6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                OPPORTUNITY BUY
              </h1>
              <p className="text-sm lg:text-base text-text-secondary">
                Hybrid AI analysis — best assets to buy now with precise entry & exit ranges
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary/50 border border-border-color/50 hover:border-accent-emerald/50 transition-all disabled:opacity-50"
              title="Refresh analysis"
            >
              <RefreshCw className={`w-4 h-4 text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs text-text-secondary hidden sm:inline">Refresh</span>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-emerald/20 border border-accent-emerald/30">
              <Activity className="w-4 h-4 text-accent-emerald animate-pulse" />
              <span className="text-sm font-medium text-accent-emerald hidden sm:inline">ENGINE ACTIVE</span>
              <span className="text-accent-emerald font-bold">● LIVE</span>
            </div>
          </div>
        </div>

        {/* Model info banner */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-secondary/30 border border-border-color/30 text-xs text-text-secondary flex-wrap">
          <Brain className="w-3.5 h-3.5 text-accent-purple" />
          <span className="font-medium text-text-primary">Hybrid Engine v3.0:</span>
          <span>freqtrade-inspired TA</span>
          <span className="text-border-color/70">•</span>
          <span>vectorbt momentum signals</span>
          <span className="text-border-color/70">•</span>
          <span>ML prediction scoring</span>
          <span className="text-border-color/70">•</span>
          <span>ATR-based entry/exit zones</span>
          {lastUpdated && (
            <>
              <span className="text-border-color/70 ml-auto">•</span>
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>

      {/* ---- STALE WARNING ---- */}
      {stale && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent-amber/10 border border-accent-amber/30">
          <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0" />
          <p className="text-sm text-accent-amber">Cached data — live market feed temporarily unavailable.</p>
          <button onClick={() => loadData(true)} className="ml-auto text-xs text-accent-amber underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* ---- STATS ---- */}
      {!loading && opportunities.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={ShoppingCart}
            label="Opportunities Found"
            value={opportunities.length}
            sub={`of ${totalAnalyzed} analyzed`}
            gradient="from-accent-emerald to-accent-teal"
          />
          <StatCard
            icon={Star}
            label="Strong Buy Signals"
            value={strongBuys}
            sub="Score ≥ 78/100"
            gradient="from-accent-amber to-accent-orange"
          />
          <StatCard
            icon={BarChart2}
            label="Avg Composite Score"
            value={`${avgScore}/100`}
            sub={`${avgConf}% avg confidence`}
            gradient="from-accent-blue to-accent-cyan"
          />
          <StatCard
            icon={Shield}
            label="Avg R:R Ratio"
            value={`${avgRR}:1`}
            sub="Target 2 (Moderate)"
            gradient="from-accent-purple to-accent-pink"
          />
        </div>
      )}

      {/* ---- FILTERS BAR ---- */}
      {!loading && opportunities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search asset…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-secondary/50 border border-border-color/50 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-emerald/50 transition-all"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-secondary/50 border border-border-color/50 hover:border-accent-emerald/50 text-sm text-text-secondary hover:text-text-primary transition-all"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Sort */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-secondary/50 border border-border-color/50">
              <SortAsc className="w-3.5 h-3.5 text-text-secondary" />
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="bg-transparent text-sm text-text-primary focus:outline-none cursor-pointer"
              >
                <option value="score">Sort: Score</option>
                <option value="rr">Sort: R:R Ratio</option>
                <option value="confidence">Sort: Confidence</option>
                <option value="rsi">Sort: RSI (Oversold)</option>
              </select>
            </div>

            <span className="text-xs text-text-secondary ml-auto hidden sm:block">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex items-center gap-3 flex-wrap p-3 rounded-lg bg-surface-secondary/20 border border-border-color/30">
              {/* Signal filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">Signal:</span>
                {(['ALL', 'STRONG_BUY', 'BUY', 'ACCUMULATE'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSignalFilter(s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      signalFilter === s
                        ? 'bg-accent-emerald text-white'
                        : 'bg-surface-secondary/50 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : SIGNAL_LABELS[s]}
                  </button>
                ))}
              </div>
              {/* Risk filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">Risk:</span>
                {(['ALL', 'Low', 'Medium', 'High'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRiskFilter(r)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      riskFilter === r
                        ? 'bg-accent-blue text-white'
                        : 'bg-surface-secondary/50 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {r === 'ALL' ? 'All Risk' : RISK_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- LOADING ---- */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-gradient animate-pulse h-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="card-gradient animate-pulse h-[420px]" />
            ))}
          </div>
        </div>
      )}

      {/* ---- ERROR ---- */}
      {error && !loading && opportunities.length === 0 && (
        <div className="card-gradient text-center py-12 space-y-4">
          <AlertTriangle className="w-10 h-10 text-accent-amber mx-auto" />
          <p className="text-text-primary text-lg font-semibold">{error}</p>
          <p className="text-text-secondary text-sm">Market analysis service temporarily unavailable.</p>
          <button
            onClick={() => loadData()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-emerald text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* ---- OPPORTUNITY GRID ---- */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Section header with live indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-emerald" />
              <span className="text-sm font-medium text-text-primary">
                {filtered.length} Buy Opportunit{filtered.length !== 1 ? 'ies' : 'y'}
              </span>
              {refreshing && (
                <span className="flex items-center gap-1 text-xs text-accent-emerald">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Updating…
                </span>
              )}
            </div>
            <span className="text-xs text-text-secondary">Score ≥ 62/100 • Sorted by {sortKey}</span>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(opp => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        </>
      )}

      {/* ---- EMPTY STATE (after filtering) ---- */}
      {!loading && opportunities.length > 0 && filtered.length === 0 && (
        <div className="card-gradient text-center py-12 space-y-3">
          <Filter className="w-10 h-10 text-text-secondary/50 mx-auto" />
          <p className="text-text-primary font-semibold">No results match your filters</p>
          <p className="text-text-secondary text-sm">Try adjusting the filters or search term.</p>
          <button
            onClick={() => { setSearch(''); setSignalFilter('ALL'); setRiskFilter('ALL') }}
            className="px-4 py-2 rounded-lg bg-accent-emerald/20 border border-accent-emerald/30 text-accent-emerald text-sm hover:bg-accent-emerald/30 transition-all"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ---- NO OPPORTUNITIES ---- */}
      {!loading && !error && opportunities.length === 0 && (
        <div className="card-gradient text-center py-12 space-y-3">
          <Zap className="w-10 h-10 text-accent-amber mx-auto" />
          <p className="text-text-primary font-semibold">No strong buy opportunities right now</p>
          <p className="text-text-secondary text-sm">
            The engine is scanning {totalAnalyzed} assets. No signals meet the threshold (score ≥ 62).
          </p>
          <button
            onClick={() => loadData(true)}
            className="px-4 py-2 rounded-lg bg-accent-emerald/20 border border-accent-emerald/30 text-accent-emerald text-sm hover:bg-accent-emerald/30 transition-all"
          >
            Re-analyze
          </button>
        </div>
      )}

      {/* ---- FOOTER ---- */}
      {!loading && (
        <div className="text-center text-xs text-text-secondary font-mono space-y-1">
          <div>
            {lastUpdated
              ? `Last analysis: ${lastUpdated.toLocaleTimeString()}`
              : 'Analyzing…'} • Auto-refresh: 5 min
          </div>
          <div className="text-text-secondary/50">
            ⚠️ For educational purposes only. Not financial advice. Always do your own research before trading.
          </div>
        </div>
      )}
    </div>
  )
}

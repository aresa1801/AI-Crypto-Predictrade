'use client'

import { useState, useCallback } from 'react'
import {
  Settings,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  XCircle,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Wallet,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

// ─── CEX Definitions ──────────────────────────────────────────────────────────

interface CexDefinition {
  id: string
  name: string
  logo: string
  color: string
  needsPassphrase: boolean
  passphrasePlaceholder?: string
}

const CEX_LIST: CexDefinition[] = [
  { id: 'binance', name: 'Binance', logo: '🟡', color: 'from-yellow-500/20 to-yellow-400/10 border-yellow-500/30 text-yellow-400', needsPassphrase: false },
  { id: 'bybit', name: 'Bybit', logo: '🟠', color: 'from-orange-500/20 to-orange-400/10 border-orange-500/30 text-orange-400', needsPassphrase: false },
  { id: 'okx', name: 'OKX', logo: '⚫', color: 'from-slate-500/20 to-slate-400/10 border-slate-400/30 text-slate-300', needsPassphrase: true, passphrasePlaceholder: 'OKX Passphrase' },
  { id: 'kraken', name: 'Kraken', logo: '🟣', color: 'from-purple-500/20 to-purple-400/10 border-purple-500/30 text-purple-400', needsPassphrase: false },
  { id: 'coinbase', name: 'Coinbase', logo: '🔵', color: 'from-blue-500/20 to-blue-400/10 border-blue-500/30 text-blue-400', needsPassphrase: true, passphrasePlaceholder: 'CB Advanced API Passphrase' },
  { id: 'kucoin', name: 'KuCoin', logo: '🟢', color: 'from-emerald-500/20 to-emerald-400/10 border-emerald-500/30 text-emerald-400', needsPassphrase: true, passphrasePlaceholder: 'KuCoin Passphrase' },
  { id: 'gateio', name: 'Gate.io', logo: '🔴', color: 'from-red-500/20 to-red-400/10 border-red-500/30 text-red-400', needsPassphrase: false },
  { id: 'mexc', name: 'MEXC', logo: '🔷', color: 'from-cyan-500/20 to-cyan-400/10 border-cyan-500/30 text-cyan-400', needsPassphrase: false },
  { id: 'bitget', name: 'Bitget', logo: '🟦', color: 'from-indigo-500/20 to-indigo-400/10 border-indigo-500/30 text-indigo-400', needsPassphrase: true, passphrasePlaceholder: 'Bitget Passphrase' },
]

const MAX_CONNECTIONS = 5

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'error'

interface CexConnection {
  id: string
  cexId: string
  apiKey: string
  apiSecret: string
  passphrase: string
  status: ConnectionStatus
  errorMessage?: string
  portfolio?: {
    totalUsdt: number
    assets: { symbol: string; usdt: number }[]
  }
  availableUsdt: string
  showSecret: boolean
  showPassphrase: boolean
  expanded: boolean
}

function createConnection(): CexConnection {
  return {
    id: nextId(),
    cexId: '',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    status: 'idle',
    availableUsdt: '',
    showSecret: false,
    showPassphrase: false,
    expanded: true,
  }
}

// ─── ID generator ────────────────────────────────────────────────────────────

let _idCounter = 0
function nextId(): string {
  return `conn-${Date.now()}-${++_idCounter}`
}


// ─── Sub-components ───────────────────────────────────────────────────────────

function CexSelector({
  value,
  onChange,
  usedIds,
  currentId,
}: {
  value: string
  onChange: (v: string) => void
  usedIds: string[]
  currentId: string
}) {
  const [open, setOpen] = useState(false)
  const selected = CEX_LIST.find(c => c.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-surface-secondary/50 border border-border-color/50 rounded-lg text-sm hover:border-accent-blue/40 transition-colors"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="text-base">{selected.logo}</span>
            <span className="text-text-primary font-medium">{selected.name}</span>
          </span>
        ) : (
          <span className="text-text-secondary">Select CEX…</span>
        )}
        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border-color/60 bg-surface-primary shadow-xl shadow-black/40 overflow-hidden">
          {CEX_LIST.map(cex => {
            const disabled = usedIds.includes(cex.id) && cex.id !== currentId
            return (
              <button
                key={cex.id}
                type="button"
                disabled={disabled}
                onClick={() => { onChange(cex.id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : cex.id === value
                    ? 'bg-accent-blue/20 text-accent-blue'
                    : 'hover:bg-surface-secondary/70 text-text-primary'
                }`}
              >
                <span className="text-base">{cex.logo}</span>
                <span className="font-medium">{cex.name}</span>
                {disabled && <span className="ml-auto text-xs text-text-secondary">Added</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, errorMessage }: { status: ConnectionStatus; errorMessage?: string }) {
  if (status === 'idle') return null
  if (status === 'testing') return (
    <span className="flex items-center gap-1.5 text-xs text-accent-blue">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing…
    </span>
  )
  if (status === 'connected') return (
    <span className="flex items-center gap-1.5 text-xs text-accent-emerald">
      <CheckCircle2 className="w-3.5 h-3.5" /> Connected
    </span>
  )
  return (
    <span className="flex items-center gap-1.5 text-xs text-accent-red" title={errorMessage}>
      <XCircle className="w-3.5 h-3.5" /> {errorMessage ?? 'Error'}
    </span>
  )
}

function PortfolioBar({ assets }: { assets: { symbol: string; usdt: number }[] }) {
  const total = assets.reduce((s, a) => s + a.usdt, 0)
  const colors = ['bg-accent-blue', 'bg-accent-emerald', 'bg-accent-purple', 'bg-accent-amber']
  return (
    <div className="mt-3 space-y-2">
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
        {assets.map((a, i) => (
          <div
            key={a.symbol}
            className={`${colors[i % colors.length]} transition-all`}
            style={{ width: `${(a.usdt / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {assets.map((a, i) => (
          <span key={a.symbol} className="flex items-center gap-1 text-xs text-text-secondary">
            <span className={`inline-block w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
            {a.symbol} <span className="text-text-primary font-medium">${a.usdt.toLocaleString()}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Connection Card ──────────────────────────────────────────────────────────

function ConnectionCard({
  conn,
  index,
  usedCexIds,
  onChange,
  onTest,
  onRemove,
  onRefresh,
}: {
  conn: CexConnection
  index: number
  usedCexIds: string[]
  onChange: (id: string, updates: Partial<CexConnection>) => void
  onTest: (id: string) => void
  onRemove: (id: string) => void
  onRefresh: (id: string) => void
}) {
  const cexDef = CEX_LIST.find(c => c.id === conn.cexId)
  const isConnected = conn.status === 'connected'
  const isTesting = conn.status === 'testing'

  return (
    <div className={`rounded-xl border transition-all duration-300 ${
      isConnected
        ? 'border-accent-emerald/30 bg-gradient-to-br from-accent-emerald/5 to-transparent'
        : conn.status === 'error'
        ? 'border-accent-red/30 bg-gradient-to-br from-accent-red/5 to-transparent'
        : 'border-border-color/50 bg-surface-secondary/30'
    }`}>
      {/* Card Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
          isConnected ? 'bg-accent-emerald/20 text-accent-emerald' : 'bg-surface-secondary text-text-secondary'
        }`}>
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          {cexDef ? (
            <div className="flex items-center gap-1.5">
              <span>{cexDef.logo}</span>
              <span className="font-semibold text-text-primary text-sm">{cexDef.name}</span>
              {isConnected && conn.portfolio && (
                <span className="text-xs text-accent-emerald ml-1">
                  ${conn.portfolio.totalUsdt.toLocaleString()} USDT
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-text-secondary">Not configured</span>
          )}
        </div>

        <StatusBadge status={conn.status} errorMessage={conn.errorMessage} />

        <div className="flex items-center gap-1.5 ml-1">
          {isConnected && (
            <button
              type="button"
              title="Refresh portfolio"
              onClick={() => onRefresh(conn.id)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onChange(conn.id, { expanded: !conn.expanded })}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            {conn.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            title="Remove connection"
            onClick={() => onRemove(conn.id)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {conn.expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-color/30 pt-3">
          {/* CEX Selector */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block font-medium">Exchange</label>
            <CexSelector
              value={conn.cexId}
              onChange={v => onChange(conn.id, { cexId: v, status: 'idle', portfolio: undefined })}
              usedIds={usedCexIds}
              currentId={conn.cexId}
            />
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block font-medium">API Key</label>
            <input
              type="text"
              value={conn.apiKey}
              onChange={e => onChange(conn.id, { apiKey: e.target.value })}
              placeholder="Enter your API Key"
              className="w-full px-3 py-2.5 bg-surface-secondary/50 border border-border-color/50 rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent-blue/50 focus:outline-none transition-colors font-mono"
            />
          </div>

          {/* API Secret */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block font-medium">API Secret</label>
            <div className="relative">
              <input
                type={conn.showSecret ? 'text' : 'password'}
                value={conn.apiSecret}
                onChange={e => onChange(conn.id, { apiSecret: e.target.value })}
                placeholder="Enter your API Secret"
                className="w-full px-3 py-2.5 pr-10 bg-surface-secondary/50 border border-border-color/50 rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent-blue/50 focus:outline-none transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => onChange(conn.id, { showSecret: !conn.showSecret })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {conn.showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Passphrase (conditional) */}
          {cexDef?.needsPassphrase && (
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block font-medium">
                Passphrase
              </label>
              <div className="relative">
                <input
                  type={conn.showPassphrase ? 'text' : 'password'}
                  value={conn.passphrase}
                  onChange={e => onChange(conn.id, { passphrase: e.target.value })}
                  placeholder={cexDef.passphrasePlaceholder ?? 'API Passphrase'}
                  className="w-full px-3 py-2.5 pr-10 bg-surface-secondary/50 border border-border-color/50 rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent-blue/50 focus:outline-none transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => onChange(conn.id, { showPassphrase: !conn.showPassphrase })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {conn.showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Available USDT for trading */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block font-medium">
              Available USDT for Trading
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-medium">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={conn.availableUsdt}
                onChange={e => onChange(conn.id, { availableUsdt: e.target.value })}
                placeholder={isConnected && conn.portfolio ? conn.portfolio.assets.find(a => a.symbol === 'USDT')?.usdt.toString() ?? '0' : '0'}
                className="w-full pl-7 pr-3 py-2.5 bg-surface-secondary/50 border border-border-color/50 rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent-blue/50 focus:outline-none transition-colors"
              />
              {isConnected && conn.portfolio && (
                <button
                  type="button"
                  onClick={() => {
                    const usdt = conn.portfolio!.assets.find(a => a.symbol === 'USDT')?.usdt ?? 0
                    onChange(conn.id, { availableUsdt: usdt.toString() })
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-accent-cyan hover:text-accent-blue transition-colors px-1.5 py-0.5 rounded bg-accent-cyan/10 hover:bg-accent-blue/10"
                >
                  MAX
                </button>
              )}
            </div>
            {isConnected && conn.portfolio && (
              <p className="text-xs text-text-secondary mt-1">
                Available in wallet: <span className="text-accent-emerald font-medium">
                  ${conn.portfolio.assets.find(a => a.symbol === 'USDT')?.usdt.toLocaleString() ?? '0'} USDT
                </span>
              </p>
            )}
          </div>

          {/* Portfolio display after connection */}
          {isConnected && conn.portfolio && (
            <div className="p-3 rounded-lg bg-accent-emerald/5 border border-accent-emerald/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-accent-emerald flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> Portfolio Balance
                </span>
                <span className="text-sm font-bold text-text-primary">
                  ${conn.portfolio.totalUsdt.toLocaleString()} <span className="text-xs text-text-secondary font-normal">USDT</span>
                </span>
              </div>
              <PortfolioBar assets={conn.portfolio.assets} />
            </div>
          )}

          {/* Test / Connect Button */}
          <button
            type="button"
            disabled={!conn.cexId || !conn.apiKey || !conn.apiSecret || isTesting}
            onClick={() => onTest(conn.id)}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isConnected
                ? 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30 hover:bg-accent-emerald/30'
                : 'bg-gradient-to-r from-accent-blue to-accent-cyan text-white hover:shadow-lg hover:shadow-accent-blue/30'
            }`}
          >
            {isTesting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Testing Connection…</>
            ) : isConnected ? (
              <><Wifi className="w-4 h-4" /> Re-test Connection</>
            ) : (
              <><Wifi className="w-4 h-4" /> Test & Connect</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Summary Panel ────────────────────────────────────────────────────────────

function SummaryPanel({ connections }: { connections: CexConnection[] }) {
  const connected = connections.filter(c => c.status === 'connected' && c.portfolio)

  if (connected.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <WifiOff className="w-10 h-10 text-text-secondary/40" />
        <p className="text-sm text-text-secondary">No CEX connected yet.</p>
        <p className="text-xs text-text-secondary/60">Add and test a connection to see your portfolio summary.</p>
      </div>
    )
  }

  const totalPortfolio = connected.reduce((sum, c) => sum + (c.portfolio?.totalUsdt ?? 0), 0)
  const totalAvailable = connected.reduce((sum, c) => sum + (parseFloat(c.availableUsdt) || 0), 0)

  return (
    <div className="space-y-4">
      {/* Aggregate stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border border-accent-blue/20">
          <p className="text-xs text-text-secondary mb-1">Total Portfolio</p>
          <p className="text-lg font-bold text-accent-blue">${totalPortfolio.toLocaleString()}</p>
          <p className="text-xs text-text-secondary">across {connected.length} exchange{connected.length > 1 ? 's' : ''}</p>
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-br from-accent-emerald/10 to-accent-teal/10 border border-accent-emerald/20">
          <p className="text-xs text-text-secondary mb-1">Available for Trading</p>
          <p className="text-lg font-bold text-accent-emerald">${totalAvailable.toLocaleString()}</p>
          <p className="text-xs text-text-secondary">USDT allocated</p>
        </div>
      </div>

      {/* Per-CEX breakdown */}
      <div className="space-y-2">
        {connected.map(conn => {
          const cexDef = CEX_LIST.find(c => c.id === conn.cexId)
          const percentage = totalPortfolio > 0 ? (conn.portfolio!.totalUsdt / totalPortfolio) * 100 : 0
          return (
            <div key={conn.id} className="p-3 rounded-lg bg-surface-secondary/40 border border-border-color/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{cexDef?.logo}</span>
                  <span className="text-sm font-semibold text-text-primary">{cexDef?.name}</span>
                  <span className="badge badge-success text-xs py-0.5 px-2">Connected</span>
                </div>
                <span className="text-sm font-bold text-text-primary">
                  ${conn.portfolio!.totalUsdt.toLocaleString()}
                </span>
              </div>

              {/* Allocation bar */}
              <div className="w-full h-1.5 bg-surface-primary rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-accent-cyan to-accent-blue transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>{percentage.toFixed(1)}% of total portfolio</span>
                <span>
                  Trading: <span className="text-accent-emerald font-medium">
                    ${parseFloat(conn.availableUsdt || '0').toLocaleString()} USDT
                  </span>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-amber/10 border border-accent-amber/20">
        <AlertCircle className="w-4 h-4 text-accent-amber flex-shrink-0 mt-0.5" />
        <p className="text-xs text-accent-amber">
          API keys are stored in memory only. For production use, store them securely via environment variables or a vault service.
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CexApiSettings() {
  const [connections, setConnections] = useState<CexConnection[]>([createConnection()])
  const [activeTab, setActiveTab] = useState<'connections' | 'summary'>('connections')

  const connectedCount = connections.filter(c => c.status === 'connected').length

  const usedCexIds = connections.map(c => c.cexId).filter(Boolean)

  // Empty dependency array is safe here because setConnections (from useState) is stable across renders
  const updateConnection = useCallback((id: string, updates: Partial<CexConnection>) => {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }, [])

  const addConnection = () => {
    if (connections.length >= MAX_CONNECTIONS) return
    setConnections(prev => [...prev, createConnection()])
  }

  const removeConnection = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id))
  }

  const testConnection = async (id: string) => {
    // Capture the connection data synchronously before the async delay to avoid stale state reads
    const conn = connections.find(c => c.id === id)
    if (!conn) return

    updateConnection(id, { status: 'testing', errorMessage: undefined })

    // Validate API key format (minimum length check – real validation requires a backend)
    await new Promise(r => setTimeout(r, 1500))

    const isValid = conn.apiKey.length >= 8 && conn.apiSecret.length >= 8

    if (isValid) {
      updateConnection(id, {
        status: 'connected',
        // No portfolio data – a real backend call to the CEX would populate this
        portfolio: undefined,
      })
    } else {
      updateConnection(id, {
        status: 'error',
        errorMessage: 'Invalid API credentials',
      })
    }
  }

  const refreshPortfolio = async (id: string) => {
    const conn = connections.find(c => c.id === id)
    if (!conn || conn.status !== 'connected') return
    // Real portfolio refresh would call the backend; no-op until backend is available
    updateConnection(id, { status: 'connected' })
  }

  return (
    <div className="card-gradient">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border-color/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-lg shadow-accent-blue/30">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold gradient-text-blue">CEX API Settings</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Connect up to {MAX_CONNECTIONS} exchanges simultaneously
            </p>
          </div>
        </div>

        {/* Connection badges */}
        <div className="flex items-center gap-2">
          {connectedCount > 0 ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-emerald/20 border border-accent-emerald/30 text-xs font-semibold text-accent-emerald">
              <Wifi className="w-3.5 h-3.5" /> {connectedCount}/{connections.length}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-secondary border border-border-color/50 text-xs text-text-secondary">
              <WifiOff className="w-3.5 h-3.5" /> No connections
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-surface-secondary/50 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('connections')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'connections'
              ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Wifi className="w-4 h-4" />
          API Connections
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            activeTab === 'connections' ? 'bg-accent-blue/30 text-accent-blue' : 'bg-surface-secondary text-text-secondary'
          }`}>
            {connections.length}/{MAX_CONNECTIONS}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'summary'
              ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Portfolio Summary
          {connectedCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-emerald/20 text-accent-emerald">
              {connectedCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'connections' ? (
        <div className="space-y-3">
          {connections.map((conn, index) => (
            <ConnectionCard
              key={conn.id}
              conn={conn}
              index={index}
              usedCexIds={usedCexIds}
              onChange={updateConnection}
              onTest={testConnection}
              onRemove={removeConnection}
              onRefresh={refreshPortfolio}
            />
          ))}

          {/* Add Connection Button */}
          {connections.length < MAX_CONNECTIONS && (
            <button
              type="button"
              onClick={addConnection}
              className="w-full py-3 rounded-xl border-2 border-dashed border-border-color/50 text-text-secondary hover:border-accent-blue/40 hover:text-accent-blue hover:bg-accent-blue/5 transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Exchange Connection
              <span className="text-xs opacity-60">({MAX_CONNECTIONS - connections.length} slots remaining)</span>
            </button>
          )}

          {connections.length === MAX_CONNECTIONS && (
            <p className="text-center text-xs text-text-secondary py-2">
              Maximum of {MAX_CONNECTIONS} connections reached.
            </p>
          )}
        </div>
      ) : (
        <SummaryPanel connections={connections} />
      )}
    </div>
  )
}

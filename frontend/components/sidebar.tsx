'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, TrendingUp, Calculator, RotateCw, Settings, Home, Activity, Sparkles } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, gradient: 'from-accent-purple to-accent-pink' },
  { href: '/predictions', label: 'Predictions', icon: TrendingUp, gradient: 'from-accent-blue to-accent-cyan' },
  { href: '/risk', label: 'Risk Simulator', icon: Calculator, gradient: 'from-accent-indigo to-accent-purple' },
  { href: '/backtest', label: 'Backtest', icon: RotateCw, gradient: 'from-accent-cyan to-accent-teal' },
  { href: '/settings', label: 'Settings', icon: Settings, gradient: 'from-accent-amber to-accent-orange' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-surface-primary/50 backdrop-blur-xl border-r border-border-color/50 flex-col shadow-2xl">
      {/* Header with gradient */}
      <div className="p-6 border-b border-border-color/50 bg-gradient-to-br from-accent-purple/10 to-accent-pink/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-lg shadow-accent-purple/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">PREDICTRADE</h1>
            <p className="text-xs text-text-secondary">AI Crypto Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-accent-emerald">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>System Active</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-2 px-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary/50'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 animate-shimmer"></div>
                  )}
                  <div className={`relative z-10 ${isActive ? '' : `group-hover:text-accent-${item.gradient.split('-')[1]}`}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="relative z-10">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Stats Card */}
      <div className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-br from-accent-indigo/20 to-accent-purple/20 border border-accent-indigo/30 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse"></div>
          <span className="text-xs font-medium text-text-primary">Performance</span>
        </div>
        <div className="text-2xl font-bold gradient-text-blue">+24.5%</div>
        <p className="text-xs text-text-secondary mt-1">Last 30 days</p>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border-color/50 text-xs text-text-secondary backdrop-blur-sm">
        <p className="font-medium text-text-primary mb-1">© 2026 PREDICTRADE</p>
        <p className="text-text-secondary/70">Version 2.0.0</p>
      </div>
    </aside>
  )
}

/* Add shimmer animation to globals.css if needed */

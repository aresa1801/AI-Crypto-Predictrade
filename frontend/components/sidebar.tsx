'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, TrendingUp, Calculator, RotateCw, Settings, Home, Activity, Sparkles, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import { useSidebar } from '@/contexts/sidebar-context'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, gradient: 'from-accent-purple to-accent-pink' },
  { href: '/predictions', label: 'AI Signals', icon: TrendingUp, gradient: 'from-accent-blue to-accent-cyan' },
  { href: '/opportunity-buy', label: 'Opportunity Buy', icon: ShoppingCart, gradient: 'from-accent-emerald to-accent-teal' },
  { href: '/risk', label: 'Risk Analysis', icon: Calculator, gradient: 'from-accent-indigo to-accent-purple' },
  { href: '/backtest', label: 'Backtest', icon: RotateCw, gradient: 'from-accent-cyan to-accent-teal' },
  { href: '/settings', label: 'Settings', icon: Settings, gradient: 'from-accent-amber to-accent-orange' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, toggleSidebar } = useSidebar()

  return (
    <aside className={`hidden lg:flex fixed left-0 top-0 h-screen bg-surface-primary/50 backdrop-blur-xl border-r border-border-color/50 flex-col shadow-2xl transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-72'
    }`}>
      {/* Header with gradient */}
      <div className="px-6 py-4 border-b border-border-color/50 bg-gradient-to-br from-accent-purple/10 to-accent-pink/10">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-lg shadow-accent-purple/30 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold gradient-text">PREDICTRADE</h1>
              <p className="text-xs text-text-secondary">AI Spot Trading</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-2 mt-2 text-xs text-accent-emerald">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>System Active</span>
          </div>
        )}
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
                  className={`group flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary/50'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 animate-shimmer"></div>
                  )}
                  <div className={`relative z-10 ${isActive ? '' : `group-hover:text-accent-${item.gradient.split('-')[1]}`}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="relative z-10">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                      )}
                    </>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Stats Card */}
      {!isCollapsed && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-br from-accent-indigo/20 to-accent-purple/20 border border-accent-indigo/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse"></div>
            <span className="text-xs font-medium text-text-primary">Performance</span>
          </div>
          <div className="text-2xl font-bold gradient-text-blue">+24.5%</div>
          <p className="text-xs text-text-secondary mt-1">Spot Portfolio ROI</p>
        </div>
      )}

      {/* Toggle Button */}
      <div className={`p-4 border-t border-border-color/50 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={toggleSidebar}
          className="w-full p-2 rounded-lg bg-surface-secondary/50 hover:bg-surface-secondary border border-border-color/50 hover:border-accent-purple/50 text-text-secondary hover:text-text-primary transition-all duration-300 flex items-center justify-center gap-2"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border-color/50 text-xs text-text-secondary backdrop-blur-sm">
          <p className="font-medium text-text-primary mb-1">© 2026 PREDICTRADE</p>
          <p className="text-text-secondary/70">Version 2.0.0</p>
        </div>
      )}
    </aside>
  )
}

/* Add shimmer animation to globals.css if needed */

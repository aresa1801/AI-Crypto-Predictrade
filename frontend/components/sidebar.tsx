'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp, Calculator, RotateCw, Settings, Home, Activity, ChevronLeft, ChevronRight, ShoppingCart, Zap, FlaskConical, Rocket } from 'lucide-react'
import { useSidebar } from '@/contexts/sidebar-context'

const navItems = [
  { href: '/dashboard',       label: 'Dashboard',        icon: Home,        dotColor: 'bg-accent-blue',    iconColor: 'text-accent-blue',    indicatorColor: 'bg-accent-blue'    },
  { href: '/live-trading',    label: 'Live Trading',     icon: Rocket,      dotColor: 'bg-accent-red',     iconColor: 'text-accent-red',     indicatorColor: 'bg-accent-red'     },
  { href: '/predictions',     label: 'AI Signals',       icon: TrendingUp,  dotColor: 'bg-accent-cyan',    iconColor: 'text-accent-cyan',    indicatorColor: 'bg-accent-cyan'    },
  { href: '/opportunity-buy', label: 'Opportunity Buy',  icon: ShoppingCart, dotColor: 'bg-accent-emerald', iconColor: 'text-accent-emerald', indicatorColor: 'bg-accent-emerald' },
  { href: '/risk',            label: 'Risk Analysis',    icon: Calculator,  dotColor: 'bg-accent-amber',   iconColor: 'text-accent-amber',   indicatorColor: 'bg-accent-amber'   },
  { href: '/backtest',        label: 'Backtest',         icon: RotateCw,       dotColor: 'bg-accent-purple',  iconColor: 'text-accent-purple',  indicatorColor: 'bg-accent-purple'  },
  { href: '/demo-account',   label: 'Demo Trade',       icon: FlaskConical,   dotColor: 'bg-accent-indigo',  iconColor: 'text-accent-indigo',  indicatorColor: 'bg-accent-indigo'  },
  { href: '/settings',        label: 'Settings',         icon: Settings,       dotColor: 'bg-accent-teal',    iconColor: 'text-accent-teal',    indicatorColor: 'bg-accent-teal'    },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, toggleSidebar } = useSidebar()

  return (
    <aside className={`hidden lg:flex fixed left-0 top-0 h-screen flex-col transition-all duration-300 ${
      isCollapsed ? 'w-[72px]' : 'w-64'
    } bg-surface-primary/60 backdrop-blur-2xl border-r border-border-color/60 shadow-[4px_0_24px_rgb(0_0_0/0.35)]`}>

      {/* Brand Header */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-border-color/50 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-lg shadow-accent-blue/30">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-accent-emerald rounded-full border-2 border-surface-primary" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <span className="block text-base font-bold tracking-tight gradient-text-blue">PREDICTRADE</span>
            <span className="block text-[10px] text-text-secondary font-medium tracking-widest uppercase">AI Spot Trading</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-surface-secondary/80 text-text-primary shadow-sm'
                  : 'text-text-secondary hover:bg-surface-secondary/50 hover:text-text-primary'
              }`}
            >
              {/* Active left-edge indicator */}
              {isActive && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${item.indicatorColor}`} />
              )}

              <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200 ${
                isActive ? item.iconColor : 'text-text-secondary group-hover:text-text-primary'
              }`} />

              {!isCollapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}

              {!isCollapsed && isActive && (
                <span className={`w-1.5 h-1.5 rounded-full ${item.dotColor} opacity-80`} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* System Status */}
      {!isCollapsed && (
        <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg bg-surface-secondary/40 border border-border-color/50">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-accent-emerald animate-pulse flex-shrink-0" />
            <span className="text-xs text-text-secondary">System</span>
            <span className="ml-auto text-[10px] font-semibold text-accent-emerald uppercase tracking-wide">Live</span>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className={`p-3 border-t border-border-color/50 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary/50 border border-border-color/40 hover:border-accent-blue/30 transition-all duration-200 text-xs font-medium"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="px-4 pb-4 text-[10px] text-text-secondary/50 font-medium">
          © 2026 PREDICTRADE · v2.0.0
        </div>
      )}
    </aside>
  )
}

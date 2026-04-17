'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, TrendingUp, Calculator, RotateCw, Settings, Home, Zap, ShoppingCart } from 'lucide-react'

const navItems = [
  { href: '/dashboard',       label: 'Dashboard',       icon: Home,        iconColor: 'text-accent-blue',    indicatorColor: 'bg-accent-blue'    },
  { href: '/predictions',     label: 'AI Signals',      icon: TrendingUp,  iconColor: 'text-accent-cyan',    indicatorColor: 'bg-accent-cyan'    },
  { href: '/opportunity-buy', label: 'Opportunity Buy', icon: ShoppingCart, iconColor: 'text-accent-emerald', indicatorColor: 'bg-accent-emerald' },
  { href: '/risk',            label: 'Risk Analysis',   icon: Calculator,  iconColor: 'text-accent-amber',   indicatorColor: 'bg-accent-amber'   },
  { href: '/backtest',        label: 'Backtest',        icon: RotateCw,    iconColor: 'text-accent-purple',  indicatorColor: 'bg-accent-purple'  },
  { href: '/settings',        label: 'Settings',        icon: Settings,    iconColor: 'text-accent-teal',    indicatorColor: 'bg-accent-teal'    },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="lg:hidden">
      {/* Hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-surface-secondary/50 border border-border-color/55 text-text-secondary hover:text-text-primary hover:border-accent-blue/40 transition-all duration-200"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 top-[52px]"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed top-[52px] left-0 right-0 bg-surface-primary/97 backdrop-blur-2xl border-b border-border-color/55 z-50 shadow-[0_12px_40px_rgb(0_0_0/0.5)]">

            {/* Brand */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-color/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-md shadow-accent-blue/25">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="block text-sm font-bold gradient-text-blue tracking-tight">PREDICTRADE</span>
                <span className="block text-[10px] text-text-secondary uppercase tracking-widest">Navigation</span>
              </div>
            </div>

            {/* Nav links */}
            <nav className="p-3 space-y-0.5 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-surface-secondary/80 text-text-primary'
                        : 'text-text-secondary hover:bg-surface-secondary/50 hover:text-text-primary'
                    }`}
                  >
                    {isActive && (
                      <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${item.indicatorColor}`} />
                    )}
                    <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? item.iconColor : ''}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="px-4 py-3 border-t border-border-color/50">
              <p className="text-[10px] text-text-secondary/50 font-medium">© 2026 PREDICTRADE · v2.0.0</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { usePathname } from 'next/navigation'
import { Bell, User, Search } from 'lucide-react'
import { MobileNav } from './mobile-nav'
import { ThemeToggle } from './theme-toggle'

const breadcrumbs: Record<string, { title: string; sub: string }> = {
  '/dashboard':       { title: 'Dashboard',          sub: 'Spot Trading Overview'   },
  '/predictions':     { title: 'AI Signals',          sub: 'Market Intelligence'     },
  '/opportunity-buy': { title: 'Opportunity Buy',     sub: 'Entry Signal Scanner'    },
  '/risk':            { title: 'Risk Analysis',       sub: 'Position Risk Tools'     },
  '/backtest':        { title: 'Strategy Backtest',   sub: 'Historical Performance'  },
  '/settings':        { title: 'Settings',            sub: 'Platform Configuration'  },
}

export function Topbar() {
  const pathname = usePathname()
  const page = breadcrumbs[pathname] ?? { title: 'Dashboard', sub: 'AI-Powered Spot Trading' }

  return (
    <header className="sticky top-0 z-10 border-b border-border-color/55 bg-surface-primary/75 backdrop-blur-2xl px-4 lg:px-6 py-3 flex items-center justify-between shadow-[0_4px_20px_rgb(0_0_0/0.3)]">

      {/* Left — page title */}
      <div className="flex items-center gap-3 min-w-0">
        <MobileNav />
        <div className="min-w-0">
          <h2 className="text-base lg:text-lg font-bold text-text-primary leading-tight tracking-tight truncate">
            {page.title}
          </h2>
          <p className="hidden sm:block text-[11px] text-text-secondary leading-none mt-0.5">{page.sub}</p>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">

        {/* Search */}
        <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary/50 border border-border-color/55 text-text-secondary hover:text-text-primary hover:border-accent-blue/40 transition-all duration-200 text-sm">
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs text-text-secondary/70">Search…</span>
          <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-surface-primary border border-border-color text-text-secondary/60 font-mono">⌘K</kbd>
        </button>

        <ThemeToggle />

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary/50 border border-transparent hover:border-border-color/50 transition-all duration-200">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent-red rounded-full border border-surface-primary animate-pulse" />
        </button>

        {/* User Profile */}
        <button className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-lg bg-surface-secondary/50 border border-border-color/55 hover:border-accent-blue/35 transition-all duration-200">
          <span className="hidden lg:block text-xs font-medium text-text-primary">Spot Bot</span>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-md shadow-accent-blue/25">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
        </button>

      </div>
    </header>
  )
}

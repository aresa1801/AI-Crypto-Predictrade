'use client'

import { usePathname } from 'next/navigation'
import { Bell, User, Search, Zap } from 'lucide-react'
import { MobileNav } from './mobile-nav'
import { ThemeToggle } from './theme-toggle'

const breadcrumbs: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/predictions': 'Predictions',
  '/risk': 'Risk Simulator',
  '/backtest': 'Backtest',
  '/settings': 'Settings',
}

export function Topbar() {
  const pathname = usePathname()
  const title = breadcrumbs[pathname] || 'Dashboard'

  return (
    <header className="sticky top-0 z-10 border-b border-border-color/50 bg-surface-primary/80 backdrop-blur-xl px-4 lg:px-8 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-4">
        <MobileNav />
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-text-primary">{title}</h2>
          <p className="text-xs text-text-secondary">Real-time AI Analytics</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 lg:gap-4">
        {/* Search Button */}
        <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-secondary/50 border border-border-color/50 text-text-secondary hover:text-text-primary hover:border-accent-cyan/50 transition-all duration-300 text-sm">
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="hidden lg:inline-flex px-2 py-0.5 text-xs rounded bg-surface-primary border border-border-color">⌘K</kbd>
        </button>

        {/* Quick Actions */}
        <button className="p-2.5 rounded-lg bg-gradient-to-br from-accent-purple/20 to-accent-pink/20 border border-accent-purple/30 text-accent-purple hover:shadow-lg hover:shadow-accent-purple/30 transition-all duration-300">
          <Zap className="w-5 h-5" />
        </button>

        <ThemeToggle />
        
        {/* Notifications */}
        <button className="relative p-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary/50 transition-all duration-300">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full border-2 border-surface-primary animate-pulse"></span>
        </button>
        
        {/* User Profile */}
        <button className="flex items-center gap-3 p-2 pl-3 rounded-lg bg-surface-secondary/50 border border-border-color/50 hover:border-accent-cyan/50 transition-all duration-300">
          <span className="hidden lg:block text-sm font-medium text-text-primary">Trading Bot</span>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center shadow-lg">
            <User className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>
    </header>
  )
}

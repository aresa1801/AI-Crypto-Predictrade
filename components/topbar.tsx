'use client'

import { usePathname } from 'next/navigation'
import { Bell, User } from 'lucide-react'
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
    <header className="border-b border-border-color bg-surface-primary px-4 lg:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <MobileNav />
        <h2 className="text-base lg:text-lg font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="flex items-center gap-4 lg:gap-6">
        <ThemeToggle />
        <button className="text-text-secondary hover:text-text-primary transition-colors p-2 hover:bg-surface-secondary rounded-lg">
          <Bell className="w-5 h-5" />
        </button>
        <button className="text-text-secondary hover:text-text-primary transition-colors p-2 hover:bg-surface-secondary rounded-lg">
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}

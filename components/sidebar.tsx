'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, TrendingUp, Calculator, RotateCw, Settings, Home } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/predictions', label: 'Predictions', icon: TrendingUp },
  { href: '/risk', label: 'Risk Simulator', icon: Calculator },
  { href: '/backtest', label: 'Backtest', icon: RotateCw },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-surface-primary border-r border-border-color flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border-color">
        <h1 className="text-xl font-bold text-accent-blue">PREDICTRADE</h1>
        <p className="text-xs text-text-secondary mt-1">AI Crypto Analysis</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-blue text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border-color text-xs text-text-secondary">
        <p>© 2025 PREDICTRADE</p>
        <p className="mt-2">Version 1.0.0</p>
      </div>
    </aside>
  )
}

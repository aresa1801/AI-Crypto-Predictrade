'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, TrendingUp, Calculator, RotateCw, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/predictions', label: 'Predictions', icon: TrendingUp },
  { href: '/dashboard/risk', label: 'Risk Simulator', icon: Calculator },
  { href: '/dashboard/backtest', label: 'Backtest', icon: RotateCw },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

function isActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/'
  }
  return pathname === href || pathname.startsWith(href + '/')
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-surface-primary border-r border-border-color flex-col z-40">
      {/* Logo Header */}
      <div className="p-6 border-b border-border-color">
        <h1 className="text-xl font-bold text-accent-blue">PREDICTRADE</h1>
        <p className="text-xs text-text-secondary mt-1">AI Crypto Analysis</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href, pathname)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border-color text-xs text-text-secondary space-y-1">
        <p className="font-semibold text-text-primary">PREDICTRADE</p>
        <p>© 2025</p>
        <p>Version 1.0.0</p>
      </div>
    </aside>
  )
}

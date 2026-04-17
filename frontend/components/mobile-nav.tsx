'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, TrendingUp, Calculator, RotateCw, Settings, Home, Sparkles, ShoppingCart } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, gradient: 'from-accent-purple to-accent-pink' },
  { href: '/predictions', label: 'AI Signals', icon: TrendingUp, gradient: 'from-accent-blue to-accent-cyan' },
  { href: '/opportunity-buy', label: 'Opportunity Buy', icon: ShoppingCart, gradient: 'from-accent-emerald to-accent-teal' },
  { href: '/risk', label: 'Risk Analysis', icon: Calculator, gradient: 'from-accent-indigo to-accent-purple' },
  { href: '/backtest', label: 'Backtest', icon: RotateCw, gradient: 'from-accent-cyan to-accent-teal' },
  { href: '/settings', label: 'Settings', icon: Settings, gradient: 'from-accent-amber to-accent-orange' },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="lg:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-lg bg-surface-secondary/50 border border-border-color/50 hover:border-accent-purple/50 text-text-secondary hover:text-text-primary transition-all duration-300"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 top-16"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-16 left-0 right-0 bg-surface-primary/95 backdrop-blur-xl border-b border-border-color/50 z-50 shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-border-color/50 bg-gradient-to-r from-accent-purple/10 to-accent-pink/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold gradient-text">PREDICTRADE</h2>
                  <p className="text-xs text-text-secondary">Navigation Menu</p>
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="p-4 space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            
            {/* Footer */}
            <div className="p-4 border-t border-border-color/50 bg-surface-secondary/30">
              <p className="text-xs text-text-secondary text-center">© 2026 PREDICTRADE • Version 2.0.0</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

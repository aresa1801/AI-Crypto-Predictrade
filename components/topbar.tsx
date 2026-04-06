'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, User } from 'lucide-react'
import { MobileNav } from './mobile-nav'
import { ThemeToggle } from './theme-toggle'
import { BreadcrumbNav } from './ui/breadcrumb-nav'

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const handleRouteChange = () => {
      setIsTransitioning(false)
    }

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  return (
    <header className={`border-b border-border-color bg-surface-primary px-4 lg:px-8 py-4 flex flex-col gap-3 transition-opacity duration-300 ${
      isTransitioning ? 'opacity-75' : 'opacity-100'
    }`}>
      <div className="flex items-center justify-between">
        {/* Mobile Menu + Breadcrumbs */}
        <div className="flex items-center gap-4 flex-1">
          <MobileNav />
          <nav className="hidden sm:flex">
            <BreadcrumbNav />
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 lg:gap-6">
          <ThemeToggle />
          <button
            className="text-text-secondary hover:text-text-primary transition-all duration-200 p-2 hover:bg-surface-secondary rounded-lg"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button
            className="text-text-secondary hover:text-text-primary transition-all duration-200 p-2 hover:bg-surface-secondary rounded-lg"
            aria-label="User menu"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Breadcrumb */}
      <nav className="sm:hidden px-2">
        <BreadcrumbNav />
      </nav>
    </header>
  )
}

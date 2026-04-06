'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
  ]

  let currentPath = ''
  segments.forEach((segment, index) => {
    if (segment === 'dashboard') return

    currentPath += `/${segment}`
    const label = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    breadcrumbs.push({
      label,
      href: `/dashboard${currentPath}`,
    })
  })

  return breadcrumbs
}

export function BreadcrumbNav() {
  const pathname = usePathname()
  const breadcrumbs = useMemo(() => generateBreadcrumbs(pathname), [pathname])

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      <Link
        href="/dashboard"
        className="p-1 text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Dashboard"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.slice(1).map((item, index) => (
        <div key={item.href} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-border-color" />
          {index === breadcrumbs.length - 2 ? (
            <span className="text-text-primary font-medium">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}

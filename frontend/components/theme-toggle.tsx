'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="p-2.5 rounded-lg bg-surface-secondary/50 border border-border-color/50 transition-all duration-300" disabled>
        <Sun className="w-5 h-5 text-text-secondary" />
      </button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative p-2.5 rounded-lg bg-gradient-to-br from-accent-indigo/20 to-accent-purple/20 border border-accent-indigo/30 text-accent-indigo hover:shadow-lg hover:shadow-accent-indigo/30 transition-all duration-300 group"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative">
        {isDark ? (
          <Sun className="w-5 h-5 transition-transform duration-300 group-hover:rotate-180" />
        ) : (
          <Moon className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </div>
    </button>
  )
}

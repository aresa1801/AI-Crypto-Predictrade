'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function DisclaimerBanner() {
  const [isDismissed, setIsDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if dismissed in current session
    const dismissed = sessionStorage.getItem('disclaimer-dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    sessionStorage.setItem('disclaimer-dismissed', 'true')
  }

  if (!mounted || isDismissed) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-yellow-900/30 border-t border-yellow-700/50 px-4 py-3 flex items-center justify-between gap-4 z-30"
      role="complementary"
      aria-label="Financial disclaimer"
    >
      <p className="text-sm text-yellow-200 flex-1">
        <span className="font-semibold">⚠️ Disclaimer:</span> Bukan saran finansial. Model berbasis probabilitas &amp; data historis. Trade at your own risk.
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Close disclaimer"
        className="flex-shrink-0 text-yellow-200 hover:text-yellow-100 transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-background"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

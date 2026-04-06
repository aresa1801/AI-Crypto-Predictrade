'use client'

import { useState } from 'react'
import { SettingsForm } from '@/components/settings/settings-form'

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsSaving(false)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Configure API keys, model preferences, and risk parameters
        </p>
      </div>

      {/* Settings Form */}
      <div className="max-w-2xl">
        <SettingsForm onSave={handleSave} isSaving={isSaving} />
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { SettingsForm } from '@/components/settings/settings-form'
import { UserSettings } from '@/lib/types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    modelPreference: 'balanced',
    riskTolerance: 'moderate',
    notificationsEnabled: true,
    theme: 'dark',
  })

  const [saved, setSaved] = useState(false)

  const handleSave = (newSettings: UserSettings) => {
    setSettings(newSettings)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary">Configure API, preferences, and notification settings</p>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="bg-accent-emerald/20 border border-accent-emerald/30 rounded-lg p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent-emerald" />
          <p className="text-sm text-accent-emerald font-medium">Settings saved successfully</p>
        </div>
      )}

      {/* Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SettingsForm initialSettings={settings} onSave={handleSave} />
        </div>

        {/* Info Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-text-primary mb-3">API Integration</h3>
            <p className="text-sm text-text-secondary mb-4">Connect your trading API for live predictions and automated alerts.</p>
            <button className="btn-primary w-full text-sm">
              Connect API
            </button>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Model Information</h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>Current Model: <span className="text-text-primary font-medium">GPT-4 Turbo</span></p>
              <p>Last Update: <span className="text-text-primary font-medium">2025-04-03</span></p>
              <p>Accuracy: <span className="text-accent-emerald font-medium">78.3%</span></p>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Help & Support</h3>
            <button className="text-sm text-accent-blue hover:text-accent-blue/80 w-full text-left">
              View Documentation →
            </button>
            <button className="text-sm text-accent-blue hover:text-accent-blue/80 w-full text-left mt-2">
              Contact Support →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { UserSettings } from '@/lib/types'
import { Eye, EyeOff } from 'lucide-react'

interface SettingsFormProps {
  onSave: (settings: UserSettings) => void
  isSaving?: boolean
}

const defaultSettings: UserSettings = {
  modelPreference: 'balanced',
  riskTolerance: 'moderate',
  notificationsEnabled: true,
  theme: 'dark',
}

export function SettingsForm({ onSave, isSaving = false }: SettingsFormProps) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey, setApiKey] = useState('')

  const handleChange = (key: keyof UserSettings, value: any) => {
    setSettings({ ...settings, [key]: value })
  }

  const handleSave = () => {
    if (apiKey) {
      setSettings({ ...settings, apiKey })
    }
    onSave(settings)
  }

  return (
    <div className="card space-y-6">
      <h3 className="text-lg font-semibold text-text-primary">Configuration</h3>

      {/* Model Preference */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">AI Model Preference</label>
        <div className="space-y-2">
          {(['fast', 'balanced', 'accurate'] as const).map((option) => (
            <label key={option} className="flex items-center gap-3 p-3 rounded-lg border border-border-color cursor-pointer hover:bg-surface-secondary transition-colors">
              <input
                type="radio"
                name="model"
                value={option}
                checked={settings.modelPreference === option}
                onChange={(e) => handleChange('modelPreference', e.target.value as typeof option)}
                className="accent-accent-blue"
              />
              <div>
                <p className="font-medium text-text-primary capitalize">{option}</p>
                <p className="text-xs text-text-secondary">
                  {option === 'fast' && 'Quick analysis, real-time updates'}
                  {option === 'balanced' && 'Moderate latency, balanced accuracy'}
                  {option === 'accurate' && 'Slower but most accurate predictions'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Risk Tolerance */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">Risk Tolerance</label>
        <div className="space-y-2">
          {(['conservative', 'moderate', 'aggressive'] as const).map((option) => (
            <label key={option} className="flex items-center gap-3 p-3 rounded-lg border border-border-color cursor-pointer hover:bg-surface-secondary transition-colors">
              <input
                type="radio"
                name="risk"
                value={option}
                checked={settings.riskTolerance === option}
                onChange={(e) => handleChange('riskTolerance', e.target.value as typeof option)}
                className="accent-accent-blue"
              />
              <div>
                <p className="font-medium text-text-primary capitalize">{option}</p>
                <p className="text-xs text-text-secondary">
                  {option === 'conservative' && 'Lower risk, smaller position sizes'}
                  {option === 'moderate' && 'Balanced risk/reward approach'}
                  {option === 'aggressive' && 'Higher risk, larger positions'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">API Key (Optional)</label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk_live_..."
            className="w-full px-4 py-2 rounded-lg bg-surface-secondary border border-border-color text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-blue pr-10"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-text-secondary mt-2">Your API key is encrypted and never shared</p>
      </div>

      {/* Notifications */}
      <div>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-border-color cursor-pointer hover:bg-surface-secondary transition-colors">
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
            className="accent-accent-blue"
          />
          <div>
            <p className="font-medium text-text-primary">Enable Notifications</p>
            <p className="text-xs text-text-secondary">Receive alerts for prediction signals and market events</p>
          </div>
        </label>
      </div>

      {/* Save Button */}
      <button 
        onClick={handleSave} 
        disabled={isSaving}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}

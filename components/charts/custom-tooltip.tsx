import { chartColors, numberFormatter } from '@/lib/utils/chart-utils'

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number | string
    color?: string
  }>
  label?: string
  confidence?: { low: number; high: number }
  volume?: number
  modelVersion?: string
}

export function PredictionTooltip({
  active,
  payload,
  label,
  confidence,
  volume,
  modelVersion,
}: CustomTooltipProps) {
  if (!active || !payload) return null

  return (
    <div
      className="rounded-lg border p-3 text-xs"
      style={{
        backgroundColor: chartColors.surface,
        borderColor: chartColors.border,
      }}
    >
      <p style={{ color: chartColors.text }} className="font-medium mb-2">
        {label}
      </p>

      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color || chartColors.text }}>
          {entry.name}:{' '}
          <span className="font-semibold">
            {typeof entry.value === 'number'
              ? numberFormatter.format(entry.value)
              : entry.value}
          </span>
        </p>
      ))}

      {confidence && (
        <p style={{ color: chartColors.text }} className="mt-2 pt-2 border-t" style={{ borderColor: chartColors.border }}>
          CI: [{numberFormatter.format(confidence.low)}, {numberFormatter.format(confidence.high)}]
        </p>
      )}

      {volume && (
        <p style={{ color: chartColors.text }}>
          Volume: <span className="font-semibold">${(volume / 1e9).toFixed(1)}B</span>
        </p>
      )}

      {modelVersion && (
        <p style={{ color: chartColors.text }} className="mt-2 pt-2 border-t" style={{ borderColor: chartColors.border }}>
          Model v{modelVersion}
        </p>
      )}
    </div>
  )
}

export function SimpleTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null

  return (
    <div
      className="rounded-lg border p-3 text-xs"
      style={{
        backgroundColor: chartColors.surface,
        borderColor: chartColors.border,
      }}
    >
      <p style={{ color: chartColors.text }} className="font-medium mb-1">
        {label}
      </p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color || chartColors.text }}>
          {entry.name}:{' '}
          <span className="font-semibold">
            {typeof entry.value === 'number'
              ? numberFormatter.format(entry.value)
              : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}

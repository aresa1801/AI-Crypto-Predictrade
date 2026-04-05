export const chartColors = {
  primary: 'rgb(59, 130, 246)', // #3B82F6
  success: 'rgb(16, 185, 129)', // #10B981
  danger: 'rgb(239, 68, 68)', // #EF4444
  warning: 'rgb(245, 158, 11)', // #F59E0B
  border: 'rgb(45, 55, 72)', // #2D3748
  text: 'rgb(156, 163, 175)', // #9CA3AF
  surface: 'rgb(17, 24, 39)', // #111827
}

export const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const shortNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
})

export const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
  return `$${numberFormatter.format(value)}`
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export function formatShortNumber(value: number): string {
  return shortNumberFormatter.format(value)
}

interface RegimeShiftMarker {
  x: number
  label: 'bull' | 'bear' | 'chop'
  timestamp: Date
}

export function getRegimeShiftMarkers(data: any[]): RegimeShiftMarker[] {
  const markers: RegimeShiftMarker[] = []
  
  if (data.length < 3) return markers

  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1]
    const curr = data[i]
    const next = data[i + 1]

    const prevPrice = prev.price || 0
    const currPrice = curr.price || 0
    const nextPrice = next.price || 0

    if (prevPrice > 0 && currPrice > 0 && nextPrice > 0) {
      const upTrend = currPrice > prevPrice && nextPrice > currPrice
      const downTrend = currPrice < prevPrice && nextPrice < currPrice
      const sideways = Math.abs(currPrice - prevPrice) < prevPrice * 0.01

      if (upTrend && (markers.length === 0 || markers[markers.length - 1].label !== 'bull')) {
        markers.push({
          x: i,
          label: 'bull',
          timestamp: new Date(curr.time || Date.now()),
        })
      } else if (downTrend && (markers.length === 0 || markers[markers.length - 1].label !== 'bear')) {
        markers.push({
          x: i,
          label: 'bear',
          timestamp: new Date(curr.time || Date.now()),
        })
      } else if (sideways && (markers.length === 0 || markers[markers.length - 1].label !== 'chop')) {
        markers.push({
          x: i,
          label: 'chop',
          timestamp: new Date(curr.time || Date.now()),
        })
      }
    }
  }

  return markers
}

export function generateConfidenceBand(
  data: any[],
  dataKey: string,
  confidenceLevel: number = 0.95,
): Array<{ lower: number; upper: number; value: number }> {
  return data.map((point) => {
    const value = point[dataKey] || 0
    const margin = value * (1 - confidenceLevel)

    return {
      value,
      lower: value - margin,
      upper: value + margin,
    }
  })
}

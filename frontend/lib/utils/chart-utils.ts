export const chartColors = {
  surface: 'hsl(var(--card))',
  border: 'hsl(var(--border))',
  text: 'hsl(var(--foreground))',
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted))',
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
}

export const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatLargeNumber(value: number): string {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`
  }
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`
  }
  return formatCurrency(value)
}

export interface RegimeShiftMarker {
  date: string
  type: 'bullish' | 'bearish'
  label: string
}

export function getRegimeShiftMarkers(data: Array<{ date: string; price: number }>): RegimeShiftMarker[] {
  const markers: RegimeShiftMarker[] = []
  
  if (data.length < 5) return markers
  
  for (let i = 4; i < data.length; i++) {
    const currentPrice = data[i].price
    const prevPrice = data[i - 4].price
    const changePercent = ((currentPrice - prevPrice) / prevPrice) * 100
    
    if (changePercent > 10) {
      markers.push({
        date: data[i].date,
        type: 'bullish',
        label: 'Bullish breakout',
      })
    } else if (changePercent < -10) {
      markers.push({
        date: data[i].date,
        type: 'bearish',
        label: 'Bearish breakdown',
      })
    }
  }
  
  return markers
}

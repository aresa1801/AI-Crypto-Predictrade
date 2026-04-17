import { useState, useEffect, useRef } from 'react'

interface LivePriceData {
  price: number
  change24h: number
  isUpdating: boolean
}

/**
 * Hook for real-time price updates
 * Fetches live price data from CoinGecko API
 */
export function useLivePrice(coinId: string, initialPrice: number, initialChange: number) {
  const [data, setData] = useState<LivePriceData>({
    price: initialPrice,
    change24h: initialChange,
    isUpdating: false,
  })
  
  const prevPriceRef = useRef(initialPrice)
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchLivePrice = async () => {
      try {
        setData(prev => ({ ...prev, isUpdating: true }))

        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?` +
          new URLSearchParams({
            ids: coinId,
            vs_currencies: 'usd',
            include_24hr_change: 'true',
          })
        )

        if (!response.ok) {
          console.warn(`CoinGecko API error for ${coinId}: ${response.status}`)
          setData(prev => ({ ...prev, isUpdating: false }))
          return
        }

        const result = await response.json()
        
        if (isMounted && result[coinId]) {
          const newPrice = result[coinId].usd
          const newChange = result[coinId].usd_24h_change ?? data.change24h

          // Determine price direction for animation
          if (newPrice > prevPriceRef.current) {
            setPriceDirection('up')
          } else if (newPrice < prevPriceRef.current) {
            setPriceDirection('down')
          }

          setData({
            price: newPrice,
            change24h: newChange,
            isUpdating: false,
          })

          prevPriceRef.current = newPrice

          // Clear direction after animation
          setTimeout(() => setPriceDirection(null), 500)
        } else if (isMounted) {
          setData(prev => ({ ...prev, isUpdating: false }))
        }
      } catch (error) {
        console.warn(`Error fetching live price for ${coinId}:`, error)
        if (isMounted) setData(prev => ({ ...prev, isUpdating: false }))
      }
    }

    // Initial fetch
    fetchLivePrice()

    // Update every 30 seconds (CoinGecko free tier rate limit friendly)
    const interval = setInterval(fetchLivePrice, 30_000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [coinId])

  return {
    ...data,
    priceDirection,
  }
}


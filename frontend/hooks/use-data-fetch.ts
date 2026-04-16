import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

interface UseDataFetchOptions<T> {
  cacheKey?: string
  cacheDuration?: number // in milliseconds
  refetchInterval?: number // in milliseconds
  enabled?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

interface UseDataFetchResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// In-memory cache
const cache = new Map<string, CacheEntry<any>>()

/**
 * Custom hook for optimized data fetching with caching
 * Reduces unnecessary API calls and improves performance
 */
export function useDataFetch<T>(
  fetchFn: () => Promise<T>,
  options: UseDataFetchOptions<T> = {}
): UseDataFetchResult<T> {
  const {
    cacheKey,
    cacheDuration = 60000, // 1 minute default
    refetchInterval,
    enabled = true,
    onSuccess,
    onError,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    // Check cache first
    if (cacheKey) {
      const cached = cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cacheDuration) {
        setData(cached.data)
        setLoading(false)
        setError(null)
        return
      }
    }

    try {
      setLoading(true)
      setError(null)
      const result = await fetchFn()
      
      if (!isMountedRef.current) return

      setData(result)
      setLoading(false)

      // Update cache
      if (cacheKey) {
        cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        })
      }

      onSuccess?.(result)
    } catch (err) {
      if (!isMountedRef.current) return

      const error = err instanceof Error ? err : new Error('Failed to fetch data')
      setError(error)
      setLoading(false)
      onError?.(error)
    }
  }, [fetchFn, cacheKey, cacheDuration, onSuccess, onError])

  useEffect(() => {
    isMountedRef.current = true

    if (!enabled) {
      setLoading(false)
      return
    }

    fetchData()

    // Set up refetch interval if specified
    let intervalId: NodeJS.Timeout | undefined
    if (refetchInterval && refetchInterval > 0) {
      intervalId = setInterval(fetchData, refetchInterval)
    }

    return () => {
      isMountedRef.current = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [enabled, fetchData, refetchInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

/**
 * Clear all cached data
 */
export function clearCache() {
  cache.clear()
}

/**
 * Clear specific cache entry
 */
export function clearCacheEntry(key: string) {
  cache.delete(key)
}

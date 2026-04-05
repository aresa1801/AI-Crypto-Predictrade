import { useState, useEffect, useCallback } from 'react'

export interface AsyncState<T> {
  status: 'idle' | 'loading' | 'success' | 'error'
  data: T | null
  error: Error | null
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true,
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  })

  const execute = useCallback(async () => {
    setState({ status: 'loading', data: null, error: null })
    try {
      const response = await asyncFunction()
      setState({ status: 'success', data: response, error: null })
    } catch (error) {
      setState({
        status: 'error',
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      })
    }
  }, [asyncFunction])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [execute, immediate])

  return {
    ...state,
    retry: execute,
  }
}

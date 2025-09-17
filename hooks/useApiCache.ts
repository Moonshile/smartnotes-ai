import { useState, useEffect, useCallback, useRef } from 'react'
import { ClientCache, localStorageCache } from '@/utils/clientCache'

// API缓存Hook
export function useApiCache<T>(
  key: string, 
  fetcher: () => Promise<T>, 
  options: {
    ttl?: number
    useLocalStorage?: boolean
    enabled?: boolean
  } = {}
) {
  const { ttl = 300000, useLocalStorage = false, enabled = true } = options
  
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    if (!enabled) return
    
    const cache = useLocalStorage ? localStorageCache : ClientCache
    const cached = cache.get(key)
    
    if (cached) {
      setData(cached)
    } else {
      setLoading(true)
      setError(null)
      
      fetcher()
        .then(result => {
          setData(result)
          cache.set(key, result, ttl)
        })
        .catch(err => {
          setError(err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [key, enabled, ttl, useLocalStorage])
  
  const refetch = useCallback(() => {
    const cache = useLocalStorage ? localStorageCache : ClientCache
    cache.delete(key)
    setLoading(true)
    setError(null)
    
    fetcher()
      .then(result => {
        setData(result)
        cache.set(key, result, ttl)
      })
      .catch(err => {
        setError(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [key, ttl, useLocalStorage])
  
  return { data, loading, error, refetch }
}

// 防抖Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

// 节流Hook
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastExecuted = useRef<number>(Date.now())
  
  useEffect(() => {
    if (Date.now() >= lastExecuted.current + delay) {
      lastExecuted.current = Date.now()
      setThrottledValue(value)
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now()
        setThrottledValue(value)
      }, delay - (Date.now() - lastExecuted.current))
      
      return () => clearTimeout(timer)
    }
  }, [value, delay])
  
  return throttledValue
}

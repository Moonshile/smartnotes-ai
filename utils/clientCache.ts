import { useState, useEffect, useCallback, useRef } from 'react'

// 客户端内存缓存
export class ClientCache {
    private static cache = new Map<string, { data: any; expires: number }>()

    static set(key: string, data: any, ttl: number = 300000) { // 默认5分钟
        this.cache.set(key, {
            data,
            expires: Date.now() + ttl
        })
    }

    static get(key: string) {
        const item = this.cache.get(key)
        if (!item || Date.now() > item.expires) {
            this.cache.delete(key)
            return null
        }
        return item.data
    }

    static has(key: string): boolean {
        const item = this.cache.get(key)
        if (!item || Date.now() > item.expires) {
            this.cache.delete(key)
            return false
        }
        return true
    }

    static delete(key: string) {
        this.cache.delete(key)
    }

    static clear() {
        this.cache.clear()
    }

    static size(): number {
        return this.cache.size
    }
}

// localStorage缓存
export const localStorageCache = {
    set: (key: string, data: any, ttl: number = 300000) => {
        try {
            const item = {
                data,
                expires: Date.now() + ttl
            }
            localStorage.setItem(key, JSON.stringify(item))
        } catch (error) {
            console.warn('Failed to save to localStorage:', error)
        }
    },

    get: (key: string) => {
        try {
            const item = localStorage.getItem(key)
            if (!item) return null

            const parsed = JSON.parse(item)
            if (Date.now() > parsed.expires) {
                localStorage.removeItem(key)
                return null
            }
            return parsed.data
        } catch (error) {
            console.warn('Failed to read from localStorage:', error)
            return null
        }
    },

    has: (key: string): boolean => {
        try {
            const item = localStorage.getItem(key)
            if (!item) return false

            const parsed = JSON.parse(item)
            if (Date.now() > parsed.expires) {
                localStorage.removeItem(key)
                return false
            }
            return true
        } catch (error) {
            console.warn('Failed to check localStorage:', error)
            return false
        }
    },

    delete: (key: string) => {
        try {
            localStorage.removeItem(key)
        } catch (error) {
            console.warn('Failed to delete from localStorage:', error)
        }
    },

    clear: () => {
        try {
            // 只清除我们的缓存项，保留其他应用的数据
            const keys = Object.keys(localStorage)
            keys.forEach(key => {
                if (key.startsWith('smartnotes-')) {
                    localStorage.removeItem(key)
                }
            })
        } catch (error) {
            console.warn('Failed to clear localStorage:', error)
        }
    }
}

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
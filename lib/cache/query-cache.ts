'use client'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize = 100 // Prevent memory leaks

  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    // Clean up old entries if cache is getting large
    if (this.cache.size >= this.maxSize) {
      this.cleanup()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  invalidate(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Singleton instance
export const queryCache = new QueryCache()

// Cache keys factory
export const cacheKeys = {
  clients: (params?: any) => `clients-${JSON.stringify(params || {})}`,
  deals: (params?: any) => `deals-${JSON.stringify(params || {})}`,
  tasks: (params?: any) => `tasks-${JSON.stringify(params || {})}`,
  dashboardMetrics: () => 'dashboard-metrics',
  user: (id: string) => `user-${id}`,
}

// Optimized fetch with caching
export async function cachedFetch<T>(
  url: string, 
  cacheKey: string,
  ttlMinutes: number = 5,
  options?: RequestInit
): Promise<T> {
  // Try cache first
  const cached = queryCache.get<T>(cacheKey)
  if (cached) {
    return cached
  }

  // Fetch and cache
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const data = await response.json()
  queryCache.set(cacheKey, data, ttlMinutes)
  
  return data
}

// Background refresh for critical data
export function backgroundRefresh<T>(
  url: string,
  cacheKey: string,
  ttlMinutes: number = 5,
  options?: RequestInit
) {
  // Use requestIdleCallback for background fetching
  const scheduleRefresh = (callback: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 10000 })
    } else {
      setTimeout(callback, 100)
    }
  }

  scheduleRefresh(() => {
    cachedFetch<T>(url, cacheKey, ttlMinutes, options)
      .catch(error => console.warn('Background refresh failed:', error))
  })
}
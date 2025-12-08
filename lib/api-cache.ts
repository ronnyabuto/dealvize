// API response caching and optimization utilities

import { NextResponse } from 'next/server'

// Cache durations in seconds
export const CACHE_DURATIONS = {
  STATIC: 86400, // 24 hours for static data
  DYNAMIC: 300,  // 5 minutes for dynamic data
  USER_DATA: 60, // 1 minute for user-specific data
  REALTIME: 10   // 10 seconds for real-time data
}

// Response compression
export function compressResponse(data: any, duration: number = CACHE_DURATIONS.USER_DATA) {
  const response = NextResponse.json(data)
  
  // Add caching headers
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${duration}, stale-while-revalidate=${duration * 2}`
  )
  
  // Add compression hint
  response.headers.set('Vary', 'Accept-Encoding')
  
  // Add ETag for conditional requests
  const etag = generateETag(data)
  response.headers.set('ETag', etag)
  
  return response
}

// Generate ETag for conditional requests
function generateETag(data: any): string {
  const content = JSON.stringify(data)
  return Buffer.from(content).toString('base64').slice(0, 16)
}

// Paginated response optimization
export function createPaginatedResponse(
  data: any[],
  page: number,
  limit: number,
  total: number,
  duration: number = CACHE_DURATIONS.USER_DATA
) {
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1
  
  const response = {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: totalPages,
      hasNext: hasNextPage,
      hasPrev: hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    },
    meta: {
      timestamp: new Date().toISOString(),
      cached: false
    }
  }
  
  return compressResponse(response, duration)
}

// Optimize database queries
export const OPTIMIZED_QUERIES = {
  // Client queries with minimal fields for lists
  CLIENT_LIST_FIELDS: `
    id,
    name,
    email,
    company,
    status,
    last_contact,
    created_at
  `,
  
  // Deal queries with client info
  DEAL_WITH_CLIENT_FIELDS: `
    id,
    title,
    value,
    status,
    probability,
    expected_close_date,
    commission_percentage,
    commission_amount,
    created_at,
    clients!inner (
      id,
      name,
      email
    )
  `,
  
  // Task queries with minimal relations
  TASK_LIST_FIELDS: `
    id,
    title,
    status,
    priority,
    due_date,
    type,
    created_at,
    clients (id, name),
    deals (id, title)
  `,
  
  // Note queries with relations
  NOTE_WITH_RELATIONS_FIELDS: `
    id,
    content,
    type,
    created_at,
    updated_at,
    clients (id, name),
    deals (id, title),
    tasks (id, title)
  `
}

// Memory cache for frequently accessed data
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>()
  private maxSize = 100 // Maximum cache entries
  
  set(key: string, data: any, ttlSeconds: number = 60) {
    // Clean old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const iterator = this.cache.keys()
      const firstEntry = iterator.next()
      if (!firstEntry.done && firstEntry.value) {
        this.cache.delete(firstEntry.value)
      }
    }
    
    const expires = Date.now() + (ttlSeconds * 1000)
    this.cache.set(key, { data, expires })
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  delete(key: string) {
    this.cache.delete(key)
  }
  
  clear() {
    this.cache.clear()
  }
  
  invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }
}

export const memoryCache = new MemoryCache()

// Cache key generators
export function generateCacheKey(
  userId: string,
  resource: string,
  params: Record<string, any> = {}
): string {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|')
  
  return `${userId}:${resource}:${paramString}`
}

// Batch API requests
export class BatchRequestManager {
  private requests = new Map<string, Promise<any>>()
  private timeout = 50 // ms to batch requests
  
  async batchRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // If request is already in progress, return existing promise
    if (this.requests.has(key)) {
      return this.requests.get(key)!
    }
    
    // Create new batched request
    const promise = new Promise<T>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await requestFn()
          this.requests.delete(key)
          resolve(result)
        } catch (error) {
          this.requests.delete(key)
          reject(error)
        }
      }, this.timeout)
    })
    
    this.requests.set(key, promise)
    return promise
  }
}

export const batchManager = new BatchRequestManager()

// Response optimization middleware
export function withOptimization(handler: Function) {
  return async (request: Request) => {
    const start = performance.now()
    
    try {
      const response = await handler(request)
      
      // Add performance headers
      const duration = performance.now() - start
      response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`)
      response.headers.set('X-Powered-By', 'Dealvize-CRM')
      
      return response
    } catch (error) {
      const duration = performance.now() - start
      if (process.env.NODE_ENV === 'development') {
        console.error(`API Error (${duration.toFixed(2)}ms):`, error)
      }
      throw error
    }
  }
}
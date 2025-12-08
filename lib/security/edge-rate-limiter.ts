import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: NextRequest) => string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  blocked: boolean
}

/**
 * Edge-compatible rate limiter using in-memory storage
 * For production, consider Redis or external rate limiting service
 */
class EdgeRateLimiter {
  public store = new Map<string, { count: number; resetTime: number }>()
  private lastCleanup = 0

  constructor() {
    // Edge runtime compatible - no setInterval timers
  }

  async checkRateLimit(
    request: NextRequest,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator?.(request) ?? this.getDefaultKey(request)
    const now = Date.now()
    
    // Passive cleanup every 5 minutes (edge runtime compatible)
    if (now - this.lastCleanup > 5 * 60 * 1000) {
      this.cleanup()
      this.lastCleanup = now
    }

    // Get or create entry
    let entry = this.store.get(key)
    
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      }
      this.store.set(key, entry)
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        blocked: true
      }
    }

    // Increment counter
    entry.count++

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
      blocked: false
    }
  }

  private getDefaultKey(request: NextRequest): string {
    // Use IP address as default key
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    return realIP || 'unknown'
  }

  private cleanup(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.store) {
      if (entry.resetTime <= now) {
        this.store.delete(key)
      }
    }
  }

  destroy(): void {
    // Edge runtime compatible - no intervals to clear
    this.store.clear()
  }
}

// Global instance for edge runtime
const rateLimiter = new EdgeRateLimiter()

// Common rate limit configurations
export const rateLimitConfigs = {
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  },
  general_api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30
  }
}

/**
 * Smart rate limiter with business user limits and IP limits
 */
class SmartRateLimiter {
  private rateLimiter: EdgeRateLimiter

  constructor(rateLimiterInstance: EdgeRateLimiter) {
    this.rateLimiter = rateLimiterInstance
  }

  async checkBusinessUserLimit(
    identifier: string, 
    endpoint: keyof typeof rateLimitConfigs = 'api',
    isAuthenticated: boolean = false
  ): Promise<{ allowed: boolean; limit: number; remaining: number; resetTime: Date }> {
    const config = rateLimitConfigs[endpoint]
    
    // Authenticated users get higher limits
    const adjustedConfig = {
      ...config,
      maxRequests: isAuthenticated ? config.maxRequests * 2 : config.maxRequests
    }
    
    const now = Date.now()
    let entry = this.rateLimiter.store.get(identifier)
    
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + adjustedConfig.windowMs
      }
      this.rateLimiter.store.set(identifier, entry)
    }

    const allowed = entry.count < adjustedConfig.maxRequests
    
    if (allowed) {
      entry.count++
    }

    return {
      allowed,
      limit: adjustedConfig.maxRequests,
      remaining: Math.max(0, adjustedConfig.maxRequests - entry.count),
      resetTime: new Date(entry.resetTime)
    }
  }

  async checkIPLimit(
    ip: string,
    endpoint: keyof typeof rateLimitConfigs = 'api'
  ): Promise<{ allowed: boolean; limit: number; remaining: number; resetTime: Date }> {
    const config = rateLimitConfigs[endpoint]
    const now = Date.now()
    const key = `ip:${ip}`
    
    let entry = this.rateLimiter.store.get(key)
    
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      }
      this.rateLimiter.store.set(key, entry)
    }

    const allowed = entry.count < config.maxRequests
    
    if (allowed) {
      entry.count++
    }

    return {
      allowed,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: new Date(entry.resetTime)
    }
  }
}

export const smartRateLimiter = new SmartRateLimiter(rateLimiter)

export { EdgeRateLimiter }
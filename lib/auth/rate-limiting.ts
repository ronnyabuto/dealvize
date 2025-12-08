import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { logger } from '@/lib/errors'

export const RATE_LIMIT_CONFIG = {
  AUTH: { window: 900, limit: 5 }, // 15 mins, 5 attempts
  API: { window: 60, limit: 100 }, // 1 min, 100 requests
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset: number
}

async function checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`
  
  try {
    const [count] = await redis
      .multi()
      .incr(key)
      .expire(key, windowSeconds)
      .exec() as [number, string]

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      reset: Date.now() + (windowSeconds * 1000)
    }
  } catch (error) {
    // Fail open in production if Redis is down, but log heavily
    logger.error('Redis Rate Limit Error', error)
    return { allowed: true, remaining: 1, reset: Date.now() }
  }
}

export async function rateLimitMiddleware(
  req: NextRequest, 
  config = RATE_LIMIT_CONFIG.API
): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const result = await checkRateLimit(ip, config.limit, config.window)

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: result.reset },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString()
        }
      }
    )
  }
  return null
}
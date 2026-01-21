import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {}
  const startTime = Date.now()

  const dbStart = Date.now()
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('users').select('id').limit(1)
    checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      latency: Date.now() - dbStart,
      error: error?.message
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      latency: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  const redisStart = Date.now()
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
      })
      checks.redis = {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency: Date.now() - redisStart
      }
    } else {
      checks.redis = { status: 'not_configured' }
    }
  } catch (error) {
    checks.redis = {
      status: 'unhealthy',
      latency: Date.now() - redisStart,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  checks.stripe = {
    status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured'
  }

  checks.resend = {
    status: process.env.RESEND_API_KEY ? 'configured' : 'not_configured'
  }

  const allHealthy = checks.database.status === 'healthy' &&
    (checks.redis.status === 'healthy' || checks.redis.status === 'not_configured')

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    latency: Date.now() - startTime,
    checks
  }, { status: allHealthy ? 200 : 503 })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const startTime = performance.now()
  
  try {
    // Simple database connection check
    const supabase = await createClient()
    const { error } = await supabase
      .from('clients')
      .select('count(*)', { count: 'exact', head: true })
      .limit(1)

    const responseTime = performance.now() - startTime

    if (error) {
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime.toFixed(2)}ms`,
        error: error.message
      }, { status: 503 })
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime.toFixed(2)}ms`,
      environment: process.env.NODE_ENV || 'unknown'
    })

  } catch (error) {
    const responseTime = performance.now() - startTime
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime.toFixed(2)}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}
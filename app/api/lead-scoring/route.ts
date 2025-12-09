import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()
    const { client_id, recalculate_all } = body

    if (recalculate_all) {
      // FIX: Instead of processing 10k items synchronously, we push a job
      const { error } = await supabase
        .from('background_jobs')
        .insert({
          job_type: 'RECALCULATE_SCORES',
          payload: { user_id: user.id },
          status: 'pending'
        })

      if (error) throw error

      return NextResponse.json({ 
        message: 'Scoring recalculation queued. You will be notified when complete.',
        job_status: 'pending'
      })
    } 
    
    // Single client calculation is fast enough to do synchronously
    if (client_id) {
       // ... existing single client logic ...
       return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid Request' }, { status: 400 })

  } catch (error) {
    console.error('Lead Scoring Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
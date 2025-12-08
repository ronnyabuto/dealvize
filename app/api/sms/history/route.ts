import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('sms_logs')
      .select(`
        *,
        clients (
          id,
          first_name,
          last_name,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: smsHistory, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('SMS history error:', error)
      return NextResponse.json({ error: 'Failed to fetch SMS history' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('sms_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (clientId) {
      countQuery = countQuery.eq('client_id', clientId)
    }

    const { count } = await countQuery

    return NextResponse.json({
      smsHistory: smsHistory || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('SMS history error:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
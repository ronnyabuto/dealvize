import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const client_id = searchParams.get('client_id')
    const deal_id = searchParams.get('deal_id')
    const call_type = searchParams.get('call_type')
    const outcome = searchParams.get('outcome')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    let query = supabase
      .from('call_logs')
      .select(`
        *,
        client:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value),
        recordings:call_recordings(id, recording_url, duration, file_size)
      `)
      .eq('user_id', user.id)
      .order('call_start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (client_id) query = query.eq('client_id', client_id)
    if (deal_id) query = query.eq('deal_id', deal_id)
    if (call_type) query = query.eq('call_type', call_type)
    if (outcome) query = query.eq('outcome', outcome)
    if (date_from) query = query.gte('call_start_time', date_from)
    if (date_to) query = query.lte('call_start_time', date_to)

    const { data: callLogs, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Apply same filters to count query
    if (client_id) countQuery = countQuery.eq('client_id', client_id)
    if (deal_id) countQuery = countQuery.eq('deal_id', deal_id)
    if (call_type) countQuery = countQuery.eq('call_type', call_type)
    if (outcome) countQuery = countQuery.eq('outcome', outcome)
    if (date_from) countQuery = countQuery.gte('call_start_time', date_from)
    if (date_to) countQuery = countQuery.lte('call_start_time', date_to)

    const { count } = await countQuery

    return NextResponse.json({
      call_logs: callLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching call logs:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      client_id,
      deal_id,
      phone_number,
      call_type = 'outbound', // inbound, outbound
      call_start_time,
      call_end_time,
      duration_seconds,
      outcome, // answered, no_answer, busy, voicemail, failed
      notes,
      follow_up_required = false,
      follow_up_date,
      recording_url,
      external_call_id,
      cost = 0
    } = body

    // Validate required fields
    if (!phone_number || !call_start_time) {
      return NextResponse.json({ 
        error: 'Phone number and call start time are required' 
      }, { status: 400 })
    }

    // Verify client exists if client_id provided
    if (client_id) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('user_id', user.id)
        .single()

      if (clientError || !client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }

    // Create call log
    const { data: callLog, error } = await supabase
      .from('call_logs')
      .insert({
        user_id: user.id,
        client_id,
        deal_id,
        phone_number,
        call_type,
        call_start_time,
        call_end_time,
        duration_seconds,
        outcome,
        notes,
        follow_up_required,
        follow_up_date,
        external_call_id,
        cost
      })
      .select(`
        *,
        client:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create recording entry if recording URL provided
    if (recording_url && callLog) {
      await supabase
        .from('call_recordings')
        .insert({
          user_id: user.id,
          call_log_id: callLog.id,
          recording_url,
          duration: duration_seconds
        })
    }

    // Update client's last contact date if successful call
    if (client_id && (outcome === 'answered' || outcome === 'voicemail')) {
      await supabase
        .from('clients')
        .update({ last_contact_date: call_start_time })
        .eq('id', client_id)
    }

    // Create follow-up task if required
    if (follow_up_required && follow_up_date && client_id) {
      await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          client_id,
          deal_id,
          title: `Follow up on call from ${new Date(call_start_time).toLocaleDateString()}`,
          description: notes ? `Previous call notes: ${notes}` : undefined,
          task_type: 'call',
          due_date: follow_up_date,
          priority: 'medium',
          status: 'pending'
        })
    }

    // Record activity for lead scoring
    if (client_id && (outcome === 'answered' || outcome === 'voicemail')) {
      let scoreAwarded = 0
      if (outcome === 'answered') scoreAwarded = call_type === 'inbound' ? 15 : 10
      else if (outcome === 'voicemail') scoreAwarded = 5

      await supabase
        .from('lead_activities')
        .insert({
          user_id: user.id,
          client_id,
          activity_type: `phone_call_${outcome}`,
          activity_data: {
            call_type,
            duration_seconds,
            outcome,
            has_recording: !!recording_url
          },
          score_awarded: scoreAwarded,
          source: 'call_log'
        })
    }

    return NextResponse.json({ call_log: callLog }, { status: 201 })
  } catch (error) {
    console.error('Error creating call log:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const callLogId = searchParams.get('id')
    const body = await request.json()

    if (!callLogId) {
      return NextResponse.json({ error: 'Call log ID is required' }, { status: 400 })
    }

    const {
      outcome,
      notes,
      follow_up_required,
      follow_up_date,
      call_end_time,
      duration_seconds
    } = body

    const updateData: any = { updated_at: new Date().toISOString() }

    if (outcome) updateData.outcome = outcome
    if (notes !== undefined) updateData.notes = notes
    if (typeof follow_up_required === 'boolean') updateData.follow_up_required = follow_up_required
    if (follow_up_date) updateData.follow_up_date = follow_up_date
    if (call_end_time) updateData.call_end_time = call_end_time
    if (duration_seconds !== undefined) updateData.duration_seconds = duration_seconds

    const { data: callLog, error } = await supabase
      .from('call_logs')
      .update(updateData)
      .eq('id', callLogId)
      .eq('user_id', user.id)
      .select(`
        *,
        client:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value),
        recordings:call_recordings(id, recording_url, duration, file_size)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ call_log: callLog })
  } catch (error) {
    console.error('Error updating call log:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const callLogId = searchParams.get('id')

    if (!callLogId) {
      return NextResponse.json({ error: 'Call log ID is required' }, { status: 400 })
    }

    // Delete related recordings first
    await supabase
      .from('call_recordings')
      .delete()
      .eq('call_log_id', callLogId)

    // Delete the call log
    const { error } = await supabase
      .from('call_logs')
      .delete()
      .eq('id', callLogId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting call log:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
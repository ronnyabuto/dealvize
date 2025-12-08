import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const client_id = searchParams.get('client_id')
    const sequence_id = searchParams.get('sequence_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    let query = supabase
      .from('sequence_enrollments')
      .select(`
        *,
        client:clients(id, first_name, last_name, email),
        sequence:nurturing_sequences(id, sequence_name),
        current_step:nurturing_sequence_steps(step_number, template:email_templates(name))
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (client_id) query = query.eq('client_id', client_id)
    if (sequence_id) query = query.eq('sequence_id', sequence_id)
    if (status) query = query.eq('status', status)

    const { data: enrollments, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ enrollments: enrollments || [] })
  } catch (error) {
    console.error('Error fetching sequence enrollments:', error)
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
      sequence_id,
      enrollment_source = 'manual'
    } = body

    // Validate required fields
    if (!client_id || !sequence_id) {
      return NextResponse.json({ 
        error: 'Client ID and sequence ID are required' 
      }, { status: 400 })
    }

    // Check if client exists and belongs to user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('user_id', user.id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check if sequence exists and belongs to user
    const { data: sequence, error: sequenceError } = await supabase
      .from('nurturing_sequences')
      .select('id, is_active')
      .eq('id', sequence_id)
      .eq('user_id', user.id)
      .single()

    if (sequenceError || !sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    if (!sequence.is_active) {
      return NextResponse.json({ error: 'Cannot enroll in inactive sequence' }, { status: 400 })
    }

    // Check if client is already enrolled in this sequence
    const { data: existingEnrollment } = await supabase
      .from('sequence_enrollments')
      .select('id, status')
      .eq('client_id', client_id)
      .eq('sequence_id', sequence_id)
      .single()

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return NextResponse.json({ 
          error: 'Client is already enrolled in this sequence' 
        }, { status: 400 })
      }
    }

    // Get the first step of the sequence
    const { data: firstStep } = await supabase
      .from('nurturing_sequence_steps')
      .select('id')
      .eq('sequence_id', sequence_id)
      .eq('is_active', true)
      .order('step_number')
      .limit(1)
      .single()

    // Calculate next step execution time
    const nextStepAt = firstStep 
      ? new Date(Date.now() + 60000) // Execute first step in 1 minute
      : null

    const { data: enrollment, error } = await supabase
      .from('sequence_enrollments')
      .insert({
        user_id: user.id,
        client_id,
        sequence_id,
        current_step_id: firstStep?.id || null,
        enrollment_source,
        next_step_at: nextStepAt?.toISOString()
      })
      .select(`
        *,
        client:clients(id, first_name, last_name, email),
        sequence:nurturing_sequences(id, sequence_name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ enrollment }, { status: 201 })
  } catch (error) {
    console.error('Error creating sequence enrollment:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const enrollmentId = searchParams.get('id')
    const body = await request.json()

    if (!enrollmentId) {
      return NextResponse.json({ error: 'Enrollment ID is required' }, { status: 400 })
    }

    const { status, pause_reason } = body

    const updateData: any = { updated_at: new Date().toISOString() }

    if (status) {
      updateData.status = status
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else if (status === 'paused') {
        updateData.paused_at = new Date().toISOString()
        if (pause_reason) updateData.pause_reason = pause_reason
      } else if (status === 'active') {
        updateData.paused_at = null
        updateData.pause_reason = null
      }
    }

    const { data: enrollment, error } = await supabase
      .from('sequence_enrollments')
      .update(updateData)
      .eq('id', enrollmentId)
      .eq('user_id', user.id)
      .select(`
        *,
        client:clients(id, first_name, last_name, email),
        sequence:nurturing_sequences(id, sequence_name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ enrollment })
  } catch (error) {
    console.error('Error updating sequence enrollment:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const sequence_id = searchParams.get('sequence_id')
    const is_active = searchParams.get('is_active')

    let query = supabase
      .from('nurturing_sequences')
      .select(`
        *,
        sequence_steps:nurturing_sequence_steps(
          id, step_number, template_id, delay_days, delay_hours, conditions, is_active,
          template:email_templates(id, name, subject)
        ),
        enrollment_count:sequence_enrollments(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (sequence_id) query = query.eq('id', sequence_id)
    if (is_active !== null) query = query.eq('is_active', is_active === 'true')

    const { data: sequences, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Format the response to include enrollment counts
    const formattedSequences = sequences?.map(sequence => ({
      ...sequence,
      enrollment_count: sequence.enrollment_count?.[0]?.count || 0
    })) || []

    return NextResponse.json({ sequences: formattedSequences })
  } catch (error) {
    console.error('Error fetching nurturing sequences:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      sequence_name,
      description,
      trigger_type = 'manual', // manual, lead_score_change, new_lead, stage_change
      trigger_conditions = {},
      target_audience = 'all', // all, buyers, sellers, specific_segment
      sequence_steps = []
    } = body

    // Validate required fields
    if (!sequence_name) {
      return NextResponse.json({ 
        error: 'Sequence name is required' 
      }, { status: 400 })
    }

    // Start transaction
    const { data: sequence, error: sequenceError } = await supabase
      .from('nurturing_sequences')
      .insert({
        user_id: user.id,
        sequence_name,
        description,
        trigger_type,
        trigger_conditions,
        target_audience
      })
      .select()
      .single()

    if (sequenceError) {
      return NextResponse.json({ error: sequenceError.message }, { status: 400 })
    }

    // Insert sequence steps if provided
    if (sequence_steps.length > 0) {
      const stepsToInsert = sequence_steps.map((step: any, index: number) => ({
        sequence_id: sequence.id,
        step_number: index + 1,
        template_id: step.template_id,
        delay_days: step.delay_days || 0,
        delay_hours: step.delay_hours || 0,
        conditions: step.conditions || {},
        is_active: step.is_active !== false
      }))

      const { error: stepsError } = await supabase
        .from('nurturing_sequence_steps')
        .insert(stepsToInsert)

      if (stepsError) {
        // Rollback sequence creation
        await supabase
          .from('nurturing_sequences')
          .delete()
          .eq('id', sequence.id)
        
        return NextResponse.json({ error: stepsError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ sequence }, { status: 201 })
  } catch (error) {
    console.error('Error creating nurturing sequence:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const sequenceId = searchParams.get('id')
    const body = await request.json()

    if (!sequenceId) {
      return NextResponse.json({ error: 'Sequence ID is required' }, { status: 400 })
    }

    const {
      sequence_name,
      description,
      trigger_type,
      trigger_conditions,
      target_audience,
      is_active
    } = body

    const updateData: any = { updated_at: new Date().toISOString() }

    if (sequence_name) updateData.sequence_name = sequence_name
    if (description !== undefined) updateData.description = description
    if (trigger_type) updateData.trigger_type = trigger_type
    if (trigger_conditions) updateData.trigger_conditions = trigger_conditions
    if (target_audience) updateData.target_audience = target_audience
    if (typeof is_active === 'boolean') updateData.is_active = is_active

    const { data: sequence, error } = await supabase
      .from('nurturing_sequences')
      .update(updateData)
      .eq('id', sequenceId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ sequence })
  } catch (error) {
    console.error('Error updating nurturing sequence:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const sequenceId = searchParams.get('id')

    if (!sequenceId) {
      return NextResponse.json({ error: 'Sequence ID is required' }, { status: 400 })
    }

    // Delete sequence steps first
    await supabase
      .from('nurturing_sequence_steps')
      .delete()
      .eq('sequence_id', sequenceId)

    // Delete sequence enrollments
    await supabase
      .from('sequence_enrollments')
      .delete()
      .eq('sequence_id', sequenceId)

    // Delete the sequence
    const { error } = await supabase
      .from('nurturing_sequences')
      .delete()
      .eq('id', sequenceId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting nurturing sequence:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
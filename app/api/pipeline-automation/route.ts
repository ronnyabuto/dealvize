import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: automations, error } = await supabase
      .from('pipeline_automations')
      .select(`
        *,
        conditions,
        actions,
        trigger_rules
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ automations: automations || [] })
  } catch (error) {
    console.error('Error fetching pipeline automations:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      description,
      trigger_type, // 'deal_stage_change', 'client_status_change', 'time_based', 'score_threshold', 'manual'
      is_active = true,
      conditions = [], // Array of condition objects
      actions = [], // Array of action objects  
      trigger_rules = {}, // Additional trigger configuration
      priority = 1
    } = body

    // Validate required fields
    if (!name || !trigger_type || !actions.length) {
      return NextResponse.json({
        error: 'Name, trigger type, and at least one action are required'
      }, { status: 400 })
    }

    // Validate actions
    for (const action of actions) {
      if (!action.type || !action.parameters) {
        return NextResponse.json({
          error: 'Each action must have type and parameters'
        }, { status: 400 })
      }
    }

    // Create automation
    const { data: automation, error } = await supabase
      .from('pipeline_automations')
      .insert({
        user_id: user.id,
        name,
        description,
        trigger_type,
        is_active,
        conditions,
        actions,
        trigger_rules,
        priority
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ automation }, { status: 201 })
  } catch (error) {
    console.error('Error creating pipeline automation:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const automationId = searchParams.get('id')
    const body = await request.json()

    if (!automationId) {
      return NextResponse.json({ error: 'Automation ID is required' }, { status: 400 })
    }

    const {
      name,
      description,
      trigger_type,
      is_active,
      conditions,
      actions,
      trigger_rules,
      priority
    } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (trigger_type) updateData.trigger_type = trigger_type
    if (typeof is_active === 'boolean') updateData.is_active = is_active
    if (conditions) updateData.conditions = conditions
    if (actions) updateData.actions = actions
    if (trigger_rules) updateData.trigger_rules = trigger_rules
    if (priority !== undefined) updateData.priority = priority

    const { data: automation, error } = await supabase
      .from('pipeline_automations')
      .update(updateData)
      .eq('id', automationId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ automation })
  } catch (error) {
    console.error('Error updating pipeline automation:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const automationId = searchParams.get('id')

    if (!automationId) {
      return NextResponse.json({ error: 'Automation ID is required' }, { status: 400 })
    }

    // Delete automation execution logs first
    await supabase
      .from('automation_execution_log')
      .delete()
      .eq('automation_id', automationId)

    // Delete the automation
    const { error } = await supabase
      .from('pipeline_automations')
      .delete()
      .eq('id', automationId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pipeline automation:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
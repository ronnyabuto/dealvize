import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: rules, error } = await supabase
      .from('lead_assignment_rules')
      .select(`
        *,
        assigned_to_user:users!lead_assignment_rules_assigned_to_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('user_id', user.id)
      .order('priority', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ rules: rules || [] })
  } catch (error) {
    console.error('Error fetching lead assignment rules:', error)
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
      priority,
      is_active = true,
      conditions, // Array of condition objects
      assignment_type, // 'round_robin', 'load_balanced', 'specific_agent', 'geographic', 'score_based'
      assigned_to,
      fallback_assigned_to,
      geographic_territories,
      score_thresholds,
      workload_limits,
      business_hours_only = true,
      exclude_weekends = false
    } = body

    // Validate required fields
    if (!name || !assignment_type || !conditions || !Array.isArray(conditions)) {
      return NextResponse.json({
        error: 'Name, assignment type, and conditions are required'
      }, { status: 400 })
    }

    // Validate conditions
    for (const condition of conditions) {
      if (!condition.field || !condition.operator || condition.value === undefined) {
        return NextResponse.json({
          error: 'Each condition must have field, operator, and value'
        }, { status: 400 })
      }
    }

    // Create rule
    const { data: rule, error } = await supabase
      .from('lead_assignment_rules')
      .insert({
        user_id: user.id,
        name,
        description,
        priority,
        is_active,
        conditions,
        assignment_type,
        assigned_to,
        fallback_assigned_to,
        geographic_territories: geographic_territories || {},
        score_thresholds: score_thresholds || {},
        workload_limits: workload_limits || {},
        business_hours_only,
        exclude_weekends
      })
      .select(`
        *,
        assigned_to_user:users!lead_assignment_rules_assigned_to_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('Error creating lead assignment rule:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('id')
    const body = await request.json()

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 })
    }

    const {
      name,
      description,
      priority,
      is_active,
      conditions,
      assignment_type,
      assigned_to,
      fallback_assigned_to,
      geographic_territories,
      score_thresholds,
      workload_limits,
      business_hours_only,
      exclude_weekends
    } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority
    if (typeof is_active === 'boolean') updateData.is_active = is_active
    if (conditions) updateData.conditions = conditions
    if (assignment_type) updateData.assignment_type = assignment_type
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (fallback_assigned_to !== undefined) updateData.fallback_assigned_to = fallback_assigned_to
    if (geographic_territories) updateData.geographic_territories = geographic_territories
    if (score_thresholds) updateData.score_thresholds = score_thresholds
    if (workload_limits) updateData.workload_limits = workload_limits
    if (typeof business_hours_only === 'boolean') updateData.business_hours_only = business_hours_only
    if (typeof exclude_weekends === 'boolean') updateData.exclude_weekends = exclude_weekends

    const { data: rule, error } = await supabase
      .from('lead_assignment_rules')
      .update(updateData)
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .select(`
        *,
        assigned_to_user:users!lead_assignment_rules_assigned_to_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Error updating lead assignment rule:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('id')

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('lead_assignment_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lead assignment rule:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
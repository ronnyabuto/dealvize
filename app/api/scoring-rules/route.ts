import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: rules, error } = await supabase
      .from('scoring_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false })
      .order('rule_type')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Group rules by type for easier management
    const rulesByType = {
      demographic: rules?.filter(r => r.rule_type === 'demographic') || [],
      behavioral: rules?.filter(r => r.rule_type === 'behavioral') || [],
      engagement: rules?.filter(r => r.rule_type === 'engagement') || [],
      property_interest: rules?.filter(r => r.rule_type === 'property_interest') || []
    }

    return NextResponse.json({ 
      rules: rules || [],
      rules_by_type: rulesByType
    })
  } catch (error) {
    console.error('Error fetching scoring rules:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      rule_name,
      rule_type,
      trigger_event,
      score_impact,
      conditions = {},
      priority = 1
    } = body

    // Validate required fields
    if (!rule_name || !rule_type || !trigger_event || score_impact === undefined) {
      return NextResponse.json({ 
        error: 'Rule name, type, trigger event, and score impact are required' 
      }, { status: 400 })
    }

    // Validate rule type
    const validRuleTypes = ['demographic', 'behavioral', 'engagement', 'property_interest']
    if (!validRuleTypes.includes(rule_type)) {
      return NextResponse.json({ 
        error: 'Invalid rule type. Must be one of: ' + validRuleTypes.join(', ')
      }, { status: 400 })
    }

    // Validate score impact range
    if (score_impact < -100 || score_impact > 100) {
      return NextResponse.json({ 
        error: 'Score impact must be between -100 and 100' 
      }, { status: 400 })
    }

    const { data: rule, error } = await supabase
      .from('scoring_rules')
      .insert({
        user_id: user.id,
        rule_name,
        rule_type,
        trigger_event,
        score_impact,
        conditions,
        priority
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('Error creating scoring rule:', error)
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
      rule_name,
      rule_type,
      trigger_event,
      score_impact,
      conditions,
      is_active,
      priority
    } = body

    const updateData: any = { updated_at: new Date().toISOString() }

    if (rule_name) updateData.rule_name = rule_name
    if (rule_type) updateData.rule_type = rule_type
    if (trigger_event) updateData.trigger_event = trigger_event
    if (score_impact !== undefined) {
      if (score_impact < -100 || score_impact > 100) {
        return NextResponse.json({ 
          error: 'Score impact must be between -100 and 100' 
        }, { status: 400 })
      }
      updateData.score_impact = score_impact
    }
    if (conditions !== undefined) updateData.conditions = conditions
    if (typeof is_active === 'boolean') updateData.is_active = is_active
    if (priority !== undefined) updateData.priority = priority

    const { data: rule, error } = await supabase
      .from('scoring_rules')
      .update(updateData)
      .eq('id', ruleId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Error updating scoring rule:', error)
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
      .from('scoring_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scoring rule:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
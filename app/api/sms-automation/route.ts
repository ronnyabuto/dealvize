import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const automation_type = searchParams.get('automation_type')
    const is_active = searchParams.get('is_active')

    let query = supabase
      .from('sms_automations')
      .select(`
        *,
        template:sms_templates(id, name, message_content),
        sent_messages:sms_messages(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (automation_type) query = query.eq('automation_type', automation_type)
    if (is_active !== null) query = query.eq('is_active', is_active === 'true')

    const { data: automations, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Format the response
    const formattedAutomations = automations?.map(automation => ({
      ...automation,
      messages_sent: automation.sent_messages?.[0]?.count || 0
    })) || []

    return NextResponse.json({ automations: formattedAutomations })
  } catch (error) {
    console.error('Error fetching SMS automations:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      automation_name,
      description,
      automation_type, // appointment_reminder, follow_up, welcome, birthday, nurturing
      trigger_conditions = {},
      template_id,
      schedule_type = 'relative', // relative, absolute
      schedule_value, // for relative: hours/days before/after, for absolute: specific time
      target_audience = 'all'
    } = body

    // Validate required fields
    if (!automation_name || !automation_type || !template_id) {
      return NextResponse.json({ 
        error: 'Automation name, type, and template are required' 
      }, { status: 400 })
    }

    // Verify template exists
    const { data: template, error: templateError } = await supabase
      .from('sms_templates')
      .select('id')
      .eq('id', template_id)
      .eq('user_id', user.id)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'SMS template not found' }, { status: 404 })
    }

    const { data: automation, error } = await supabase
      .from('sms_automations')
      .insert({
        user_id: user.id,
        automation_name,
        description,
        automation_type,
        trigger_conditions,
        template_id,
        schedule_type,
        schedule_value,
        target_audience
      })
      .select(`
        *,
        template:sms_templates(id, name, message_content)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ automation }, { status: 201 })
  } catch (error) {
    console.error('Error creating SMS automation:', error)
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
      automation_name,
      description,
      trigger_conditions,
      template_id,
      schedule_type,
      schedule_value,
      target_audience,
      is_active
    } = body

    const updateData: any = { updated_at: new Date().toISOString() }

    if (automation_name) updateData.automation_name = automation_name
    if (description !== undefined) updateData.description = description
    if (trigger_conditions) updateData.trigger_conditions = trigger_conditions
    if (template_id) updateData.template_id = template_id
    if (schedule_type) updateData.schedule_type = schedule_type
    if (schedule_value !== undefined) updateData.schedule_value = schedule_value
    if (target_audience) updateData.target_audience = target_audience
    if (typeof is_active === 'boolean') updateData.is_active = is_active

    const { data: automation, error } = await supabase
      .from('sms_automations')
      .update(updateData)
      .eq('id', automationId)
      .eq('user_id', user.id)
      .select(`
        *,
        template:sms_templates(id, name, message_content)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ automation })
  } catch (error) {
    console.error('Error updating SMS automation:', error)
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

    const { error } = await supabase
      .from('sms_automations')
      .delete()
      .eq('id', automationId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting SMS automation:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
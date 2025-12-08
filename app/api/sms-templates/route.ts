import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category')
    const is_system = searchParams.get('is_system')

    let query = supabase
      .from('sms_templates')
      .select('*')
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .eq('is_active', true)
      .order('is_system', { ascending: false })
      .order('usage_count', { ascending: false })

    if (category) query = query.eq('category', category)
    if (is_system !== null) query = query.eq('is_system', is_system === 'true')

    const { data: templates, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Error fetching SMS templates:', error)
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
      category = 'general',
      message_content,
      variables = []
    } = body

    // Validate required fields
    if (!name || !message_content) {
      return NextResponse.json({ 
        error: 'Name and message content are required' 
      }, { status: 400 })
    }

    // Validate message length (SMS limit is typically 160 characters)
    if (message_content.length > 320) {
      return NextResponse.json({ 
        error: 'Message content is too long. Maximum 320 characters for SMS.' 
      }, { status: 400 })
    }

    // Check for duplicate names for this user
    const { data: existing } = await supabase
      .from('sms_templates')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'A template with this name already exists' 
      }, { status: 400 })
    }

    const { data: template, error } = await supabase
      .from('sms_templates')
      .insert({
        user_id: user.id,
        name,
        category,
        message_content,
        variables,
        is_system: false
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating SMS template:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')
    const body = await request.json()

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    const {
      name,
      category,
      message_content,
      variables,
      is_active
    } = body

    const updateData: any = { updated_at: new Date().toISOString() }

    if (name) updateData.name = name
    if (category) updateData.category = category
    if (message_content) {
      if (message_content.length > 320) {
        return NextResponse.json({ 
          error: 'Message content is too long. Maximum 320 characters for SMS.' 
        }, { status: 400 })
      }
      updateData.message_content = message_content
    }
    if (variables) updateData.variables = variables
    if (typeof is_active === 'boolean') updateData.is_active = is_active

    const { data: template, error } = await supabase
      .from('sms_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('user_id', user.id)
      .eq('is_system', false) // Only allow editing user templates
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating SMS template:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('sms_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id)
      .eq('is_system', false) // Only allow deleting user templates

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting SMS template:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
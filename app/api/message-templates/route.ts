import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const channel_id = searchParams.get('channel_id')
    const category = searchParams.get('category')

    let query = supabase
      .from('message_templates')
      .select(`
        *,
        channel:communication_channels(name, display_name, icon, color)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('usage_count', { ascending: false })

    if (channel_id) query = query.eq('channel_id', channel_id)
    if (category) query = query.eq('category', category)

    const { data: templates, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching message templates:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      channel_id,
      name,
      content,
      shortcut,
      category = 'general'
    } = body

    // Validate required fields
    if (!channel_id || !name || !content) {
      return NextResponse.json({ 
        error: 'Channel ID, name, and content are required' 
      }, { status: 400 })
    }

    // Check for duplicate names for this user and channel
    const { data: existing } = await supabase
      .from('message_templates')
      .select('id')
      .eq('user_id', user.id)
      .eq('channel_id', channel_id)
      .eq('name', name)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'A template with this name already exists for this channel' 
      }, { status: 400 })
    }

    const { data: template, error } = await supabase
      .from('message_templates')
      .insert({
        user_id: user.id,
        channel_id,
        name,
        content,
        shortcut,
        category
      })
      .select(`
        *,
        channel:communication_channels(name, display_name, icon, color)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating message template:', error)
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
      content,
      shortcut,
      category,
      is_active
    } = body

    const updateData: any = { updated_at: new Date().toISOString() }

    if (name) updateData.name = name
    if (content) updateData.content = content
    if (shortcut !== undefined) updateData.shortcut = shortcut
    if (category) updateData.category = category
    if (typeof is_active === 'boolean') updateData.is_active = is_active

    const { data: template, error } = await supabase
      .from('message_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('user_id', user.id)
      .select(`
        *,
        channel:communication_channels(name, display_name, icon, color)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating message template:', error)
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
      .from('message_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting message template:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')
    const clientId = searchParams.get('client_id')
    const dealId = searchParams.get('deal_id')
    const taskId = searchParams.get('task_id')
    
    const offset = (page - 1) * limit
    
    let query = supabase
      .from('notes')
      .select(`
        *,
        clients (
          id,
          name,
          initials
        ),
        deals (
          id,
          title
        ),
        tasks (
          id,
          title
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('content', `%${search}%`)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (dealId) {
      query = query.eq('deal_id', dealId)
    }

    if (taskId) {
      query = query.eq('task_id', taskId)
    }

    const { data: notes, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      notes,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const body = await request.json()
    const { content, client_id, deal_id, task_id } = body

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Verify related entities belong to user if provided
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

    if (deal_id) {
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('id')
        .eq('id', deal_id)
        .eq('user_id', user.id)
        .single()

      if (dealError || !deal) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
      }
    }

    if (task_id) {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', task_id)
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
        .single()

      if (taskError || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
    }

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        content,
        client_id,
        deal_id,
        task_id,
        user_id: user.id,
      })
      .select(`
        *,
        clients (
          id,
          name,
          initials
        ),
        deals (
          id,
          title
        ),
        tasks (
          id,
          title
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
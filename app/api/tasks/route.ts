import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
  type: z.enum(['Call', 'Email', 'Meeting', 'Document', 'Follow-up', 'Other']).default('Other'),
  client_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable()
})

export async function GET(request: NextRequest) {
  try {
    // Environment validation
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ 
        error: 'Configuration error',
        message: 'Service temporarily unavailable' 
      }, { status: 503 })
    }

    const supabase = await createClient()
    
    // Get current user with enhanced error handling
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth error in tasks API:', userError)
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to access tasks',
        details: process.env.NODE_ENV === 'development' ? userError?.message : undefined
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const clientId = searchParams.get('client_id')
    const dealId = searchParams.get('deal_id')
    const dueSoon = searchParams.get('due_soon') === 'true'
    const overdue = searchParams.get('overdue') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        clients (
          id,
          name
        ),
        deals (
          id,
          title
        )
      `)
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })
      .limit(limit)

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (dealId) {
      query = query.eq('deal_id', dealId)
    }

    if (dueSoon) {
      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      query = query.lte('due_date', weekFromNow.toISOString())
      query = query.neq('status', 'Completed')
    }

    if (overdue) {
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      query = query.lt('due_date', today.toISOString())
      query = query.neq('status', 'Completed')
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    return NextResponse.json({ tasks: tasks || [] })
  } catch (error) {
    console.error('Error in GET /api/tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createTaskSchema.parse(body)

    // Verify client belongs to user if provided
    if (validatedData.client_id) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', validatedData.client_id)
        .eq('user_id', user.id)
        .single()

      if (clientError || !client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }

    // Verify deal belongs to user if provided
    if (validatedData.deal_id) {
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('id')
        .eq('id', validatedData.deal_id)
        .eq('user_id', user.id)
        .single()

      if (dealError || !deal) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
      }
    }

    // Insert task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select(`
        *,
        clients (
          id,
          name
        ),
        deals (
          id,
          title
        )
      `)
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Error in POST /api/tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
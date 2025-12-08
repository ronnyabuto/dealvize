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
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '50')
    const dueSoon = searchParams.get('due_soon') === 'true'
    
    // Attempt fetch with relationships
    let query = supabase
      .from('tasks')
      .select(`
        *,
        clients ( id, name ),
        deals ( id, title )
      `)
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })
      .limit(limit)

    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)

    if (dueSoon) {
      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      query = query.lte('due_date', weekFromNow.toISOString()).neq('status', 'Completed')
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Database error fetching tasks:', error)
      // Fallback: If relation join fails (missing FKs), fetch just tasks to prevent 500 crash
      if (error.code === 'PGRST200') {
         const { data: simpleTasks } = await supabase.from('tasks').select('*').eq('user_id', user.id).limit(limit);
         return NextResponse.json({ tasks: simpleTasks || [] })
      }
      return NextResponse.json({ tasks: [] })
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
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validatedData = createTaskSchema.parse(body)

    // Check references existence to prevent FK violations
    if (validatedData.client_id) {
       const { count } = await supabase.from('clients').select('id', { count: 'exact', head: true }).eq('id', validatedData.client_id);
       if (!count) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ ...validatedData, user_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
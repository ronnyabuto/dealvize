import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const resolvedParams = await params
    
    // Get current user - proper API route authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          initials
        ),
        deals (
          id,
          title
        )
      `)
      .eq('id', resolvedParams.id)
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error in GET /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const resolvedParams = await params
    
    // Get current user - proper API route authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const body = await request.json()
    const {
      title,
      description,
      due_date,
      priority,
      status,
      assigned_to,
      type
    } = body

    const { data: task, error } = await supabase
      .from('tasks')
      .update({
        title,
        description,
        due_date,
        priority,
        status,
        assigned_to,
        type,
      })
      .eq('id', resolvedParams.id)
      .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
      .select(`
        *,
        clients (
          id,
          name,
          email,
          initials
        ),
        deals (
          id,
          title
        )
      `)
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error in PUT /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const resolvedParams = await params
    
    // Get current user - proper API route authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const body = await request.json()
    const { status } = body

    console.log('PATCH task request:', {
      taskId: resolvedParams.id,
      userId: user.id,
      newStatus: status,
      userEmail: user.email
    })

    // Quick status update for task completion toggle
    const { data: task, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
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
      console.error('Error updating task:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error in PATCH /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const resolvedParams = await params
    
    // Get current user - proper API route authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting task:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/tasks/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
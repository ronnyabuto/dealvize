import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in first',
        authError: userError?.message 
      }, { status: 401 })
    }

    console.log('Testing database with user:', user.id)

    // Test 1: Try to read from clients table
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, created_at')
      .limit(5)

    // Test 2: Try to read from deals table
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id, title, value')
      .limit(5)

    // Test 3: Try to read from tasks table
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, due_date')
      .limit(5)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      tests: {
        clients: {
          success: !clientsError,
          error: clientsError?.message || null,
          count: clients?.length || 0,
          data: clients || []
        },
        deals: {
          success: !dealsError,
          error: dealsError?.message || null,
          count: deals?.length || 0,
          data: deals || []
        },
        tasks: {
          success: !tasksError,
          error: tasksError?.message || null,
          count: tasks?.length || 0,
          data: tasks || []
        }
      },
      message: 'Database connection test completed'
    })

  } catch (error: any) {
    console.error('Database test error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const transaction_id = searchParams.get('transaction_id')
    
    if (!transaction_id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    const { data: timeline, error } = await supabase
      .from('transaction_timeline')
      .select(`
        *,
        transaction:transactions!inner(id, user_id)
      `)
      .eq('transaction_id', transaction_id)
      .eq('transaction.user_id', user.id)
      .order('milestone_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ timeline: timeline || [] })
  } catch (error) {
    console.error('Error fetching transaction timeline:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      transaction_id,
      milestone,
      milestone_date,
      notes,
      assigned_to,
      priority = 'medium'
    } = body

    // Validate required fields
    if (!transaction_id || !milestone || !milestone_date) {
      return NextResponse.json({
        error: 'Transaction ID, milestone, and milestone date are required'
      }, { status: 400 })
    }

    // Verify transaction belongs to user
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id, client_id, deal_id')
      .eq('id', transaction_id)
      .eq('user_id', user.id)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Create timeline entry
    const { data: timelineEntry, error } = await supabase
      .from('transaction_timeline')
      .insert({
        user_id: user.id,
        transaction_id,
        milestone,
        milestone_date,
        status: 'pending',
        notes,
        assigned_to
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create associated task
    await supabase
      .from('tasks')
      .insert({
        user_id: assigned_to || user.id,
        client_id: transaction.client_id,
        deal_id: transaction.deal_id,
        title: milestone,
        description: notes || `Complete ${milestone.toLowerCase()} for transaction`,
        task_type: 'transaction',
        due_date: milestone_date,
        priority,
        status: 'pending',
        metadata: {
          transaction_id,
          timeline_id: timelineEntry.id,
          auto_generated: false
        }
      })

    return NextResponse.json({ timeline_entry: timelineEntry }, { status: 201 })
  } catch (error) {
    console.error('Error creating timeline entry:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const timelineId = searchParams.get('id')
    const body = await request.json()

    if (!timelineId) {
      return NextResponse.json({ error: 'Timeline ID is required' }, { status: 400 })
    }

    const {
      status,
      milestone,
      milestone_date,
      notes,
      assigned_to,
      completed_date
    } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
      if (status === 'completed' && !completed_date) {
        updateData.completed_date = new Date().toISOString()
      }
    }
    if (milestone) updateData.milestone = milestone
    if (milestone_date) updateData.milestone_date = milestone_date
    if (notes !== undefined) updateData.notes = notes
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (completed_date) updateData.completed_date = completed_date

    const { data: timelineEntry, error } = await supabase
      .from('transaction_timeline')
      .update(updateData)
      .eq('id', timelineId)
      .eq('user_id', user.id)
      .select(`
        *,
        transaction:transactions(id, client_id, deal_id)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Update associated task
    if (status) {
      await supabase
        .from('tasks')
        .update({
          status: status === 'completed' ? 'completed' : 'pending',
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('metadata->timeline_id', timelineId)
    }

    // Record completion activity
    if (status === 'completed' && timelineEntry.transaction?.client_id) {
      await supabase
        .from('lead_activities')
        .insert({
          user_id: user.id,
          client_id: timelineEntry.transaction.client_id,
          activity_type: 'transaction_milestone_completed',
          activity_data: {
            transaction_id: timelineEntry.transaction_id,
            milestone: timelineEntry.milestone,
            completed_date: updateData.completed_date || new Date().toISOString()
          },
          score_awarded: 15,
          source: 'transaction_management'
        })
    }

    return NextResponse.json({ timeline_entry: timelineEntry })
  } catch (error) {
    console.error('Error updating timeline entry:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const timelineId = searchParams.get('id')

    if (!timelineId) {
      return NextResponse.json({ error: 'Timeline ID is required' }, { status: 400 })
    }

    // Delete associated task first
    await supabase
      .from('tasks')
      .delete()
      .eq('metadata->timeline_id', timelineId)

    // Delete timeline entry
    const { error } = await supabase
      .from('transaction_timeline')
      .delete()
      .eq('id', timelineId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting timeline entry:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
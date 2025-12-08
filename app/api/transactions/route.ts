import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const deal_id = searchParams.get('deal_id')
    const client_id = searchParams.get('client_id')
    const transaction_type = searchParams.get('transaction_type')
    const status = searchParams.get('status')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    let query = supabase
      .from('transactions')
      .select(`
        *,
        client:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value, address),
        documents:transaction_documents(id, document_name, document_type, file_url, uploaded_at),
        timeline:transaction_timeline(
          id,
          milestone,
          milestone_date,
          status,
          notes,
          created_at,
          assigned_to
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (deal_id) query = query.eq('deal_id', deal_id)
    if (client_id) query = query.eq('client_id', client_id)
    if (transaction_type) query = query.eq('transaction_type', transaction_type)
    if (status) query = query.eq('status', status)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to)

    const { data: transactions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Apply same filters to count query
    if (deal_id) countQuery = countQuery.eq('deal_id', deal_id)
    if (client_id) countQuery = countQuery.eq('client_id', client_id)
    if (transaction_type) countQuery = countQuery.eq('transaction_type', transaction_type)
    if (status) countQuery = countQuery.eq('status', status)
    if (date_from) countQuery = countQuery.gte('created_at', date_from)
    if (date_to) countQuery = countQuery.lte('created_at', date_to)

    const { count } = await countQuery

    return NextResponse.json({
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      deal_id,
      client_id,
      transaction_type, // 'purchase', 'sale', 'lease', 'rental'
      purchase_price,
      down_payment,
      loan_amount,
      interest_rate,
      loan_term,
      monthly_payment,
      closing_date,
      title_company,
      lender_name,
      lender_contact,
      real_estate_attorney,
      home_inspector,
      appraiser,
      contingencies = [],
      special_conditions,
      commission_percentage,
      commission_amount,
      earnest_money_amount,
      earnest_money_due_date
    } = body

    // Validate required fields
    if (!deal_id || !client_id || !transaction_type || !purchase_price) {
      return NextResponse.json({
        error: 'Deal ID, client ID, transaction type, and purchase price are required'
      }, { status: 400 })
    }

    // Verify deal and client exist and belong to user
    const [dealResult, clientResult] = await Promise.all([
      supabase
        .from('deals')
        .select('id, title')
        .eq('id', deal_id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('id', client_id)
        .eq('user_id', user.id)
        .single()
    ])

    if (dealResult.error || !dealResult.data) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    if (clientResult.error || !clientResult.data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Create transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        deal_id,
        client_id,
        transaction_type,
        purchase_price,
        down_payment: down_payment || null,
        loan_amount: loan_amount || null,
        interest_rate: interest_rate || null,
        loan_term: loan_term || null,
        monthly_payment: monthly_payment || null,
        closing_date: closing_date || null,
        title_company: title_company || null,
        lender_name: lender_name || null,
        lender_contact: lender_contact || null,
        real_estate_attorney: real_estate_attorney || null,
        home_inspector: home_inspector || null,
        appraiser: appraiser || null,
        contingencies,
        special_conditions: special_conditions || null,
        commission_percentage: commission_percentage || null,
        commission_amount: commission_amount || null,
        earnest_money_amount: earnest_money_amount || null,
        earnest_money_due_date: earnest_money_due_date || null,
        status: 'pending'
      })
      .select(`
        *,
        client:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value, address)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create initial timeline milestones
    const initialMilestones = getInitialMilestones(transaction_type, closing_date)
    
    if (initialMilestones.length > 0) {
      await supabase
        .from('transaction_timeline')
        .insert(
          initialMilestones.map(milestone => ({
            user_id: user.id,
            transaction_id: transaction.id,
            ...milestone
          }))
        )
    }

    // Create tasks for important milestones
    const taskMilestones = initialMilestones.filter(m => m.create_task)
    if (taskMilestones.length > 0) {
      await supabase
        .from('tasks')
        .insert(
          taskMilestones.map(milestone => ({
            user_id: user.id,
            client_id,
            deal_id,
            title: milestone.milestone,
            description: milestone.notes || `Complete ${milestone.milestone.toLowerCase()} for transaction`,
            task_type: 'transaction',
            due_date: milestone.milestone_date,
            priority: milestone.priority || 'medium',
            status: 'pending',
            metadata: {
              transaction_id: transaction.id,
              milestone_type: milestone.milestone,
              auto_generated: true
            }
          }))
        )
    }

    // Record activity
    await supabase
      .from('lead_activities')
      .insert({
        user_id: user.id,
        client_id,
        activity_type: 'transaction_created',
        activity_data: {
          transaction_id: transaction.id,
          transaction_type,
          purchase_price,
          closing_date
        },
        score_awarded: 50, // Major milestone
        source: 'transaction_management'
      })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('id')
    const body = await request.json()

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    const {
      status,
      purchase_price,
      down_payment,
      loan_amount,
      interest_rate,
      loan_term,
      monthly_payment,
      closing_date,
      title_company,
      lender_name,
      lender_contact,
      real_estate_attorney,
      home_inspector,
      appraiser,
      contingencies,
      special_conditions,
      commission_percentage,
      commission_amount,
      earnest_money_amount,
      earnest_money_due_date
    } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (purchase_price !== undefined) updateData.purchase_price = purchase_price
    if (down_payment !== undefined) updateData.down_payment = down_payment
    if (loan_amount !== undefined) updateData.loan_amount = loan_amount
    if (interest_rate !== undefined) updateData.interest_rate = interest_rate
    if (loan_term !== undefined) updateData.loan_term = loan_term
    if (monthly_payment !== undefined) updateData.monthly_payment = monthly_payment
    if (closing_date !== undefined) updateData.closing_date = closing_date
    if (title_company !== undefined) updateData.title_company = title_company
    if (lender_name !== undefined) updateData.lender_name = lender_name
    if (lender_contact !== undefined) updateData.lender_contact = lender_contact
    if (real_estate_attorney !== undefined) updateData.real_estate_attorney = real_estate_attorney
    if (home_inspector !== undefined) updateData.home_inspector = home_inspector
    if (appraiser !== undefined) updateData.appraiser = appraiser
    if (contingencies !== undefined) updateData.contingencies = contingencies
    if (special_conditions !== undefined) updateData.special_conditions = special_conditions
    if (commission_percentage !== undefined) updateData.commission_percentage = commission_percentage
    if (commission_amount !== undefined) updateData.commission_amount = commission_amount
    if (earnest_money_amount !== undefined) updateData.earnest_money_amount = earnest_money_amount
    if (earnest_money_due_date !== undefined) updateData.earnest_money_due_date = earnest_money_due_date

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .select(`
        *,
        client:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value, address),
        documents:transaction_documents(id, document_name, document_type, file_url, uploaded_at),
        timeline:transaction_timeline(
          id,
          milestone,
          milestone_date,
          status,
          notes,
          created_at,
          assigned_to
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Record status change activity
    if (status && transaction.client_id) {
      await supabase
        .from('lead_activities')
        .insert({
          user_id: user.id,
          client_id: transaction.client_id,
          activity_type: 'transaction_status_changed',
          activity_data: {
            transaction_id: transaction.id,
            new_status: status,
            previous_status: transaction.status
          },
          score_awarded: status === 'closed' ? 100 : 10,
          source: 'transaction_management'
        })
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('id')

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    // Delete related records first
    await Promise.all([
      supabase
        .from('transaction_documents')
        .delete()
        .eq('transaction_id', transactionId),
      supabase
        .from('transaction_timeline')
        .delete()
        .eq('transaction_id', transactionId)
    ])

    // Delete the transaction
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

// Helper function to generate initial milestones
function getInitialMilestones(transactionType: string, closingDate: string | null) {
  const milestones = []
  const baseDate = closingDate ? new Date(closingDate) : new Date()

  if (transactionType === 'purchase') {
    milestones.push(
      {
        milestone: 'Earnest Money Deposit',
        milestone_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Submit earnest money deposit to secure the property',
        priority: 'high',
        create_task: true
      },
      {
        milestone: 'Loan Application',
        milestone_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Submit mortgage loan application to lender',
        priority: 'high',
        create_task: true
      },
      {
        milestone: 'Home Inspection',
        milestone_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Schedule and complete home inspection',
        priority: 'high',
        create_task: true
      },
      {
        milestone: 'Appraisal',
        milestone_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Property appraisal by lender',
        priority: 'medium',
        create_task: true
      },
      {
        milestone: 'Loan Approval',
        milestone_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Receive final loan approval from lender',
        priority: 'high',
        create_task: false
      },
      {
        milestone: 'Final Walkthrough',
        milestone_date: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Final property walkthrough before closing',
        priority: 'high',
        create_task: true
      },
      {
        milestone: 'Closing',
        milestone_date: closingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Property closing and key transfer',
        priority: 'high',
        create_task: true
      }
    )
  } else if (transactionType === 'sale') {
    milestones.push(
      {
        milestone: 'Property Preparation',
        milestone_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Prepare property for showing and listing',
        priority: 'medium',
        create_task: true
      },
      {
        milestone: 'Professional Photography',
        milestone_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Schedule professional property photography',
        priority: 'medium',
        create_task: true
      },
      {
        milestone: 'MLS Listing',
        milestone_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'List property on MLS and marketing platforms',
        priority: 'high',
        create_task: true
      },
      {
        milestone: 'Offer Review',
        milestone_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Review and negotiate offers',
        priority: 'high',
        create_task: false
      },
      {
        milestone: 'Purchase Agreement',
        milestone_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Execute purchase agreement with buyer',
        priority: 'high',
        create_task: false
      }
    )
  }

  return milestones
}
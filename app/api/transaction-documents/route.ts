import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const transaction_id = searchParams.get('transaction_id')
    const document_type = searchParams.get('document_type')
    
    if (!transaction_id) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    let query = supabase
      .from('transaction_documents')
      .select(`
        *,
        transaction:transactions!inner(id, user_id)
      `)
      .eq('transaction_id', transaction_id)
      .eq('transaction.user_id', user.id)
      .order('uploaded_at', { ascending: false })

    if (document_type) {
      query = query.eq('document_type', document_type)
    }

    const { data: documents, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    console.error('Error fetching transaction documents:', error)
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
      document_name,
      document_type, // 'contract', 'disclosure', 'inspection', 'appraisal', 'loan_docs', 'title', 'insurance', 'other'
      file_url,
      file_size,
      mime_type,
      description,
      is_required = false,
      expiration_date
    } = body

    // Validate required fields
    if (!transaction_id || !document_name || !document_type || !file_url) {
      return NextResponse.json({
        error: 'Transaction ID, document name, document type, and file URL are required'
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

    // Create document entry
    const { data: document, error } = await supabase
      .from('transaction_documents')
      .insert({
        user_id: user.id,
        transaction_id,
        document_name,
        document_type,
        file_url,
        file_size: file_size || null,
        mime_type: mime_type || null,
        description: description || null,
        is_required,
        expiration_date: expiration_date || null,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Record document upload activity
    await supabase
      .from('lead_activities')
      .insert({
        user_id: user.id,
        client_id: transaction.client_id,
        activity_type: 'transaction_document_uploaded',
        activity_data: {
          transaction_id,
          document_id: document.id,
          document_name,
          document_type
        },
        score_awarded: 5,
        source: 'transaction_management'
      })

    // Create task for document review if required
    if (is_required) {
      await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          client_id: transaction.client_id,
          deal_id: transaction.deal_id,
          title: `Review ${document_name}`,
          description: `Review and approve ${document_name} for transaction`,
          task_type: 'document_review',
          due_date: expiration_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          status: 'pending',
          metadata: {
            transaction_id,
            document_id: document.id,
            auto_generated: true
          }
        })
    }

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction document:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')
    const body = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const {
      document_name,
      document_type,
      description,
      is_required,
      expiration_date,
      status = 'active'
    } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (document_name) updateData.document_name = document_name
    if (document_type) updateData.document_type = document_type
    if (description !== undefined) updateData.description = description
    if (typeof is_required === 'boolean') updateData.is_required = is_required
    if (expiration_date !== undefined) updateData.expiration_date = expiration_date
    if (status) updateData.status = status

    const { data: document, error } = await supabase
      .from('transaction_documents')
      .update(updateData)
      .eq('id', documentId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Error updating transaction document:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Delete associated tasks first
    await supabase
      .from('tasks')
      .delete()
      .eq('metadata->document_id', documentId)

    // Delete document
    const { error } = await supabase
      .from('transaction_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction document:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
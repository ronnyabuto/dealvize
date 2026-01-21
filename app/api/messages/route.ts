import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { securityMiddleware, validateChatRequestBody, createErrorResponse, createSuccessResponse } from '@/lib/security/middleware'
import { chatSecurity } from '@/lib/security/chat-security'

export async function GET(request: NextRequest) {
  // Security middleware
  const securityResult = await securityMiddleware(request, 'messages')
  if (!securityResult.success) {
    return createErrorResponse(securityResult.error, securityResult.status, securityResult.headers)
  }

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const conversation_id = searchParams.get('conversation_id')
    const client_id = searchParams.get('client_id')
    const deal_id = searchParams.get('deal_id')
    const direction = searchParams.get('direction')
    const status = searchParams.get('status')
    const is_read = searchParams.get('is_read')
    const is_starred = searchParams.get('is_starred')
    const is_archived = searchParams.get('is_archived')
    const search = searchParams.get('search')

    const offset = (page - 1) * limit

    // Verify conversation access if conversation_id is provided
    if (conversation_id && !await chatSecurity.verifyConversationAccess(securityResult.userId, conversation_id)) {
      await chatSecurity.logSecurityEvent({
        type: 'unauthorized_access',
        userId: securityResult.userId,
        details: { action: 'get_messages', conversationId: conversation_id },
        ipAddress: chatSecurity.getClientIP(request)
      })
      return createErrorResponse('Access denied to conversation', 403)
    }

    let query = supabase
      .from('conversation_messages')
      .select(`
        *,
        conversation:conversations!inner(
          id, title, customer_id, deal_id, channel_type,
          customer:clients(first_name, last_name, email),
          deal:deals(title, status, value)
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (conversation_id) query = query.eq('conversation_id', conversation_id)
    if (direction) query = query.eq('direction', direction)
    if (status) query = query.eq('status', status)
    if (is_read !== null) query = query.eq('is_read', is_read === 'true')
    if (is_starred !== null) query = query.eq('is_starred', is_starred === 'true')
    if (is_archived !== null) query = query.eq('is_archived', is_archived === 'true')
    
    if (client_id) {
      query = query.eq('conversation.customer_id', client_id)
    }
    if (deal_id) {
      query = query.eq('conversation.deal_id', deal_id)
    }

    // Search functionality with validation
    if (search && search.trim()) {
      const searchValidation = chatSecurity.validateMessageContent(search)
      if (searchValidation.isValid) {
        const searchTerm = searchValidation.sanitized!.replace(/[%_]/g, '\\$&')
        query = query.or(`subject.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,sender_name.ilike.%${searchTerm}%`)
      }
    }

    const { data: messages, error } = await query

    if (error) {
      await chatSecurity.logSecurityEvent({
        type: 'unauthorized_access',
        userId: securityResult.userId,
        details: { error: error.message, query: 'messages' },
        ipAddress: chatSecurity.getClientIP(request)
      })
      return createErrorResponse(error.message, 400)
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
    
    // Apply same filters to count query
    if (conversation_id) countQuery = countQuery.eq('conversation_id', conversation_id)
    if (direction) countQuery = countQuery.eq('direction', direction)
    if (status) countQuery = countQuery.eq('status', status)
    if (is_read !== null) countQuery = countQuery.eq('is_read', is_read === 'true')
    if (is_starred !== null) countQuery = countQuery.eq('is_starred', is_starred === 'true')
    if (is_archived !== null) countQuery = countQuery.eq('is_archived', is_archived === 'true')
    
    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      return createErrorResponse(countError.message, 400)
    }

    return createSuccessResponse({
      messages,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    await chatSecurity.logSecurityEvent({
      type: 'unauthorized_access',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      ipAddress: chatSecurity.getClientIP(request)
    })
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  // Security middleware
  const securityResult = await securityMiddleware(request, 'messages')
  if (!securityResult.success) {
    return createErrorResponse(securityResult.error, securityResult.status, securityResult.headers)
  }

  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate request body
    const validation = validateChatRequestBody(body, ['conversation_id', 'content'])
    if (!validation.isValid) {
      return createErrorResponse(validation.errors.join(', '), 400)
    }

    const sanitizedBody = validation.sanitizedBody!
    const {
      conversation_id,
      content,
      message_type = 'text',
      priority = 'normal',
      subject,
      recipient_email,
      recipient_name,
      attachments = [],
      metadata = {}
    } = sanitizedBody

    // Verify conversation access
    if (!await chatSecurity.verifyConversationAccess(securityResult.userId, conversation_id)) {
      await chatSecurity.logSecurityEvent({
        type: 'unauthorized_access',
        userId: securityResult.userId,
        details: { action: 'send_message', conversationId: conversation_id },
        ipAddress: chatSecurity.getClientIP(request)
      })
      return createErrorResponse('Access denied to conversation', 403)
    }

    // Verify conversation exists and user has access
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Invalid conversation or access denied' }, { status: 400 })
    }

    // Create the message
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return createErrorResponse('User not authenticated', 401)
    }

    const { data: message, error } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id,
        sender_id: userData.user.id,
        sender_name: userData.user.user_metadata?.name || userData.user.email,
        sender_email: userData.user.email,
        content,
        subject,
        message_type,
        direction: 'outbound',
        status: 'sent',
        priority,
        attachments,
        metadata,
        sent_at: new Date().toISOString()
      })
      .select(`
        *,
        conversation:conversations(
          id, title, channel_type,
          customer:clients(first_name, last_name, email),
          deal:deals(title, status, value)
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('id')
    const body = await request.json()

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    const {
      is_read,
      is_starred,
      is_archived,
      status,
      metadata
    } = body

    const updateData: any = { updated_at: new Date().toISOString() }

    if (typeof is_read === 'boolean') updateData.is_read = is_read
    if (typeof is_starred === 'boolean') updateData.is_starred = is_starred
    if (typeof is_archived === 'boolean') updateData.is_archived = is_archived
    if (status) updateData.status = status
    if (metadata) updateData.metadata = metadata

    // Mark as read when opened
    if (is_read === true && !updateData.read_at) {
      updateData.read_at = new Date().toISOString()
    }

    const { data: message, error } = await supabase
      .from('conversation_messages')
      .update(updateData)
      .eq('id', messageId)
      .select(`
        *,
        conversation:conversations(
          id, title, channel_type,
          customer:clients(first_name, last_name, email),
          deal:deals(title, status, value)
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('id')

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('conversation_messages')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', messageId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
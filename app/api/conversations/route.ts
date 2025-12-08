import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { securityMiddleware, validateChatRequestBody, createErrorResponse, createSuccessResponse } from '@/lib/security/middleware'
import { chatSecurity } from '@/lib/security/chat-security'

export async function GET(request: NextRequest) {
  // Security middleware
  const securityResult = await securityMiddleware(request, 'conversations')
  if (!securityResult.success) {
    return createErrorResponse(securityResult.error, securityResult.status, securityResult.headers)
  }

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status')
    const customer_id = searchParams.get('customer_id')
    const channel_type = searchParams.get('channel_type')

    const offset = (page - 1) * limit

    let query = supabase
      .from('conversations')
      .select(`
        *,
        customer:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value),
        last_message:conversation_messages(content, created_at, direction)
      `)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) query = query.eq('status', status)
    if (customer_id) query = query.eq('customer_id', customer_id)
    if (channel_type) query = query.eq('channel_type', channel_type)

    const { data: conversations, error } = await query

    if (error) {
      await chatSecurity.logSecurityEvent({
        type: 'unauthorized_access',
        userId: securityResult.userId,
        details: { error: error.message, query: 'conversations' },
        ipAddress: chatSecurity.getClientIP(request)
      })
      return createErrorResponse(error.message, 400)
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
    
    if (status) countQuery = countQuery.eq('status', status)
    if (customer_id) countQuery = countQuery.eq('customer_id', customer_id)
    if (channel_type) countQuery = countQuery.eq('channel_type', channel_type)

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      return createErrorResponse(countError.message, 400)
    }

    return createSuccessResponse({
      conversations: conversations || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching conversations:', error)
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
  const securityResult = await securityMiddleware(request, 'conversations')
  if (!securityResult.success) {
    return createErrorResponse(securityResult.error, securityResult.status, securityResult.headers)
  }

  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate request body
    const validation = validateChatRequestBody(body, ['customer_id'])
    if (!validation.isValid) {
      return createErrorResponse(validation.errors.join(', '), 400)
    }

    const sanitizedBody = validation.sanitizedBody!
    const {
      title,
      customer_id,
      deal_id,
      channel_type = 'chat',
      priority = 'normal'
    } = sanitizedBody

    // Create conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        title: title || `Conversation with customer`,
        customer_id,
        deal_id,
        channel_type,
        priority,
        assigned_agent_id: securityResult.userId,
        status: 'open'
      })
      .select(`
        *,
        customer:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value)
      `)
      .single()

    if (error) {
      await chatSecurity.logSecurityEvent({
        type: 'invalid_input',
        userId: securityResult.userId,
        details: { error: error.message, action: 'create_conversation' },
        ipAddress: chatSecurity.getClientIP(request)
      })
      return createErrorResponse(error.message, 400)
    }

    return createSuccessResponse({ conversation }, 201)

  } catch (error) {
    console.error('Error creating conversation:', error)
    await chatSecurity.logSecurityEvent({
      type: 'unauthorized_access',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      ipAddress: chatSecurity.getClientIP(request)
    })
    return createErrorResponse('Internal server error', 500)
  }
}
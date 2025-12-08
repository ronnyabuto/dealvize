import { NextRequest, NextResponse } from 'next/server'
import { chatSecurity } from './chat-security'
import { requireAuth } from '@/lib/auth/utils'

type SecurityMiddlewareResult = {
  success: true
  userId: string
  csrfToken?: string
} | {
  success: false
  error: string
  status: number
  headers?: Record<string, string>
}

/**
 * Comprehensive security middleware for chat endpoints
 */
export async function securityMiddleware(
  request: NextRequest,
  action: 'messages' | 'conversations' | 'typing' = 'messages'
): Promise<SecurityMiddlewareResult> {
  try {
    // 1. Authentication check
    const user = await requireAuth()
    const userId = user.id
    const clientIP = chatSecurity.getClientIP(request)

    // 2. Rate limiting
    const rateLimitResult = await chatSecurity.checkRateLimit(
      `${userId}:${clientIP}`, 
      action
    )

    if (!rateLimitResult.success) {
      await chatSecurity.logSecurityEvent({
        type: 'rate_limit_exceeded',
        userId,
        details: { action, limit: rateLimitResult.limit },
        ipAddress: clientIP
      })

      return {
        success: false,
        error: 'Rate limit exceeded',
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          ...chatSecurity.getSecurityHeaders()
        }
      }
    }

    // 3. CSRF protection for state-changing operations
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      const csrfToken = request.headers.get('x-csrf-token')
      const sessionCSRF = request.headers.get('x-session-csrf') // From session/cookie

      if (!csrfToken || !sessionCSRF) {
        await chatSecurity.logSecurityEvent({
          type: 'csrf_violation',
          userId,
          details: { reason: 'missing_csrf_token' },
          ipAddress: clientIP
        })

        return {
          success: false,
          error: 'CSRF token required',
          status: 403,
          headers: chatSecurity.getSecurityHeaders()
        }
      }

      if (!chatSecurity.validateCSRFToken(csrfToken, sessionCSRF)) {
        await chatSecurity.logSecurityEvent({
          type: 'csrf_violation',
          userId,
          details: { reason: 'invalid_csrf_token' },
          ipAddress: clientIP
        })

        return {
          success: false,
          error: 'Invalid CSRF token',
          status: 403,
          headers: chatSecurity.getSecurityHeaders()
        }
      }
    }

    return {
      success: true,
      userId,
      csrfToken: chatSecurity.generateCSRFToken()
    }

  } catch (error) {
    return {
      success: false,
      error: 'Authentication required',
      status: 401,
      headers: chatSecurity.getSecurityHeaders()
    }
  }
}

/**
 * Validate request body for chat endpoints
 */
export function validateChatRequestBody(body: any, requiredFields: string[] = []): {
  isValid: boolean
  errors: string[]
  sanitizedBody?: any
} {
  const errors: string[] = []
  
  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] }
  }

  // Check required fields
  for (const field of requiredFields) {
    if (!(field in body) || body[field] === null || body[field] === undefined) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  // Validate message content if present
  if (body.content) {
    const contentValidation = chatSecurity.validateMessageContent(body.content)
    if (!contentValidation.isValid) {
      errors.push(...contentValidation.errors)
    } else {
      body.content = contentValidation.sanitized
    }
  }

  // Sanitize other text fields
  const textFields = ['title', 'subject', 'sender_name', 'recipient_name']
  for (const field of textFields) {
    if (body[field] && typeof body[field] === 'string') {
      body[field] = body[field].trim().substring(0, 255)
    }
  }

  // Validate enums
  if (body.priority && !['low', 'normal', 'high', 'urgent'].includes(body.priority)) {
    errors.push('Invalid priority value')
  }

  if (body.message_type && !['text', 'html', 'file', 'image', 'system'].includes(body.message_type)) {
    errors.push('Invalid message type')
  }

  if (body.direction && !['inbound', 'outbound'].includes(body.direction)) {
    errors.push('Invalid direction value')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedBody: errors.length === 0 ? body : undefined
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string, 
  status: number = 400, 
  details?: any
): NextResponse {
  return NextResponse.json(
    { 
      error, 
      details: details || undefined,
      timestamp: new Date().toISOString()
    }, 
    { 
      status,
      headers: chatSecurity.getSecurityHeaders()
    }
  )
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(
  data: any, 
  status: number = 200,
  additionalHeaders?: Record<string, string>
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      ...chatSecurity.getSecurityHeaders(),
      ...additionalHeaders
    }
  })
}
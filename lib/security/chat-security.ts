import { NextRequest } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface SecurityValidationResult {
  isValid: boolean
  errors: string[]
  sanitized?: string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

class ChatSecurity {
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>()
  private readonly MAX_MESSAGE_LENGTH = 4000
  private readonly MIN_MESSAGE_LENGTH = 1
  private readonly SUSPICIOUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
  ]
  
  private readonly RATE_LIMITS: Record<string, RateLimitConfig> = {
    messages: { windowMs: 60000, maxRequests: 30 }, // 30 messages per minute
    conversations: { windowMs: 60000, maxRequests: 10 }, // 10 conversations per minute
    typing: { windowMs: 5000, maxRequests: 20 } // 20 typing indicators per 5 seconds
  }

  /**
   * Validate and sanitize message content
   */
  validateMessageContent(content: string): SecurityValidationResult {
    const errors: string[] = []

    if (!content || typeof content !== 'string') {
      errors.push('Message content is required')
      return { isValid: false, errors }
    }

    const trimmedContent = content.trim()

    if (trimmedContent.length < this.MIN_MESSAGE_LENGTH) {
      errors.push('Message is too short')
    }

    if (trimmedContent.length > this.MAX_MESSAGE_LENGTH) {
      errors.push(`Message exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`)
    }

    // Check for suspicious patterns
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(trimmedContent)) {
        errors.push('Message contains potentially harmful content')
        break
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors }
    }

    // Sanitize content - escape HTML but preserve basic formatting
    const sanitized = this.sanitizeHtml(trimmedContent)

    return {
      isValid: true,
      errors: [],
      sanitized
    }
  }

  /**
   * Basic HTML sanitization - escape dangerous tags while preserving safe ones
   */
  private sanitizeHtml(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  /**
   * Rate limiting implementation
   */
  async checkRateLimit(
    identifier: string, 
    action: keyof typeof this.RATE_LIMITS
  ): Promise<RateLimitResult> {
    const config = this.RATE_LIMITS[action]
    if (!config) {
      return { success: true, limit: 0, remaining: 0, resetTime: 0 }
    }

    const key = `${identifier}:${action}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Clean up expired entries
    if (this.rateLimitStore.has(key)) {
      const entry = this.rateLimitStore.get(key)!
      if (entry.resetTime <= now) {
        this.rateLimitStore.delete(key)
      }
    }

    const entry = this.rateLimitStore.get(key) || { 
      count: 0, 
      resetTime: now + config.windowMs 
    }

    if (entry.count >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }

    // Update rate limit
    entry.count++
    this.rateLimitStore.set(key, entry)

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(provided: string, expected: string): boolean {
    if (!provided || !expected) return false
    
    // Use crypto.timingSafeEqual to prevent timing attacks
    const providedBuffer = Buffer.from(provided, 'hex')
    const expectedBuffer = Buffer.from(expected, 'hex')
    
    if (providedBuffer.length !== expectedBuffer.length) return false
    
    return providedBuffer.equals(expectedBuffer)
  }

  /**
   * Get security headers for responses
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    }
  }

  /**
   * Verify user has access to conversation
   */
  async verifyConversationAccess(userId: string, conversationId: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .or(`assigned_agent_id.eq.${userId},customer_id.eq.${userId}`)
        .single()

      return !error && !!data
    } catch {
      return false
    }
  }

  /**
   * Log security events for monitoring
   */
  async logSecurityEvent(event: {
    type: 'rate_limit_exceeded' | 'invalid_input' | 'csrf_violation' | 'unauthorized_access'
    userId?: string
    conversationId?: string
    details: Record<string, any>
    ipAddress?: string
  }): Promise<void> {
    // In production, this would integrate with your logging service
    console.warn('Security Event:', {
      ...event,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Extract client IP from request
   */
  getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    return realIP || 'unknown'
  }

  /**
   * Create secure message hash for integrity verification
   */
  createMessageHash(messageId: string, content: string, timestamp: string): string {
    return createHash('sha256')
      .update(`${messageId}:${content}:${timestamp}`)
      .digest('hex')
  }
}

export const chatSecurity = new ChatSecurity()
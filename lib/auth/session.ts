// Secure session management utilities
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/errors'

// Session configuration
export const SESSION_CONFIG = {
  // Cookie settings
  COOKIE_NAME: 'dealvize-session',
  MAX_AGE: 60 * 60 * 24 * 7, // 7 days
  REFRESH_THRESHOLD: 60 * 60 * 24, // Refresh if expires within 24 hours
  
  // Security settings
  SECURE: process.env.NODE_ENV === 'production',
  SAME_SITE: 'strict' as const,
  HTTP_ONLY: true,
  
  // Session validation
  VALIDATE_IP: process.env.VALIDATE_SESSION_IP === 'true',
  VALIDATE_USER_AGENT: process.env.VALIDATE_SESSION_USER_AGENT === 'true',
}

export interface SessionInfo {
  userId: string
  email: string
  isValid: boolean
  expiresAt: Date
  createdAt: Date
  lastActivity: Date
  ipAddress?: string
  userAgent?: string
}

export interface SessionValidationOptions {
  requireAuth?: boolean
  refreshIfNeeded?: boolean
  validateFingerprint?: boolean
}

// Create secure session
export async function createSecureSession(
  userId: string, 
  request?: NextRequest
): Promise<{ success: boolean; sessionInfo?: SessionInfo; error?: string }> {
  try {
    const supabase = await createClient()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SESSION_CONFIG.MAX_AGE * 1000)
    
    // Get session fingerprint
    const fingerprint = request ? generateSessionFingerprint(request) : {}
    
    const sessionInfo: SessionInfo = {
      userId,
      email: '', // Will be filled from user data
      isValid: true,
      expiresAt,
      createdAt: now,
      lastActivity: now,
      ...fingerprint
    }
    
    // Get user info
    const { data: user, error: userError } = await supabase.auth.getUser()
    if (userError || !user.user) {
      return { success: false, error: 'Invalid user' }
    }
    
    sessionInfo.email = user.user.email || ''
    
    logger.info('Secure session created', {
      userId,
      email: sessionInfo.email,
      expiresAt: sessionInfo.expiresAt.toISOString()
    })
    
    return { success: true, sessionInfo }
  } catch (error) {
    logger.error('Failed to create secure session', error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: 'Session creation failed' }
  }
}

// Validate session security
export async function validateSession(
  request: NextRequest,
  options: SessionValidationOptions = {}
): Promise<{ isValid: boolean; sessionInfo?: SessionInfo; error?: string }> {
  const {
    requireAuth = true,
    refreshIfNeeded = true,
    validateFingerprint = true
  } = options
  
  try {
    const supabase = await createClient()
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      if (requireAuth) {
        return { isValid: false, error: 'No valid session found' }
      }
      return { isValid: true }
    }
    
    const now = new Date()
    const expiresAt = new Date(session.expires_at! * 1000)
    
    // Check if session is expired
    if (now >= expiresAt) {
      logger.warn('Session expired', { userId: session.user.id })
      return { isValid: false, error: 'Session expired' }
    }
    
    // Generate current fingerprint
    const currentFingerprint = generateSessionFingerprint(request)
    
    const sessionInfo: SessionInfo = {
      userId: session.user.id,
      email: session.user.email || '',
      isValid: true,
      expiresAt,
      createdAt: new Date(session.user.created_at),
      lastActivity: now,
      ...currentFingerprint
    }
    
    // Validate session fingerprint if enabled
    if (validateFingerprint && SESSION_CONFIG.VALIDATE_IP) {
      // In a production system, you would store and compare fingerprints
      // For now, we just log the information
      logger.debug('Session fingerprint validation', currentFingerprint)
    }
    
    // Check if session needs refresh
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()
    const shouldRefresh = refreshIfNeeded && timeUntilExpiry < SESSION_CONFIG.REFRESH_THRESHOLD * 1000
    
    if (shouldRefresh) {
      try {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          logger.warn('Session refresh failed', refreshError)
        } else {
          logger.info('Session refreshed', { userId: session.user.id })
        }
      } catch (refreshError) {
        logger.error('Session refresh error', refreshError instanceof Error ? refreshError : new Error(String(refreshError)))
      }
    }
    
    return { isValid: true, sessionInfo }
  } catch (error) {
    logger.error('Session validation error', error instanceof Error ? error : new Error(String(error)))
    return { isValid: false, error: 'Session validation failed' }
  }
}

// Generate session fingerprint for security
function generateSessionFingerprint(request: NextRequest): Partial<SessionInfo> {
  const fingerprint: Partial<SessionInfo> = {}
  
  if (SESSION_CONFIG.VALIDATE_IP) {
    fingerprint.ipAddress = getClientIP(request)
  }
  
  if (SESSION_CONFIG.VALIDATE_USER_AGENT) {
    fingerprint.userAgent = request.headers.get('user-agent') || 'Unknown'
  }
  
  return fingerprint
}

// Extract client IP address
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  // Fallback to connection remote address (may not be available in serverless)
  return 'unknown'
}

// Secure session cleanup
export async function invalidateSession(
  userId?: string,
  reason: string = 'User logout'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    logger.info('Session invalidated', { userId, reason })
    return { success: true }
  } catch (error) {
    logger.error('Session invalidation failed', error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: 'Session invalidation failed' }
  }
}

// Session middleware helper
export function withSecureSession(
  handler: (request: NextRequest, sessionInfo: SessionInfo) => Promise<NextResponse>,
  options: SessionValidationOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const validation = await validateSession(request, options)
    
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid session' },
        { status: 401 }
      )
    }
    
    if (!validation.sessionInfo) {
      return NextResponse.json(
        { error: 'Session information not available' },
        { status: 401 }
      )
    }
    
    return handler(request, validation.sessionInfo)
  }
}

// Session health check
export async function checkSessionHealth(): Promise<{
  healthy: boolean
  activeSessions: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Simple health check - verify we can get session
    const { data, error } = await supabase.auth.getSession()
    
    return {
      healthy: !error,
      activeSessions: data.session ? 1 : 0,
      error: error?.message
    }
  } catch (error) {
    return {
      healthy: false,
      activeSessions: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Security headers helper
export function setSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // HSTS for HTTPS
  if (SESSION_CONFIG.SECURE) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  return response
}
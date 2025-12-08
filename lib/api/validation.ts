import { NextRequest } from 'next/server'
import { ZodSchema, ZodError } from 'zod'
import { ValidationError, logger } from '@/lib/errors'

// Validate request body
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    const validated = schema.parse(body)
    return validated
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = error.errors[0]
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.')
      )
    }
    throw new ValidationError('Invalid request body')
  }
}

// Validate query parameters
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  try {
    const { searchParams } = new URL(request.url)
    const query: Record<string, any> = {}
    
    // Convert URLSearchParams to object
    for (const [key, value] of searchParams) {
      query[key] = value
    }
    
    const validated = schema.parse(query)
    return validated
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = error.errors[0]
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.')
      )
    }
    throw new ValidationError('Invalid query parameters')
  }
}

// Validate URL parameters
export function validateParams<T>(
  params: Record<string, string | string[]>,
  schema: ZodSchema<T>
): T {
  try {
    const validated = schema.parse(params)
    return validated
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = error.errors[0]
      throw new ValidationError(
        firstError.message,
        firstError.path.join('.')
      )
    }
    throw new ValidationError('Invalid URL parameters')
  }
}

// Sanitize input data
export function sanitizeInput<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data }
  
  for (const key in sanitized) {
    const value = sanitized[key]
    
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      sanitized[key] = value
        .trim()
        .replace(/[<>]/g, '') // Remove potential XSS
        .replace(/[{}]/g, '') // Remove potential injection
        .slice(0, 10000) as T[typeof key] // Prevent extremely long strings
    }
  }
  
  return sanitized
}

// Rate limiting helper (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean expired entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitMap.delete(key)
    }
  }
  
  const current = rateLimitMap.get(identifier)
  
  if (!current) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now })
    return true
  }
  
  if (current.resetTime < windowStart) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now })
    return true
  }
  
  if (current.count >= maxRequests) {
    logger.warn('Rate limit exceeded', { identifier, count: current.count })
    return false
  }
  
  current.count++
  return true
}

// Get client IP for rate limiting
export function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // NextRequest in Edge Runtime doesn't have ip property
  return 'unknown'
}

// Validate content type
export function validateContentType(
  request: NextRequest,
  expectedType: string = 'application/json'
): void {
  const contentType = request.headers.get('content-type')
  
  if (!contentType || !contentType.includes(expectedType)) {
    throw new ValidationError(`Expected content type: ${expectedType}`)
  }
}
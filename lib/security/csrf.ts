import { NextRequest, NextResponse } from 'next/server'

const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate CSRF token using Web Crypto API
 * Compatible with both Node.js and Edge Runtime
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate CSRF token using timing-safe comparison
 */
export function validateCSRFToken(provided: string, expected: string): boolean {
  if (!provided || !expected || provided.length !== expected.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  
  return result === 0
}

/**
 * Middleware to add CSRF protection
 */
export function withCSRFProtection(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    // Skip CSRF for GET requests (safe methods)
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return handler(request)
    }

    const token = request.headers.get(CSRF_HEADER_NAME)
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value

    if (!token || !cookieToken || !validateCSRFToken(token, cookieToken)) {
      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 }
      )
    }

    return handler(request)
  }
}

/**
 * Set CSRF token in response
 * Uses double-submit cookie pattern - one httpOnly for validation, one readable for client
 */
export function setCSRFToken(response: NextResponse): NextResponse {
  const token = generateCSRFToken()
  
  // httpOnly cookie for server-side validation
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  })

  // Client-readable cookie for JavaScript access
  response.cookies.set(`${CSRF_COOKIE_NAME}-client`, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  })

  response.headers.set('x-csrf-token', token)
  
  return response
}
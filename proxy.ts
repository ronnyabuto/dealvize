import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { withCSRFProtection, setCSRFToken } from './lib/security/csrf'
import { smartRateLimiter } from '@/lib/security/edge-rate-limiter'
import { createServerClient } from '@supabase/ssr'

// Edge-compatible Supabase client creator
function createEdgeClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Edge middleware cannot set cookies, handled by updateSession
        },
      },
    }
  )
}

// Essential security headers
// NOTE: HSTS (Strict-Transport-Security) is applied conditionally in production only
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com https://vercel.live",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vercel.live",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://vercel.live",
    "object-src 'none'"
  ].join('; ')
}

// Apply CSRF protection to API routes
const protectedMiddleware = withCSRFProtection(updateSession)

export async function proxy(request: NextRequest) {
  try {
    let response: NextResponse

    // Apply CSRF protection to API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      response = await protectedMiddleware(request)
    } else {
      // Apply regular session middleware to other routes
      response = await updateSession(request)
    }

    // Apply security headers to all responses
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    // FIX: Only apply HSTS in production to prevent localhost SSL errors
    // Browsers cache HSTS aggressively, causing issues in local development
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    // Get client IP for rate limiting and security logging
    const clientIP = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Rate limiting for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const supabase = createEdgeClient(request)
      const { data: { user } } = await supabase.auth.getUser()
      const identifier = user?.id || clientIP

      // Different rate limits for different endpoints using edge-based limiting
      let rateLimit
      if (request.nextUrl.pathname.includes('/api/auth')) {
        // Auth endpoints: use both user and IP rate limits
        const userLimit = await smartRateLimiter.checkBusinessUserLimit(identifier, 'auth', !!user)
        const ipLimit = await smartRateLimiter.checkIPLimit(clientIP, 'auth')
        rateLimit = !userLimit.allowed ? userLimit : ipLimit
      } else if (request.nextUrl.pathname.includes('/api/compliance')) {
        // Compliance endpoints: stricter limits
        rateLimit = await smartRateLimiter.checkBusinessUserLimit(identifier, 'general_api', !!user)
      } else if (request.nextUrl.pathname.includes('/api/v1')) {
        // External API: very generous limits for business users
        rateLimit = await smartRateLimiter.checkBusinessUserLimit(identifier, 'general_api', !!user)
      } else {
        // General API: business-friendly limits
        rateLimit = await smartRateLimiter.checkBusinessUserLimit(identifier, 'general_api', !!user)
      }

      if (!rateLimit.allowed) {
        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            resetTime: rateLimit.resetTime
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': rateLimit.limit.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.resetTime.toISOString(),
              ...securityHeaders
            }
          }
        )
      }

      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
      response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toISOString())
    }

    // Authentication check for protected routes
    const protectedPaths = [
      '/dashboard',
      '/clients',
      '/deals',
      '/messages',
      '/calendar',
      '/analytics',
      '/settings',
      '/admin'
    ]

    const isProtectedPath = protectedPaths.some(path =>
      request.nextUrl.pathname.startsWith(path)
    )

    if (isProtectedPath) {
      const supabase = createEdgeClient(request)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        const redirectUrl = new URL('/auth/signin', request.url)
        redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Log security event for protected route access
      await logSecurityEvent(request, user.id, clientIP)
    }

    // Tenant subdomain routing for multi-tenant architecture
    const hostname = request.headers.get('host')
    if (hostname && hostname.includes('.') && !hostname.includes('localhost')) {
      const subdomain = hostname.split('.')[0]

      // Skip www, api, and main domain subdomains
      if (subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'dealvize') {
        // Rewrite to tenant-specific routes
        const url = request.nextUrl.clone()
        url.pathname = `/tenant/${subdomain}${url.pathname}`
        return NextResponse.rewrite(url)
      }
    }

    // Set CSRF token for dashboard routes (not API routes, they handle their own CSRF)
    if (!request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/auth/')) {
      response = setCSRFToken(response)
    }

    return response

  } catch (error) {
    console.error('Middleware error:', error)

    // Return error response with security headers
    const errorResponse = new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders
        }
      }
    )

    return errorResponse
  }
}

async function logSecurityEvent(request: NextRequest, userId: string, clientIP: string) {
  // In a real implementation, store security events in database
  const event = {
    user_id: userId,
    ip_address: clientIP,
    user_agent: request.headers.get('user-agent'),
    method: request.method,
    path: request.nextUrl.pathname,
    timestamp: new Date().toISOString()
  }

  // For now, just log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Security event:', event)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
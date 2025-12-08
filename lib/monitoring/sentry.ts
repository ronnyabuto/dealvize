// Sentry error tracking integration
import * as Sentry from '@sentry/nextjs'

// Sentry configuration
export const SENTRY_CONFIG = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: process.env.NODE_ENV === 'development',
  beforeSend: (event: any) => {
    // Filter out irrelevant errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send client-side navigation errors
      if (event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
        return null
      }
      
      // Don't send network errors from ad blockers
      if (event.exception?.values?.[0]?.value?.includes('Script error')) {
        return null
      }
    }
    
    return event
  }
}

// Initialize Sentry (call this in your app initialization)
export function initSentry() {
  if (!SENTRY_CONFIG.dsn) {
    console.warn('Sentry DSN not configured, error tracking disabled')
    return
  }

  Sentry.init({
    dsn: SENTRY_CONFIG.dsn,
    environment: SENTRY_CONFIG.environment,
    tracesSampleRate: SENTRY_CONFIG.tracesSampleRate,
    debug: SENTRY_CONFIG.debug,
    beforeSend: SENTRY_CONFIG.beforeSend,
    
    // Performance monitoring (BrowserTracing is automatically included in Next.js integration)
    integrations: [],
    
    // Error filtering
    ignoreErrors: [
      // Browser extension errors
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      'Script error.',
      // Network errors
      'NetworkError when attempting to fetch resource.',
      'Failed to fetch',
      // Ad blocker errors
      'Blocked a frame with origin',
    ],
  })
}

// Enhanced error reporting with context
export interface ErrorContext {
  userId?: string
  email?: string
  action?: string
  component?: string
  route?: string
  requestId?: string
  userAgent?: string
  ipAddress?: string
  metadata?: Record<string, any>
}

// Report error to Sentry with context
export function reportErrorToSentry(
  error: Error,
  context?: ErrorContext,
  level: Sentry.SeverityLevel = 'error'
) {
  if (!SENTRY_CONFIG.dsn) {
    console.error('Sentry not configured, logging error locally:', error)
    return
  }

  Sentry.withScope((scope) => {
    // Set user context
    if (context?.userId || context?.email) {
      scope.setUser({
        id: context.userId,
        email: context.email,
      })
    }

    // Set additional context
    if (context?.action) {
      scope.setTag('action', context.action)
    }

    if (context?.component) {
      scope.setTag('component', context.component)
    }

    if (context?.route) {
      scope.setTag('route', context.route)
    }

    if (context?.requestId) {
      scope.setTag('requestId', context.requestId)
    }

    // Set extra metadata
    if (context?.metadata) {
      scope.setContext('metadata', context.metadata)
    }

    if (context?.userAgent) {
      scope.setContext('userAgent', { value: context.userAgent })
    }

    if (context?.ipAddress) {
      scope.setContext('network', { ipAddress: context.ipAddress })
    }

    // Set severity level
    scope.setLevel(level)

    // Capture the exception
    Sentry.captureException(error)
  })
}

// Report API errors specifically
export function reportApiError(
  error: Error,
  request: {
    method: string
    url: string
    headers?: Record<string, string>
    body?: any
  },
  response?: {
    status: number
    body?: any
  },
  context?: Omit<ErrorContext, 'action' | 'route'>
) {
  reportErrorToSentry(error, {
    ...context,
    action: 'api_request',
    route: `${request.method} ${request.url}`,
    metadata: {
      request: {
        method: request.method,
        url: request.url,
        headers: filterSensitiveHeaders(request.headers || {}),
        body: request.body
      },
      response: response ? {
        status: response.status,
        body: response.body
      } : undefined
    }
  })
}

// Report authentication errors
export function reportAuthError(
  error: Error,
  authAction: 'login' | 'register' | 'logout' | 'refresh' | 'reset_password',
  context?: Omit<ErrorContext, 'action'>
) {
  reportErrorToSentry(error, {
    ...context,
    action: `auth_${authAction}`,
    metadata: {
      authAction,
      timestamp: new Date().toISOString()
    }
  }, 'warning')
}

// Report performance issues
export function reportPerformanceIssue(
  name: string,
  duration: number,
  threshold: number,
  context?: ErrorContext
) {
  if (duration > threshold) {
    const error = new Error(`Performance issue: ${name} took ${duration}ms (threshold: ${threshold}ms)`)
    reportErrorToSentry(error, {
      ...context,
      action: 'performance_issue',
      metadata: {
        performance: {
          name,
          duration,
          threshold,
          ratio: duration / threshold
        }
      }
    }, 'warning')
  }
}

// Report database errors
export function reportDatabaseError(
  error: Error,
  query?: string,
  context?: Omit<ErrorContext, 'action'>
) {
  reportErrorToSentry(error, {
    ...context,
    action: 'database_error',
    metadata: {
      database: {
        query: query ? sanitizeQuery(query) : undefined,
        timestamp: new Date().toISOString()
      }
    }
  })
}

// Create breadcrumb for user actions
export function addBreadcrumb(
  message: string,
  category: string = 'user',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  if (!SENTRY_CONFIG.dsn) return

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  })
}

// Set user context
export function setUserContext(userId: string, email?: string, additional?: Record<string, any>) {
  if (!SENTRY_CONFIG.dsn) return

  Sentry.setUser({
    id: userId,
    email,
    ...additional
  })
}

// Clear user context (on logout)
export function clearUserContext() {
  if (!SENTRY_CONFIG.dsn) return

  Sentry.setUser(null)
}

// Filter sensitive headers
function filterSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token']
  const filtered: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      filtered[key] = '[REDACTED]'
    } else {
      filtered[key] = value
    }
  }
  
  return filtered
}

// Sanitize SQL queries by removing potential sensitive data
function sanitizeQuery(query: string): string {
  // Remove potential password fields
  return query.replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
              .replace(/password\s*=\s*"[^"]*"/gi, 'password = "[REDACTED]"')
              .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
              .replace(/token\s*=\s*"[^"]*"/gi, 'token = "[REDACTED]"')
}

// Manual error capture with custom fingerprinting
export function captureException(
  error: Error,
  fingerprint?: string[],
  context?: ErrorContext
) {
  if (!SENTRY_CONFIG.dsn) {
    console.error('Sentry not configured:', error)
    return
  }

  Sentry.withScope((scope) => {
    if (fingerprint) {
      scope.setFingerprint(fingerprint)
    }
    
    if (context) {
      if (context.userId || context.email) {
        scope.setUser({
          id: context.userId,
          email: context.email,
        })
      }
      
      Object.entries(context).forEach(([key, value]) => {
        if (key !== 'userId' && key !== 'email' && key !== 'metadata') {
          scope.setTag(key, String(value))
        }
      })
      
      if (context.metadata) {
        scope.setContext('additional', context.metadata)
      }
    }
    
    Sentry.captureException(error)
  })
}

// Health check for Sentry
export function checkSentryHealth(): { configured: boolean; dsn?: string } {
  return {
    configured: !!SENTRY_CONFIG.dsn,
    dsn: SENTRY_CONFIG.dsn ? `${SENTRY_CONFIG.dsn.slice(0, 20)}...` : undefined
  }
}

// Export Sentry instance for direct use if needed
export { Sentry }
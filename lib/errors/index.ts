// Centralized error handling system

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', isOperational: boolean = true) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

// Predefined error classes
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    if (field) {
      this.message = `${field}: ${message}`
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR')
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR')
    this.name = 'RateLimitError'
  }
}

// Error response formatter
export interface ErrorResponse {
  error: {
    message: string
    code: string
    statusCode: number
    timestamp: string
    requestId?: string
    details?: any
  }
}

export function formatErrorResponse(error: AppError, requestId?: string, details?: any): ErrorResponse {
  return {
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      requestId,
      details: process.env.NODE_ENV === 'development' ? details : undefined
    }
  }
}

// Async error handler wrapper for API routes
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return (...args: T): Promise<R> => {
    return Promise.resolve(fn(...args)).catch((error) => {
      // Re-throw AppError instances
      if (error instanceof AppError) {
        throw error
      }
      
      // Convert unknown errors to AppError
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Resource')
      }
      
      if (error.message?.includes('duplicate key')) {
        throw new ConflictError('Resource already exists')
      }
      
      if (error.message?.includes('foreign key')) {
        throw new ValidationError('Invalid reference to related resource')
      }
      
      // Default to internal server error
      throw new AppError(
        process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message || 'Unknown error',
        500,
        'INTERNAL_ERROR'
      )
    })
  }
}

// Logger interface
export interface Logger {
  info(message: string, meta?: any): void
  warn(message: string, meta?: any): void
  error(message: string, error?: Error, meta?: any): void
  debug(message: string, meta?: any): void
}

// Simple console logger (replace with winston/pino in production)
class ConsoleLogger implements Logger {
  info(message: string, meta?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '')
    }
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '')
  }

  error(message: string, error?: Error, meta?: any): void {
    console.error(`[ERROR] ${message}`, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      meta
    })
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '')
    }
  }
}

export const logger = new ConsoleLogger()

// Error reporting helper
export function reportError(error: Error, context?: Record<string, any>) {
  logger.error('Unhandled error occurred', error, context)
  
  // In production, send to error tracking service (Sentry)
  if (process.env.NODE_ENV === 'production') {
    try {
      // Dynamic import to avoid issues if Sentry is not configured
      import('@/lib/monitoring/sentry').then(({ reportErrorToSentry }) => {
        reportErrorToSentry(error, context)
      }).catch((importError) => {
        console.warn('Failed to import Sentry:', importError)
      })
    } catch (sentryError) {
      console.warn('Failed to report error to Sentry:', sentryError)
    }
  }
}

// Standardized API response interfaces
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// Standard success response format
export interface SuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      pages: number
    }
    timestamp: string
    requestId?: string
  }
}

// Standard error response format
export interface StandardErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    field?: string
    timestamp: string
    requestId?: string
    stack?: string // Only in development
  }
}

// API response type
export type ApiResponse<T = any> = SuccessResponse<T> | StandardErrorResponse

// Create standardized success response
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: SuccessResponse<T>['meta']
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      ...meta,
      timestamp: new Date().toISOString()
    }
  }
}

// Create standardized error response
export function createErrorResponse(
  error: AppError | Error | string,
  requestId?: string,
  field?: string
): StandardErrorResponse {
  let code: string
  let message: string
  let details: any

  if (error instanceof AppError) {
    code = error.code
    message = error.message
    details = error
  } else if (error instanceof Error) {
    code = 'INTERNAL_ERROR'
    message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
    details = process.env.NODE_ENV === 'development' ? error.stack : undefined
  } else {
    code = 'UNKNOWN_ERROR'
    message = String(error)
  }

  return {
    success: false,
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      field,
      timestamp: new Date().toISOString(),
      requestId,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }
  }
}

// Handle Zod validation errors
export function createValidationErrorResponse(
  error: ZodError,
  requestId?: string
): StandardErrorResponse {
  const firstError = error.errors[0]
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: firstError?.message || 'Validation failed',
      field: firstError?.path.join('.') || 'unknown',
      details: process.env.NODE_ENV === 'development' ? error.errors : undefined,
      timestamp: new Date().toISOString(),
      requestId
    }
  }
}

// Create Next.js JSON response with standard format
export function createJsonResponse<T>(
  data: T | AppError | Error | string,
  status: number = 200,
  message?: string,
  meta?: SuccessResponse<T>['meta'],
  requestId?: string
): NextResponse {
  // Handle error responses
  if (data instanceof AppError || data instanceof Error || typeof data === 'string') {
    const errorResponse = createErrorResponse(data, requestId)
    return NextResponse.json(errorResponse, { status: status >= 400 ? status : 500 })
  }

  // Handle success responses
  const successResponse = createSuccessResponse(data, message, meta)
  return NextResponse.json(successResponse, { status })
}

// Handle Zod validation errors in API routes
export function handleValidationError(
  error: ZodError,
  requestId?: string
): NextResponse {
  const errorResponse = createValidationErrorResponse(error, requestId)
  return NextResponse.json(errorResponse, { status: 400 })
}

// API error handler wrapper
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      const requestId = crypto.randomUUID()
      logger.error('API error', error instanceof Error ? error : new Error(String(error)), { requestId })
      
      if (error instanceof ZodError) {
        return handleValidationError(error, requestId)
      }
      
      return createJsonResponse(error instanceof Error ? error : new Error(String(error)), 500, undefined, undefined, requestId)
    }
  }
}
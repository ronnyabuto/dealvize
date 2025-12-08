/**
 * Enterprise API Gateway
 * Centralized API management with rate limiting, authentication, and monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface ApiKeyData {
  id: string
  tenant_id: string
  name: string
  key_hash: string
  permissions: string[]
  rate_limit: number
  is_active: boolean
  expires_at?: string
  last_used_at?: string
  created_at: string
}

interface RateLimitData {
  key: string
  requests: number
  reset_time: number
}

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitData>()

// API key validation schema
const ApiRequestSchema = z.object({
  endpoint: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  data: z.any().optional(),
  params: z.record(z.string()).optional()
})

// POST - Process API requests through gateway
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const serviceClient = createServiceClient()
    
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization')
    const apiKey = authHeader?.replace('Bearer ', '')
    
    if (!apiKey) {
      return createErrorResponse('API key required', 401, null)
    }

    // Validate and get API key data
    const keyData = await validateApiKey(serviceClient, apiKey)
    if (!keyData) {
      return createErrorResponse('Invalid API key', 401, null)
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit(keyData.id, keyData.rate_limit)
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Rate limit exceeded', 
        429, 
        null, 
        {
          'X-RateLimit-Limit': keyData.rate_limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString()
        }
      )
    }

    // Parse request body
    const body = await request.json()
    const validatedRequest = ApiRequestSchema.parse(body)

    // Check permissions
    const hasPermission = await checkEndpointPermissions(
      keyData.permissions,
      validatedRequest.endpoint,
      validatedRequest.method
    )

    if (!hasPermission) {
      return createErrorResponse('Insufficient permissions', 403, keyData.tenant_id)
    }

    // Update API key usage
    await updateApiKeyUsage(serviceClient, keyData.id)

    // Route request to internal API
    const result = await routeInternalRequest(
      serviceClient,
      validatedRequest,
      keyData.tenant_id,
      request
    )

    // Log API usage
    await logApiUsage(serviceClient, {
      api_key_id: keyData.id,
      tenant_id: keyData.tenant_id,
      endpoint: validatedRequest.endpoint,
      method: validatedRequest.method,
      status_code: result.status,
      response_time: Date.now() - startTime,
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent') || ''
    })

    // Add rate limit headers to response
    const response = NextResponse.json(result.data, { status: result.status })
    response.headers.set('X-RateLimit-Limit', keyData.rate_limit.toString())
    response.headers.set('X-RateLimit-Remaining', (keyData.rate_limit - rateLimitResult.requests).toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString())
    response.headers.set('X-Response-Time', (Date.now() - startTime).toString())

    return response

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Invalid request format',
        400,
        null,
        undefined,
        error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      )
    }

    console.error('API Gateway error:', error)
    return createErrorResponse('Internal server error', 500, null)
  }
}

// GET - API health and status
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  
  if (!apiKey) {
    return createErrorResponse('API key required', 401, null)
  }

  try {
    const serviceClient = createServiceClient()
    const keyData = await validateApiKey(serviceClient, apiKey)
    
    if (!keyData) {
      return createErrorResponse('Invalid API key', 401, null)
    }

    const rateLimitResult = await checkRateLimit(keyData.id, keyData.rate_limit)
    
    return NextResponse.json({
      status: 'operational',
      version: 'v1',
      timestamp: new Date().toISOString(),
      tenant_id: keyData.tenant_id,
      rate_limit: {
        limit: keyData.rate_limit,
        remaining: keyData.rate_limit - rateLimitResult.requests,
        reset: Math.ceil(rateLimitResult.resetTime / 1000)
      },
      endpoints: await getAvailableEndpoints(keyData.permissions)
    })

  } catch (error) {
    console.error('API Gateway health check error:', error)
    return createErrorResponse('Health check failed', 500, null)
  }
}

// Helper functions
async function validateApiKey(serviceClient: any, apiKey: string): Promise<ApiKeyData | null> {
  try {
    // Hash the provided key for comparison
    const keyHash = await hashApiKey(apiKey)
    
    const { data: keyData, error } = await serviceClient
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (error || !keyData) {
      return null
    }

    // Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return null
    }

    return keyData
  } catch (error) {
    console.error('API key validation error:', error)
    return null
  }
}

async function checkRateLimit(keyId: string, limit: number): Promise<{
  allowed: boolean
  requests: number
  resetTime: number
}> {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour window
  const resetTime = Math.ceil(now / windowMs) * windowMs

  const existing = rateLimitStore.get(keyId)

  if (!existing || existing.reset_time <= now) {
    // New window
    const newData: RateLimitData = {
      key: keyId,
      requests: 1,
      reset_time: resetTime
    }
    rateLimitStore.set(keyId, newData)
    return { allowed: true, requests: 1, resetTime }
  }

  existing.requests++
  
  return {
    allowed: existing.requests <= limit,
    requests: existing.requests,
    resetTime: existing.reset_time
  }
}

async function checkEndpointPermissions(
  permissions: string[],
  endpoint: string,
  method: string
): Promise<boolean> {
  // Check if user has wildcard permission
  if (permissions.includes('*')) {
    return true
  }

  // Check specific endpoint permission
  const endpointPermission = `${method.toLowerCase()}:${endpoint}`
  if (permissions.includes(endpointPermission)) {
    return true
  }

  // Check resource-level permissions
  const resource = endpoint.split('/')[1] // Extract resource from /resource/action
  const resourcePermission = `${method.toLowerCase()}:${resource}:*`
  if (permissions.includes(resourcePermission)) {
    return true
  }

  // Check read-only permissions for GET requests
  if (method === 'GET' && permissions.includes('read:*')) {
    return true
  }

  return false
}

async function routeInternalRequest(
  serviceClient: any,
  request: any,
  tenantId: string,
  originalRequest: NextRequest
): Promise<{ status: number; data: any }> {
  const { endpoint, method, data, params } = request

  try {
    // Map external endpoints to internal API routes
    const internalUrl = mapToInternalRoute(endpoint)
    
    if (!internalUrl) {
      return { status: 404, data: { error: 'Endpoint not found' } }
    }

    // Build internal request URL with params
    const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL}${internalUrl}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value as string)
      })
    }

    // Add tenant context
    url.searchParams.append('tenant_id', tenantId)

    // Create internal request
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true',
        'X-Tenant-Id': tenantId,
        'User-Agent': originalRequest.headers.get('user-agent') || ''
      }
    }

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = JSON.stringify(data)
    }

    // Make internal request
    const response = await fetch(url.toString(), requestOptions)
    const responseData = await response.json()

    return {
      status: response.status,
      data: responseData
    }

  } catch (error) {
    console.error('Internal routing error:', error)
    return {
      status: 500,
      data: { error: 'Internal routing failed' }
    }
  }
}

function mapToInternalRoute(endpoint: string): string | null {
  const routeMap: Record<string, string> = {
    '/clients': '/api/clients',
    '/deals': '/api/deals',
    '/messages': '/api/messages',
    '/templates': '/api/email-templates',
    '/sequences': '/api/nurturing-sequences',
    '/analytics': '/api/analytics',
    '/webhooks': '/api/webhooks'
  }

  return routeMap[endpoint] || null
}

async function updateApiKeyUsage(serviceClient: any, keyId: string) {
  await serviceClient
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: serviceClient.sql`usage_count + 1`
    })
    .eq('id', keyId)
}

async function logApiUsage(serviceClient: any, logData: any) {
  await serviceClient
    .from('api_usage_logs')
    .insert({
      ...logData,
      created_at: new Date().toISOString()
    })
}

async function getAvailableEndpoints(permissions: string[]): Promise<string[]> {
  const allEndpoints = [
    'GET:/clients',
    'POST:/clients',
    'GET:/deals',
    'POST:/deals',
    'GET:/messages',
    'POST:/messages',
    'GET:/templates',
    'GET:/sequences',
    'GET:/analytics'
  ]

  return allEndpoints.filter(endpoint => {
    const [method, path] = endpoint.split(':')
    return checkEndpointPermissions(permissions, path, method)
  })
}

async function hashApiKey(key: string): Promise<string> {
  // Simple hash for demo - in production use proper cryptographic hashing
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown'
}

function createErrorResponse(
  message: string, 
  status: number, 
  tenantId: string | null,
  headers?: Record<string, string>,
  details?: any
) {
  const response = NextResponse.json({
    error: message,
    status,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  }, { status })

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  return response
}
/**
 * Enterprise Webhook Management API
 * Comprehensive webhook system for external integrations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const WebhookSchema = z.object({
  name: z.string().min(1, 'Webhook name is required'),
  url: z.string().url('Valid URL is required'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  secret: z.string().optional(),
  is_active: z.boolean().default(true),
  retry_config: z.object({
    max_retries: z.number().min(0).max(10).default(3),
    retry_delay: z.number().min(1).max(3600).default(60), // seconds
    backoff_multiplier: z.number().min(1).max(10).default(2)
  }).optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().min(1).max(60).default(30), // seconds
  description: z.string().optional()
})

const WebhookEventSchema = z.object({
  event: z.string().min(1),
  payload: z.record(z.any()),
  tenant_id: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// GET - List webhooks with delivery statistics
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const event = searchParams.get('event')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    try {
      let query = serviceClient
        .from('webhooks')
        .select(`
          *,
          delivery_stats:webhook_deliveries(
            id,
            status,
            created_at
          )
        `)

      // Apply filters
      if (event) {
        query = query.contains('events', [event])
      }
      if (status === 'active') {
        query = query.eq('is_active', true)
      } else if (status === 'inactive') {
        query = query.eq('is_active', false)
      }
      if (search) {
        query = query.or(`
          name.ilike.%${search}%,
          url.ilike.%${search}%,
          description.ilike.%${search}%
        `)
      }

      const { count } = await serviceClient
        .from('webhooks')
        .select('*', { count: 'exact', head: true })

      const { data: webhooks, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Calculate delivery statistics
      const webhooksWithStats = await Promise.all(
        (webhooks || []).map(async (webhook) => {
          const deliveryStats = webhook.delivery_stats || []
          const last24h = deliveryStats.filter(d => 
            new Date(d.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          )

          const successCount = deliveryStats.filter(d => d.status === 'success').length
          const failureCount = deliveryStats.filter(d => d.status === 'failed').length
          const totalDeliveries = deliveryStats.length

          return {
            ...webhook,
            statistics: {
              total_deliveries: totalDeliveries,
              successful_deliveries: successCount,
              failed_deliveries: failureCount,
              success_rate: totalDeliveries > 0 ? Math.round((successCount / totalDeliveries) * 100) : 0,
              deliveries_24h: last24h.length,
              last_delivery: deliveryStats[0]?.created_at || null
            }
          }
        })
      )

      // Get available events
      const availableEvents = await getAvailableEvents()

      return NextResponse.json({
        webhooks: webhooksWithStats,
        available_events: availableEvents,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        summary: {
          total_webhooks: count || 0,
          active_webhooks: webhooksWithStats.filter(w => w.is_active).length,
          total_deliveries: webhooksWithStats.reduce((sum, w) => sum + w.statistics.total_deliveries, 0)
        }
      })

    } catch (error) {
      console.error('Error fetching webhooks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch webhooks' },
        { status: 500 }
      )
    }
  }, {
    resource: 'webhooks',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create webhook or trigger webhook event
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'create'

    try {
      const body = await request.json()

      if (action === 'create') {
        const validatedData = WebhookSchema.parse(body)

        // Generate webhook secret if not provided
        const secret = validatedData.secret || generateWebhookSecret()

        const webhookData = {
          ...validatedData,
          secret,
          created_by: context.userId
        }

        const { data: webhook, error } = await serviceClient
          .from('webhooks')
          .insert(webhookData)
          .select()
          .single()

        if (error) throw error

        // Log the activity
        await serviceClient
          .from('tenant_activity_logs')
          .insert({
            user_id: context.userId,
            action: 'webhook.created',
            entity_type: 'webhook',
            entity_id: webhook.id,
            metadata: {
              webhook_name: validatedData.name,
              events: validatedData.events,
              url: validatedData.url
            }
          })

        return NextResponse.json({
          message: 'Webhook created successfully',
          webhook: {
            ...webhook,
            secret: '***hidden***' // Don't expose secret in response
          }
        }, { status: 201 })
      }

      if (action === 'trigger') {
        const eventData = WebhookEventSchema.parse(body)
        
        const result = await triggerWebhookEvent(
          serviceClient,
          eventData.event,
          eventData.payload,
          eventData.tenant_id,
          eventData.metadata
        )

        return NextResponse.json({
          message: 'Webhook event triggered',
          deliveries: result.deliveries,
          total_webhooks: result.totalWebhooks,
          successful_deliveries: result.successfulDeliveries
        })
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }, { status: 400 })
      }

      console.error('Error in webhook operation:', error)
      return NextResponse.json(
        { error: 'Failed to process webhook operation' },
        { status: 500 }
      )
    }
  }, {
    resource: 'webhooks',
    action: 'manage',
    requireTenant: false
  })
}

// PUT - Update webhook
export async function PUT(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
    }

    try {
      const body = await request.json()
      const validatedData = WebhookSchema.partial().parse(body)

      const { data: webhook, error } = await serviceClient
        .from('webhooks')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          user_id: context.userId,
          action: 'webhook.updated',
          entity_type: 'webhook',
          entity_id: id,
          metadata: {
            webhook_name: webhook.name,
            changes: Object.keys(validatedData)
          }
        })

      return NextResponse.json({
        message: 'Webhook updated successfully',
        webhook: {
          ...webhook,
          secret: '***hidden***'
        }
      })

    } catch (error) {
      console.error('Error updating webhook:', error)
      return NextResponse.json(
        { error: 'Failed to update webhook' },
        { status: 500 }
      )
    }
  }, {
    resource: 'webhooks',
    action: 'manage',
    requireTenant: false
  })
}

// DELETE - Delete webhook
export async function DELETE(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 })
    }

    try {
      const { data: webhook } = await serviceClient
        .from('webhooks')
        .select('name')
        .eq('id', id)
        .single()

      const { error } = await serviceClient
        .from('webhooks')
        .delete()
        .eq('id', id)

      if (error) throw error

      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          user_id: context.userId,
          action: 'webhook.deleted',
          entity_type: 'webhook',
          entity_id: id,
          metadata: {
            webhook_name: webhook?.name || 'Unknown'
          }
        })

      return NextResponse.json({
        message: 'Webhook deleted successfully'
      })

    } catch (error) {
      console.error('Error deleting webhook:', error)
      return NextResponse.json(
        { error: 'Failed to delete webhook' },
        { status: 500 }
      )
    }
  }, {
    resource: 'webhooks',
    action: 'manage',
    requireTenant: false
  })
}

// Helper functions
async function triggerWebhookEvent(
  serviceClient: any,
  event: string,
  payload: any,
  tenantId?: string,
  metadata?: any
) {
  // Find all webhooks that listen for this event
  let query = serviceClient
    .from('webhooks')
    .select('*')
    .contains('events', [event])
    .eq('is_active', true)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data: webhooks, error } = await query

  if (error) throw error

  if (!webhooks || webhooks.length === 0) {
    return {
      deliveries: [],
      totalWebhooks: 0,
      successfulDeliveries: 0
    }
  }

  // Prepare webhook payload
  const webhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data: payload,
    metadata: metadata || {}
  }

  // Deliver to all matching webhooks
  const deliveries = await Promise.all(
    webhooks.map(webhook => deliverWebhook(serviceClient, webhook, webhookPayload))
  )

  const successfulDeliveries = deliveries.filter(d => d.success).length

  return {
    deliveries,
    totalWebhooks: webhooks.length,
    successfulDeliveries
  }
}

async function deliverWebhook(serviceClient: any, webhook: any, payload: any) {
  const deliveryId = generateDeliveryId()
  const startTime = Date.now()

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Dealvize-Webhooks/1.0',
      'X-Webhook-Delivery': deliveryId,
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp,
      ...(webhook.headers || {})
    }

    // Add signature if secret is provided
    if (webhook.secret) {
      headers['X-Webhook-Signature'] = await generateSignature(
        JSON.stringify(payload),
        webhook.secret
      )
    }

    // Make HTTP request
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(webhook.timeout * 1000)
    })

    const responseTime = Date.now() - startTime
    const responseText = await response.text()

    // Log delivery
    const delivery = {
      id: deliveryId,
      webhook_id: webhook.id,
      event: payload.event,
      payload: payload,
      url: webhook.url,
      status: response.ok ? 'success' : 'failed',
      status_code: response.status,
      response_body: responseText.substring(0, 1000), // Limit response body
      response_time: responseTime,
      attempt: 1,
      created_at: new Date().toISOString()
    }

    await serviceClient
      .from('webhook_deliveries')
      .insert(delivery)

    if (!response.ok) {
      // Schedule retry if configured
      if (webhook.retry_config?.max_retries > 0) {
        await scheduleRetry(serviceClient, webhook, payload, delivery, 1)
      }
    }

    return {
      success: response.ok,
      webhook_id: webhook.id,
      delivery_id: deliveryId,
      status_code: response.status,
      response_time: responseTime
    }

  } catch (error) {
    console.error(`Webhook delivery failed for ${webhook.url}:`, error)

    const responseTime = Date.now() - startTime
    const delivery = {
      id: deliveryId,
      webhook_id: webhook.id,
      event: payload.event,
      payload: payload,
      url: webhook.url,
      status: 'failed',
      status_code: 0,
      response_body: error.message,
      response_time: responseTime,
      attempt: 1,
      created_at: new Date().toISOString()
    }

    await serviceClient
      .from('webhook_deliveries')
      .insert(delivery)

    // Schedule retry if configured
    if (webhook.retry_config?.max_retries > 0) {
      await scheduleRetry(serviceClient, webhook, payload, delivery, 1)
    }

    return {
      success: false,
      webhook_id: webhook.id,
      delivery_id: deliveryId,
      error: error.message,
      response_time: responseTime
    }
  }
}

async function scheduleRetry(
  serviceClient: any,
  webhook: any,
  payload: any,
  originalDelivery: any,
  attempt: number
) {
  const retryConfig = webhook.retry_config
  const delay = retryConfig.retry_delay * Math.pow(retryConfig.backoff_multiplier, attempt - 1)
  const retryAt = new Date(Date.now() + delay * 1000)

  await serviceClient
    .from('webhook_retry_queue')
    .insert({
      webhook_id: webhook.id,
      original_delivery_id: originalDelivery.id,
      payload: payload,
      attempt: attempt + 1,
      retry_at: retryAt.toISOString(),
      created_at: new Date().toISOString()
    })
}

async function getAvailableEvents() {
  return [
    'user.created',
    'user.updated',
    'user.deleted',
    'client.created',
    'client.updated',
    'client.deleted',
    'deal.created',
    'deal.updated',
    'deal.status_changed',
    'deal.deleted',
    'message.sent',
    'sequence.enrolled',
    'sequence.completed',
    'payment.succeeded',
    'payment.failed',
    'subscription.created',
    'subscription.updated',
    'subscription.cancelled'
  ]
}

function generateWebhookSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateDeliveryId(): string {
  return 'whd_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(payload)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  return 'sha256=' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
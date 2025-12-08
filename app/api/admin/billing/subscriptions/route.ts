/**
 * Admin Subscription Management API
 * CRUD operations for managing tenant subscriptions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const UpdateSubscriptionSchema = z.object({
  planType: z.enum(['starter', 'professional', 'enterprise']).optional(),
  status: z.enum(['active', 'cancelled', 'past_due', 'incomplete']).optional(),
  notes: z.string().optional()
})

// GET - List all subscriptions with filtering
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const status = searchParams.get('status')
    const planType = searchParams.get('plan')
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    try {
      let query = supabase
        .from('tenant_subscriptions')
        .select(`
          id,
          tenant_id,
          plan_type,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          created_at,
          updated_at,
          stripe_subscription_id,
          stripe_customer_id,
          tenants!inner(
            id,
            name,
            domain,
            industry,
            settings
          )
        `)

      // Apply filters
      if (status) {
        query = query.eq('status', status)
      }

      if (planType) {
        query = query.eq('plan_type', planType)
      }

      if (search) {
        query = query.or(`
          tenants.name.ilike.%${search}%,
          tenants.domain.ilike.%${search}%,
          stripe_customer_id.ilike.%${search}%
        `)
      }

      // Get total count for pagination
      const { count } = await supabase
        .from('tenant_subscriptions')
        .select('*', { count: 'exact', head: true })

      // Get paginated results
      const { data: subscriptions, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Calculate summary statistics
      const allSubscriptions = await supabase
        .from('tenant_subscriptions')
        .select('plan_type, status')

      const summary = {
        total: allSubscriptions.data?.length || 0,
        active: allSubscriptions.data?.filter(s => s.status === 'active').length || 0,
        cancelled: allSubscriptions.data?.filter(s => s.status === 'cancelled').length || 0,
        pastDue: allSubscriptions.data?.filter(s => s.status === 'past_due').length || 0,
        plans: {
          starter: allSubscriptions.data?.filter(s => s.plan_type === 'starter').length || 0,
          professional: allSubscriptions.data?.filter(s => s.plan_type === 'professional').length || 0,
          enterprise: allSubscriptions.data?.filter(s => s.plan_type === 'enterprise').length || 0
        }
      }

      return NextResponse.json({
        subscriptions,
        summary,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })

    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }
  }, {
    resource: 'billing',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create new subscription (for manual setup)
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()

    try {
      const body = await request.json()
      const { tenantId, planType, customerId } = body

      if (!tenantId || !planType) {
        return NextResponse.json(
          { error: 'Tenant ID and plan type are required' },
          { status: 400 }
        )
      }

      // Check if tenant already has a subscription
      const { data: existingSubscription } = await serviceClient
        .from('tenant_subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .single()

      if (existingSubscription) {
        return NextResponse.json(
          { error: 'Tenant already has a subscription' },
          { status: 409 }
        )
      }

      // Create subscription record
      const currentPeriodStart = new Date()
      const currentPeriodEnd = new Date()
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)

      const { data: subscription, error: subscriptionError } = await serviceClient
        .from('tenant_subscriptions')
        .insert({
          tenant_id: tenantId,
          plan_type: planType,
          status: 'active',
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          stripe_customer_id: customerId,
          cancel_at_period_end: false
        })
        .select(`
          id,
          tenant_id,
          plan_type,
          status,
          current_period_start,
          current_period_end,
          tenants!inner(
            name,
            domain
          )
        `)
        .single()

      if (subscriptionError) throw subscriptionError

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          tenant_id: tenantId,
          user_id: context.userId,
          action: 'subscription.created',
          entity_type: 'subscription',
          entity_id: subscription.id,
          metadata: {
            plan_type: planType,
            status: 'active',
            created_by: 'admin'
          }
        })

      return NextResponse.json({
        message: 'Subscription created successfully',
        subscription
      })

    } catch (error) {
      console.error('Error creating subscription:', error)
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      )
    }
  }, {
    resource: 'billing',
    action: 'manage',
    requireTenant: false
  })
}
/**
 * Individual Subscription Management API
 * Admin operations for specific subscriptions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

interface Params {
  id: string
}

const UpdateSubscriptionSchema = z.object({
  planType: z.enum(['starter', 'professional', 'enterprise']).optional(),
  status: z.enum(['active', 'cancelled', 'past_due', 'incomplete', 'trialing']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  notes: z.string().optional()
})

// GET - Get specific subscription with details
export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const subscriptionId = params.id

    try {
      // Get subscription details
      const { data: subscription, error: subscriptionError } = await supabase
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
          trial_end,
          tenants!inner(
            id,
            name,
            domain,
            industry,
            settings,
            created_at
          )
        `)
        .eq('id', subscriptionId)
        .single()

      if (subscriptionError || !subscription) {
        return NextResponse.json(
          { error: 'Subscription not found' },
          { status: 404 }
        )
      }

      // Get subscription usage/activity data
      const [
        { data: tenantMembers },
        { data: activityLogs },
        { data: paymentHistory }
      ] = await Promise.all([
        // Get tenant member count
        supabase
          .from('tenant_members')
          .select('id, role, status, joined_at')
          .eq('tenant_id', subscription.tenant_id)
          .eq('status', 'active'),

        // Get recent activity logs for this tenant
        supabase
          .from('tenant_activity_logs')
          .select('id, action, entity_type, created_at, metadata')
          .eq('tenant_id', subscription.tenant_id)
          .order('created_at', { ascending: false })
          .limit(20),

        // Get payment history (would be from Stripe in real implementation)
        supabase
          .from('tenant_activity_logs')
          .select('id, action, created_at, metadata')
          .eq('tenant_id', subscription.tenant_id)
          .like('action', '%payment%')
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      // Calculate subscription metrics
      const subscriptionAge = Math.floor(
        (new Date().getTime() - new Date(subscription.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      const daysUntilRenewal = Math.floor(
        (new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )

      // Plan pricing (would come from Stripe in real implementation)
      const planPricing = {
        starter: 29,
        professional: 79,
        enterprise: 149
      }

      const monthlyValue = planPricing[subscription.plan_type as keyof typeof planPricing] || 0
      const lifetimeValue = monthlyValue * Math.max(1, Math.ceil(subscriptionAge / 30))

      return NextResponse.json({
        subscription: {
          ...subscription,
          subscriptionAge,
          daysUntilRenewal,
          monthlyValue,
          lifetimeValue
        },
        usage: {
          memberCount: tenantMembers?.length || 0,
          members: tenantMembers || [],
          recentActivity: activityLogs || [],
          paymentHistory: paymentHistory || []
        },
        limits: {
          maxMembers: subscription.plan_type === 'starter' ? 5 : 
                     subscription.plan_type === 'professional' ? 25 : 100,
          currentMembers: tenantMembers?.length || 0,
          usagePercentage: subscription.plan_type === 'starter' ? 
            Math.round(((tenantMembers?.length || 0) / 5) * 100) :
            subscription.plan_type === 'professional' ?
            Math.round(((tenantMembers?.length || 0) / 25) * 100) :
            Math.round(((tenantMembers?.length || 0) / 100) * 100)
        }
      })

    } catch (error) {
      console.error('Error fetching subscription details:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscription details' },
        { status: 500 }
      )
    }
  }, {
    resource: 'billing',
    action: 'view',
    requireTenant: false
  })
}

// PUT - Update subscription
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const subscriptionId = params.id

    try {
      const body = await request.json()
      const validatedData = UpdateSubscriptionSchema.parse(body)

      // Verify subscription exists
      const { data: existingSubscription, error: fetchError } = await serviceClient
        .from('tenant_subscriptions')
        .select('id, tenant_id, plan_type, status')
        .eq('id', subscriptionId)
        .single()

      if (fetchError || !existingSubscription) {
        return NextResponse.json(
          { error: 'Subscription not found' },
          { status: 404 }
        )
      }

      // Update subscription
      const updateData = {
        ...validatedData,
        updated_at: new Date().toISOString()
      }

      // If changing plan type, extend the period
      if (validatedData.planType && validatedData.planType !== existingSubscription.plan_type) {
        const newPeriodEnd = new Date()
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
        updateData.current_period_end = newPeriodEnd.toISOString()
      }

      const { data: updatedSubscription, error: updateError } = await serviceClient
        .from('tenant_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)
        .select(`
          id,
          tenant_id,
          plan_type,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          tenants!inner(
            name,
            domain
          )
        `)
        .single()

      if (updateError) throw updateError

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          tenant_id: existingSubscription.tenant_id,
          user_id: context.userId,
          action: 'subscription.updated',
          entity_type: 'subscription',
          entity_id: subscriptionId,
          metadata: {
            changes: validatedData,
            previous: {
              plan_type: existingSubscription.plan_type,
              status: existingSubscription.status
            },
            updated_by: 'admin'
          }
        })

      return NextResponse.json({
        message: 'Subscription updated successfully',
        subscription: updatedSubscription
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation error',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        )
      }

      console.error('Error updating subscription:', error)
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      )
    }
  }, {
    resource: 'billing',
    action: 'manage',
    requireTenant: false
  })
}

// DELETE - Cancel subscription
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const subscriptionId = params.id

    try {
      // Verify subscription exists
      const { data: existingSubscription, error: fetchError } = await serviceClient
        .from('tenant_subscriptions')
        .select('id, tenant_id, plan_type, status, stripe_subscription_id')
        .eq('id', subscriptionId)
        .single()

      if (fetchError || !existingSubscription) {
        return NextResponse.json(
          { error: 'Subscription not found' },
          { status: 404 }
        )
      }

      if (existingSubscription.status === 'cancelled') {
        return NextResponse.json(
          { error: 'Subscription is already cancelled' },
          { status: 400 }
        )
      }

      // Cancel subscription (set to cancel at period end)
      const { error: updateError } = await serviceClient
        .from('tenant_subscriptions')
        .update({
          cancel_at_period_end: true,
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)

      if (updateError) throw updateError

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          tenant_id: existingSubscription.tenant_id,
          user_id: context.userId,
          action: 'subscription.cancelled',
          entity_type: 'subscription',
          entity_id: subscriptionId,
          metadata: {
            previous_plan: existingSubscription.plan_type,
            cancelled_by: 'admin',
            reason: 'admin_cancellation'
          }
        })

      return NextResponse.json({
        message: 'Subscription cancelled successfully'
      })

    } catch (error) {
      console.error('Error cancelling subscription:', error)
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      )
    }
  }, {
    resource: 'billing',
    action: 'manage',
    requireTenant: false
  })
}
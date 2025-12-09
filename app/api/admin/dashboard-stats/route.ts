/**
 * Admin Dashboard Statistics API
 * Provides overview metrics for tenant administration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'

export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()

    try {
      // Get total users in tenant
      const { count: totalUsers, error: usersError } = await supabase
        .from('tenant_members')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', context.tenantId)

      if (usersError) {
        throw usersError
      }

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: activeUsers, error: activeError } = await supabase
        .from('tenant_members')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', context.tenantId)
        .eq('status', 'active')
        .gte('last_active_at', thirtyDaysAgo.toISOString())

      if (activeError) {
        console.warn('Error getting active users:', activeError)
      }

      // Get pending invitations
      const { count: pendingInvitations, error: invitationsError } = await supabase
        .from('tenant_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', context.tenantId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())

      if (invitationsError) {
        console.warn('Error getting invitations:', invitationsError)
      }

      // Get tenant info for plan limits
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('plan_type, settings')
        .eq('id', context.tenantId)
        .single()

      if (tenantError) {
        console.warn('Error getting tenant info:', tenantError)
      }

      // Get plan limits based on tenant plan
      const planLimits = {
        starter: { maxUsers: 5 },
        professional: { maxUsers: 25 },
        enterprise: { maxUsers: 100 }
      }

      const currentPlan = tenant?.plan_type || 'starter'
      const maxUsers = planLimits[currentPlan as keyof typeof planLimits]?.maxUsers || 5

      const billingStatus = 'active' // This would come from Stripe
      const monthlyRevenue = currentPlan === 'starter' ? 29 : 
                            currentPlan === 'professional' ? 99 : 299

      const stats = {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        pendingInvitations: pendingInvitations || 0,
        currentPlanUsers: totalUsers || 0,
        maxUsers,
        billingStatus,
        monthlyRevenue,
        planType: currentPlan,
        usagePercentage: Math.round(((totalUsers || 0) / maxUsers) * 100)
      }

      return NextResponse.json({ stats })

    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      return NextResponse.json(
        { error: 'Failed to load dashboard statistics' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'view',
    requireTenant: true
  })
}
/**
 * Admin Billing Overview API
 * Provides billing analytics and subscription management for admins
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'

// GET - Get billing overview and analytics
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const timeRange = searchParams.get('range') || '30d'
    const now = new Date()
    let startDate = new Date()

    // Calculate date range
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '12m':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    try {
      // Get subscription analytics from tenant_subscriptions table
      const [
        { data: subscriptionStats },
        { data: revenueStats },
        { data: planDistribution },
        { data: recentTransactions },
        { data: churnAnalysis }
      ] = await Promise.all([
        // Overall subscription stats
        supabase
          .from('tenant_subscriptions')
          .select(`
            id,
            status,
            plan_type,
            created_at,
            current_period_end,
            cancel_at_period_end
          `)
          .gte('created_at', startDate.toISOString()),

        supabase
          .from('tenant_subscriptions')
          .select(`
            id,
            plan_type,
            status,
            created_at
          `)
          .eq('status', 'active')
          .gte('created_at', startDate.toISOString()),

        // Plan distribution
        supabase
          .from('tenant_subscriptions')
          .select('plan_type')
          .eq('status', 'active'),

        // Recent subscription changes
        supabase
          .from('tenant_subscriptions')
          .select(`
            id,
            status,
            plan_type,
            created_at,
            updated_at,
            tenants!inner(
              id,
              name
            )
          `)
          .order('updated_at', { ascending: false })
          .limit(20),

        // Churn analysis
        supabase
          .from('tenant_subscriptions')
          .select('id, created_at, status')
          .in('status', ['cancelled', 'incomplete_expired'])
          .gte('created_at', startDate.toISOString())
      ])

      // Calculate metrics
      const totalActiveSubscriptions = subscriptionStats?.filter(s => s.status === 'active').length || 0
      const totalNewSubscriptions = subscriptionStats?.length || 0
      const cancelledSubscriptions = churnAnalysis?.length || 0
      const churnRate = totalNewSubscriptions > 0 ? (cancelledSubscriptions / totalNewSubscriptions) * 100 : 0

      const planPricing = {
        starter: 29,
        professional: 79,
        enterprise: 149
      }

      const monthlyRecurringRevenue = planDistribution?.reduce((total, sub) => {
        const price = planPricing[sub.plan_type as keyof typeof planPricing] || 0
        return total + price
      }, 0) || 0

      // Plan distribution counts
      const planCounts = {
        starter: 0,
        professional: 0,
        enterprise: 0
      }

      planDistribution?.forEach(sub => {
        if (sub.plan_type in planCounts) {
          planCounts[sub.plan_type as keyof typeof planCounts]++
        }
      })

      // Generate daily revenue/signup data for charts
      const dailyMetrics = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const daySignups = subscriptionStats?.filter(s => 
          s.created_at.startsWith(dateStr)
        ).length || 0
        
        const dayChurns = churnAnalysis?.filter(s => 
          s.created_at.startsWith(dateStr)
        ).length || 0

        dailyMetrics.push({
          date: dateStr,
          signups: daySignups,
          churns: dayChurns,
          net: daySignups - dayChurns
        })
      }

      // Subscription health analysis
      const subscriptionHealth = {
        healthy: subscriptionStats?.filter(s => 
          s.status === 'active' && !s.cancel_at_period_end
        ).length || 0,
        atRisk: subscriptionStats?.filter(s => 
          s.cancel_at_period_end
        ).length || 0,
        expired: subscriptionStats?.filter(s => 
          new Date(s.current_period_end) < now
        ).length || 0
      }

      return NextResponse.json({
        overview: {
          totalActiveSubscriptions,
          totalNewSubscriptions,
          monthlyRecurringRevenue,
          churnRate: Math.round(churnRate * 100) / 100,
          averageRevenuePerUser: totalActiveSubscriptions > 0 ? 
            Math.round((monthlyRecurringRevenue / totalActiveSubscriptions) * 100) / 100 : 0
        },
        planDistribution: planCounts,
        subscriptionHealth,
        dailyMetrics,
        recentTransactions: recentTransactions?.map(transaction => ({
          id: transaction.id,
          tenantName: transaction.tenants?.name || 'Unknown',
          planType: transaction.plan_type,
          status: transaction.status,
          amount: planPricing[transaction.plan_type as keyof typeof planPricing] || 0,
          date: transaction.updated_at || transaction.created_at,
          type: transaction.status === 'active' ? 'subscription' : 'cancellation'
        })) || []
      })

    } catch (error) {
      console.error('Error fetching billing overview:', error)
      return NextResponse.json(
        { error: 'Failed to fetch billing overview' },
        { status: 500 }
      )
    }
  }, {
    resource: 'billing',
    action: 'view',
    requireTenant: false
  })
}
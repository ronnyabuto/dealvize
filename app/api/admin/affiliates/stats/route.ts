/**
 * Affiliate Platform Statistics API
 * Provides overview stats for affiliate program management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'

// GET - Get affiliate platform overview statistics
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()

    try {
      // Use the database function for comprehensive stats
      const { data: stats, error: statsError } = await supabase
        .rpc('get_affiliate_platform_stats')

      if (statsError) throw statsError

      // Get additional time-based metrics
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [
        { data: recentReferrals, error: referralsError },
        { data: recentClicks, error: clicksError },
        { data: pendingPayouts, error: payoutsError }
      ] = await Promise.all([
        supabase
          .from('affiliate_referrals')
          .select('id, commission_amount, created_at, status')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false }),

        supabase
          .from('affiliate_clicks')
          .select('id, created_at, converted')
          .gte('created_at', thirtyDaysAgo.toISOString()),

        // Pending payouts
        supabase
          .from('affiliate_payouts')
          .select('id, amount, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      ])

      // Calculate additional metrics
      const clicksLast30Days = recentClicks?.length || 0
      const conversionsLast30Days = recentReferrals?.filter(r => r.status === 'confirmed').length || 0
      const conversionRate = clicksLast30Days > 0 ? (conversionsLast30Days / clicksLast30Days) * 100 : 0
      const pendingPayoutAmount = pendingPayouts?.reduce((sum, p) => sum + p.amount, 0) || 0

      // Generate daily activity chart data for last 30 days
      const dailyActivity = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayClicks = recentClicks?.filter(c => 
          c.created_at.startsWith(dateStr)
        ).length || 0
        
        const dayConversions = recentReferrals?.filter(r => 
          r.created_at.startsWith(dateStr) && r.status === 'confirmed'
        ).length || 0

        dailyActivity.push({
          date: dateStr,
          clicks: dayClicks,
          conversions: dayConversions
        })
      }

      // Tier distribution
      const { data: tierDistribution, error: tierError } = await supabase
        .from('affiliate_programs')
        .select('tier')
        .eq('status', 'active')

      const tierCounts = {
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0
      }

      tierDistribution?.forEach(affiliate => {
        tierCounts[affiliate.tier as keyof typeof tierCounts]++
      })

      return NextResponse.json({
        overview: {
          totalAffiliates: stats.total_affiliates || 0,
          totalReferrals: stats.total_referrals || 0,
          totalConversions: stats.total_conversions || 0,
          totalCommissions: stats.total_commissions || 0,
          pendingCommissions: stats.pending_commissions || 0,
          paidCommissions: stats.paid_commissions || 0,
          conversionRate: Math.round(conversionRate * 100) / 100,
          pendingPayoutAmount
        },
        activity: {
          clicksLast30Days,
          conversionsLast30Days,
          dailyActivity
        },
        tierDistribution: tierCounts,
        topAffiliates: stats.top_affiliates || [],
        recentActivity: stats.recent_activity || [],
        pendingPayouts: pendingPayouts || []
      })

    } catch (error) {
      console.error('Error fetching affiliate stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch affiliate statistics' },
        { status: 500 }
      )
    }
  }, {
    resource: 'affiliates',
    action: 'view',
    requireTenant: false
  })
}
/**
 * Tenant Performance Analytics API
 * Comprehensive tenant insights and performance metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'

// GET - Tenant performance analytics and insights
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const timeRange = searchParams.get('range') || '30d'
    const tenantId = searchParams.get('tenant_id')
    const metric = searchParams.get('metric') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')

    const now = new Date()
    let startDate = new Date()

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
      if (tenantId) {
        // Get detailed analytics for specific tenant
        return await getTenantDetails(serviceClient, tenantId, startDate, timeRange)
      }

      // Get analytics for all tenants
      const analytics = await getAllTenantsAnalytics(serviceClient, startDate, timeRange, limit)
      
      return NextResponse.json({
        ...analytics,
        time_range: timeRange,
        generated_at: now.toISOString()
      })

    } catch (error) {
      console.error('Error fetching tenant analytics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tenant analytics' },
        { status: 500 }
      )
    }
  }, {
    resource: 'tenant_analytics',
    action: 'view',
    requireTenant: false
  })
}

async function getAllTenantsAnalytics(serviceClient: any, startDate: Date, timeRange: string, limit: number) {
  // Get all tenants with their basic info
  const { data: tenants, error: tenantsError } = await serviceClient
    .from('tenants')
    .select(`
      id,
      name,
      domain,
      status,
      industry,
      created_at,
      settings,
      tenant_subscriptions(
        id,
        plan_type,
        status,
        created_at,
        current_period_end
      )
    `)
    .order('created_at', { ascending: false })

  if (tenantsError) throw tenantsError

  // Get metrics for each tenant
  const tenantsWithAnalytics = await Promise.all(
    (tenants || []).map(async (tenant) => {
      const [
        { count: userCount },
        { count: activeUserCount },
        { count: dealCount },
        { count: clientCount },
        { count: messageCount },
        { data: activities }
      ] = await Promise.all([
        serviceClient.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        serviceClient.from('profiles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('last_sign_in_at', startDate.toISOString()),
        serviceClient.from('deals').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('created_at', startDate.toISOString()),
        serviceClient.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('created_at', startDate.toISOString()),
        serviceClient.from('messages').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('sent_at', startDate.toISOString()),
        serviceClient.from('tenant_activity_logs').select('action, created_at').eq('tenant_id', tenant.id).gte('created_at', startDate.toISOString()).limit(100)
      ])

      // Calculate engagement metrics
      const subscription = tenant.tenant_subscriptions?.[0]
      const subscriptionAge = subscription ? 
        Math.floor((new Date().getTime() - new Date(subscription.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0
      
      const activityScore = calculateActivityScore(activities || [], userCount || 0, subscriptionAge)
      const healthScore = calculateTenantHealthScore({
        userCount: userCount || 0,
        activeUserCount: activeUserCount || 0,
        dealCount: dealCount || 0,
        clientCount: clientCount || 0,
        messageCount: messageCount || 0,
        activities: activities || [],
        subscriptionStatus: subscription?.status,
        subscriptionAge
      })

      return {
        ...tenant,
        analytics: {
          users: {
            total: userCount || 0,
            active: activeUserCount || 0,
            activity_rate: userCount > 0 ? Math.round((activeUserCount / userCount) * 100) : 0
          },
          business: {
            deals: dealCount || 0,
            clients: clientCount || 0,
            messages: messageCount || 0,
            deals_per_user: userCount > 0 ? Math.round((dealCount || 0) / userCount * 10) / 10 : 0
          },
          engagement: {
            activity_count: activities?.length || 0,
            activity_score: activityScore,
            health_score: healthScore,
            last_activity: activities?.[0]?.created_at || null
          },
          subscription: {
            plan: subscription?.plan_type || 'none',
            status: subscription?.status || 'none',
            age_days: subscriptionAge,
            revenue: calculateMonthlyRevenue(subscription?.plan_type)
          }
        }
      }
    })
  )

  // Sort by health score and activity
  const rankedTenants = tenantsWithAnalytics
    .sort((a, b) => b.analytics.engagement.health_score - a.analytics.engagement.health_score)
    .slice(0, limit)

  // Calculate summary statistics
  const summary = {
    total_tenants: tenants?.length || 0,
    active_tenants: tenantsWithAnalytics.filter(t => t.status === 'active').length,
    total_users: tenantsWithAnalytics.reduce((sum, t) => sum + t.analytics.users.total, 0),
    total_deals: tenantsWithAnalytics.reduce((sum, t) => sum + t.analytics.business.deals, 0),
    total_revenue: tenantsWithAnalytics.reduce((sum, t) => sum + t.analytics.subscription.revenue, 0),
    avg_health_score: Math.round(tenantsWithAnalytics.reduce((sum, t) => sum + t.analytics.engagement.health_score, 0) / (tenantsWithAnalytics.length || 1)),
    plan_distribution: calculatePlanDistribution(tenantsWithAnalytics)
  }

  // Get trending metrics
  const trending = await getTrendingMetrics(serviceClient, startDate, timeRange)

  return {
    tenants: rankedTenants,
    summary,
    trending,
    insights: generateTenantInsights(tenantsWithAnalytics)
  }
}

async function getTenantDetails(serviceClient: any, tenantId: string, startDate: Date, timeRange: string) {
  // Get detailed tenant information
  const { data: tenant, error } = await serviceClient
    .from('tenants')
    .select(`
      *,
      tenant_subscriptions(
        id,
        plan_type,
        status,
        created_at,
        current_period_end,
        stripe_subscription_id
      )
    `)
    .eq('id', tenantId)
    .single()

  if (error) throw error

  // Get comprehensive metrics
  const [
    { data: users },
    { data: deals },
    { data: clients },
    { data: messages },
    { data: activities },
    { data: sequences },
    { data: templates }
  ] = await Promise.all([
    serviceClient.from('profiles').select('*').eq('tenant_id', tenantId),
    serviceClient.from('deals').select('*').eq('tenant_id', tenantId).gte('created_at', startDate.toISOString()),
    serviceClient.from('clients').select('*').eq('tenant_id', tenantId).gte('created_at', startDate.toISOString()),
    serviceClient.from('messages').select('*').eq('tenant_id', tenantId).gte('sent_at', startDate.toISOString()),
    serviceClient.from('tenant_activity_logs').select('*').eq('tenant_id', tenantId).gte('created_at', startDate.toISOString()).limit(500),
    serviceClient.from('nurturing_sequences').select('*').eq('tenant_id', tenantId),
    serviceClient.from('email_templates').select('*').eq('tenant_id', tenantId)
  ])

  // Generate daily activity metrics
  const dailyMetrics = generateDailyMetrics(activities || [], startDate, timeRange)

  // Calculate feature usage
  const featureUsage = calculateFeatureUsage(activities || [])

  // Generate user activity breakdown
  const userAnalytics = generateUserAnalytics(users || [], activities || [], startDate)

  return NextResponse.json({
    tenant,
    metrics: {
      users: {
        total: users?.length || 0,
        active: users?.filter(u => new Date(u.last_sign_in_at) >= startDate).length || 0,
        breakdown: userAnalytics
      },
      business: {
        deals: deals?.length || 0,
        clients: clients?.length || 0,
        messages: messages?.length || 0,
        sequences: sequences?.length || 0,
        templates: templates?.length || 0
      },
      activity: {
        total_actions: activities?.length || 0,
        daily_metrics: dailyMetrics,
        feature_usage: featureUsage,
        peak_activity: findPeakActivity(dailyMetrics)
      }
    },
    insights: generateSingleTenantInsights(tenant, activities || [], users || [])
  })
}

// Helper functions
function calculateActivityScore(activities: any[], userCount: number, subscriptionAge: number): number {
  if (userCount === 0) return 0

  const actionsPerUser = activities.length / userCount
  const ageMultiplier = Math.min(1, subscriptionAge / 30) // Normalize by 30 days
  const baseScore = Math.min(100, actionsPerUser * 10)

  return Math.round(baseScore * (0.7 + ageMultiplier * 0.3))
}

function calculateTenantHealthScore(metrics: any): number {
  const {
    userCount,
    activeUserCount,
    dealCount,
    clientCount,
    messageCount,
    activities,
    subscriptionStatus,
    subscriptionAge
  } = metrics

  let score = 0

  // User engagement (40% of score)
  const userEngagement = userCount > 0 ? (activeUserCount / userCount) * 100 : 0
  score += userEngagement * 0.4

  // Business activity (30% of score)
  const businessActivity = Math.min(100, (dealCount + clientCount + messageCount) / Math.max(1, userCount) * 10)
  score += businessActivity * 0.3

  // System usage (20% of score)
  const systemUsage = Math.min(100, activities.length / Math.max(1, userCount) * 5)
  score += systemUsage * 0.2

  // Subscription health (10% of score)
  const subscriptionScore = subscriptionStatus === 'active' ? 100 : 
                           subscriptionStatus === 'trialing' ? 80 :
                           subscriptionStatus === 'past_due' ? 40 : 20
  score += subscriptionScore * 0.1

  return Math.round(Math.max(0, Math.min(100, score)))
}

function calculateMonthlyRevenue(planType?: string): number {
  const pricing = {
    starter: 29,
    professional: 79,
    enterprise: 149
  }
  return pricing[planType as keyof typeof pricing] || 0
}

function calculatePlanDistribution(tenants: any[]) {
  return tenants.reduce((acc, tenant) => {
    const plan = tenant.analytics.subscription.plan
    acc[plan] = (acc[plan] || 0) + 1
    return acc
  }, {})
}

async function getTrendingMetrics(serviceClient: any, startDate: Date, timeRange: string) {
  // Calculate growth trends
  const previousPeriod = new Date(startDate)
  const periodLength = new Date().getTime() - startDate.getTime()
  previousPeriod.setTime(startDate.getTime() - periodLength)

  const [
    { count: currentUsers },
    { count: previousUsers },
    { count: currentDeals },
    { count: previousDeals },
    { count: currentTenants },
    { count: previousTenants }
  ] = await Promise.all([
    serviceClient.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
    serviceClient.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', previousPeriod.toISOString()).lt('created_at', startDate.toISOString()),
    serviceClient.from('deals').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
    serviceClient.from('deals').select('*', { count: 'exact', head: true }).gte('created_at', previousPeriod.toISOString()).lt('created_at', startDate.toISOString()),
    serviceClient.from('tenants').select('*', { count: 'exact', head: true }).gte('created_at', startDate.toISOString()),
    serviceClient.from('tenants').select('*', { count: 'exact', head: true }).gte('created_at', previousPeriod.toISOString()).lt('created_at', startDate.toISOString())
  ])

  return {
    user_growth: calculateGrowthRate(currentUsers || 0, previousUsers || 0),
    deal_growth: calculateGrowthRate(currentDeals || 0, previousDeals || 0),
    tenant_growth: calculateGrowthRate(currentTenants || 0, previousTenants || 0)
  }
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function generateDailyMetrics(activities: any[], startDate: Date, timeRange: string) {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
  const dailyMetrics = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const dayActivities = activities.filter(a => a.created_at.startsWith(dateStr))
    
    dailyMetrics.push({
      date: dateStr,
      activity_count: dayActivities.length,
      unique_actions: [...new Set(dayActivities.map(a => a.action))].length
    })
  }

  return dailyMetrics
}

function calculateFeatureUsage(activities: any[]) {
  const featureMap = {
    'client.': 'Client Management',
    'deal.': 'Deal Management', 
    'message.': 'Communication',
    'email.': 'Email',
    'sequence.': 'Automation',
    'template.': 'Templates',
    'report.': 'Reporting'
  }

  const usage = activities.reduce((acc, activity) => {
    for (const [prefix, feature] of Object.entries(featureMap)) {
      if (activity.action.startsWith(prefix)) {
        acc[feature] = (acc[feature] || 0) + 1
        break
      }
    }
    return acc
  }, {})

  return Object.entries(usage)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([feature, count]) => ({ feature, usage_count: count }))
}

function generateUserAnalytics(users: any[], activities: any[], startDate: Date) {
  return users.map(user => {
    const userActivities = activities.filter(a => a.user_id === user.id)
    const lastActivity = userActivities[0]?.created_at || null
    const isActive = user.last_sign_in_at && new Date(user.last_sign_in_at) >= startDate

    return {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      activity_count: userActivities.length,
      last_activity: lastActivity,
      is_active: isActive,
      engagement_score: Math.min(100, userActivities.length * 2)
    }
  }).sort((a, b) => b.activity_count - a.activity_count)
}

function findPeakActivity(dailyMetrics: any[]) {
  return dailyMetrics.reduce((peak, current) => 
    current.activity_count > peak.activity_count ? current : peak,
    { date: '', activity_count: 0 }
  )
}

function generateTenantInsights(tenants: any[]) {
  const insights = []

  // High performing tenants
  const highPerformers = tenants.filter(t => t.analytics.engagement.health_score >= 80)
  if (highPerformers.length > 0) {
    insights.push({
      type: 'success',
      title: 'High Performing Tenants',
      message: `${highPerformers.length} tenants have health scores above 80%`,
      tenants: highPerformers.slice(0, 3).map(t => t.name)
    })
  }

  // At-risk tenants
  const atRisk = tenants.filter(t => t.analytics.engagement.health_score < 40)
  if (atRisk.length > 0) {
    insights.push({
      type: 'warning',
      title: 'At-Risk Tenants',
      message: `${atRisk.length} tenants have low engagement and may need attention`,
      tenants: atRisk.slice(0, 3).map(t => t.name)
    })
  }

  // Growth opportunities
  const trialTenants = tenants.filter(t => t.analytics.subscription.status === 'trialing')
  if (trialTenants.length > 0) {
    insights.push({
      type: 'info',
      title: 'Trial Conversions',
      message: `${trialTenants.length} tenants are currently on trial`,
      tenants: trialTenants.slice(0, 3).map(t => t.name)
    })
  }

  return insights
}

function generateSingleTenantInsights(tenant: any, activities: any[], users: any[]) {
  const insights = []
  const subscription = tenant.tenant_subscriptions?.[0]

  // Engagement insight
  const recentActivities = activities.filter(a => 
    new Date(a.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )
  
  if (recentActivities.length > 50) {
    insights.push({
      type: 'success',
      title: 'High Engagement',
      message: `This tenant has been very active with ${recentActivities.length} actions in the past week`
    })
  } else if (recentActivities.length < 10) {
    insights.push({
      type: 'warning',
      title: 'Low Recent Activity',
      message: 'This tenant may need engagement to increase platform usage'
    })
  }

  // User growth
  const activeUsers = users.filter(u => 
    new Date(u.last_sign_in_at || 0) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length
  
  if (activeUsers / users.length < 0.5) {
    insights.push({
      type: 'info',
      title: 'User Activation Opportunity',
      message: `Only ${activeUsers} of ${users.length} users are active. Consider user training or engagement campaigns.`
    })
  }

  // Subscription status
  if (subscription?.status === 'trialing') {
    const trialEnd = new Date(subscription.current_period_end)
    const daysLeft = Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    insights.push({
      type: 'info',
      title: 'Trial Ending Soon',
      message: `Trial ends in ${daysLeft} days. Consider reaching out for conversion.`
    })
  }

  return insights
}
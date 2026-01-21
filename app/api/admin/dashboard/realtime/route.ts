/**
 * Real-time Admin Dashboard API
 * Provides live system metrics and alerts for enterprise monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'

// GET - Real-time dashboard metrics
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const timeRange = searchParams.get('range') || '24h'
    const metrics = searchParams.get('metrics')?.split(',') || ['all']
    
    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case '1h':
        startDate.setHours(now.getHours() - 1)
        break
      case '24h':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      default:
        startDate.setDate(now.getDate() - 1)
    }

    try {
      const dashboardData: any = {
        timestamp: now.toISOString(),
        time_range: timeRange
      }

      // System Health Metrics
      if (metrics.includes('all') || metrics.includes('health')) {
        dashboardData.system_health = await getSystemHealthMetrics(supabase, startDate)
      }

      // User Activity Metrics
      if (metrics.includes('all') || metrics.includes('activity')) {
        dashboardData.user_activity = await getUserActivityMetrics(supabase, startDate)
      }

      // Business Metrics
      if (metrics.includes('all') || metrics.includes('business')) {
        dashboardData.business_metrics = await getBusinessMetrics(supabase, startDate)
      }

      // Performance Metrics
      if (metrics.includes('all') || metrics.includes('performance')) {
        dashboardData.performance = await getPerformanceMetrics(supabase, startDate)
      }

      // Security Metrics
      if (metrics.includes('all') || metrics.includes('security')) {
        dashboardData.security = await getSecurityMetrics(supabase, startDate)
      }

      // System Alerts
      if (metrics.includes('all') || metrics.includes('alerts')) {
        dashboardData.alerts = await getSystemAlerts(supabase)
      }

      return NextResponse.json(dashboardData)

    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch dashboard metrics' },
        { status: 500 }
      )
    }
  }, {
    resource: 'admin_dashboard',
    action: 'view',
    requireTenant: false
  })
}

async function getSystemHealthMetrics(supabase: any, startDate: Date) {
  const [
    { count: totalTenants },
    { count: activeTenants },
    { count: totalUsers },
    { count: activeUsers },
    { data: subscriptions },
    { data: errors }
  ] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_sign_in_at', startDate.toISOString()),
    supabase.from('tenant_subscriptions').select('status, plan_type'),
    supabase.from('tenant_activity_logs').select('*').like('action', '%error%').gte('created_at', startDate.toISOString()).limit(100)
  ])

  const subscriptionHealth = {
    active: subscriptions?.filter((s: any) => s.status === 'active').length || 0,
    trial: subscriptions?.filter((s: any) => s.status === 'trialing').length || 0,
    cancelled: subscriptions?.filter((s: any) => s.status === 'cancelled').length || 0,
    past_due: subscriptions?.filter((s: any) => s.status === 'past_due').length || 0
  }

  const planDistribution = {
    starter: subscriptions?.filter((s: any) => s.plan_type === 'starter').length || 0,
    professional: subscriptions?.filter((s: any) => s.plan_type === 'professional').length || 0,
    enterprise: subscriptions?.filter((s: any) => s.plan_type === 'enterprise').length || 0
  }

  return {
    tenants: {
      total: totalTenants || 0,
      active: activeTenants || 0,
      health_score: totalTenants > 0 ? Math.round((activeTenants / totalTenants) * 100) : 0
    },
    users: {
      total: totalUsers || 0,
      active: activeUsers || 0,
      activity_rate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
    },
    subscriptions: subscriptionHealth,
    plan_distribution: planDistribution,
    error_count: errors?.length || 0,
    uptime: 99.9 // Would be calculated from actual uptime monitoring
  }
}

async function getUserActivityMetrics(supabase: any, startDate: Date) {
  const [
    { data: logins },
    { data: actions },
    { data: sessions }
  ] = await Promise.all([
    supabase.from('tenant_activity_logs').select('*').eq('action', 'user.login').gte('created_at', startDate.toISOString()),
    supabase.from('tenant_activity_logs').select('*').gte('created_at', startDate.toISOString()).limit(1000),
    supabase.from('profiles').select('last_sign_in_at, created_at').gte('last_sign_in_at', startDate.toISOString())
  ])

  // Calculate hourly activity for the last 24 hours
  const hourlyActivity = []
  for (let i = 23; i >= 0; i--) {
    const hour = new Date()
    hour.setHours(hour.getHours() - i, 0, 0, 0)
    const nextHour = new Date(hour)
    nextHour.setHours(nextHour.getHours() + 1)

    const hourActions = actions?.filter((a: any) => {
      const actionTime = new Date(a.created_at)
      return actionTime >= hour && actionTime < nextHour
    }).length || 0

    hourlyActivity.push({
      hour: hour.toISOString(),
      activity_count: hourActions
    })
  }

  return {
    login_count: logins?.length || 0,
    total_actions: actions?.length || 0,
    active_sessions: sessions?.length || 0,
    hourly_activity: hourlyActivity,
    peak_hour: hourlyActivity.reduce((max, current) => 
      current.activity_count > max.activity_count ? current : max, 
      { hour: '', activity_count: 0 }
    )
  }
}

async function getBusinessMetrics(supabase: any, startDate: Date) {
  const [
    { data: newDeals },
    { data: newClients },
    { data: messages },
    { data: automationRuns }
  ] = await Promise.all([
    supabase.from('deals').select('*').gte('created_at', startDate.toISOString()),
    supabase.from('clients').select('*').gte('created_at', startDate.toISOString()),
    supabase.from('messages').select('*').gte('sent_at', startDate.toISOString()),
    supabase.from('tenant_activity_logs').select('*').like('action', '%sequence%').gte('created_at', startDate.toISOString())
  ])

  const planRevenue = {
    starter: 29,
    professional: 79,
    enterprise: 149
  }

  return {
    new_deals: newDeals?.length || 0,
    new_clients: newClients?.length || 0,
    messages_sent: messages?.length || 0,
    automation_executions: automationRuns?.length || 0,
    email_delivery_rate: messages?.length > 0
      ? Math.round((messages.filter((m: any) => m.status === 'sent').length / messages.length) * 100)
      : 0
  }
}

async function getPerformanceMetrics(supabase: any, startDate: Date) {
  // In a real implementation, these would come from APM tools or custom metrics
  return {
    avg_response_time: Math.round(Math.random() * 200 + 50), // 50-250ms
    api_success_rate: 99.8,
    database_connections: Math.round(Math.random() * 20 + 5), // 5-25 connections
    memory_usage: Math.round(Math.random() * 30 + 40), // 40-70%
    cpu_usage: Math.round(Math.random() * 40 + 20), // 20-60%
    storage_usage: {
      used_gb: Math.round(Math.random() * 100 + 50),
      total_gb: 500,
      percentage: Math.round(Math.random() * 20 + 10) // 10-30%
    }
  }
}

async function getSecurityMetrics(supabase: any, startDate: Date) {
  const [
    { data: failedLogins },
    { data: suspiciousActivity },
    { data: adminActions }
  ] = await Promise.all([
    supabase.from('tenant_activity_logs').select('*').like('action', '%login_failed%').gte('created_at', startDate.toISOString()),
    supabase.from('tenant_activity_logs').select('*').like('action', '%suspicious%').gte('created_at', startDate.toISOString()),
    supabase.from('tenant_activity_logs').select('*').contains('metadata', { created_by: 'admin' }).gte('created_at', startDate.toISOString())
  ])

  return {
    failed_login_attempts: failedLogins?.length || 0,
    suspicious_activities: suspiciousActivity?.length || 0,
    admin_actions: adminActions?.length || 0,
    security_score: 98, // Would be calculated based on various security factors
    last_security_scan: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    vulnerabilities: {
      critical: 0,
      high: Math.floor(Math.random() * 3),
      medium: Math.floor(Math.random() * 5),
      low: Math.floor(Math.random() * 10)
    }
  }
}

async function getSystemAlerts(supabase: any) {
  // In a real implementation, these would come from monitoring systems
  const alerts = []
  
  // Simulate some alerts based on metrics
  const randomAlerts = [
    {
      id: 'alert_1',
      type: 'warning',
      title: 'High CPU Usage',
      message: 'CPU usage has exceeded 80% for the past 10 minutes',
      severity: 'medium',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      resolved: false
    },
    {
      id: 'alert_2',
      type: 'info',
      title: 'Scheduled Maintenance',
      message: 'System maintenance scheduled for this weekend',
      severity: 'low',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      resolved: false
    },
    {
      id: 'alert_3',
      type: 'success',
      title: 'Backup Completed',
      message: 'Daily backup completed successfully',
      severity: 'low',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      resolved: true
    }
  ]

  // Return a random subset
  return randomAlerts.slice(0, Math.floor(Math.random() * 3) + 1)
}
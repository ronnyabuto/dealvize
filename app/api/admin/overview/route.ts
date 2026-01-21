import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, subscription_plan')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get plan details
    const planLimits = {
      'Tier 1': { max_users: 3, features: ['Basic CRM', 'Deal tracking', 'Client management'] },
      'Tier 2': { max_users: 7, features: ['Advanced analytics', 'Team collaboration', 'Email automation'] },
      'Tier 3': { max_users: 10, features: ['Full analytics suite', 'Custom reports', 'API access', 'Priority support'] }
    }

    const currentPlan = userProfile.subscription_plan || 'Tier 1'
    const plan = {
      name: currentPlan,
      ...planLimits[currentPlan as keyof typeof planLimits]
    }

    // Get team members
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select(`
        id,
        email,
        role,
        status,
        last_active,
        invited_date,
        user_profiles (
          deals_count,
          clients_count,
          tasks_completed
        )
      `)
      .eq('organization_id', user.id)

    if (membersError) {
      console.error('Team members error:', membersError)
    }

    // Format team members data
    const formattedMembers = (teamMembers || []).map(member => ({
      id: member.id,
      email: member.email,
      role: member.role,
      status: member.status,
      last_active: member.last_active || new Date().toISOString(),
      invited_date: member.invited_date,
      activity_summary: {
        deals_created: (member.user_profiles as any)?.deals_count || 0,
        clients_added: (member.user_profiles as any)?.clients_count || 0,
        tasks_completed: (member.user_profiles as any)?.tasks_completed || 0,
        last_login: member.last_active || new Date().toISOString()
      }
    }))

    // Add current user as admin
    const adminMember = {
      id: user.id,
      email: user.email || 'admin@dealvize.com',
      role: 'admin' as const,
      status: 'active' as const,
      last_active: new Date().toISOString(),
      invited_date: new Date().toISOString(),
      activity_summary: {
        deals_created: 0,
        clients_added: 0,
        tasks_completed: 0,
        last_login: new Date().toISOString()
      }
    }

    const allMembers = [adminMember, ...formattedMembers]
    ;(plan as any).current_users = allMembers.length

    // Get recent activity
    const { data: activities, error: activitiesError } = await supabase
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50)

    const recentActivity = (activities || []).map(activity => ({
      id: activity.id,
      user_email: activity.user_email,
      action: activity.action,
      resource_type: activity.resource_type,
      resource_id: activity.resource_id,
      timestamp: activity.timestamp,
      details: activity.details || `${activity.action} ${activity.resource_type}`
    }))

    // Get system statistics
    const [dealsResult, clientsResult, tasksResult, revenueResult] = await Promise.all([
      supabase.from('deals').select('id, value, status').eq('user_id', user.id),
      supabase.from('clients').select('id').eq('user_id', user.id),
      supabase.from('tasks').select('id').eq('user_id', user.id),
      supabase.from('deals').select('value').eq('user_id', user.id).eq('status', 'Closed')
    ])

    const totalRevenue = (revenueResult.data || []).reduce((sum, deal) => {
      const value = typeof deal.value === 'string' 
        ? parseFloat(deal.value.replace(/[$,]/g, '')) || 0
        : deal.value || 0
      return sum + value
    }, 0)

    const systemStats = {
      total_deals: dealsResult.data?.length || 0,
      total_clients: clientsResult.data?.length || 0,
      total_tasks: tasksResult.data?.length || 0,
      total_revenue: Math.round(totalRevenue),
      active_users_today: allMembers.filter(m => {
        const lastActive = new Date(m.last_active)
        const today = new Date()
        const diffInHours = (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60)
        return diffInHours < 24
      }).length
    }

    return NextResponse.json({
      plan,
      team_members: allMembers,
      recent_activity: recentActivity,
      system_stats: systemStats
    })
  } catch (error) {
    console.error('Admin overview error:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
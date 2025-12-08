import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLeadScoringStats } from '@/lib/lead-scoring/lead-service'

export async function GET(request: NextRequest) {
  try {
    // Environment validation
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ 
        error: 'Configuration error',
        message: 'Service temporarily unavailable' 
      }, { status: 503 })
    }

    const supabase = await createClient()
    
    // Get current user with enhanced error handling
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth error in dashboard metrics:', userError)
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to access dashboard metrics',
        details: process.env.NODE_ENV === 'development' ? userError?.message : undefined
      }, { status: 401 })
    }

    // Fetch real data from database (optimized with centralized lead scoring)
    const [clientsResult, dealsResult, tasksResult, leadStatsResult] = await Promise.allSettled([
      supabase.from('clients').select('id, created_at', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('deals').select('id, value, status, created_at', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('tasks').select('id, status', { count: 'exact' }).eq('user_id', user.id),
      getLeadScoringStats(user.id)
    ])

    // Calculate metrics from real data
    const totalClients = clientsResult.status === 'fulfilled' ? (clientsResult.value.count || 0) : 0
    const allClients = clientsResult.status === 'fulfilled' ? (clientsResult.value.data || []) : []
    const allDeals = dealsResult.status === 'fulfilled' ? (dealsResult.value.data || []) : []
    const totalTasks = tasksResult.status === 'fulfilled' ? (tasksResult.value.count || 0) : 0
    const leadStats = leadStatsResult.status === 'fulfilled' ? leadStatsResult.value : {
      total_leads: 0, qualified: 0, hot: 0, warm: 0, cold: 0, average_score: 0
    }
    
    // Calculate deal status counts (industry standard: Qualified, In Progress, Under Contract, Closed, Lost)
    const activeDeals = allDeals.filter(deal => ['Qualified', 'In Progress', 'Under Contract'].includes(deal.status)).length
    const wonDeals = allDeals.filter(deal => deal.status === 'Closed').length
    
    // Calculate pipeline value (active deals: Qualified + In Progress + Under Contract)
    const pipelineValue = allDeals
      .filter(deal => ['Qualified', 'In Progress', 'Under Contract'].includes(deal.status))
      .reduce((sum, deal) => sum + (deal.value || 0), 0)
    
    // Calculate monthly revenue (closed/won deals)
    const monthlyRevenue = allDeals
      .filter(deal => deal.status === 'Closed')
      .reduce((sum, deal) => sum + (deal.value || 0), 0)
    
    // Calculate conversion rate (deals won / total clients)
    const conversionRate = totalClients > 0 ? Math.round((wonDeals / totalClients) * 100) : 0
    
    // Get lead conversion rate from centralized service
    const leadConversionRate = leadStats.total_leads > 0 ? 
      Math.round((leadStats.qualified / leadStats.total_leads) * 100) : 0
    
    // Calculate month-over-month growth for clients (simplified - in production would compare actual dates)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
    const recentClients = allClients.filter(client => 
      client.created_at && new Date(client.created_at) >= thirtyDaysAgo
    ).length
    const clientsChange = totalClients > recentClients ? 
      Math.round(((recentClients / (totalClients - recentClients)) * 100)) : 0
      
    // Calculate recent deals growth
    const recentDeals = allDeals.filter(deal => 
      deal.created_at && new Date(deal.created_at) >= thirtyDaysAgo
    ).length
    const dealsChange = activeDeals > recentDeals ? 
      Math.round(((recentDeals / Math.max(1, activeDeals - recentDeals)) * 100)) : 0

    return NextResponse.json({
      metrics: {
        totalClients,
        activeDeals,
        monthlyRevenue,
        pipelineValue,
        totalTasks,
        wonDeals,
        conversionRate,
        totalLeads: leadStats.total_leads, // Count of clients being lead scored (industry standard)
        totalDeals: activeDeals, // Count of active deals (converted leads)
        qualifiedLeads: leadStats.qualified,
        leadConversionRate,
        hotLeads: leadStats.hot,
        warmLeads: leadStats.warm,
        coldLeads: leadStats.cold,
        averageLeadScore: leadStats.average_score,
        clientsChange: Math.min(100, Math.max(-100, clientsChange)), // Cap at ±100%
        dealsChange: Math.min(100, Math.max(-100, dealsChange)), // Cap at ±100%
        revenueChange: 0, // Would need historical revenue data
        conversionChange: 0 // Would need historical conversion data
      },
      debug: process.env.NODE_ENV === 'development' ? {
        totalClients,
        totalLeads: leadStats.total_leads,
        recentClients,
        recentDeals,
        calculatedClientsChange: clientsChange,
        calculatedDealsChange: dealsChange,
        leadBreakdown: leadStats
      } : undefined
    })

  } catch (error) {
    console.error('Dashboard metrics error:', error)
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
    
    // Return fallback data with actual zero values on error
    return NextResponse.json({
      metrics: {
        totalClients: 0,
        activeDeals: 0,
        monthlyRevenue: 0,
        pipelineValue: 0,
        totalTasks: 0,
        wonDeals: 0,
        conversionRate: 0,
        totalLeads: 0, // Clients being lead scored
        totalDeals: 0, // Active deals (converted leads)
        qualifiedLeads: 0,
        leadConversionRate: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        averageLeadScore: 0,
        clientsChange: 0,
        dealsChange: 0,
        revenueChange: 0,
        conversionChange: 0
      },
      error: 'Failed to fetch metrics',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 200 }) // Return 200 to avoid breaking the UI
  }
}
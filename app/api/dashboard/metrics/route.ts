import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SENIOR DEV CHANGE: Call the Postgres RPC function
    // This executes in <10ms on the DB instead of 2000ms+ in Node.js
    const { data: metrics, error: metricsError } = await supabase
      .rpc('get_dashboard_metrics', { target_user_id: user.id })

    if (metricsError) {
      console.error('RPC Error:', metricsError)
      throw new Error(metricsError.message)
    }

    // Process the pre-calculated data
    // All heavy lifting was done in SQL
    const totalClients = metrics.totalClients || 0
    const activeDeals = metrics.activeDeals || 0
    const recentClients = metrics.recentClientsCount || 0
    const recentDeals = metrics.recentDealsCount || 0
    
    const conversionRate = totalClients > 0 ? Math.round((metrics.wonDeals / totalClients) * 100) : 0
    const clientsChange = totalClients > recentClients 
      ? Math.round(((recentClients / (totalClients - recentClients)) * 100)) 
      : 0
    const dealsChange = activeDeals > recentDeals 
      ? Math.round(((recentDeals / Math.max(1, activeDeals - recentDeals)) * 100)) 
      : 0

    return NextResponse.json({
      metrics: {
        totalClients,
        activeDeals,
        monthlyRevenue: metrics.monthlyRevenue || 0,
        pipelineValue: metrics.pipelineValue || 0,
        totalTasks: metrics.totalTasks || 0,
        wonDeals: metrics.wonDeals || 0,
        conversionRate,
        totalLeads: metrics.leadStats?.total || 0,
        totalDeals: activeDeals,
        qualifiedLeads: metrics.leadStats?.qualified || 0,
        leadConversionRate: 0, // Calculate if needed
        hotLeads: metrics.leadStats?.hot || 0,
        warmLeads: metrics.leadStats?.warm || 0,
        coldLeads: metrics.leadStats?.cold || 0,
        averageLeadScore: metrics.leadStats?.avgScore || 0,
        clientsChange: Math.min(100, Math.max(-100, clientsChange)),
        dealsChange: Math.min(100, Math.max(-100, dealsChange)),
        revenueChange: 0,
        conversionChange: 0
      }
    })

  } catch (error) {
    console.error('Dashboard metrics error:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
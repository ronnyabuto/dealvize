import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric') || 'overview'
    const period = searchParams.get('period') || 'month'

    // Calculate date range based on period
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        startDate.setMonth(startDate.getMonth() - 1)
    }

    if (metric === 'revenue') {
      // Revenue analytics
      const { data: deals, error } = await supabase
        .from('deals')
        .select('value, created_at, status')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) {
        console.error('Error fetching revenue data:', error)
        return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 })
      }

      // Group by date and calculate totals
      const revenueByDate: { [key: string]: number } = {}
      let totalRevenue = 0
      let dealsWon = 0
      
      deals?.forEach(deal => {
        const date = deal.created_at.split('T')[0]
        // Handle both string and number formats for deal value
        let value = 0
        if (typeof deal.value === 'string') {
          value = parseFloat(deal.value.replace(/[$,]/g, '')) || 0
        } else {
          value = deal.value || 0
        }
        
        if (!revenueByDate[date]) {
          revenueByDate[date] = 0
        }
        
        if (deal.status === 'Closed') {
          revenueByDate[date] += value
          totalRevenue += value
          dealsWon++
        }
      })

      const data = Object.entries(revenueByDate).map(([date, revenue]) => ({
        date,
        revenue
      })).sort((a, b) => a.date.localeCompare(b.date))

      return NextResponse.json({
        data,
        total_revenue: totalRevenue,
        deals_closed: dealsWon,
        average_deal_size: dealsWon > 0 ? Math.round(totalRevenue / dealsWon) : 0
      })

    } else if (metric === 'deals') {
      // Deals analytics
      const { data: deals, error } = await supabase
        .from('deals')
        .select('status, created_at, value')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) {
        console.error('Error fetching deals data:', error)
        return NextResponse.json({ error: 'Failed to fetch deals data' }, { status: 500 })
      }

      const statusCounts: { [key: string]: number } = {}
      const dealsByDate: { [key: string]: number } = {}
      
      deals?.forEach(deal => {
        const status = deal.status || 'Unknown'
        const date = deal.created_at.split('T')[0]
        
        statusCounts[status] = (statusCounts[status] || 0) + 1
        dealsByDate[date] = (dealsByDate[date] || 0) + 1
      })

      const data = Object.entries(dealsByDate).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => a.date.localeCompare(b.date))

      const stages = Object.entries(statusCounts).map(([status, count]) => ({
        stage: status,
        count
      }))

      return NextResponse.json({
        data,
        stages,
        total_deals: deals?.length || 0
      })

    } else if (metric === 'pipeline') {
      // Pipeline analytics
      const { data: deals, error } = await supabase
        .from('deals')
        .select('status, value')
        .eq('user_id', user.id)
        .neq('status', 'Lost') // Exclude lost deals from pipeline

      if (error) {
        console.error('Error fetching pipeline data:', error)
        return NextResponse.json({ error: 'Failed to fetch pipeline data' }, { status: 500 })
      }

      const stages = [
        { stage: 'Lead', count: 0, total_value: 0 },
        { stage: 'In Progress', count: 0, total_value: 0 },
        { stage: 'Under Contract', count: 0, total_value: 0 },
        { stage: 'Closed', count: 0, total_value: 0 }
      ]

      deals?.forEach(deal => {
        const stage = stages.find(s => s.stage === deal.status)
        if (stage) {
          stage.count++
          // Handle both string and number formats for deal value
          let value = 0
          if (typeof deal.value === 'string') {
            value = parseFloat(deal.value.replace(/[$,]/g, '')) || 0
          } else {
            value = deal.value || 0
          }
          stage.total_value += value
        }
      })

      return NextResponse.json({ stages })

    } else {
      // Overview/summary analytics
      const [clientsResult, dealsResult, tasksResult] = await Promise.all([
        supabase.from('clients').select('id').eq('user_id', user.id),
        supabase.from('deals').select('status, value').eq('user_id', user.id),
        supabase.from('tasks').select('status').eq('user_id', user.id)
      ])

      const totalClients = clientsResult.data?.length || 0
      const totalDeals = dealsResult.data?.length || 0
      const totalTasks = tasksResult.data?.length || 0
      
      const dealsWon = dealsResult.data?.filter(d => d.status === 'Closed').length || 0
      const totalRevenue = dealsResult.data
        ?.filter(d => d.status === 'Closed')
        .reduce((sum, d) => {
          // Handle both string and number formats for deal value
          let value = 0
          if (typeof d.value === 'string') {
            value = parseFloat(d.value.replace(/[$,]/g, '')) || 0
          } else {
            value = d.value || 0
          }
          return sum + value
        }, 0) || 0

      const completedTasks = tasksResult.data?.filter(t => t.status === 'Completed').length || 0
      
      return NextResponse.json({
        total_clients: totalClients,
        total_deals: totalDeals,
        total_tasks: totalTasks,
        deals_won: dealsWon,
        total_revenue: totalRevenue,
        completed_tasks: completedTasks,
        win_rate: totalDeals > 0 ? Math.round((dealsWon / totalDeals) * 100) : 0,
        task_completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      })
    }

  } catch (error) {
    console.error('Error in GET /api/analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
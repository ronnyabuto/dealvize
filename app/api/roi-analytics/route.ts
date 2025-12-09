import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const date_range = parseInt(searchParams.get('date_range') || '30')
    const channel_id = searchParams.get('channel_id')
    const compare_periods = searchParams.get('compare_periods') === 'true'

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - date_range)
    
    const currentPeriodStart = startDate.toISOString()
    const currentPeriodEnd = endDate.toISOString()

    // Get comparison period if requested
    let previousPeriodStart, previousPeriodEnd
    if (compare_periods) {
      previousPeriodEnd = new Date(startDate)
      previousPeriodStart = new Date(startDate)
      previousPeriodStart.setDate(previousPeriodStart.getDate() - date_range)
    }

    // Get all marketing channels or specific channel
    let channelQuery = supabase
      .from('marketing_channels')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (channel_id) {
      channelQuery = channelQuery.eq('id', channel_id)
    }

    const { data: channels, error: channelsError } = await channelQuery

    if (channelsError) {
      return NextResponse.json({ error: channelsError.message }, { status: 400 })
    }

    if (!channels || channels.length === 0) {
      return NextResponse.json({ 
        channels: [],
        summary: {
          total_leads: 0,
          total_revenue: 0,
          total_cost: 0,
          overall_roi: 0,
          best_performing_channel: null
        }
      })
    }

    // Calculate ROI for each channel
    const channelAnalytics = await Promise.all(
      channels.map(async (channel) => {
        const currentMetrics = await calculatePeriodROI(
          supabase, 
          user.id, 
          channel.id, 
          currentPeriodStart, 
          currentPeriodEnd,
          channel
        )

        let previousMetrics = null
        if (compare_periods && previousPeriodStart && previousPeriodEnd) {
          previousMetrics = await calculatePeriodROI(
            supabase,
            user.id,
            channel.id,
            previousPeriodStart.toISOString(),
            previousPeriodEnd.toISOString(),
            channel
          )
        }

        return {
          ...channel,
          current_period: currentMetrics,
          previous_period: previousMetrics,
          period_comparison: previousMetrics ? {
            leads_change: currentMetrics.leads_generated - previousMetrics.leads_generated,
            revenue_change: currentMetrics.total_revenue - previousMetrics.total_revenue,
            roi_change: currentMetrics.roi_percentage - previousMetrics.roi_percentage,
            cost_change: currentMetrics.total_cost - previousMetrics.total_cost
          } : null
        }
      })
    )

    // Calculate summary metrics
    const summary = {
      total_leads: channelAnalytics.reduce((sum, c) => sum + c.current_period.leads_generated, 0),
      total_revenue: channelAnalytics.reduce((sum, c) => sum + c.current_period.total_revenue, 0),
      total_cost: channelAnalytics.reduce((sum, c) => sum + c.current_period.total_cost, 0),
      total_deals: channelAnalytics.reduce((sum, c) => sum + c.current_period.deals_closed, 0),
      overall_roi: 0,
      best_performing_channel: null as any,
      avg_conversion_rate: 0,
      total_profit: 0
    }

    // Calculate overall ROI
    if (summary.total_cost > 0) {
      summary.overall_roi = ((summary.total_revenue - summary.total_cost) / summary.total_cost) * 100
    }

    // Calculate total profit
    summary.total_profit = summary.total_revenue - summary.total_cost

    // Calculate average conversion rate
    const activeChannels = channelAnalytics.filter(c => c.current_period.leads_generated > 0)
    if (activeChannels.length > 0) {
      summary.avg_conversion_rate = activeChannels.reduce((sum, c) => 
        sum + c.current_period.conversion_rate, 0
      ) / activeChannels.length
    }

    summary.best_performing_channel = channelAnalytics.reduce((best, current) => {
      if (!best || current.current_period.roi_percentage > best.current_period.roi_percentage) {
        return current
      }
      return best
    }, null as any)

    // Generate insights
    const insights = generateROIInsights(channelAnalytics, summary)

    return NextResponse.json({
      channels: channelAnalytics,
      summary,
      insights,
      period: {
        start_date: currentPeriodStart,
        end_date: currentPeriodEnd,
        days: date_range
      }
    })
  } catch (error) {
    console.error('Error fetching ROI analytics:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

async function calculatePeriodROI(
  supabase: any, 
  userId: string, 
  channelId: string, 
  startDate: string, 
  endDate: string,
  channel: any
) {
  // Get leads from this channel in the period
  const { data: leads } = await supabase
    .from('clients')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('lead_source_id', channelId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const leadCount = leads?.length || 0
  const leadIds = leads?.map(l => l.id) || []

  // Get closed deals from these leads
  let closedDeals = 0
  let totalRevenue = 0

  if (leadIds.length > 0) {
    const { data: deals } = await supabase
      .from('deals')
      .select('value, commission_percentage, close_date')
      .eq('user_id', userId)
      .in('client_id', leadIds)
      .eq('status', 'closed')
      .gte('close_date', startDate)
      .lte('close_date', endDate)

    if (deals) {
      closedDeals = deals.length
      totalRevenue = deals.reduce((sum, deal) => {
        const commission = (deal.value || 0) * ((deal.commission_percentage || 0) / 100)
        return sum + commission
      }, 0)
    }
  }

  // Calculate costs
  const costPerLead = channel?.cost_per_lead || 0
  const monthlyBudget = channel?.monthly_budget || 0
  
  // Calculate period length in days
  const periodDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
  const dailyBudget = monthlyBudget / 30
  const budgetBasedCost = dailyBudget * periodDays
  
  // Use the higher of cost-per-lead or budget-based cost
  const totalCost = Math.max(leadCount * costPerLead, budgetBasedCost)

  // Calculate metrics
  const conversionRate = leadCount > 0 ? (closedDeals / leadCount) * 100 : 0
  const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0
  const costPerConversion = closedDeals > 0 ? totalCost / closedDeals : totalCost
  const revenuePerLead = leadCount > 0 ? totalRevenue / leadCount : 0
  const costPerLead_actual = leadCount > 0 ? totalCost / leadCount : costPerLead

  return {
    leads_generated: leadCount,
    deals_closed: closedDeals,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_cost: Math.round(totalCost * 100) / 100,
    conversion_rate: Math.round(conversionRate * 100) / 100,
    roi_percentage: Math.round(roi * 100) / 100,
    cost_per_conversion: Math.round(costPerConversion * 100) / 100,
    revenue_per_lead: Math.round(revenuePerLead * 100) / 100,
    cost_per_lead: Math.round(costPerLead_actual * 100) / 100,
    profit: Math.round((totalRevenue - totalCost) * 100) / 100
  }
}

function generateROIInsights(channelAnalytics: any[], summary: any) {
  const insights = []

  // Best performing channel insight
  if (summary.best_performing_channel) {
    insights.push({
      type: 'success',
      title: 'Best Performing Channel',
      message: `${summary.best_performing_channel.name} is your top performer with ${summary.best_performing_channel.current_period.roi_percentage}% ROI`,
      action: 'Consider increasing budget allocation to this channel'
    })
  }

  // Low ROI channels
  const lowROIChannels = channelAnalytics.filter(c => 
    c.current_period.leads_generated > 0 && c.current_period.roi_percentage < 0
  )
  
  if (lowROIChannels.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Underperforming Channels',
      message: `${lowROIChannels.length} channel(s) have negative ROI`,
      action: 'Review and optimize these channels or consider pausing them'
    })
  }

  // High cost per lead
  const expensiveChannels = channelAnalytics.filter(c => 
    c.current_period.leads_generated > 0 && 
    c.current_period.cost_per_lead > (summary.total_cost / summary.total_leads) * 1.5
  )

  if (expensiveChannels.length > 0) {
    insights.push({
      type: 'info',
      title: 'High Cost Per Lead',
      message: `${expensiveChannels.length} channel(s) have above-average cost per lead`,
      action: 'Optimize targeting or creative to reduce acquisition costs'
    })
  }

  // Overall performance insight
  if (summary.overall_roi > 100) {
    insights.push({
      type: 'success',
      title: 'Strong Overall Performance',
      message: `Your marketing is generating ${summary.overall_roi.toFixed(1)}% ROI`,
      action: 'Consider scaling successful campaigns'
    })
  } else if (summary.overall_roi > 0) {
    insights.push({
      type: 'info',
      title: 'Positive ROI',
      message: `Overall ROI of ${summary.overall_roi.toFixed(1)}% is positive but could be improved`,
      action: 'Focus on optimizing conversion rates and reducing costs'
    })
  } else {
    insights.push({
      type: 'error',
      title: 'Negative ROI',
      message: 'Your marketing spend is not generating positive returns',
      action: 'Urgent review of all marketing activities needed'
    })
  }

  return insights
}
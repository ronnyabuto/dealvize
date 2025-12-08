import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const include_stats = searchParams.get('include_stats') === 'true'
    const date_range = searchParams.get('date_range') || '30' // days

    let query = supabase
      .from('marketing_channels')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    const { data: channels, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (include_stats && channels) {
      // Calculate ROI statistics for each channel
      const channelsWithStats = await Promise.all(
        channels.map(async (channel) => {
          const stats = await calculateChannelROI(supabase, user.id, channel.id, parseInt(date_range))
          return { ...channel, stats }
        })
      )
      
      return NextResponse.json({ channels: channelsWithStats })
    }

    return NextResponse.json({ channels: channels || [] })
  } catch (error) {
    console.error('Error fetching marketing channels:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      description,
      channel_type = 'digital', // digital, traditional, referral, direct
      cost_per_lead = 0,
      monthly_budget = 0,
      tracking_url,
      utm_source,
      utm_medium,
      utm_campaign
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: 'Channel name is required' 
      }, { status: 400 })
    }

    // Check for duplicate names
    const { data: existing } = await supabase
      .from('marketing_channels')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'A channel with this name already exists' 
      }, { status: 400 })
    }

    const { data: channel, error } = await supabase
      .from('marketing_channels')
      .insert({
        user_id: user.id,
        name,
        description,
        channel_type,
        cost_per_lead,
        monthly_budget,
        tracking_url,
        utm_source,
        utm_medium,
        utm_campaign
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error) {
    console.error('Error creating marketing channel:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('id')
    const body = await request.json()

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    const {
      name,
      description,
      channel_type,
      cost_per_lead,
      monthly_budget,
      tracking_url,
      utm_source,
      utm_medium,
      utm_campaign,
      is_active
    } = body

    const updateData: any = { updated_at: new Date().toISOString() }

    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (channel_type) updateData.channel_type = channel_type
    if (cost_per_lead !== undefined) updateData.cost_per_lead = cost_per_lead
    if (monthly_budget !== undefined) updateData.monthly_budget = monthly_budget
    if (tracking_url !== undefined) updateData.tracking_url = tracking_url
    if (utm_source !== undefined) updateData.utm_source = utm_source
    if (utm_medium !== undefined) updateData.utm_medium = utm_medium
    if (utm_campaign !== undefined) updateData.utm_campaign = utm_campaign
    if (typeof is_active === 'boolean') updateData.is_active = is_active

    const { data: channel, error } = await supabase
      .from('marketing_channels')
      .update(updateData)
      .eq('id', channelId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ channel })
  } catch (error) {
    console.error('Error updating marketing channel:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('id')

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('marketing_channels')
      .delete()
      .eq('id', channelId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting marketing channel:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

async function calculateChannelROI(supabase: any, userId: string, channelId: string, days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateISO = startDate.toISOString()

  // Get leads from this channel
  const { data: leads, error: leadsError } = await supabase
    .from('clients')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('lead_source_id', channelId)
    .gte('created_at', startDateISO)

  if (leadsError) {
    console.error('Error fetching leads:', leadsError)
    return null
  }

  const leadCount = leads?.length || 0
  const leadIds = leads?.map(l => l.id) || []

  // Get closed deals from these leads
  let closedDeals = 0
  let totalRevenue = 0

  if (leadIds.length > 0) {
    const { data: deals } = await supabase
      .from('deals')
      .select('value, commission_percentage')
      .eq('user_id', userId)
      .in('client_id', leadIds)
      .eq('status', 'closed')
      .gte('close_date', startDateISO)

    if (deals) {
      closedDeals = deals.length
      totalRevenue = deals.reduce((sum, deal) => {
        const commission = (deal.value || 0) * ((deal.commission_percentage || 0) / 100)
        return sum + commission
      }, 0)
    }
  }

  // Get channel costs
  const { data: channel } = await supabase
    .from('marketing_channels')
    .select('cost_per_lead, monthly_budget')
    .eq('id', channelId)
    .single()

  const costPerLead = channel?.cost_per_lead || 0
  const monthlyBudget = channel?.monthly_budget || 0
  const dailyBudget = monthlyBudget / 30
  const totalCost = Math.max(leadCount * costPerLead, dailyBudget * days)

  // Calculate metrics
  const conversionRate = leadCount > 0 ? (closedDeals / leadCount) * 100 : 0
  const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0
  const costPerConversion = closedDeals > 0 ? totalCost / closedDeals : totalCost
  const revenuePerLead = leadCount > 0 ? totalRevenue / leadCount : 0

  return {
    period_days: days,
    leads_generated: leadCount,
    deals_closed: closedDeals,
    total_revenue: totalRevenue,
    total_cost: totalCost,
    conversion_rate: Math.round(conversionRate * 100) / 100,
    roi_percentage: Math.round(roi * 100) / 100,
    cost_per_conversion: Math.round(costPerConversion * 100) / 100,
    revenue_per_lead: Math.round(revenuePerLead * 100) / 100,
    profit: totalRevenue - totalCost
  }
}
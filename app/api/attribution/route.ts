import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const client_id = searchParams.get('client_id')
    const timeframe = parseInt(searchParams.get('timeframe') || '90') // days
    const model = searchParams.get('model') || 'multi_touch' // first_touch, last_touch, multi_touch

    if (client_id) {
      const attribution = await getClientAttribution(supabase, user.id, client_id, model)
      return NextResponse.json({ client_id, attribution, model })
    } else {
      const analytics = await getAttributionAnalytics(supabase, user.id, timeframe, model)
      return NextResponse.json({ analytics, timeframe, model })
    }
  } catch (error) {
    console.error('Error fetching attribution data:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      client_id,
      touchpoint_type, // 'email', 'sms', 'call', 'website', 'social', 'ad', 'referral', 'direct'
      channel, // specific channel within type
      source, // campaign, ad group, etc.
      medium, // email, social, cpc, etc.
      campaign,
      content,
      term,
      value = 0,
      conversion_event, // 'page_view', 'form_submit', 'call', 'meeting_booked', 'deal_created', 'deal_closed'
      event_data = {},
      url,
      referrer,
      user_agent,
      ip_address,
      session_id
    } = body

    // Validate required fields
    if (!client_id || !touchpoint_type || !conversion_event) {
      return NextResponse.json({
        error: 'client_id, touchpoint_type, and conversion_event are required'
      }, { status: 400 })
    }

    // Record the touchpoint
    const { data: touchpoint, error: touchpointError } = await supabase
      .from('attribution_touchpoints')
      .insert({
        user_id: user.id,
        client_id,
        touchpoint_type,
        channel,
        source,
        medium,
        campaign,
        content,
        term,
        value,
        conversion_event,
        event_data,
        url,
        referrer,
        user_agent,
        ip_address,
        session_id,
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (touchpointError) {
      return NextResponse.json({ error: touchpointError.message }, { status: 400 })
    }

    // Update attribution analysis for this client
    await updateClientAttribution(supabase, user.id, client_id)

    return NextResponse.json({ touchpoint }, { status: 201 })
  } catch (error) {
    console.error('Error recording touchpoint:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

async function getClientAttribution(supabase: any, userId: string, clientId: string, model: string) {
  // Get all touchpoints for this client
  const { data: touchpoints } = await supabase
    .from('attribution_touchpoints')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .order('timestamp', { ascending: true })

  if (!touchpoints || touchpoints.length === 0) {
    return {
      journey: [],
      attribution: {},
      total_touchpoints: 0,
      first_touch: null,
      last_touch: null
    }
  }

  const journey = touchpoints.map(tp => ({
    timestamp: tp.timestamp,
    touchpoint_type: tp.touchpoint_type,
    channel: tp.channel,
    source: tp.source,
    campaign: tp.campaign,
    conversion_event: tp.conversion_event,
    value: tp.value
  }))

  const attribution = calculateAttribution(touchpoints, model)
  const firstTouch = touchpoints[0]
  const lastTouch = touchpoints[touchpoints.length - 1]

  return {
    journey,
    attribution,
    total_touchpoints: touchpoints.length,
    first_touch: {
      touchpoint_type: firstTouch.touchpoint_type,
      channel: firstTouch.channel,
      source: firstTouch.source,
      timestamp: firstTouch.timestamp
    },
    last_touch: {
      touchpoint_type: lastTouch.touchpoint_type,
      channel: lastTouch.channel,
      source: lastTouch.source,
      timestamp: lastTouch.timestamp
    }
  }
}

async function getAttributionAnalytics(supabase: any, userId: string, timeframeDays: number, model: string) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - timeframeDays)

  // Get all touchpoints in timeframe
  const { data: touchpoints } = await supabase
    .from('attribution_touchpoints')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: true })

  if (!touchpoints || touchpoints.length === 0) {
    return {
      channel_performance: [],
      conversion_paths: [],
      attribution_summary: {},
      touchpoint_analysis: {},
      time_to_conversion: {}
    }
  }

  // Group touchpoints by client to analyze journeys
  const clientJourneys = groupBy(touchpoints, 'client_id')
  
  const channelPerformance = analyzeChannelPerformance(touchpoints, clientJourneys, model)
  const conversionPaths = analyzeConversionPaths(clientJourneys)
  const attributionSummary = generateAttributionSummary(touchpoints, model)
  const touchpointAnalysis = analyzeTouchpoints(touchpoints)
  const timeToConversion = analyzeTimeToConversion(clientJourneys)

  return {
    channel_performance: channelPerformance,
    conversion_paths: conversionPaths.slice(0, 20), // Top 20 paths
    attribution_summary: attributionSummary,
    touchpoint_analysis: touchpointAnalysis,
    time_to_conversion: timeToConversion
  }
}

function calculateAttribution(touchpoints: any[], model: string) {
  const attribution: { [key: string]: number } = {}
  const totalValue = touchpoints.reduce((sum, tp) => sum + (tp.value || 0), 0)

  if (touchpoints.length === 0) return attribution

  switch (model) {
    case 'first_touch':
      const firstTouch = touchpoints[0]
      const firstKey = `${firstTouch.touchpoint_type}:${firstTouch.channel || 'direct'}`
      attribution[firstKey] = totalValue
      break

    case 'last_touch':
      const lastTouch = touchpoints[touchpoints.length - 1]
      const lastKey = `${lastTouch.touchpoint_type}:${lastTouch.channel || 'direct'}`
      attribution[lastKey] = totalValue
      break

    case 'multi_touch':
    default:
      // Time-decay attribution: more recent touchpoints get more credit
      const now = new Date().getTime()
      let totalWeight = 0
      const weights: { [key: number]: number } = {}

      // Calculate weights based on recency
      touchpoints.forEach((tp, index) => {
        const touchpointTime = new Date(tp.timestamp).getTime()
        const hoursAgo = (now - touchpointTime) / (1000 * 60 * 60)
        const weight = Math.exp(-hoursAgo / 168) // Decay over 1 week (168 hours)
        weights[index] = weight
        totalWeight += weight
      })

      // Distribute value based on weights
      touchpoints.forEach((tp, index) => {
        const key = `${tp.touchpoint_type}:${tp.channel || 'direct'}`
        const attributedValue = totalValue * (weights[index] / totalWeight)
        attribution[key] = (attribution[key] || 0) + attributedValue
      })
      break
  }

  return attribution
}

function analyzeChannelPerformance(touchpoints: any[], clientJourneys: any, model: string) {
  const channelStats: { [key: string]: any } = {}

  // Initialize channel stats
  touchpoints.forEach(tp => {
    const key = `${tp.touchpoint_type}:${tp.channel || 'direct'}`
    if (!channelStats[key]) {
      channelStats[key] = {
        touchpoint_type: tp.touchpoint_type,
        channel: tp.channel || 'direct',
        total_touchpoints: 0,
        unique_clients: new Set(),
        total_value: 0,
        conversions: 0,
        attributed_value: 0
      }
    }
    
    channelStats[key].total_touchpoints++
    channelStats[key].unique_clients.add(tp.client_id)
    channelStats[key].total_value += (tp.value || 0)
    
    if (tp.conversion_event === 'deal_closed') {
      channelStats[key].conversions++
    }
  })

  // Calculate attributed value for each channel
  Object.values(clientJourneys).forEach((journey: any) => {
    const attribution = calculateAttribution(journey, model)
    Object.entries(attribution).forEach(([key, value]) => {
      if (channelStats[key]) {
        channelStats[key].attributed_value += value
      }
    })
  })

  return Object.values(channelStats).map((stats: any) => ({
    touchpoint_type: stats.touchpoint_type,
    channel: stats.channel,
    total_touchpoints: stats.total_touchpoints,
    unique_clients: stats.unique_clients.size,
    total_value: stats.total_value,
    attributed_value: Math.round(stats.attributed_value),
    conversions: stats.conversions,
    conversion_rate: stats.unique_clients.size > 0 ? (stats.conversions / stats.unique_clients.size) * 100 : 0,
    roi: stats.attributed_value > 0 && stats.total_value > 0 ? ((stats.attributed_value - stats.total_value) / stats.total_value) * 100 : 0
  })).sort((a, b) => b.attributed_value - a.attributed_value)
}

function analyzeConversionPaths(clientJourneys: any) {
  const pathCounts: { [key: string]: any } = {}

  Object.values(clientJourneys).forEach((journey: any) => {
    if (journey.length === 0) return

    const path = journey.map((tp: any) => `${tp.touchpoint_type}:${tp.channel || 'direct'}`).join(' -> ')
    const hasConversion = journey.some((tp: any) => tp.conversion_event === 'deal_closed')
    
    if (!pathCounts[path]) {
      pathCounts[path] = {
        path,
        count: 0,
        conversions: 0,
        total_value: 0,
        avg_touchpoints: 0,
        avg_time_to_conversion: 0
      }
    }

    pathCounts[path].count++
    pathCounts[path].total_value += journey.reduce((sum: number, tp: any) => sum + (tp.value || 0), 0)
    pathCounts[path].avg_touchpoints = journey.length

    if (hasConversion) {
      pathCounts[path].conversions++
      const firstTouch = new Date(journey[0].timestamp)
      const lastTouch = new Date(journey[journey.length - 1].timestamp)
      const timeToConversion = (lastTouch.getTime() - firstTouch.getTime()) / (1000 * 60 * 60 * 24) // days
      pathCounts[path].avg_time_to_conversion = timeToConversion
    }
  })

  return Object.values(pathCounts).map((path: any) => ({
    ...path,
    conversion_rate: path.count > 0 ? (path.conversions / path.count) * 100 : 0,
    avg_value_per_journey: path.count > 0 ? path.total_value / path.count : 0
  })).sort((a: any, b: any) => b.conversions - a.conversions)
}

function generateAttributionSummary(touchpoints: any[], model: string) {
  const totalTouchpoints = touchpoints.length
  const uniqueClients = new Set(touchpoints.map(tp => tp.client_id)).size
  const totalValue = touchpoints.reduce((sum, tp) => sum + (tp.value || 0), 0)
  const conversions = touchpoints.filter(tp => tp.conversion_event === 'deal_closed').length

  const touchpointTypes = groupBy(touchpoints, 'touchpoint_type')
  const channelBreakdown = Object.entries(touchpointTypes).map(([type, tps]: [string, any]) => ({
    touchpoint_type: type,
    count: tps.length,
    percentage: (tps.length / totalTouchpoints) * 100
  }))

  return {
    total_touchpoints: totalTouchpoints,
    unique_clients: uniqueClients,
    total_value: totalValue,
    conversions: conversions,
    conversion_rate: uniqueClients > 0 ? (conversions / uniqueClients) * 100 : 0,
    avg_touchpoints_per_client: uniqueClients > 0 ? totalTouchpoints / uniqueClients : 0,
    avg_value_per_touchpoint: totalTouchpoints > 0 ? totalValue / totalTouchpoints : 0,
    channel_breakdown: channelBreakdown.sort((a, b) => b.count - a.count)
  }
}

function analyzeTouchpoints(touchpoints: any[]) {
  const byHour = groupBy(touchpoints, (tp: any) => new Date(tp.timestamp).getHours())
  const byDay = groupBy(touchpoints, (tp: any) => new Date(tp.timestamp).getDay())
  const bySource = groupBy(touchpoints, 'source')

  const hourlyDistribution = Object.entries(byHour).map(([hour, tps]: [string, any]) => ({
    hour: parseInt(hour),
    count: tps.length,
    conversion_rate: tps.filter((tp: any) => tp.conversion_event === 'deal_closed').length / tps.length * 100
  })).sort((a, b) => a.hour - b.hour)

  const dailyDistribution = Object.entries(byDay).map(([day, tps]: [string, any]) => ({
    day: parseInt(day), // 0 = Sunday
    day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)],
    count: tps.length,
    conversion_rate: tps.filter((tp: any) => tp.conversion_event === 'deal_closed').length / tps.length * 100
  })).sort((a, b) => a.day - b.day)

  const topSources = Object.entries(bySource)
    .map(([source, tps]: [string, any]) => ({
      source: source || 'direct',
      count: tps.length,
      conversions: tps.filter((tp: any) => tp.conversion_event === 'deal_closed').length,
      conversion_rate: tps.filter((tp: any) => tp.conversion_event === 'deal_closed').length / tps.length * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    hourly_distribution: hourlyDistribution,
    daily_distribution: dailyDistribution,
    top_sources: topSources
  }
}

function analyzeTimeToConversion(clientJourneys: any) {
  const conversionTimes: number[] = []
  const touchpointCounts: number[] = []

  Object.values(clientJourneys).forEach((journey: any) => {
    const hasConversion = journey.some((tp: any) => tp.conversion_event === 'deal_closed')
    
    if (hasConversion && journey.length > 1) {
      const firstTouch = new Date(journey[0].timestamp)
      const lastTouch = new Date(journey[journey.length - 1].timestamp)
      const timeToConversion = (lastTouch.getTime() - firstTouch.getTime()) / (1000 * 60 * 60 * 24) // days
      
      conversionTimes.push(timeToConversion)
      touchpointCounts.push(journey.length)
    }
  })

  if (conversionTimes.length === 0) {
    return {
      avg_time_to_conversion: 0,
      median_time_to_conversion: 0,
      avg_touchpoints_to_conversion: 0,
      conversion_timeframes: {}
    }
  }

  const avgTime = conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length
  const sortedTimes = [...conversionTimes].sort((a, b) => a - b)
  const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)]
  const avgTouchpoints = touchpointCounts.reduce((sum, count) => sum + count, 0) / touchpointCounts.length

  const timeframes = {
    same_day: conversionTimes.filter(time => time < 1).length,
    within_week: conversionTimes.filter(time => time >= 1 && time <= 7).length,
    within_month: conversionTimes.filter(time => time > 7 && time <= 30).length,
    over_month: conversionTimes.filter(time => time > 30).length
  }

  return {
    avg_time_to_conversion: Math.round(avgTime),
    median_time_to_conversion: Math.round(medianTime),
    avg_touchpoints_to_conversion: Math.round(avgTouchpoints),
    conversion_timeframes: timeframes
  }
}

async function updateClientAttribution(supabase: any, userId: string, clientId: string) {
  const { data: touchpoints } = await supabase
    .from('attribution_touchpoints')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .order('timestamp', { ascending: true })

  if (!touchpoints || touchpoints.length === 0) return

  const multiTouchAttribution = calculateAttribution(touchpoints, 'multi_touch')
  const firstTouchAttribution = calculateAttribution(touchpoints, 'first_touch')
  const lastTouchAttribution = calculateAttribution(touchpoints, 'last_touch')

  // Update client record with attribution data
  await supabase
    .from('clients')
    .update({
      attribution_first_touch: firstTouchAttribution,
      attribution_last_touch: lastTouchAttribution,
      attribution_multi_touch: multiTouchAttribution,
      total_touchpoints: touchpoints.length,
      attribution_updated_at: new Date().toISOString()
    })
    .eq('id', clientId)
    .eq('user_id', userId)
}

function groupBy(array: any[], keyOrFunction: string | ((item: any) => any)) {
  return array.reduce((acc, item) => {
    const key = typeof keyOrFunction === 'function' ? keyOrFunction(item) : item[keyOrFunction]
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}
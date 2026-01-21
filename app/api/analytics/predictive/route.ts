import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const timeframe = searchParams.get('timeframe') || '30' // days
    const metric = searchParams.get('metric') || 'all'

    const predictions = await generatePredictiveAnalytics(supabase, user.id, parseInt(timeframe), metric)

    return NextResponse.json({
      timeframe: `${timeframe} days`,
      predictions,
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error generating predictive analytics:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

async function generatePredictiveAnalytics(supabase: any, userId: string, timeframeDays: number, metric: string) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - timeframeDays)

  // Get historical data for analysis
  const [dealsData, leadsData, activitiesData, revenueData] = await Promise.all([
    getDealsData(supabase, userId, startDate),
    getLeadsData(supabase, userId, startDate),
    getActivitiesData(supabase, userId, startDate),
    getRevenueData(supabase, userId, startDate)
  ])

  const predictions = {
    deal_conversion: await predictDealConversion(dealsData, leadsData),
    revenue_forecast: await predictRevenueForecast(revenueData, dealsData),
    lead_quality_trends: await predictLeadQualityTrends(leadsData, activitiesData),
    pipeline_performance: await predictPipelinePerformance(dealsData, activitiesData),
    seasonal_patterns: await identifySeasonalPatterns(revenueData, dealsData, timeframeDays),
    risk_assessment: await assessRisks(dealsData, leadsData, activitiesData)
  }

  if (metric !== 'all' && predictions[metric as keyof typeof predictions]) {
    return { [metric]: predictions[metric as keyof typeof predictions] }
  }

  return predictions
}

async function getDealsData(supabase: any, userId: string, startDate: Date) {
  const { data } = await supabase
    .from('deals')
    .select(`
      id, title, status, value, probability, stage,
      expected_close_date, created_at, updated_at,
      client_id, source
    `)
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  return data || []
}

async function getLeadsData(supabase: any, userId: string, startDate: Date) {
  const { data } = await supabase
    .from('clients')
    .select(`
      id, status, lead_score, ai_lead_score, source,
      created_at, last_contact_date, conversion_date,
      budget_min, budget_max
    `)
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  return data || []
}

async function getActivitiesData(supabase: any, userId: string, startDate: Date) {
  const { data } = await supabase
    .from('lead_activities')
    .select(`
      id, client_id, activity_type, score_awarded,
      created_at, source
    `)
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  return data || []
}

async function getRevenueData(supabase: any, userId: string, startDate: Date) {
  const { data } = await supabase
    .from('deals')
    .select(`
      value, status, created_at, updated_at, stage,
      expected_close_date, actual_close_date
    `)
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  return data || []
}

async function predictDealConversion(deals: any[], leads: any[]) {
  const totalLeads = leads.length
  const convertedLeads = leads.filter(lead => lead.conversion_date).length
  const currentConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

  // Analyze conversion trends by time periods
  const conversionsByWeek = groupByWeek(leads.filter(l => l.conversion_date))
  const trend = calculateTrend(conversionsByWeek)

  // Predict next 30 days
  const expectedNewLeads = Math.max(10, Math.round(totalLeads * 0.3)) // 30% growth assumption
  const predictedConversionRate = Math.max(5, currentConversionRate + (trend * 4)) // 4 weeks ahead
  const expectedConversions = Math.round((expectedNewLeads * predictedConversionRate) / 100)

  return {
    current_conversion_rate: Math.round(currentConversionRate * 10) / 10,
    predicted_conversion_rate: Math.round(predictedConversionRate * 10) / 10,
    expected_new_leads: expectedNewLeads,
    expected_conversions: expectedConversions,
    trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
    confidence: Math.min(95, Math.max(60, 70 + (totalLeads * 2))) // Higher confidence with more data
  }
}

async function predictRevenueForecast(revenueData: any[], deals: any[]) {
  const closedDeals = deals.filter(d => d.status === 'closed_won')
  const currentMonthRevenue = closedDeals
    .filter(d => isCurrentMonth(d.actual_close_date || d.updated_at))
    .reduce((sum, d) => sum + (d.value || 0), 0)

  const lastMonthRevenue = closedDeals
    .filter(d => isLastMonth(d.actual_close_date || d.updated_at))
    .reduce((sum, d) => sum + (d.value || 0), 0)

  const growthRate = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0
  
  // Pipeline value analysis
  const pipelineValue = deals
    .filter(d => ['proposal_sent', 'negotiation', 'contract_review'].includes(d.status))
    .reduce((sum, d) => sum + (d.value || 0) * ((d.probability || 50) / 100), 0)

  const nextMonthForecast = currentMonthRevenue * (1 + (growthRate / 100)) + (pipelineValue * 0.6)
  const quarterForecast = nextMonthForecast * 3 * (1 + Math.max(0, growthRate / 100))

  return {
    current_month_revenue: currentMonthRevenue,
    last_month_revenue: lastMonthRevenue,
    growth_rate: Math.round(growthRate * 10) / 10,
    pipeline_value: Math.round(pipelineValue),
    next_month_forecast: Math.round(nextMonthForecast),
    quarter_forecast: Math.round(quarterForecast),
    confidence: Math.min(90, Math.max(50, 60 + closedDeals.length))
  }
}

async function predictLeadQualityTrends(leads: any[], activities: any[]) {
  const recentLeads = leads.filter(l => isLastWeek(l.created_at))
  const avgScore = recentLeads.reduce((sum, l) => sum + (l.ai_lead_score || l.lead_score || 50), 0) / Math.max(1, recentLeads.length)
  
  const leadsBySource = groupBy(leads, 'source')
  const sourceQuality = Object.entries(leadsBySource).map(([source, sourceLeads]) => {
    const leads = sourceLeads as any[]
    return {
      source: source || 'unknown',
      avg_score: leads.reduce((sum, l) => sum + (l.ai_lead_score || l.lead_score || 50), 0) / leads.length,
      count: leads.length,
      conversion_rate: (leads.filter(l => l.conversion_date).length / leads.length) * 100
    }
  }).sort((a, b) => b.avg_score - a.avg_score)

  const highQualityLeads = recentLeads.filter(l => (l.ai_lead_score || l.lead_score || 0) >= 70).length
  const qualityTrend = calculateQualityTrend(leads)

  return {
    average_lead_score: Math.round(avgScore * 10) / 10,
    high_quality_leads_count: highQualityLeads,
    quality_trend: qualityTrend > 0 ? 'improving' : qualityTrend < 0 ? 'declining' : 'stable',
    best_sources: sourceQuality.slice(0, 3),
    predicted_next_week_quality: Math.max(30, avgScore + qualityTrend * 7),
    recommendations: generateQualityRecommendations(sourceQuality, avgScore)
  }
}

async function predictPipelinePerformance(deals: any[], activities: any[]) {
  const stageAnalysis = analyzeStagePerformance(deals)
  const bottlenecks = identifyBottlenecks(stageAnalysis)
  const averageDealTime = calculateAverageDealTime(deals)
  
  const activeDealPredictions = deals
    .filter(d => !['closed_won', 'closed_lost'].includes(d.status))
    .map(deal => {
      const timeInCurrentStage = daysBetween(new Date(deal.updated_at), new Date())
      const stageData = stageAnalysis.find(s => s.stage === deal.status)
      const avgStageTime = stageData?.avg_time_in_stage || 14
      
      return {
        deal_id: deal.id,
        current_stage: deal.status,
        days_in_stage: timeInCurrentStage,
        predicted_close_probability: Math.max(10, Math.min(95, (deal.probability || 50) - (timeInCurrentStage - avgStageTime))),
        expected_close_date: addDays(new Date(), avgStageTime - timeInCurrentStage)
      }
    })

  return {
    stage_performance: stageAnalysis,
    identified_bottlenecks: bottlenecks,
    average_deal_duration: averageDealTime,
    active_deal_predictions: activeDealPredictions.slice(0, 10),
    pipeline_health_score: calculatePipelineHealth(stageAnalysis, bottlenecks),
    recommendations: generatePipelineRecommendations(bottlenecks, stageAnalysis)
  }
}

async function identifySeasonalPatterns(revenue: any[], deals: any[], timeframeDays: number) {
  if (timeframeDays < 60) {
    return {
      message: "Insufficient data for seasonal analysis",
      patterns: []
    }
  }

  const monthlyData = groupByMonth(deals)
  const seasonalPatterns = []

  // Identify peak months
  const monthlyRevenue = Object.entries(monthlyData).map(([month, monthDeals]) => {
    const deals = monthDeals as any[]
    return {
      month,
      revenue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
      deal_count: deals.length
    }
  })

  const avgMonthlyRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0) / monthlyRevenue.length
  const peakMonths = monthlyRevenue.filter(m => m.revenue > avgMonthlyRevenue * 1.2)
  const slowMonths = monthlyRevenue.filter(m => m.revenue < avgMonthlyRevenue * 0.8)

  seasonalPatterns.push({
    pattern_type: 'peak_months',
    months: peakMonths.map(m => m.month),
    average_increase: peakMonths.length > 0 ? Math.round(((peakMonths.reduce((sum, m) => sum + m.revenue, 0) / peakMonths.length) / avgMonthlyRevenue - 1) * 100) : 0
  })

  if (slowMonths.length > 0) {
    seasonalPatterns.push({
      pattern_type: 'slow_months',
      months: slowMonths.map(m => m.month),
      average_decrease: Math.round((1 - (slowMonths.reduce((sum, m) => sum + m.revenue, 0) / slowMonths.length) / avgMonthlyRevenue) * 100)
    })
  }

  return {
    patterns: seasonalPatterns,
    next_month_prediction: predictNextMonthTrend(monthlyRevenue),
    seasonal_recommendations: generateSeasonalRecommendations(seasonalPatterns)
  }
}

async function assessRisks(deals: any[], leads: any[], activities: any[]) {
  const risks = []

  // Stalled deals risk
  const stalledDeals = deals.filter(d => {
    const daysSinceUpdate = daysBetween(new Date(d.updated_at), new Date())
    return !['closed_won', 'closed_lost'].includes(d.status) && daysSinceUpdate > 14
  })

  if (stalledDeals.length > 0) {
    risks.push({
      type: 'stalled_deals',
      severity: stalledDeals.length > 5 ? 'high' : 'medium',
      count: stalledDeals.length,
      potential_value_at_risk: stalledDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      description: `${stalledDeals.length} deals haven't been updated in 14+ days`
    })
  }

  // Lead quality decline risk
  const recentLeadScores = leads
    .filter(l => isLastWeek(l.created_at))
    .map(l => l.ai_lead_score || l.lead_score || 50)
  
  const olderLeadScores = leads
    .filter(l => isTwoWeeksAgo(l.created_at))
    .map(l => l.ai_lead_score || l.lead_score || 50)

  const recentAvg = recentLeadScores.reduce((sum, s) => sum + s, 0) / Math.max(1, recentLeadScores.length)
  const olderAvg = olderLeadScores.reduce((sum, s) => sum + s, 0) / Math.max(1, olderLeadScores.length)

  if (recentAvg < olderAvg * 0.85) {
    risks.push({
      type: 'lead_quality_decline',
      severity: 'medium',
      current_avg_score: Math.round(recentAvg),
      previous_avg_score: Math.round(olderAvg),
      decline_percentage: Math.round(((olderAvg - recentAvg) / olderAvg) * 100),
      description: 'Recent lead quality has declined compared to previous period'
    })
  }

  // Low activity risk
  const recentActivities = activities.filter(a => isLastWeek(a.created_at))
  const expectedActivities = Math.max(leads.length * 0.5, 10) // Expected minimum activities per week

  if (recentActivities.length < expectedActivities * 0.7) {
    risks.push({
      type: 'low_activity',
      severity: 'high',
      actual_activities: recentActivities.length,
      expected_activities: Math.round(expectedActivities),
      description: 'Lead engagement activities are below expected levels'
    })
  }

  return {
    total_risks: risks.length,
    high_severity_count: risks.filter(r => r.severity === 'high').length,
    risks: risks,
    overall_risk_score: calculateOverallRiskScore(risks),
    recommendations: generateRiskMitigationRecommendations(risks)
  }
}

// Helper functions
function groupByWeek(data: any[]) {
  return data.reduce((acc, item) => {
    const week = getWeekNumber(new Date(item.created_at))
    if (!acc[week]) acc[week] = []
    acc[week].push(item)
    return acc
  }, {})
}

function groupByMonth(data: any[]) {
  return data.reduce((acc, item) => {
    const month = new Date(item.created_at).toISOString().slice(0, 7) // YYYY-MM
    if (!acc[month]) acc[month] = []
    acc[month].push(item)
    return acc
  }, {})
}

function groupBy(array: any[], key: string) {
  return array.reduce((acc, item) => {
    const group = item[key] || 'unknown'
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {})
}

function calculateTrend(groupedData: any) {
  const weeks = Object.keys(groupedData).sort()
  if (weeks.length < 2) return 0

  const values = weeks.map(week => groupedData[week].length)
  const firstHalf = values.slice(0, Math.floor(values.length / 2))
  const secondHalf = values.slice(Math.floor(values.length / 2))

  const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length

  return secondAvg - firstAvg
}

function calculateQualityTrend(leads: any[]) {
  const recentLeads = leads.filter(l => isLastWeek(l.created_at))
  const olderLeads = leads.filter(l => isTwoWeeksAgo(l.created_at))

  const recentAvg = recentLeads.reduce((sum, l) => sum + (l.ai_lead_score || l.lead_score || 50), 0) / Math.max(1, recentLeads.length)
  const olderAvg = olderLeads.reduce((sum, l) => sum + (l.ai_lead_score || l.lead_score || 50), 0) / Math.max(1, olderLeads.length)

  return recentAvg - olderAvg
}

function analyzeStagePerformance(deals: any[]) {
  const stages = ['lead', 'qualified', 'proposal_sent', 'negotiation', 'contract_review', 'closed_won', 'closed_lost']
  
  return stages.map(stage => {
    const stageDeals = deals.filter(d => d.status === stage)
    const avgTimeInStage = calculateAverageStageTime(stageDeals)
    const conversionRate = calculateStageConversionRate(deals, stage)
    
    return {
      stage,
      deal_count: stageDeals.length,
      avg_time_in_stage: avgTimeInStage,
      conversion_rate: conversionRate,
      total_value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    }
  })
}

function identifyBottlenecks(stageAnalysis: any[]) {
  return stageAnalysis
    .filter(stage => stage.avg_time_in_stage > 21 || stage.conversion_rate < 30) // More than 3 weeks or low conversion
    .map(stage => ({
      stage: stage.stage,
      issue: stage.avg_time_in_stage > 21 ? 'long_duration' : 'low_conversion',
      avg_time: stage.avg_time_in_stage,
      conversion_rate: stage.conversion_rate
    }))
}

function calculateAverageDealTime(deals: any[]) {
  const closedDeals = deals.filter(d => ['closed_won', 'closed_lost'].includes(d.status))
  if (closedDeals.length === 0) return 0

  const totalDays = closedDeals.reduce((sum, deal) => {
    const created = new Date(deal.created_at)
    const closed = new Date(deal.actual_close_date || deal.updated_at)
    return sum + daysBetween(created, closed)
  }, 0)

  return Math.round(totalDays / closedDeals.length)
}

function calculateAverageStageTime(stageDeals: any[]) {
  if (stageDeals.length === 0) return 0
  
  const totalDays = stageDeals.reduce((sum, deal) => {
    const created = new Date(deal.created_at)
    const updated = new Date(deal.updated_at)
    return sum + daysBetween(created, updated)
  }, 0)

  return Math.round(totalDays / stageDeals.length)
}

function calculateStageConversionRate(deals: any[], stage: string) {
  const stageDeals = deals.filter(d => d.status === stage)
  const convertedDeals = deals.filter(d => d.status === 'closed_won')
  
  if (stageDeals.length === 0) return 0
  return Math.round((convertedDeals.length / stageDeals.length) * 100)
}

function calculatePipelineHealth(stageAnalysis: any[], bottlenecks: any[]) {
  const totalScore = 100
  const bottleneckPenalty = bottlenecks.length * 15
  const lowVolumeStages = stageAnalysis.filter(s => s.deal_count < 3).length
  const volumePenalty = lowVolumeStages * 5

  return Math.max(0, totalScore - bottleneckPenalty - volumePenalty)
}

function calculateOverallRiskScore(risks: any[]) {
  const riskScores = { high: 30, medium: 15, low: 5 }
  return risks.reduce((sum, risk) => sum + (riskScores[risk.severity as keyof typeof riskScores] || 0), 0)
}

// Date helper functions
function isCurrentMonth(date: string) {
  const now = new Date()
  const checkDate = new Date(date)
  return now.getMonth() === checkDate.getMonth() && now.getFullYear() === checkDate.getFullYear()
}

function isLastMonth(date: string) {
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const checkDate = new Date(date)
  return lastMonth.getMonth() === checkDate.getMonth() && lastMonth.getFullYear() === checkDate.getFullYear()
}

function isLastWeek(date: string) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return new Date(date) >= weekAgo
}

function isTwoWeeksAgo(date: string) {
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const checkDate = new Date(date)
  return checkDate >= twoWeeksAgo && checkDate < oneWeekAgo
}

function daysBetween(date1: Date, date2: Date) {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result.toISOString()
}

function getWeekNumber(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24 * 7))
}

function predictNextMonthTrend(monthlyRevenue: any[]) {
  if (monthlyRevenue.length < 2) return 'insufficient_data'
  
  const recent = monthlyRevenue.slice(-2)
  const trend = recent[1].revenue - recent[0].revenue
  
  if (trend > recent[0].revenue * 0.1) return 'increasing'
  if (trend < -recent[0].revenue * 0.1) return 'decreasing'
  return 'stable'
}

// Recommendation generators
function generateQualityRecommendations(sourceQuality: any[], avgScore: number) {
  const recommendations = []
  
  if (avgScore < 60) {
    recommendations.push("Focus on lead qualification process to improve overall quality")
  }
  
  const bestSource = sourceQuality[0]
  if (bestSource) {
    recommendations.push(`Increase investment in ${bestSource.source} - your best performing source`)
  }
  
  const worstSources = sourceQuality.filter(s => s.avg_score < 50)
  if (worstSources.length > 0) {
    recommendations.push(`Review lead sources: ${worstSources.map(s => s.source).join(', ')} - showing poor quality`)
  }
  
  return recommendations
}

function generatePipelineRecommendations(bottlenecks: any[], stageAnalysis: any[]) {
  const recommendations = []
  
  bottlenecks.forEach(bottleneck => {
    if (bottleneck.issue === 'long_duration') {
      recommendations.push(`Address delays in ${bottleneck.stage} stage - deals spending ${bottleneck.avg_time} days on average`)
    } else {
      recommendations.push(`Improve conversion rate in ${bottleneck.stage} stage - only ${bottleneck.conversion_rate}% converting`)
    }
  })
  
  const lowVolumeStages = stageAnalysis.filter(s => s.deal_count < 3)
  if (lowVolumeStages.length > 0) {
    recommendations.push("Increase lead generation to fill early pipeline stages")
  }
  
  return recommendations
}

function generateSeasonalRecommendations(patterns: any[]) {
  const recommendations = []
  
  const peakPattern = patterns.find(p => p.pattern_type === 'peak_months')
  if (peakPattern) {
    recommendations.push(`Prepare for peak season in ${peakPattern.months.join(', ')} - increase capacity and marketing`)
  }
  
  const slowPattern = patterns.find(p => p.pattern_type === 'slow_months')
  if (slowPattern) {
    recommendations.push(`Plan nurturing campaigns for slow months: ${slowPattern.months.join(', ')}`)
  }
  
  return recommendations
}

function generateRiskMitigationRecommendations(risks: any[]) {
  return risks.map(risk => {
    switch (risk.type) {
      case 'stalled_deals':
        return "Implement systematic follow-up process for stalled deals"
      case 'lead_quality_decline':
        return "Review and optimize lead qualification criteria and sources"
      case 'low_activity':
        return "Increase engagement activities and follow-up frequency"
      default:
        return "Monitor this risk area closely and take corrective action"
    }
  })
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const competitor_id = searchParams.get('competitor_id')
    const analysis_type = searchParams.get('type') || 'overview' // overview, pricing, features, market_share

    if (competitor_id) {
      const analysis = await getCompetitorAnalysis(supabase, user.id, competitor_id, analysis_type)
      return NextResponse.json({ competitor_id, analysis, analysis_type })
    } else {
      const marketAnalysis = await getMarketAnalysis(supabase, user.id, analysis_type)
      return NextResponse.json({ market_analysis: marketAnalysis, analysis_type })
    }
  } catch (error) {
    console.error('Error fetching competitive analysis:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      competitor_name,
      website_url,
      market_segment = 'real_estate',
      target_markets = [],
      business_model,
      estimated_revenue,
      employee_count,
      funding_info,
      key_features = [],
      pricing_tiers = [],
      strengths = [],
      weaknesses = [],
      market_positioning,
      notes
    } = body

    // Validate required fields
    if (!competitor_name || !website_url) {
      return NextResponse.json({
        error: 'Competitor name and website URL are required'
      }, { status: 400 })
    }

    // Add competitor to tracking
    const { data: competitor, error: competitorError } = await supabase
      .from('competitors')
      .insert({
        user_id: user.id,
        competitor_name,
        website_url,
        market_segment,
        target_markets,
        business_model,
        estimated_revenue,
        employee_count,
        funding_info,
        key_features,
        pricing_tiers,
        strengths,
        weaknesses,
        market_positioning,
        notes,
        last_analyzed: new Date().toISOString()
      })
      .select()
      .single()

    if (competitorError) {
      return NextResponse.json({ error: competitorError.message }, { status: 400 })
    }

    // Trigger initial analysis
    await performCompetitorAnalysis(supabase, user.id, competitor.id)

    return NextResponse.json({ competitor }, { status: 201 })
  } catch (error) {
    console.error('Error adding competitor:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const competitorId = searchParams.get('id')
    const action = searchParams.get('action') // 'update', 'analyze', 'refresh'

    if (!competitorId) {
      return NextResponse.json({ error: 'Competitor ID is required' }, { status: 400 })
    }

    if (action === 'analyze' || action === 'refresh') {
      await performCompetitorAnalysis(supabase, user.id, competitorId)
      return NextResponse.json({ message: 'Analysis updated successfully' })
    } else {
      const body = await request.json()
      
      const { data: competitor, error } = await supabase
        .from('competitors')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', competitorId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ competitor })
    }
  } catch (error) {
    console.error('Error updating competitor:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const competitorId = searchParams.get('id')

    if (!competitorId) {
      return NextResponse.json({ error: 'Competitor ID is required' }, { status: 400 })
    }

    // Delete analysis data first
    await supabase
      .from('competitive_analysis_snapshots')
      .delete()
      .eq('competitor_id', competitorId)

    // Delete the competitor
    const { error } = await supabase
      .from('competitors')
      .delete()
      .eq('id', competitorId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting competitor:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

async function getCompetitorAnalysis(supabase: any, userId: string, competitorId: string, analysisType: string) {
  const { data: competitor } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', competitorId)
    .eq('user_id', userId)
    .single()

  if (!competitor) return null

  const { data: snapshots } = await supabase
    .from('competitive_analysis_snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('analyzed_at', { ascending: false })
    .limit(10)

  const latestSnapshot = snapshots?.[0]
  const trend = calculateCompetitorTrend(snapshots)

  return {
    competitor,
    latest_analysis: latestSnapshot,
    trend_analysis: trend,
    analysis_history: snapshots || []
  }
}

async function getMarketAnalysis(supabase: any, userId: string, analysisType: string) {
  const { data: competitors } = await supabase
    .from('competitors')
    .select(`
      *,
      competitive_analysis_snapshots(*)
    `)
    .eq('user_id', userId)
    .order('last_analyzed', { ascending: false })

  if (!competitors || competitors.length === 0) {
    return {
      competitors: [],
      market_insights: {},
      competitive_landscape: {},
      recommendations: []
    }
  }

  const marketInsights = generateMarketInsights(competitors)
  const competitiveLandscape = analyzeCompetitiveLandscape(competitors)
  const recommendations = generateCompetitiveRecommendations(competitors, marketInsights)

  return {
    competitors: competitors.slice(0, 20),
    market_insights: marketInsights,
    competitive_landscape: competitiveLandscape,
    recommendations
  }
}

async function performCompetitorAnalysis(supabase: any, userId: string, competitorId: string) {
  const { data: competitor } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', competitorId)
    .eq('user_id', userId)
    .single()

  if (!competitor) return

  // In production, this would use web scraping, APIs, and AI analysis
  const analysisData = await mockCompetitorAnalysis(competitor)

  // Store analysis snapshot
  await supabase
    .from('competitive_analysis_snapshots')
    .insert({
      competitor_id: competitorId,
      analysis_data: analysisData,
      analyzed_at: new Date().toISOString()
    })

  // Update competitor's last analyzed timestamp
  await supabase
    .from('competitors')
    .update({ last_analyzed: new Date().toISOString() })
    .eq('id', competitorId)
}

async function mockCompetitorAnalysis(competitor: any) {
  // Simulate competitive intelligence gathering
  await new Promise(resolve => setTimeout(resolve, 1000))

  const mockData = {
    website_metrics: {
      domain_authority: 45 + Math.floor(Math.random() * 40),
      monthly_traffic: Math.floor(Math.random() * 100000) + 10000,
      traffic_growth: (Math.random() - 0.5) * 40, // -20% to +20%
      top_keywords: [
        'real estate CRM',
        'property management',
        'lead generation',
        'real estate software',
        'property listings'
      ],
      backlinks_count: Math.floor(Math.random() * 5000) + 500
    },
    pricing_analysis: {
      pricing_strategy: ['freemium', 'subscription', 'per_user', 'enterprise'][Math.floor(Math.random() * 4)],
      price_range: {
        min: Math.floor(Math.random() * 50) + 10,
        max: Math.floor(Math.random() * 200) + 100
      },
      free_trial: Math.random() > 0.3,
      money_back_guarantee: Math.random() > 0.5
    },
    feature_analysis: {
      core_features: [
        'lead_management',
        'contact_management',
        'email_marketing',
        'reporting_analytics',
        'mobile_app'
      ].filter(() => Math.random() > 0.3),
      advanced_features: [
        'ai_powered_insights',
        'automation_workflows',
        'integrations',
        'custom_branding',
        'api_access'
      ].filter(() => Math.random() > 0.5),
      unique_selling_points: [
        'Industry-specific templates',
        'Advanced automation',
        'Superior customer support',
        'Extensive integrations',
        'Mobile-first design'
      ].slice(0, Math.floor(Math.random() * 3) + 1)
    },
    social_presence: {
      facebook_followers: Math.floor(Math.random() * 50000) + 1000,
      twitter_followers: Math.floor(Math.random() * 20000) + 500,
      linkedin_followers: Math.floor(Math.random() * 30000) + 1000,
      instagram_followers: Math.floor(Math.random() * 15000) + 500,
      social_engagement_rate: Math.random() * 5 + 1 // 1-6%
    },
    content_strategy: {
      blog_post_frequency: Math.floor(Math.random() * 20) + 5, // posts per month
      content_topics: [
        'Real Estate Tips',
        'Market Trends',
        'Technology Updates',
        'Customer Success Stories',
        'Industry News'
      ],
      content_quality_score: Math.floor(Math.random() * 40) + 60 // 60-100
    },
    market_position: {
      market_share_estimate: Math.random() * 10 + 1, // 1-11%
      growth_rate: (Math.random() - 0.3) * 50, // -15% to +35%
      customer_satisfaction: Math.random() * 2 + 3, // 3-5 stars
      brand_recognition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    },
    strengths_weaknesses: {
      identified_strengths: [
        'Strong brand presence',
        'Comprehensive feature set',
        'Good customer support',
        'Competitive pricing',
        'User-friendly interface'
      ].filter(() => Math.random() > 0.4),
      identified_weaknesses: [
        'Limited integrations',
        'Steep learning curve',
        'Higher pricing',
        'Outdated UI/UX',
        'Poor mobile experience'
      ].filter(() => Math.random() > 0.6)
    }
  }

  return mockData
}

function calculateCompetitorTrend(snapshots: any[]) {
  if (!snapshots || snapshots.length < 2) return null

  const latest = snapshots[0]?.analysis_data
  const previous = snapshots[1]?.analysis_data

  if (!latest || !previous) return null

  return {
    traffic_trend: calculatePercentageChange(
      previous.website_metrics?.monthly_traffic || 0,
      latest.website_metrics?.monthly_traffic || 0
    ),
    domain_authority_trend: calculatePercentageChange(
      previous.website_metrics?.domain_authority || 0,
      latest.website_metrics?.domain_authority || 0
    ),
    social_growth: calculatePercentageChange(
      previous.social_presence?.facebook_followers || 0,
      latest.social_presence?.facebook_followers || 0
    ),
    market_share_trend: calculatePercentageChange(
      previous.market_position?.market_share_estimate || 0,
      latest.market_position?.market_share_estimate || 0
    )
  }
}

function generateMarketInsights(competitors: any[]) {
  const totalCompetitors = competitors.length
  const avgMarketShare = competitors.reduce((sum, c) => {
    const latestSnapshot = c.competitive_analysis_snapshots?.[0]
    return sum + (latestSnapshot?.analysis_data?.market_position?.market_share_estimate || 0)
  }, 0) / totalCompetitors

  const pricingStrategies = competitors.reduce((acc, c) => {
    const latestSnapshot = c.competitive_analysis_snapshots?.[0]
    const strategy = latestSnapshot?.analysis_data?.pricing_analysis?.pricing_strategy
    if (strategy) {
      acc[strategy] = (acc[strategy] || 0) + 1
    }
    return acc
  }, {})

  const topFeatures = competitors.reduce((acc, c) => {
    const latestSnapshot = c.competitive_analysis_snapshots?.[0]
    const features = latestSnapshot?.analysis_data?.feature_analysis?.core_features || []
    features.forEach((feature: string) => {
      acc[feature] = (acc[feature] || 0) + 1
    })
    return acc
  }, {})

  return {
    market_size: totalCompetitors,
    avg_market_share: Math.round(avgMarketShare * 10) / 10,
    dominant_pricing_strategy: Object.entries(pricingStrategies).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'unknown',
    most_common_features: Object.entries(topFeatures)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([feature, count]) => ({ feature, count })),
    pricing_trends: analyzePricingTrends(competitors),
    innovation_trends: analyzeInnovationTrends(competitors)
  }
}

function analyzeCompetitiveLandscape(competitors: any[]) {
  const competitorsBySegment = competitors.reduce((acc, c) => {
    const segment = c.market_segment || 'unknown'
    if (!acc[segment]) acc[segment] = []
    acc[segment].push(c)
    return acc
  }, {})

  const threatLevel = calculateThreatLevels(competitors)
  const opportunities = identifyMarketOpportunities(competitors)

  return {
    segments: Object.entries(competitorsBySegment).map(([segment, comps]: [string, any]) => ({
      segment,
      competitor_count: comps.length,
      avg_market_share: comps.reduce((sum: number, c: any) => {
        const latestSnapshot = c.competitive_analysis_snapshots?.[0]
        return sum + (latestSnapshot?.analysis_data?.market_position?.market_share_estimate || 0)
      }, 0) / comps.length
    })),
    threat_assessment: threatLevel,
    market_opportunities: opportunities,
    competitive_gaps: identifyCompetitiveGaps(competitors)
  }
}

function generateCompetitiveRecommendations(competitors: any[], marketInsights: any) {
  const recommendations = []

  // Pricing recommendations
  const dominantStrategy = marketInsights.dominant_pricing_strategy
  if (dominantStrategy === 'freemium') {
    recommendations.push({
      category: 'pricing',
      priority: 'high',
      title: 'Consider Freemium Model',
      description: 'Most competitors use freemium pricing. Consider offering a free tier to compete effectively.',
      impact: 'Could increase lead generation by 40-60%'
    })
  }

  // Feature recommendations
  const topFeatures = marketInsights.most_common_features
  recommendations.push({
    category: 'features',
    priority: 'medium',
    title: 'Feature Gap Analysis',
    description: `Focus on developing ${topFeatures[0]?.feature} and ${topFeatures[1]?.feature} which are common among top competitors.`,
    impact: 'Improve competitive positioning'
  })

  // Market positioning recommendations
  const weakCompetitors = competitors.filter(c => {
    const latestSnapshot = c.competitive_analysis_snapshots?.[0]
    return latestSnapshot?.analysis_data?.market_position?.customer_satisfaction < 4
  })

  if (weakCompetitors.length > 0) {
    recommendations.push({
      category: 'positioning',
      priority: 'high',
      title: 'Target Competitor Weaknesses',
      description: `${weakCompetitors.length} competitors have customer satisfaction below 4 stars. Focus on superior customer experience.`,
      impact: 'Potential to capture 15-25% market share'
    })
  }

  return recommendations
}

function analyzePricingTrends(competitors: any[]) {
  const priceRanges = competitors.map(c => {
    const latestSnapshot = c.competitive_analysis_snapshots?.[0]
    return latestSnapshot?.analysis_data?.pricing_analysis?.price_range
  }).filter(Boolean)

  if (priceRanges.length === 0) return null

  const avgMin = priceRanges.reduce((sum, range) => sum + range.min, 0) / priceRanges.length
  const avgMax = priceRanges.reduce((sum, range) => sum + range.max, 0) / priceRanges.length

  return {
    avg_min_price: Math.round(avgMin),
    avg_max_price: Math.round(avgMax),
    price_distribution: {
      budget: priceRanges.filter(r => r.max < 50).length,
      mid_range: priceRanges.filter(r => r.max >= 50 && r.max < 150).length,
      premium: priceRanges.filter(r => r.max >= 150).length
    }
  }
}

function analyzeInnovationTrends(competitors: any[]) {
  const advancedFeatures = competitors.reduce((acc, c) => {
    const latestSnapshot = c.competitive_analysis_snapshots?.[0]
    const features = latestSnapshot?.analysis_data?.feature_analysis?.advanced_features || []
    features.forEach((feature: string) => {
      acc[feature] = (acc[feature] || 0) + 1
    })
    return acc
  }, {})

  const trendingFeatures = Object.entries(advancedFeatures)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)

  return {
    trending_features: trendingFeatures.map(([feature, count]) => ({ feature, adoption_rate: (count as number) / competitors.length * 100 })),
    innovation_leaders: competitors
      .filter(c => {
        const latestSnapshot = c.competitive_analysis_snapshots?.[0]
        return (latestSnapshot?.analysis_data?.feature_analysis?.advanced_features?.length || 0) >= 3
      })
      .slice(0, 3)
      .map(c => c.competitor_name)
  }
}

function calculateThreatLevels(competitors: any[]) {
  return competitors.map(c => {
    const latestSnapshot = c.competitive_analysis_snapshots?.[0]
    const data = latestSnapshot?.analysis_data

    let threatScore = 0
    
    // Market share threat
    if (data?.market_position?.market_share_estimate > 10) threatScore += 30
    else if (data?.market_position?.market_share_estimate > 5) threatScore += 20
    else threatScore += 10

    // Growth threat
    if (data?.market_position?.growth_rate > 20) threatScore += 25
    else if (data?.market_position?.growth_rate > 0) threatScore += 15

    // Feature completeness threat
    const featureCount = (data?.feature_analysis?.core_features?.length || 0) + (data?.feature_analysis?.advanced_features?.length || 0)
    if (featureCount > 8) threatScore += 20
    else if (featureCount > 5) threatScore += 10

    // Brand recognition threat
    if (data?.market_position?.brand_recognition === 'high') threatScore += 15
    else if (data?.market_position?.brand_recognition === 'medium') threatScore += 10

    // Customer satisfaction threat
    if (data?.market_position?.customer_satisfaction > 4.5) threatScore += 10

    return {
      competitor_name: c.competitor_name,
      threat_score: Math.min(100, threatScore),
      threat_level: threatScore > 70 ? 'high' : threatScore > 40 ? 'medium' : 'low',
      key_threats: identifyKeyThreats(data)
    }
  }).sort((a, b) => b.threat_score - a.threat_score)
}

function identifyMarketOpportunities(competitors: any[]) {
  const opportunities = []

  // Underserved segments
  const segments = competitors.reduce((acc, c) => {
    const segment = c.market_segment || 'unknown'
    acc[segment] = (acc[segment] || 0) + 1
    return acc
  }, {})

  const underservedSegments = Object.entries(segments)
    .filter(([, count]) => (count as number) < 3)
    .map(([segment]) => segment)

  if (underservedSegments.length > 0) {
    opportunities.push({
      type: 'market_segment',
      description: `Underserved segments: ${underservedSegments.join(', ')}`,
      potential: 'high'
    })
  }

  // Feature gaps
  const allFeatures = competitors.reduce((acc, c) => {
    const latestSnapshot = c.competitive_analysis_snapshots?.[0]
    const features = [
      ...(latestSnapshot?.analysis_data?.feature_analysis?.core_features || []),
      ...(latestSnapshot?.analysis_data?.feature_analysis?.advanced_features || [])
    ]
    features.forEach(feature => {
      acc[feature] = (acc[feature] || 0) + 1
    })
    return acc
  }, {})

  const missingFeatures = [
    'voice_assistant',
    'vr_property_tours',
    'blockchain_transactions',
    'predictive_analytics',
    'augmented_reality'
  ].filter(feature => !allFeatures[feature] || allFeatures[feature] < competitors.length * 0.3)

  if (missingFeatures.length > 0) {
    opportunities.push({
      type: 'feature_innovation',
      description: `Innovation opportunities: ${missingFeatures.slice(0, 3).join(', ')}`,
      potential: 'medium'
    })
  }

  return opportunities
}

function identifyCompetitiveGaps(competitors: any[]) {
  const gaps = []

  // Pricing gaps
  const priceRanges = competitors.map(c => {
    const latestSnapshot = c.competitive_analysis_snapshots?.[0]
    return latestSnapshot?.analysis_data?.pricing_analysis?.price_range
  }).filter(Boolean)

  if (priceRanges.length > 0) {
    const sortedPrices = priceRanges.sort((a, b) => a.min - b.min)
    for (let i = 0; i < sortedPrices.length - 1; i++) {
      const gap = sortedPrices[i + 1].min - sortedPrices[i].max
      if (gap > 30) {
        gaps.push({
          type: 'pricing',
          description: `Pricing gap between $${sortedPrices[i].max} and $${sortedPrices[i + 1].min}`,
          opportunity_size: 'medium'
        })
      }
    }
  }

  return gaps.slice(0, 3) // Return top 3 gaps
}

function identifyKeyThreats(analysisData: any) {
  const threats = []

  if (analysisData?.market_position?.market_share_estimate > 10) {
    threats.push('High market share')
  }
  if (analysisData?.market_position?.growth_rate > 20) {
    threats.push('Rapid growth')
  }
  if (analysisData?.website_metrics?.monthly_traffic > 50000) {
    threats.push('High web traffic')
  }
  if (analysisData?.market_position?.customer_satisfaction > 4.5) {
    threats.push('Excellent customer satisfaction')
  }

  return threats.slice(0, 3)
}

function calculatePercentageChange(oldValue: number, newValue: number) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0
  return Math.round(((newValue - oldValue) / oldValue) * 100)
}
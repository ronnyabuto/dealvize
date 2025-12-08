/**
 * Advanced Feature Flags & A/B Testing Framework
 * Enterprise-grade feature management with analytics and gradual rollouts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const FeatureFlagSchema = z.object({
  name: z.string().min(1, 'Feature flag name is required'),
  key: z.string().min(1, 'Feature key is required').regex(/^[a-zA-Z0-9_-]+$/, 'Invalid key format'),
  description: z.string().optional(),
  type: z.enum(['boolean', 'string', 'number', 'json']).default('boolean'),
  default_value: z.any(),
  is_active: z.boolean().default(true),
  rollout_strategy: z.object({
    type: z.enum(['all_users', 'percentage', 'user_attributes', 'gradual']),
    percentage: z.number().min(0).max(100).optional(),
    gradual_config: z.object({
      start_percentage: z.number().min(0).max(100),
      end_percentage: z.number().min(0).max(100),
      increment_percentage: z.number().min(1).max(50),
      increment_interval_hours: z.number().min(1).max(168)
    }).optional(),
    user_attributes: z.array(z.object({
      attribute: z.string(),
      operator: z.enum(['equals', 'not_equals', 'contains', 'in', 'greater_than', 'less_than']),
      value: z.any()
    })).optional()
  }),
  variations: z.array(z.object({
    name: z.string(),
    value: z.any(),
    description: z.string().optional(),
    weight: z.number().min(0).max(100).default(50)
  })).optional(),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  tags: z.array(z.string()).default([])
})

const ABTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  hypothesis: z.string().min(1, 'Hypothesis is required'),
  feature_flag_key: z.string().min(1, 'Feature flag key is required'),
  success_metrics: z.array(z.string()).min(1, 'At least one success metric is required'),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  minimum_sample_size: z.number().min(1).default(1000),
  confidence_level: z.number().min(0.8).max(0.99).default(0.95),
  variants: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    allocation: z.number().min(0).max(100),
    feature_value: z.any()
  })).min(2, 'At least 2 variants are required'),
  status: z.enum(['draft', 'running', 'paused', 'completed', 'cancelled']).default('draft')
})

// GET - List feature flags or A/B tests with analytics
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const type = searchParams.get('type') || 'flags'
    const environment = searchParams.get('environment')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const tag = searchParams.get('tag')

    try {
      if (type === 'flags') {
        return await getFeatureFlags(serviceClient, { environment, status, search, tag })
      } else if (type === 'tests') {
        return await getABTests(serviceClient, { status, search })
      } else if (type === 'analytics') {
        return await getFeatureFlagAnalytics(serviceClient, searchParams.get('flag_key'))
      }

      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })

    } catch (error) {
      console.error('Error fetching feature flags data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feature flags data' },
        { status: 500 }
      )
    }
  }, {
    resource: 'feature_flags',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create feature flag or A/B test
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'flag'

    try {
      const body = await request.json()

      if (type === 'flag') {
        const validatedData = FeatureFlagSchema.parse(body)

        // Check for duplicate key
        const { data: existing } = await serviceClient
          .from('feature_flags')
          .select('id')
          .eq('key', validatedData.key)
          .eq('environment', validatedData.environment)
          .single()

        if (existing) {
          return NextResponse.json({
            error: 'Feature flag with this key already exists in this environment'
          }, { status: 400 })
        }

        const flagData = {
          ...validatedData,
          created_by: context.userId
        }

        const { data: flag, error } = await serviceClient
          .from('feature_flags')
          .insert(flagData)
          .select()
          .single()

        if (error) throw error

        // Log the activity
        await serviceClient
          .from('tenant_activity_logs')
          .insert({
            user_id: context.userId,
            action: 'feature_flag.created',
            entity_type: 'feature_flag',
            entity_id: flag.id,
            metadata: {
              flag_name: validatedData.name,
              key: validatedData.key,
              environment: validatedData.environment,
              type: validatedData.type
            }
          })

        return NextResponse.json({
          message: 'Feature flag created successfully',
          flag
        }, { status: 201 })
      }

      if (type === 'test') {
        const validatedData = ABTestSchema.parse(body)

        // Validate variant allocations sum to 100
        const totalAllocation = validatedData.variants.reduce((sum, v) => sum + v.allocation, 0)
        if (totalAllocation !== 100) {
          return NextResponse.json({
            error: 'Variant allocations must sum to 100%'
          }, { status: 400 })
        }

        const testData = {
          ...validatedData,
          created_by: context.userId
        }

        const { data: test, error } = await serviceClient
          .from('ab_tests')
          .insert(testData)
          .select()
          .single()

        if (error) throw error

        await serviceClient
          .from('tenant_activity_logs')
          .insert({
            user_id: context.userId,
            action: 'ab_test.created',
            entity_type: 'ab_test',
            entity_id: test.id,
            metadata: {
              test_name: validatedData.name,
              feature_flag_key: validatedData.feature_flag_key,
              variants: validatedData.variants.length
            }
          })

        return NextResponse.json({
          message: 'A/B test created successfully',
          test
        }, { status: 201 })
      }

      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }, { status: 400 })
      }

      console.error('Error creating feature flag resource:', error)
      return NextResponse.json(
        { error: 'Failed to create feature flag resource' },
        { status: 500 }
      )
    }
  }, {
    resource: 'feature_flags',
    action: 'manage',
    requireTenant: false
  })
}

// PUT - Update feature flag or A/B test
export async function PUT(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') || 'flag'
    const action = searchParams.get('action') // 'toggle', 'update', 'gradual_rollout'

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    try {
      const body = await request.json()

      if (type === 'flag') {
        if (action === 'toggle') {
          const { is_active } = body
          
          const { data: flag, error } = await serviceClient
            .from('feature_flags')
            .update({
              is_active,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

          if (error) throw error

          await logFeatureFlagEvent(serviceClient, context.userId, flag, 'toggled', { is_active })

          return NextResponse.json({
            message: `Feature flag ${is_active ? 'enabled' : 'disabled'}`,
            flag
          })
        }

        if (action === 'gradual_rollout') {
          return await processGradualRollout(serviceClient, id, context.userId)
        }

        // Regular update
        const validatedData = FeatureFlagSchema.partial().parse(body)

        const { data: flag, error } = await serviceClient
          .from('feature_flags')
          .update({
            ...validatedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        await logFeatureFlagEvent(serviceClient, context.userId, flag, 'updated', validatedData)

        return NextResponse.json({
          message: 'Feature flag updated successfully',
          flag
        })
      }

      if (type === 'test') {
        if (action === 'start') {
          return await startABTest(serviceClient, id, context.userId)
        }

        if (action === 'stop') {
          return await stopABTest(serviceClient, id, context.userId, body.reason)
        }

        // Regular update
        const validatedData = ABTestSchema.partial().parse(body)

        const { data: test, error } = await serviceClient
          .from('ab_tests')
          .update({
            ...validatedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        return NextResponse.json({
          message: 'A/B test updated successfully',
          test
        })
      }

      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })

    } catch (error) {
      console.error('Error updating feature flag resource:', error)
      return NextResponse.json(
        { error: 'Failed to update feature flag resource' },
        { status: 500 }
      )
    }
  }, {
    resource: 'feature_flags',
    action: 'manage',
    requireTenant: false
  })
}

// Helper functions
async function getFeatureFlags(serviceClient: any, filters: any) {
  let query = serviceClient
    .from('feature_flags')
    .select(`
      *,
      creator:profiles(first_name, last_name, email),
      usage_stats:feature_flag_events(
        id,
        event_type,
        created_at
      )
    `)

  if (filters.environment) query = query.eq('environment', filters.environment)
  if (filters.status === 'active') query = query.eq('is_active', true)
  if (filters.status === 'inactive') query = query.eq('is_active', false)
  if (filters.search) {
    query = query.or(`
      name.ilike.%${filters.search}%,
      key.ilike.%${filters.search}%,
      description.ilike.%${filters.search}%
    `)
  }
  if (filters.tag) {
    query = query.contains('tags', [filters.tag])
  }

  const { data: flags, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  // Add analytics to each flag
  const flagsWithAnalytics = (flags || []).map(flag => {
    const events = flag.usage_stats || []
    const evaluations = events.filter(e => e.event_type === 'evaluated')
    const toggles = events.filter(e => e.event_type === 'toggled')

    return {
      ...flag,
      analytics: {
        total_evaluations: evaluations.length,
        recent_evaluations: evaluations.filter(e => 
          new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        toggle_history: toggles.length,
        last_evaluation: evaluations[0]?.created_at || null
      }
    }
  })

  return NextResponse.json({
    flags: flagsWithAnalytics,
    summary: {
      total: flags?.length || 0,
      active: flags?.filter(f => f.is_active).length || 0,
      environments: {
        development: flags?.filter(f => f.environment === 'development').length || 0,
        staging: flags?.filter(f => f.environment === 'staging').length || 0,
        production: flags?.filter(f => f.environment === 'production').length || 0
      }
    }
  })
}

async function getABTests(serviceClient: any, filters: any) {
  let query = serviceClient
    .from('ab_tests')
    .select(`
      *,
      creator:profiles(first_name, last_name, email),
      metrics:ab_test_metrics(
        metric_name,
        variant_name,
        value,
        recorded_at
      )
    `)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.search) {
    query = query.or(`
      name.ilike.%${filters.search}%,
      hypothesis.ilike.%${filters.search}%,
      feature_flag_key.ilike.%${filters.search}%
    `)
  }

  const { data: tests, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  // Calculate test analytics
  const testsWithAnalytics = (tests || []).map(test => {
    const metrics = test.metrics || []
    const participants = [...new Set(metrics.map(m => m.user_id))].length

    return {
      ...test,
      analytics: {
        participants,
        conversion_rates: calculateConversionRates(test.variants, metrics),
        statistical_significance: calculateStatisticalSignificance(test.variants, metrics)
      }
    }
  })

  return NextResponse.json({
    tests: testsWithAnalytics,
    summary: {
      total: tests?.length || 0,
      running: tests?.filter(t => t.status === 'running').length || 0,
      completed: tests?.filter(t => t.status === 'completed').length || 0
    }
  })
}

async function getFeatureFlagAnalytics(serviceClient: any, flagKey: string | null) {
  if (!flagKey) {
    return NextResponse.json({ error: 'Flag key is required' }, { status: 400 })
  }

  const { data: events, error } = await serviceClient
    .from('feature_flag_events')
    .select('*')
    .eq('flag_key', flagKey)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) throw error

  // Generate analytics
  const evaluations = events?.filter(e => e.event_type === 'evaluated') || []
  const hourlyStats = generateHourlyStats(evaluations)
  const userSegmentation = analyzeUserSegmentation(evaluations)

  return NextResponse.json({
    flag_key: flagKey,
    analytics: {
      total_evaluations: evaluations.length,
      unique_users: [...new Set(evaluations.map(e => e.user_id))].length,
      hourly_stats: hourlyStats,
      user_segmentation: userSegmentation,
      recent_activity: events?.slice(0, 50) || []
    }
  })
}

async function processGradualRollout(serviceClient: any, flagId: string, userId: string) {
  const { data: flag, error } = await serviceClient
    .from('feature_flags')
    .select('*')
    .eq('id', flagId)
    .single()

  if (error) throw error

  const gradualConfig = flag.rollout_strategy?.gradual_config
  if (!gradualConfig) {
    return NextResponse.json({
      error: 'Flag is not configured for gradual rollout'
    }, { status: 400 })
  }

  // Calculate next percentage
  const currentPercentage = flag.rollout_strategy.percentage || gradualConfig.start_percentage
  const nextPercentage = Math.min(
    currentPercentage + gradualConfig.increment_percentage,
    gradualConfig.end_percentage
  )

  // Update flag
  const updatedRolloutStrategy = {
    ...flag.rollout_strategy,
    percentage: nextPercentage
  }

  const { data: updatedFlag, error: updateError } = await serviceClient
    .from('feature_flags')
    .update({
      rollout_strategy: updatedRolloutStrategy,
      updated_at: new Date().toISOString()
    })
    .eq('id', flagId)
    .select()
    .single()

  if (updateError) throw updateError

  await logFeatureFlagEvent(serviceClient, userId, updatedFlag, 'gradual_rollout', {
    from_percentage: currentPercentage,
    to_percentage: nextPercentage
  })

  return NextResponse.json({
    message: `Rollout increased to ${nextPercentage}%`,
    flag: updatedFlag,
    completed: nextPercentage >= gradualConfig.end_percentage
  })
}

async function startABTest(serviceClient: any, testId: string, userId: string) {
  const { data: test, error } = await serviceClient
    .from('ab_tests')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', testId)
    .select()
    .single()

  if (error) throw error

  await serviceClient
    .from('tenant_activity_logs')
    .insert({
      user_id: userId,
      action: 'ab_test.started',
      entity_type: 'ab_test',
      entity_id: testId,
      metadata: {
        test_name: test.name,
        variants: test.variants.length
      }
    })

  return NextResponse.json({
    message: 'A/B test started successfully',
    test
  })
}

async function stopABTest(serviceClient: any, testId: string, userId: string, reason?: string) {
  const { data: test, error } = await serviceClient
    .from('ab_tests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', testId)
    .select()
    .single()

  if (error) throw error

  await serviceClient
    .from('tenant_activity_logs')
    .insert({
      user_id: userId,
      action: 'ab_test.stopped',
      entity_type: 'ab_test',
      entity_id: testId,
      metadata: {
        test_name: test.name,
        reason: reason || 'manual_stop'
      }
    })

  return NextResponse.json({
    message: 'A/B test stopped successfully',
    test
  })
}

async function logFeatureFlagEvent(
  serviceClient: any,
  userId: string,
  flag: any,
  eventType: string,
  metadata: any
) {
  await serviceClient
    .from('feature_flag_events')
    .insert({
      flag_id: flag.id,
      flag_key: flag.key,
      user_id: userId,
      event_type: eventType,
      metadata,
      created_at: new Date().toISOString()
    })
}

function generateHourlyStats(evaluations: any[]) {
  const hourlyStats = []
  
  for (let i = 23; i >= 0; i--) {
    const hour = new Date()
    hour.setHours(hour.getHours() - i, 0, 0, 0)
    const nextHour = new Date(hour)
    nextHour.setHours(nextHour.getHours() + 1)
    
    const hourEvaluations = evaluations.filter(e => {
      const evalTime = new Date(e.created_at)
      return evalTime >= hour && evalTime < nextHour
    })
    
    hourlyStats.push({
      hour: hour.toISOString(),
      evaluations: hourEvaluations.length,
      unique_users: [...new Set(hourEvaluations.map(e => e.user_id))].length
    })
  }
  
  return hourlyStats
}

function analyzeUserSegmentation(evaluations: any[]) {
  const segments = {
    new_users: 0,
    returning_users: 0,
    power_users: 0
  }

  const userEvaluations = evaluations.reduce((acc, evaluation) => {
    acc[evaluation.user_id] = (acc[evaluation.user_id] || 0) + 1
    return acc
  }, {})

  Object.values(userEvaluations).forEach((count: any) => {
    if (count === 1) segments.new_users++
    else if (count <= 10) segments.returning_users++
    else segments.power_users++
  })

  return segments
}

function calculateConversionRates(variants: any[], metrics: any[]) {
  return variants.map(variant => {
    const variantMetrics = metrics.filter(m => m.variant_name === variant.name)
    const conversions = variantMetrics.filter(m => m.value > 0).length
    const rate = variantMetrics.length > 0 ? (conversions / variantMetrics.length) * 100 : 0
    
    return {
      variant: variant.name,
      conversion_rate: Math.round(rate * 100) / 100,
      sample_size: variantMetrics.length
    }
  })
}

function calculateStatisticalSignificance(variants: any[], metrics: any[]) {
  // Simplified statistical significance calculation
  if (variants.length < 2) return null
  
  const variantStats = variants.map(variant => {
    const variantMetrics = metrics.filter(m => m.variant_name === variant.name)
    const conversions = variantMetrics.filter(m => m.value > 0).length
    return {
      name: variant.name,
      conversions,
      samples: variantMetrics.length,
      rate: variantMetrics.length > 0 ? conversions / variantMetrics.length : 0
    }
  })
  
  // Basic significance test (would use proper statistical testing in production)
  const minSampleSize = 100
  const hasSignificance = variantStats.every(v => v.samples >= minSampleSize)
  
  return {
    is_significant: hasSignificance && Math.abs(variantStats[0].rate - variantStats[1].rate) > 0.05,
    confidence_level: hasSignificance ? 0.95 : 0,
    sample_sizes: variantStats.map(v => ({ variant: v.name, sample_size: v.samples }))
  }
}
/**
 * Admin Email Segmentation API
 * Advanced audience segmentation for targeted email campaigns
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const SegmentConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in_list', 'not_in_list']),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
  type: z.enum(['client_property', 'activity', 'engagement', 'custom_field'])
})

const SegmentSchema = z.object({
  name: z.string().min(1, 'Segment name is required'),
  description: z.string().optional(),
  conditions: z.array(SegmentConditionSchema),
  logic: z.enum(['AND', 'OR']).default('AND'),
  is_dynamic: z.boolean().default(true),
  tags: z.array(z.string()).default([])
})

// GET - List audience segments with member counts
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const search = searchParams.get('search')
    const user_id = searchParams.get('user_id')
    const offset = (page - 1) * limit

    try {
      let query = supabase
        .from('client_segments')
        .select(`
          *,
          profiles(
            first_name,
            last_name,
            email
          )
        `)

      if (user_id) {
        query = query.eq('user_id', user_id)
      }

      if (search) {
        query = query.or(`
          name.ilike.%${search}%,
          description.ilike.%${search}%
        `)
      }

      // Get total count for pagination
      const { count } = await supabase
        .from('client_segments')
        .select('*', { count: 'exact', head: true })

      // Get paginated results
      const { data: segments, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Calculate member counts for each segment
      const segmentsWithCounts = await Promise.all(
        (segments || []).map(async (segment) => {
          const memberCount = await calculateSegmentMemberCount(supabase, segment)
          
          // Get recent sequence enrollments for this segment
          const { data: recentEnrollments } = await supabase
            .from('sequence_enrollments')
            .select('id, sequence_id, enrolled_at')
            .eq('user_id', segment.user_id)
            .gte('enrolled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            .limit(10)

          return {
            ...segment,
            member_count: memberCount,
            recent_activity: {
              enrollments_30d: recentEnrollments?.length || 0
            }
          }
        })
      )

      return NextResponse.json({
        segments: segmentsWithCounts,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        summary: {
          total_segments: count || 0,
          total_members: segmentsWithCounts.reduce((sum, s) => sum + s.member_count, 0)
        }
      })

    } catch (error) {
      console.error('Error fetching segments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch segments' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create new audience segment
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()

    try {
      const body = await request.json()
      const validatedData = SegmentSchema.parse(body)

      // Test the segment conditions to ensure they're valid
      const testResult = await testSegmentConditions(serviceClient, validatedData.conditions, validatedData.logic)
      
      if (!testResult.valid) {
        return NextResponse.json({
          error: 'Invalid segment conditions',
          details: testResult.errors
        }, { status: 400 })
      }

      const segmentData = {
        user_id: body.user_id || context.userId, // Allow admin to create for specific users
        name: validatedData.name,
        description: validatedData.description,
        conditions: validatedData.conditions,
        logic: validatedData.logic,
        is_dynamic: validatedData.is_dynamic,
        tags: validatedData.tags,
        estimated_size: testResult.memberCount
      }

      const { data: segment, error } = await serviceClient
        .from('client_segments')
        .insert(segmentData)
        .select(`
          *,
          profiles(
            first_name,
            last_name,
            email
          )
        `)
        .single()

      if (error) throw error

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          user_id: context.userId,
          action: 'client_segment.created',
          entity_type: 'client_segment',
          entity_id: segment.id,
          metadata: {
            segment_name: validatedData.name,
            conditions_count: validatedData.conditions.length,
            estimated_size: testResult.memberCount,
            created_by: 'admin'
          }
        })

      return NextResponse.json({
        message: 'Audience segment created successfully',
        segment: {
          ...segment,
          member_count: testResult.memberCount
        }
      }, { status: 201 })

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

      console.error('Error creating segment:', error)
      return NextResponse.json(
        { error: 'Failed to create segment' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'manage',
    requireTenant: false
  })
}

// Helper function to calculate segment member count
async function calculateSegmentMemberCount(supabase: any, segment: any): Promise<number> {
  try {
    const query = buildSegmentQuery(supabase, segment.conditions, segment.logic, segment.user_id)
    const { count } = await query.select('*', { count: 'exact', head: true })
    return count || 0
  } catch (error) {
    console.error('Error calculating segment size:', error)
    return 0
  }
}

// Helper function to test segment conditions
async function testSegmentConditions(supabase: any, conditions: any[], logic: string) {
  try {
    // Build a test query to validate conditions
    const testQuery = supabase.from('clients').select('id')
    
    let validQuery = testQuery
    let conditionCount = 0

    for (const condition of conditions) {
      try {
        validQuery = applyConditionToQuery(validQuery, condition, logic === 'OR' && conditionCount > 0)
        conditionCount++
      } catch (error) {
        return {
          valid: false,
          errors: [`Invalid condition: ${condition.field} ${condition.operator} ${condition.value}`],
          memberCount: 0
        }
      }
    }

    // Execute test query to get count
    const { count, error } = await validQuery.select('*', { count: 'exact', head: true }).limit(1)
    
    if (error) {
      return {
        valid: false,
        errors: [error.message],
        memberCount: 0
      }
    }

    return {
      valid: true,
      errors: [],
      memberCount: count || 0
    }
  } catch (error) {
    return {
      valid: false,
      errors: [error.message || 'Unknown validation error'],
      memberCount: 0
    }
  }
}

// Helper function to build segment query
function buildSegmentQuery(supabase: any, conditions: any[], logic: string, userId?: string) {
  let query = supabase.from('clients').select('*')
  
  if (userId) {
    query = query.eq('user_id', userId)
  }

  conditions.forEach((condition, index) => {
    query = applyConditionToQuery(query, condition, logic === 'OR' && index > 0)
  })

  return query
}

// Helper function to apply individual condition to query
function applyConditionToQuery(query: any, condition: any, isOrCondition: boolean = false) {
  const { field, operator, value, type } = condition

  // Map condition types to actual database fields
  let actualField = field
  if (type === 'client_property') {
    // Direct client fields
    actualField = field
  } else if (type === 'custom_field') {
    // Custom fields stored in JSON
    actualField = `custom_fields->>${field}`
  }

  switch (operator) {
    case 'equals':
      return isOrCondition ? query.or(`${actualField}.eq.${value}`) : query.eq(actualField, value)
    case 'not_equals':
      return isOrCondition ? query.or(`${actualField}.neq.${value}`) : query.neq(actualField, value)
    case 'contains':
      return isOrCondition ? query.or(`${actualField}.ilike.%${value}%`) : query.ilike(actualField, `%${value}%`)
    case 'not_contains':
      return isOrCondition ? query.or(`${actualField}.not.ilike.%${value}%`) : query.not(actualField, 'ilike', `%${value}%`)
    case 'greater_than':
      return isOrCondition ? query.or(`${actualField}.gt.${value}`) : query.gt(actualField, value)
    case 'less_than':
      return isOrCondition ? query.or(`${actualField}.lt.${value}`) : query.lt(actualField, value)
    case 'in_list':
      const inValues = Array.isArray(value) ? value : [value]
      return isOrCondition ? query.or(`${actualField}.in.(${inValues.join(',')})`) : query.in(actualField, inValues)
    case 'not_in_list':
      const notInValues = Array.isArray(value) ? value : [value]
      return isOrCondition ? query.or(`${actualField}.not.in.(${notInValues.join(',')})`) : query.not(actualField, 'in', notInValues)
    default:
      throw new Error(`Unsupported operator: ${operator}`)
  }
}
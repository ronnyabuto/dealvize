/**
 * Admin Email Automation Sequences Management API
 * Provides comprehensive oversight of email automation across all tenants
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'

// GET - List all email sequences across tenants with analytics
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const status = searchParams.get('status')
    const userId = searchParams.get('user_id')
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    try {
      let query = supabase
        .from('nurturing_sequences')
        .select(`
          id,
          user_id,
          sequence_name,
          description,
          trigger_type,
          trigger_conditions,
          target_audience,
          is_active,
          created_at,
          updated_at,
          profiles!inner(
            id,
            first_name,
            last_name,
            email
          ),
          sequence_steps:nurturing_sequence_steps(count),
          enrollments:sequence_enrollments(
            id,
            status,
            created_at
          )
        `)

      // Apply filters
      if (status === 'active') {
        query = query.eq('is_active', true)
      } else if (status === 'inactive') {
        query = query.eq('is_active', false)
      }

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (search) {
        query = query.or(`
          sequence_name.ilike.%${search}%,
          description.ilike.%${search}%
        `)
      }

      // Get total count for pagination
      const { count } = await supabase
        .from('nurturing_sequences')
        .select('*', { count: 'exact', head: true })

      // Get paginated results
      const { data: sequences, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Calculate analytics for each sequence
      const sequencesWithAnalytics = await Promise.all(
        (sequences || []).map(async (sequence) => {
          const [
            { data: enrollmentStats },
            { data: messageStats }
          ] = await Promise.all([
            // Enrollment statistics
            supabase
              .from('sequence_enrollments')
              .select('status')
              .eq('sequence_id', sequence.id),
            
            // Message performance
            supabase
              .from('messages')
              .select('status, metadata')
              .eq('metadata->>sequence_id', sequence.id.toString())
              .eq('message_type', 'email')
          ])

          const totalEnrollments = enrollmentStats?.length || 0
          const activeEnrollments = enrollmentStats?.filter(e => e.status === 'active').length || 0
          const completedEnrollments = enrollmentStats?.filter(e => e.status === 'completed').length || 0
          const pausedEnrollments = enrollmentStats?.filter(e => e.status === 'paused').length || 0

          const totalMessages = messageStats?.length || 0
          const sentMessages = messageStats?.filter(m => m.status === 'sent').length || 0
          const failedMessages = messageStats?.filter(m => m.status === 'failed').length || 0

          const deliveryRate = totalMessages > 0 ? Math.round((sentMessages / totalMessages) * 100) : 0

          return {
            ...sequence,
            step_count: sequence.sequence_steps?.[0]?.count || 0,
            analytics: {
              total_enrollments: totalEnrollments,
              active_enrollments: activeEnrollments,
              completed_enrollments: completedEnrollments,
              paused_enrollments: pausedEnrollments,
              completion_rate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
              total_messages_sent: totalMessages,
              successful_deliveries: sentMessages,
              failed_deliveries: failedMessages,
              delivery_rate: deliveryRate
            }
          }
        })
      )

      // Calculate summary statistics
      const summary = {
        total_sequences: count || 0,
        active_sequences: sequencesWithAnalytics.filter(s => s.is_active).length,
        inactive_sequences: sequencesWithAnalytics.filter(s => !s.is_active).length,
        total_enrollments: sequencesWithAnalytics.reduce((sum, s) => sum + s.analytics.total_enrollments, 0),
        total_messages: sequencesWithAnalytics.reduce((sum, s) => sum + s.analytics.total_messages_sent, 0),
        average_delivery_rate: sequencesWithAnalytics.length > 0 
          ? Math.round(sequencesWithAnalytics.reduce((sum, s) => sum + s.analytics.delivery_rate, 0) / sequencesWithAnalytics.length)
          : 0
      }

      return NextResponse.json({
        sequences: sequencesWithAnalytics,
        summary,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })

    } catch (error) {
      console.error('Error fetching automation sequences:', error)
      return NextResponse.json(
        { error: 'Failed to fetch automation sequences' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create system-wide email sequence template
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()

    try {
      const body = await request.json()
      const {
        sequence_name,
        description,
        trigger_type = 'manual',
        trigger_conditions = {},
        target_audience = 'all',
        sequence_steps = [],
        is_system_template = false
      } = body

      if (!sequence_name) {
        return NextResponse.json(
          { error: 'Sequence name is required' },
          { status: 400 }
        )
      }

      // Create sequence
      const { data: sequence, error: sequenceError } = await serviceClient
        .from('nurturing_sequences')
        .insert({
          user_id: is_system_template ? null : context.userId, // System templates have null user_id
          sequence_name,
          description,
          trigger_type,
          trigger_conditions,
          target_audience,
          is_system_template
        })
        .select()
        .single()

      if (sequenceError) throw sequenceError

      // Insert sequence steps if provided
      if (sequence_steps.length > 0) {
        const stepsToInsert = sequence_steps.map((step: any, index: number) => ({
          sequence_id: sequence.id,
          step_number: index + 1,
          template_id: step.template_id,
          delay_days: step.delay_days || 0,
          delay_hours: step.delay_hours || 0,
          conditions: step.conditions || {},
          is_active: step.is_active !== false
        }))

        const { error: stepsError } = await serviceClient
          .from('nurturing_sequence_steps')
          .insert(stepsToInsert)

        if (stepsError) {
          // Rollback sequence creation
          await serviceClient
            .from('nurturing_sequences')
            .delete()
            .eq('id', sequence.id)
          
          throw stepsError
        }
      }

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          user_id: context.userId,
          action: 'automation_sequence.created',
          entity_type: 'automation_sequence',
          entity_id: sequence.id,
          metadata: {
            sequence_name,
            trigger_type,
            step_count: sequence_steps.length,
            is_system_template,
            created_by: 'admin'
          }
        })

      return NextResponse.json({
        message: 'Automation sequence created successfully',
        sequence
      }, { status: 201 })

    } catch (error) {
      console.error('Error creating automation sequence:', error)
      return NextResponse.json(
        { error: 'Failed to create automation sequence' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'manage',
    requireTenant: false
  })
}

export async function PUT(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const sequenceId = searchParams.get('id')

    if (!sequenceId) {
      return NextResponse.json(
        { error: 'Sequence ID is required' },
        { status: 400 }
      )
    }

    try {
      const body = await request.json()
      const { is_active, pause_all_enrollments } = body

      // Update sequence
      const updateData: any = { updated_at: new Date().toISOString() }
      if (typeof is_active === 'boolean') updateData.is_active = is_active

      const { data: sequence, error: updateError } = await serviceClient
        .from('nurturing_sequences')
        .update(updateData)
        .eq('id', sequenceId)
        .select()
        .single()

      if (updateError) throw updateError

      // If pausing sequence, also pause all active enrollments
      if (pause_all_enrollments && !is_active) {
        await serviceClient
          .from('sequence_enrollments')
          .update({
            status: 'paused',
            paused_at: new Date().toISOString(),
            pause_reason: 'sequence_disabled_by_admin',
            updated_at: new Date().toISOString()
          })
          .eq('sequence_id', sequenceId)
          .eq('status', 'active')
      }

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          user_id: context.userId,
          action: `automation_sequence.${is_active ? 'enabled' : 'disabled'}`,
          entity_type: 'automation_sequence',
          entity_id: sequenceId,
          metadata: {
            sequence_name: sequence.sequence_name,
            pause_enrollments: pause_all_enrollments || false,
            updated_by: 'admin'
          }
        })

      return NextResponse.json({
        message: `Sequence ${is_active ? 'enabled' : 'disabled'} successfully`,
        sequence
      })

    } catch (error) {
      console.error('Error updating automation sequence:', error)
      return NextResponse.json(
        { error: 'Failed to update automation sequence' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'manage',
    requireTenant: false
  })
}
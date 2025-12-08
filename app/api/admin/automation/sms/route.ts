/**
 * Admin SMS Automation Management API
 * Twilio-powered SMS sequences and campaigns
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const SmsTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  message: z.string().min(1, 'Message is required').max(1600, 'Message too long'),
  variables: z.array(z.string()).default([]),
  category: z.enum(['welcome', 'follow_up', 'promotional', 'reminder', 'general']).default('general'),
  is_system: z.boolean().default(false)
})

const SmsSequenceSchema = z.object({
  sequence_name: z.string().min(1, 'Sequence name is required'),
  description: z.string().optional(),
  trigger_type: z.enum(['manual', 'lead_created', 'deal_stage_change', 'appointment_reminder']).default('manual'),
  trigger_conditions: z.record(z.any()).default({}),
  target_audience: z.string().default('all'),
  sequence_steps: z.array(z.object({
    template_id: z.string(),
    delay_days: z.number().default(0),
    delay_hours: z.number().default(0),
    conditions: z.record(z.any()).default({}),
    is_active: z.boolean().default(true)
  })).default([])
})

// GET - List SMS templates and sequences
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const type = searchParams.get('type') // 'templates' or 'sequences'
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const search = searchParams.get('search')
    const user_id = searchParams.get('user_id')
    const offset = (page - 1) * limit

    try {
      if (type === 'templates') {
        return await getSmsTemplates(supabase, { page, limit, search, user_id, offset })
      } else if (type === 'sequences') {
        return await getSmsSequences(supabase, { page, limit, search, user_id, offset })
      } else {
        // Return both templates and sequences overview
        const [templatesRes, sequencesRes] = await Promise.all([
          getSmsTemplates(supabase, { page: 1, limit: 5, search: null, user_id, offset: 0 }),
          getSmsSequences(supabase, { page: 1, limit: 5, search: null, user_id, offset: 0 })
        ])

        const templates = await templatesRes.json()
        const sequences = await sequencesRes.json()

        // Get SMS usage statistics
        const { data: smsStats } = await supabase
          .from('messages')
          .select('id, status, sent_at, metadata')
          .eq('message_type', 'sms')
          .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

        const totalSms = smsStats?.length || 0
        const deliveredSms = smsStats?.filter(m => m.status === 'delivered').length || 0
        const failedSms = smsStats?.filter(m => m.status === 'failed').length || 0

        return NextResponse.json({
          overview: {
            total_templates: templates.templates?.length || 0,
            total_sequences: sequences.sequences?.length || 0,
            sms_sent_30d: totalSms,
            delivery_rate: totalSms > 0 ? Math.round((deliveredSms / totalSms) * 100) : 0,
            failed_rate: totalSms > 0 ? Math.round((failedSms / totalSms) * 100) : 0
          },
          recent_templates: templates.templates?.slice(0, 5) || [],
          recent_sequences: sequences.sequences?.slice(0, 5) || []
        })
      }

    } catch (error) {
      console.error('Error fetching SMS data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch SMS data' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create SMS template or sequence
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'template' or 'sequence'

    try {
      const body = await request.json()

      if (type === 'template') {
        const validatedData = SmsTemplateSchema.parse(body)
        
        // Extract variables from message content
        const extractedVariables = extractVariablesFromMessage(validatedData.message)
        
        const templateData = {
          user_id: validatedData.is_system ? null : context.userId,
          name: validatedData.name,
          message: validatedData.message,
          variables: [...new Set([...validatedData.variables, ...extractedVariables])],
          category: validatedData.category,
          is_system: validatedData.is_system,
          message_type: 'sms'
        }

        const { data: template, error } = await serviceClient
          .from('sms_templates')
          .insert(templateData)
          .select(`
            *,
            profiles(first_name, last_name, email)
          `)
          .single()

        if (error) throw error

        await logActivity(serviceClient, context.userId, 'sms_template.created', 'sms_template', template.id, {
          template_name: validatedData.name,
          category: validatedData.category,
          is_system: validatedData.is_system
        })

        return NextResponse.json({
          message: 'SMS template created successfully',
          template
        }, { status: 201 })

      } else if (type === 'sequence') {
        const validatedData = SmsSequenceSchema.parse(body)

        // Create sequence
        const { data: sequence, error: sequenceError } = await serviceClient
          .from('sms_sequences')
          .insert({
            user_id: body.user_id || context.userId,
            sequence_name: validatedData.sequence_name,
            description: validatedData.description,
            trigger_type: validatedData.trigger_type,
            trigger_conditions: validatedData.trigger_conditions,
            target_audience: validatedData.target_audience
          })
          .select()
          .single()

        if (sequenceError) throw sequenceError

        // Insert sequence steps if provided
        if (validatedData.sequence_steps.length > 0) {
          const stepsToInsert = validatedData.sequence_steps.map((step, index) => ({
            sequence_id: sequence.id,
            step_number: index + 1,
            template_id: step.template_id,
            delay_days: step.delay_days,
            delay_hours: step.delay_hours,
            conditions: step.conditions,
            is_active: step.is_active
          }))

          const { error: stepsError } = await serviceClient
            .from('sms_sequence_steps')
            .insert(stepsToInsert)

          if (stepsError) {
            // Rollback sequence creation
            await serviceClient
              .from('sms_sequences')
              .delete()
              .eq('id', sequence.id)
            
            throw stepsError
          }
        }

        await logActivity(serviceClient, context.userId, 'sms_sequence.created', 'sms_sequence', sequence.id, {
          sequence_name: validatedData.sequence_name,
          trigger_type: validatedData.trigger_type,
          step_count: validatedData.sequence_steps.length
        })

        return NextResponse.json({
          message: 'SMS sequence created successfully',
          sequence
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

      console.error('Error creating SMS resource:', error)
      return NextResponse.json(
        { error: 'Failed to create SMS resource' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'manage',
    requireTenant: false
  })
}

// Helper function to get SMS templates
async function getSmsTemplates(supabase: any, options: any) {
  const { page, limit, search, user_id, offset } = options

  let query = supabase
    .from('sms_templates')
    .select(`
      *,
      profiles(first_name, last_name, email),
      usage_stats:messages(template_id, status, created_at)
    `)
    .eq('is_active', true)

  if (user_id) query = query.eq('user_id', user_id)
  if (search) {
    query = query.or(`
      name.ilike.%${search}%,
      message.ilike.%${search}%
    `)
  }

  const { count } = await supabase
    .from('sms_templates')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { data: templates, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  // Calculate usage statistics
  const templatesWithStats = templates?.map(template => {
    const usageStats = template.usage_stats || []
    const totalUses = usageStats.length
    const successfulUses = usageStats.filter(u => u.status === 'delivered').length

    return {
      ...template,
      usage_analytics: {
        total_uses: totalUses,
        successful_uses: successfulUses,
        success_rate: totalUses > 0 ? Math.round((successfulUses / totalUses) * 100) : 0
      }
    }
  })

  return NextResponse.json({
    templates: templatesWithStats,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  })
}

// Helper function to get SMS sequences
async function getSmsSequences(supabase: any, options: any) {
  const { page, limit, search, user_id, offset } = options

  let query = supabase
    .from('sms_sequences')
    .select(`
      *,
      profiles(first_name, last_name, email),
      sequence_steps:sms_sequence_steps(count),
      enrollments:sms_sequence_enrollments(id, status, created_at)
    `)

  if (user_id) query = query.eq('user_id', user_id)
  if (search) {
    query = query.or(`
      sequence_name.ilike.%${search}%,
      description.ilike.%${search}%
    `)
  }

  const { count } = await supabase
    .from('sms_sequences')
    .select('*', { count: 'exact', head: true })

  const { data: sequences, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  // Calculate analytics
  const sequencesWithAnalytics = sequences?.map(sequence => {
    const enrollments = sequence.enrollments || []
    const totalEnrollments = enrollments.length
    const activeEnrollments = enrollments.filter(e => e.status === 'active').length
    const completedEnrollments = enrollments.filter(e => e.status === 'completed').length

    return {
      ...sequence,
      step_count: sequence.sequence_steps?.[0]?.count || 0,
      analytics: {
        total_enrollments: totalEnrollments,
        active_enrollments: activeEnrollments,
        completed_enrollments: completedEnrollments,
        completion_rate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0
      }
    }
  })

  return NextResponse.json({
    sequences: sequencesWithAnalytics,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  })
}

// Helper function to extract variables from SMS message
function extractVariablesFromMessage(message: string): string[] {
  const variableRegex = /\{\{\s*(\w+)\s*\}\}/g
  const variables: string[] = []
  let match

  while ((match = variableRegex.exec(message)) !== null) {
    variables.push(match[1])
  }

  return [...new Set(variables)]
}

// Helper function to log activities
async function logActivity(serviceClient: any, userId: string, action: string, entityType: string, entityId: string, metadata: any) {
  await serviceClient
    .from('tenant_activity_logs')
    .insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: {
        ...metadata,
        created_by: 'admin'
      }
    })
}
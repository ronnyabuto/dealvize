/**
 * Automated Sequence Executor Cron Job
 * Processes pending email automation steps on a schedule
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const serviceClient = createServiceClient()

    const now = new Date()
    const executionInterval = 5 * 60 * 1000
    const roundedTime = Math.floor(now.getTime() / executionInterval) * executionInterval
    const executionId = `sequence-executor-${roundedTime}`

    const { data: existingExecution } = await serviceClient
      .from('cron_execution_log')
      .select('id, status')
      .eq('execution_id', executionId)
      .single()

    if (existingExecution) {
      if (existingExecution.status === 'running') {
        return NextResponse.json({
          skipped: true,
          reason: 'Execution already in progress',
          execution_id: executionId
        })
      }
      if (existingExecution.status === 'completed') {
        return NextResponse.json({
          skipped: true,
          reason: 'Already executed',
          execution_id: executionId
        })
      }
    }

    const { data: executionLog } = await serviceClient
      .from('cron_execution_log')
      .insert({
        job_name: 'sequence-executor',
        execution_id: executionId,
        status: 'running'
      })
      .select()
      .single()

    if (!executionLog) {
      return NextResponse.json({ error: 'Failed to create execution log' }, { status: 500 })
    }

    // Get all pending enrollments that are due for execution
    const { data: pendingEnrollments, error: fetchError } = await serviceClient
      .from('sequence_enrollments')
      .select(`
        *,
        client:clients(*),
        sequence:nurturing_sequences(*),
        current_step:nurturing_sequence_steps(
          *,
          template:email_templates(*)
        )
      `)
      .eq('status', 'active')
      .not('next_step_at', 'is', null)
      .lte('next_step_at', new Date().toISOString())
      .limit(100) // Process 100 at a time to avoid timeouts

    if (fetchError) {
      console.error('Error fetching pending enrollments:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    if (!pendingEnrollments || pendingEnrollments.length === 0) {
      return NextResponse.json({ 
        processed: 0, 
        message: 'No pending enrollments to process',
        timestamp: new Date().toISOString()
      })
    }

    console.log(`Processing ${pendingEnrollments.length} pending enrollments...`)

    const results = []
    const batchSize = 10 // Process in smaller batches to avoid overwhelming email service

    for (let i = 0; i < pendingEnrollments.length; i += batchSize) {
      const batch = pendingEnrollments.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (enrollment) => {
        try {
          const result = await processSequenceStep(serviceClient, enrollment)
          return result
        } catch (error) {
          console.error(`Error processing enrollment ${enrollment.id}:`, error)
          return {
            enrollment_id: enrollment.id,
            success: false,
            error: (error as any).message || 'Unknown error'
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < pendingEnrollments.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    // Log execution summary
    await serviceClient
      .from('tenant_activity_logs')
      .insert({
        action: 'cron.sequence_executor',
        entity_type: 'automation',
        metadata: {
          total_processed: results.length,
          successful: successCount,
          errors: errorCount,
          timestamp: new Date().toISOString(),
          results: results.slice(0, 10) // Store first 10 results for debugging
        }
      })

    console.log(`Cron execution complete: ${successCount} successful, ${errorCount} errors`)

    await serviceClient
      .from('cron_execution_log')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        records_processed: results.length,
        errors: results.filter(r => !r.success).map(r => ({ enrollment_id: r.enrollment_id, error: (r as any).error }))
      })
      .eq('id', executionLog.id)

    return NextResponse.json({
      processed: results.length,
      successful: successCount,
      errors: errorCount,
      execution_id: executionId,
      timestamp: new Date().toISOString(),
      sample_results: results.slice(0, 5)
    })

  } catch (error) {
    console.error('Error in cron sequence executor:', error)

    const executionId = `sequence-executor-${Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000)}`
    await createServiceClient()
      .from('cron_execution_log')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }]
      })
      .eq('execution_id', executionId)
      .eq('status', 'running')

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processSequenceStep(serviceClient: any, enrollment: any) {
  const { client, current_step, sequence } = enrollment

  if (!current_step || !current_step.template) {
    throw new Error('No current step or template found')
  }

  // Skip if sequence is not active
  if (!sequence.is_active) {
    await serviceClient
      .from('sequence_enrollments')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        pause_reason: 'sequence_disabled',
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollment.id)

    return {
      enrollment_id: enrollment.id,
      success: true,
      action: 'paused_due_to_inactive_sequence'
    }
  }

  // Process the email template with client data
  const processedTemplate = processEmailTemplate(
    current_step.template,
    client,
    sequence
  )

  // Send the email via Resend
  const emailResult = await sendEmailWithResend({
    to: client.email,
    subject: processedTemplate.subject,
    content: processedTemplate.content,
    template_id: current_step.template.id,
    client_id: client.id,
    sequence_id: sequence.id,
    step_id: current_step.id
  })

  // Record the message in the messages table
  const messageResult = await serviceClient
    .from('messages')
    .insert({
      user_id: enrollment.user_id,
      client_id: client.id,
      channel_id: await getEmailChannelId(serviceClient),
      direction: 'outbound',
      subject: processedTemplate.subject,
      content: processedTemplate.content,
      recipient_name: `${client.first_name} ${client.last_name}`,
      recipient_email: client.email,
      status: emailResult.success ? 'sent' : 'failed',
      message_type: 'email',
      priority: 'normal',
      metadata: {
        sequence_id: sequence.id,
        step_id: current_step.id,
        enrollment_id: enrollment.id,
        automated: true,
        provider: emailResult.provider || 'unknown',
        message_id: emailResult.message_id,
        error: emailResult.error || null
      },
      sent_at: new Date().toISOString()
    })
    .select()
    .single()

  // Get the next step in the sequence
  const { data: nextStep } = await serviceClient
    .from('nurturing_sequence_steps')
    .select('*')
    .eq('sequence_id', sequence.id)
    .eq('is_active', true)
    .gt('step_number', current_step.step_number)
    .order('step_number')
    .limit(1)
    .single()

  let updateData: any = {
    steps_completed: enrollment.steps_completed + 1,
    last_step_executed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (nextStep) {
    // Calculate when the next step should execute
    const nextExecutionTime = new Date()
    nextExecutionTime.setDate(nextExecutionTime.getDate() + (nextStep.delay_days || 0))
    nextExecutionTime.setHours(nextExecutionTime.getHours() + (nextStep.delay_hours || 0))

    updateData.current_step_id = nextStep.id
    updateData.next_step_at = nextExecutionTime.toISOString()
  } else {
    // No more steps - complete the sequence
    updateData.status = 'completed'
    updateData.completed_at = new Date().toISOString()
    updateData.current_step_id = null
    updateData.next_step_at = null
  }

  // Update the enrollment
  await serviceClient
    .from('sequence_enrollments')
    .update(updateData)
    .eq('id', enrollment.id)

  // Record activity for lead scoring
  await serviceClient
    .from('lead_activities')
    .insert({
      user_id: enrollment.user_id,
      client_id: client.id,
      activity_type: 'nurturing_email_sent',
      activity_data: {
        sequence_name: sequence.sequence_name,
        step_number: current_step.step_number,
        template_name: current_step.template.name
      },
      score_awarded: 0, // Nurturing doesn't affect score
      source: 'automation'
    })

  return {
    enrollment_id: enrollment.id,
    client_email: client.email,
    sequence_name: sequence.sequence_name,
    step_number: current_step.step_number,
    success: emailResult.success,
    next_step_scheduled: !!nextStep,
    message_id: emailResult.message_id
  }
}

function processEmailTemplate(template: any, client: any, sequence: any) {
  const variables = {
    client_first_name: client.first_name || '',
    client_last_name: client.last_name || '',
    client_name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
    client_email: client.email || '',
    client_phone: client.phone || '',
    sequence_name: sequence.sequence_name || ''
  }

  let processedSubject = template.subject || ''
  let processedContent = template.body_text || ''

  // Replace variables in subject and content
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    processedSubject = processedSubject.replace(regex, String(value))
    processedContent = processedContent.replace(regex, String(value))
  })

  // Clean up any remaining unreplaced variables
  processedSubject = processedSubject.replace(/\{\{\s*\w+\s*\}\}/g, '')
  processedContent = processedContent.replace(/\{\{\s*\w+\s*\}\}/g, '')

  return {
    subject: processedSubject,
    content: processedContent
  }
}

async function sendEmailWithResend(emailData: any) {
  const { Resend } = require('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.FROM_EMAIL || 'noreply@dealvize.com'

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const emailResponse = await resend.emails.send({
      from: `Dealvize Automation <${fromEmail}>`,
      to: [emailData.to],
      subject: emailData.subject,
      text: emailData.content,
      html: emailData.content.replace(/\n/g, '<br>'),
      tags: [
        { name: 'type', value: 'automation' },
        { name: 'sequence_id', value: emailData.sequence_id?.toString() || 'unknown' },
        { name: 'step_id', value: emailData.step_id?.toString() || 'unknown' }
      ]
    })

    return { 
      success: true, 
      message_id: emailResponse.data?.id || 'unknown',
      provider: 'resend'
    }
  } catch (error: any) {
    console.error('Failed to send automation email:', error)
    return { 
      success: false, 
      error: error.message || 'Unknown email error',
      provider: 'resend'
    }
  }
}

async function getEmailChannelId(serviceClient: any) {
  // Get the email communication channel ID
  const { data: channel } = await serviceClient
    .from('communication_channels')
    .select('id')
    .eq('name', 'email')
    .single()

  return channel?.id || null
}
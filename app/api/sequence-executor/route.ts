import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// This endpoint processes pending sequence steps
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get all pending enrollments that are due for execution
    const { data: pendingEnrollments, error: fetchError } = await supabase
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
      .limit(50) // Process 50 at a time to avoid timeouts

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 })
    }

    if (!pendingEnrollments || pendingEnrollments.length === 0) {
      return NextResponse.json({ 
        processed: 0, 
        message: 'No pending enrollments to process' 
      })
    }

    const results = []

    for (const enrollment of pendingEnrollments) {
      try {
        const result = await processSequenceStep(supabase, enrollment)
        results.push(result)
      } catch (error) {
        console.error(`Error processing enrollment ${enrollment.id}:`, error)
        results.push({
          enrollment_id: enrollment.id,
          success: false,
          error: error.message || 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return NextResponse.json({
      processed: results.length,
      successful: successCount,
      errors: errorCount,
      results
    })
  } catch (error) {
    console.error('Error in sequence executor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processSequenceStep(supabase: any, enrollment: any) {
  const { client, current_step, sequence } = enrollment

  if (!current_step || !current_step.template) {
    throw new Error('No current step or template found')
  }

  // Process the email template with client data
  const processedTemplate = await processEmailTemplate(
    current_step.template,
    client,
    sequence
  )

  // Send the email (integrate with your email service here)
  const emailResult = await sendEmail({
    to: client.email,
    subject: processedTemplate.subject,
    content: processedTemplate.content,
    template_id: current_step.template.id,
    client_id: client.id,
    sequence_id: sequence.id,
    step_id: current_step.id
  })

  // Record the message in the messages table
  await supabase
    .from('messages')
    .insert({
      user_id: enrollment.user_id,
      client_id: client.id,
      channel_id: await getEmailChannelId(supabase),
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

  // Get the next step in the sequence
  const { data: nextStep } = await supabase
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
  await supabase
    .from('sequence_enrollments')
    .update(updateData)
    .eq('id', enrollment.id)

  // Record activity for lead scoring
  await supabase
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
    next_step_scheduled: !!nextStep
  }
}

async function processEmailTemplate(template: any, client: any, sequence: any) {
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

async function sendEmail(emailData: any) {
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
        { name: 'sequence_id', value: emailData.sequence_id?.toString() || 'unknown' }
      ]
    })

    console.log('Automation email sent:', {
      to: emailData.to,
      subject: emailData.subject,
      message_id: emailResponse.data?.id
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

async function getEmailChannelId(supabase: any) {
  // Get the email communication channel ID
  const { data: channel } = await supabase
    .from('communication_channels')
    .select('id')
    .eq('name', 'email')
    .single()

  return channel?.id || null
}
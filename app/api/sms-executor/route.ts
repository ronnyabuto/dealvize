import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// This endpoint processes pending SMS automations
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get all active SMS automations
    const { data: automations, error: automationsError } = await supabase
      .from('sms_automations')
      .select(`
        *,
        template:sms_templates(*)
      `)
      .eq('is_active', true)

    if (automationsError) {
      return NextResponse.json({ error: automationsError.message }, { status: 400 })
    }

    if (!automations || automations.length === 0) {
      return NextResponse.json({ 
        processed: 0, 
        message: 'No active SMS automations found' 
      })
    }

    const results = []
    const currentTime = new Date()

    for (const automation of automations) {
      try {
        const eligible = await findEligibleClients(supabase, automation, currentTime)
        
        for (const client of eligible) {
          const result = await processSMSAutomation(supabase, automation, client)
          results.push(result)
        }
      } catch (error) {
        console.error(`Error processing automation ${automation.id}:`, error)
        results.push({
          automation_id: automation.id,
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
    console.error('Error in SMS executor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function findEligibleClients(supabase: any, automation: any, currentTime: Date) {
  const eligible = []
  
  switch (automation.automation_type) {
    case 'appointment_reminder':
      eligible.push(...await findAppointmentReminderClients(supabase, automation, currentTime))
      break
      
    case 'follow_up':
      eligible.push(...await findFollowUpClients(supabase, automation, currentTime))
      break
      
    case 'welcome':
      eligible.push(...await findWelcomeClients(supabase, automation, currentTime))
      break
      
    case 'birthday':
      eligible.push(...await findBirthdayClients(supabase, automation, currentTime))
      break
      
    case 'nurturing':
      eligible.push(...await findNurturingClients(supabase, automation, currentTime))
      break
  }
  
  return eligible
}

async function findAppointmentReminderClients(supabase: any, automation: any, currentTime: Date) {
  const scheduleHours = parseInt(automation.schedule_value) || 24
  const reminderTime = new Date()
  reminderTime.setHours(reminderTime.getHours() + scheduleHours)
  
  // Find tasks/appointments scheduled within the reminder window
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      client:clients(*)
    `)
    .eq('user_id', automation.user_id)
    .eq('task_type', 'appointment')
    .eq('status', 'pending')
    .gte('due_date', currentTime.toISOString())
    .lte('due_date', reminderTime.toISOString())

  // Filter clients who haven't received this reminder recently
  const eligible = []
  if (tasks) {
    for (const task of tasks) {
      if (!task.client || !task.client.phone) continue
      
      // Check if SMS was already sent for this task
      const { data: existingSMS } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('client_id', task.client.id)
        .eq('automation_id', automation.id)
        .eq('task_id', task.id)
        .single()

      if (!existingSMS) {
        eligible.push({
          ...task.client,
          task_id: task.id,
          task_title: task.title,
          appointment_date: task.due_date
        })
      }
    }
  }
  
  return eligible
}

async function findFollowUpClients(supabase: any, automation: any, currentTime: Date) {
  const followUpDays = parseInt(automation.schedule_value) || 3
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() - followUpDays)
  
  // Find clients who had a recent interaction but no follow-up
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', automation.user_id)
    .not('phone', 'is', null)
    .gte('last_contact_date', targetDate.toISOString())
  
  const eligible = []
  if (clients) {
    for (const client of clients) {
      // Check if follow-up SMS was already sent
      const { data: existingSMS } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('client_id', client.id)
        .eq('automation_id', automation.id)
        .gte('created_at', targetDate.toISOString())
        .single()

      if (!existingSMS) {
        eligible.push(client)
      }
    }
  }
  
  return eligible
}

async function findWelcomeClients(supabase: any, automation: any, currentTime: Date) {
  const welcomeHours = parseInt(automation.schedule_value) || 1
  const targetDate = new Date()
  targetDate.setHours(targetDate.getHours() - welcomeHours)
  
  // Find new clients created within the welcome timeframe
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', automation.user_id)
    .not('phone', 'is', null)
    .gte('created_at', targetDate.toISOString())
  
  const eligible = []
  if (clients) {
    for (const client of clients) {
      // Check if welcome SMS was already sent
      const { data: existingSMS } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('client_id', client.id)
        .eq('automation_id', automation.id)
        .single()

      if (!existingSMS) {
        eligible.push(client)
      }
    }
  }
  
  return eligible
}

async function findBirthdayClients(supabase: any, automation: any, currentTime: Date) {
  const today = currentTime.toISOString().split('T')[0] // YYYY-MM-DD format
  const monthDay = today.substring(5) // MM-DD format
  
  // Find clients whose birthday is today
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', automation.user_id)
    .not('phone', 'is', null)
    .not('date_of_birth', 'is', null)
    .like('date_of_birth', `%${monthDay}`)
  
  const eligible = []
  if (clients) {
    for (const client of clients) {
      // Check if birthday SMS was already sent this year
      const yearStart = new Date(currentTime.getFullYear(), 0, 1)
      const { data: existingSMS } = await supabase
        .from('sms_messages')
        .select('id')
        .eq('client_id', client.id)
        .eq('automation_id', automation.id)
        .gte('created_at', yearStart.toISOString())
        .single()

      if (!existingSMS) {
        eligible.push(client)
      }
    }
  }
  
  return eligible
}

async function findNurturingClients(supabase: any, automation: any, currentTime: Date) {
  // This is for general nurturing - find clients who haven't been contacted recently
  const nurturingDays = parseInt(automation.schedule_value) || 7
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() - nurturingDays)
  
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', automation.user_id)
    .not('phone', 'is', null)
    .or(`last_contact_date.is.null,last_contact_date.lt.${targetDate.toISOString()}`)
  
  return clients || []
}

async function processSMSAutomation(supabase: any, automation: any, client: any) {
  // Process the SMS template with client data
  const processedMessage = await processSMSTemplate(
    automation.template.message_content,
    client,
    automation
  )

  const smsResult = await sendSMS({
    to: client.phone,
    message: processedMessage.content,
    client_id: client.id,
    automation_id: automation.id,
    template_id: automation.template.id
  })

  // Record the SMS in the messages table
  const smsChannelId = await getSMSChannelId(supabase)
  
  await supabase
    .from('messages')
    .insert({
      user_id: automation.user_id,
      client_id: client.id,
      channel_id: smsChannelId,
      direction: 'outbound',
      content: processedMessage.content,
      recipient_name: `${client.first_name} ${client.last_name}`,
      recipient_phone: client.phone,
      status: smsResult.success ? 'sent' : 'failed',
      message_type: 'sms',
      priority: 'normal',
      metadata: {
        automation_id: automation.id,
        template_id: automation.template.id,
        task_id: client.task_id || null,
        automated: true
      },
      sent_at: new Date().toISOString()
    })

  // Record in SMS messages table for detailed tracking
  await supabase
    .from('sms_messages')
    .insert({
      user_id: automation.user_id,
      client_id: client.id,
      automation_id: automation.id,
      template_id: automation.template.id,
      task_id: client.task_id || null,
      phone_number: client.phone,
      message_content: processedMessage.content,
      status: smsResult.success ? 'sent' : 'failed',
      external_id: smsResult.message_id,
      cost: smsResult.cost || 0,
      sent_at: smsResult.success ? new Date().toISOString() : null
    })

  // Update template usage count
  await supabase
    .from('sms_templates')
    .update({
      usage_count: automation.template.usage_count + 1,
      last_used_at: new Date().toISOString()
    })
    .eq('id', automation.template.id)

  // Update client's last contact date if SMS was successful
  if (smsResult.success) {
    await supabase
      .from('clients')
      .update({ last_contact_date: new Date().toISOString() })
      .eq('id', client.id)
  }

  return {
    automation_id: automation.id,
    client_phone: client.phone,
    automation_name: automation.automation_name,
    template_name: automation.template.name,
    success: smsResult.success,
    message: processedMessage.content.substring(0, 50) + '...'
  }
}

async function processSMSTemplate(template: string, client: any, automation: any) {
  const variables = {
    client_first_name: client.first_name || '',
    client_last_name: client.last_name || '',
    client_name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'there',
    appointment_date: client.appointment_date ? 
      new Date(client.appointment_date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit' 
      }) : '',
    task_title: client.task_title || '',
    agent_name: 'Your Agent' // This could be dynamically populated
  }

  let processedContent = template

  // Replace variables in content
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    processedContent = processedContent.replace(regex, String(value))
  })

  // Clean up any remaining unreplaced variables
  processedContent = processedContent.replace(/\{\{\s*\w+\s*\}\}/g, '')

  return { content: processedContent }
}

async function sendSMS(smsData: any) {
  // This is a placeholder for SMS sending logic
  // In a real implementation, you would integrate with SMS providers like:
  // - Twilio
  // - AWS SNS
  // - TextMagic
  
  console.log('Sending SMS:', {
    to: smsData.to,
    message: smsData.message.substring(0, 50) + '...',
    automation_id: smsData.automation_id
  })

  // For now, simulate successful sending
  return { 
    success: true, 
    message_id: 'sim_' + Date.now(), 
    cost: 0.01 // Typical SMS cost in USD
  }
}

async function getSMSChannelId(supabase: any) {
  // Get the SMS communication channel ID
  const { data: channel } = await supabase
    .from('communication_channels')
    .select('id')
    .eq('name', 'sms')
    .single()

  return channel?.id || null
}
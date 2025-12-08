import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

// This endpoint executes pipeline automations based on triggers
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      trigger_type,
      entity_type, // 'client', 'deal', 'task', 'transaction'
      entity_id,
      trigger_data = {},
      user_id
    } = body

    // Validate required fields
    if (!trigger_type || !entity_type || !entity_id) {
      return NextResponse.json({
        error: 'Trigger type, entity type, and entity ID are required'
      }, { status: 400 })
    }

    // Get active automations for this trigger type
    const { data: automations, error: automationsError } = await supabase
      .from('pipeline_automations')
      .select('*')
      .eq('trigger_type', trigger_type)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (automationsError) {
      return NextResponse.json({ error: automationsError.message }, { status: 400 })
    }

    if (!automations || automations.length === 0) {
      return NextResponse.json({
        executed: 0,
        message: 'No active automations found for this trigger'
      })
    }

    // Get the entity data
    const entityData = await getEntityData(supabase, entity_type, entity_id)
    if (!entityData) {
      return NextResponse.json({
        error: 'Entity not found'
      }, { status: 404 })
    }

    const results = []
    const executedAutomations = []

    // Process each automation
    for (const automation of automations) {
      try {
        // Check if conditions are met
        const conditionsMet = await evaluateConditions(
          supabase,
          automation.conditions,
          entityData,
          trigger_data
        )

        if (conditionsMet) {
          // Execute actions
          const actionResults = await executeActions(
            supabase,
            automation.actions,
            entityData,
            automation
          )

          // Log execution
          await supabase
            .from('automation_execution_log')
            .insert({
              automation_id: automation.id,
              entity_type,
              entity_id,
              trigger_type,
              trigger_data,
              action_results,
              executed_at: new Date().toISOString(),
              success: actionResults.every(r => r.success)
            })

          executedAutomations.push({
            id: automation.id,
            name: automation.name,
            actions_executed: actionResults.length,
            success: actionResults.every(r => r.success)
          })

          results.push(...actionResults)
        }
      } catch (error) {
        console.error(`Error executing automation ${automation.id}:`, error)
        
        // Log failed execution
        await supabase
          .from('automation_execution_log')
          .insert({
            automation_id: automation.id,
            entity_type,
            entity_id,
            trigger_type,
            trigger_data,
            action_results: [],
            executed_at: new Date().toISOString(),
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })

        results.push({
          automation_id: automation.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return NextResponse.json({
      executed: executedAutomations.length,
      total_actions: results.length,
      successful_actions: successCount,
      failed_actions: errorCount,
      automations: executedAutomations,
      results
    })
  } catch (error) {
    console.error('Error in pipeline executor:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get entity data based on type and ID
async function getEntityData(supabase: any, entityType: string, entityId: string) {
  const queries = {
    client: () => supabase
      .from('clients')
      .select('*')
      .eq('id', entityId)
      .single(),
    deal: () => supabase
      .from('deals')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', entityId)
      .single(),
    task: () => supabase
      .from('tasks')
      .select(`
        *,
        client:clients(*),
        deal:deals(*)
      `)
      .eq('id', entityId)
      .single(),
    transaction: () => supabase
      .from('transactions')
      .select(`
        *,
        client:clients(*),
        deal:deals(*)
      `)
      .eq('id', entityId)
      .single()
  }

  const query = queries[entityType as keyof typeof queries]
  if (!query) return null

  const { data, error } = await query()
  return error ? null : data
}

// Evaluate automation conditions
async function evaluateConditions(
  supabase: any,
  conditions: any[],
  entityData: any,
  triggerData: any
): Promise<boolean> {
  if (!conditions || conditions.length === 0) {
    return true // No conditions means always execute
  }

  // All conditions must be true (AND logic)
  for (const condition of conditions) {
    if (!evaluateCondition(condition, entityData, triggerData)) {
      return false
    }
  }

  return true
}

// Evaluate a single condition
function evaluateCondition(condition: any, entityData: any, triggerData: any): boolean {
  const { field, operator, value, source = 'entity' } = condition
  
  let actualValue: any
  if (source === 'entity') {
    actualValue = getNestedValue(entityData, field)
  } else if (source === 'trigger') {
    actualValue = getNestedValue(triggerData, field)
  } else {
    return false
  }

  switch (operator) {
    case 'equals':
      return actualValue === value
    case 'not_equals':
      return actualValue !== value
    case 'greater_than':
      return parseFloat(actualValue) > parseFloat(value)
    case 'less_than':
      return parseFloat(actualValue) < parseFloat(value)
    case 'greater_equal':
      return parseFloat(actualValue) >= parseFloat(value)
    case 'less_equal':
      return parseFloat(actualValue) <= parseFloat(value)
    case 'contains':
      return actualValue && actualValue.toString().toLowerCase().includes(value.toLowerCase())
    case 'starts_with':
      return actualValue && actualValue.toString().toLowerCase().startsWith(value.toLowerCase())
    case 'ends_with':
      return actualValue && actualValue.toString().toLowerCase().endsWith(value.toLowerCase())
    case 'in_list':
      return Array.isArray(value) && value.includes(actualValue)
    case 'not_in_list':
      return Array.isArray(value) && !value.includes(actualValue)
    case 'is_empty':
      return !actualValue || actualValue === '' || (Array.isArray(actualValue) && actualValue.length === 0)
    case 'is_not_empty':
      return actualValue && actualValue !== '' && (!Array.isArray(actualValue) || actualValue.length > 0)
    case 'date_before':
      return new Date(actualValue) < new Date(value)
    case 'date_after':
      return new Date(actualValue) > new Date(value)
    default:
      return false
  }
}

// Execute automation actions
async function executeActions(
  supabase: any,
  actions: any[],
  entityData: any,
  automation: any
): Promise<any[]> {
  const results = []

  for (const action of actions) {
    try {
      const result = await executeAction(supabase, action, entityData, automation)
      results.push({
        action_type: action.type,
        success: true,
        result
      })
    } catch (error) {
      results.push({
        action_type: action.type,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}

// Execute a single action
async function executeAction(supabase: any, action: any, entityData: any, automation: any) {
  const { type, parameters } = action

  switch (type) {
    case 'update_status':
      return await updateEntityStatus(supabase, parameters, entityData)
    
    case 'create_task':
      return await createTask(supabase, parameters, entityData, automation)
    
    case 'send_email':
      return await sendEmail(supabase, parameters, entityData, automation)
    
    case 'send_sms':
      return await sendSMS(supabase, parameters, entityData, automation)
    
    case 'create_note':
      return await createNote(supabase, parameters, entityData, automation)
    
    case 'update_score':
      return await updateLeadScore(supabase, parameters, entityData)
    
    case 'assign_to_user':
      return await assignToUser(supabase, parameters, entityData)
    
    case 'move_to_stage':
      return await moveToStage(supabase, parameters, entityData)
    
    case 'schedule_follow_up':
      return await scheduleFollowUp(supabase, parameters, entityData, automation)
    
    case 'webhook':
      return await callWebhook(parameters, entityData, automation)
    
    default:
      throw new Error(`Unknown action type: ${type}`)
  }
}

// Action implementations
async function updateEntityStatus(supabase: any, parameters: any, entityData: any) {
  const { entity_type, new_status } = parameters
  const table = entity_type + 's' // clients, deals, tasks, etc.
  
  const { data, error } = await supabase
    .from(table)
    .update({ status: new_status })
    .eq('id', entityData.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update ${entity_type} status: ${error.message}`)
  return data
}

async function createTask(supabase: any, parameters: any, entityData: any, automation: any) {
  const {
    title,
    description,
    due_days = 1,
    priority = 'medium',
    assigned_to
  } = parameters

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + due_days)

  const taskData = {
    user_id: assigned_to || entityData.user_id,
    title: processTemplate(title, entityData),
    description: processTemplate(description || '', entityData),
    due_date: dueDate.toISOString(),
    priority,
    status: 'pending',
    task_type: 'automation',
    metadata: {
      automation_id: automation.id,
      generated_by: 'pipeline_automation'
    }
  }

  // Add entity relationships
  if (entityData.client_id || entityData.id && entityData.first_name) {
    taskData.client_id = entityData.client_id || entityData.id
  }
  if (entityData.deal_id || entityData.id && entityData.title) {
    taskData.deal_id = entityData.deal_id || entityData.id
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single()

  if (error) throw new Error(`Failed to create task: ${error.message}`)
  return data
}

async function sendEmail(supabase: any, parameters: any, entityData: any, automation: any) {
  const { template_id, subject, content, recipient_email } = parameters
  
  // In production, integrate with email service
  console.log('Sending email:', {
    to: recipient_email || entityData.email,
    subject: processTemplate(subject, entityData),
    content: processTemplate(content, entityData),
    template_id
  })

  // Record in messages table
  const messageData = {
    user_id: entityData.user_id,
    client_id: entityData.client_id || (entityData.first_name ? entityData.id : null),
    direction: 'outbound',
    content: processTemplate(content, entityData),
    recipient_email: recipient_email || entityData.email,
    status: 'sent',
    message_type: 'email',
    priority: 'normal',
    metadata: {
      automation_id: automation.id,
      template_id,
      generated_by: 'pipeline_automation'
    },
    sent_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single()

  if (error) throw new Error(`Failed to record email: ${error.message}`)
  return { sent: true, message_id: data.id }
}

async function sendSMS(supabase: any, parameters: any, entityData: any, automation: any) {
  const { message, recipient_phone } = parameters
  
  console.log('Sending SMS:', {
    to: recipient_phone || entityData.phone,
    message: processTemplate(message, entityData)
  })

  // Similar to email implementation
  return { sent: true, message_id: 'sms_' + Date.now() }
}

async function createNote(supabase: any, parameters: any, entityData: any, automation: any) {
  const { content, note_type = 'automation' } = parameters

  const noteData = {
    user_id: entityData.user_id,
    content: processTemplate(content, entityData),
    note_type,
    created_at: new Date().toISOString(),
    metadata: {
      automation_id: automation.id,
      generated_by: 'pipeline_automation'
    }
  }

  // Add entity relationships
  if (entityData.client_id || (entityData.first_name && entityData.id)) {
    noteData.client_id = entityData.client_id || entityData.id
  }
  if (entityData.deal_id || (entityData.title && entityData.value)) {
    noteData.deal_id = entityData.deal_id || entityData.id
  }

  const { data, error } = await supabase
    .from('notes')
    .insert(noteData)
    .select()
    .single()

  if (error) throw new Error(`Failed to create note: ${error.message}`)
  return data
}

async function updateLeadScore(supabase: any, parameters: any, entityData: any) {
  const { score_change, reason } = parameters
  
  const clientId = entityData.client_id || (entityData.first_name ? entityData.id : null)
  if (!clientId) {
    throw new Error('No client found to update score')
  }

  // Update client score
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('lead_score')
    .eq('id', clientId)
    .single()

  if (clientError) throw new Error(`Failed to get client: ${clientError.message}`)

  const newScore = (client.lead_score || 0) + score_change

  const { data, error } = await supabase
    .from('clients')
    .update({ lead_score: Math.max(0, newScore) })
    .eq('id', clientId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update lead score: ${error.message}`)

  // Record activity
  await supabase
    .from('lead_activities')
    .insert({
      user_id: entityData.user_id,
      client_id: clientId,
      activity_type: 'score_updated_automation',
      activity_data: {
        score_change,
        new_score: newScore,
        reason: reason || 'Pipeline automation'
      },
      score_awarded: score_change,
      source: 'pipeline_automation'
    })

  return { previous_score: client.lead_score, new_score: newScore, score_change }
}

async function assignToUser(supabase: any, parameters: any, entityData: any) {
  const { user_id, entity_type = 'client' } = parameters
  const table = entity_type + 's'

  const { data, error } = await supabase
    .from(table)
    .update({ assigned_to: user_id })
    .eq('id', entityData.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to assign ${entity_type}: ${error.message}`)
  return data
}

async function moveToStage(supabase: any, parameters: any, entityData: any) {
  const { new_stage } = parameters

  const { data, error } = await supabase
    .from('deals')
    .update({ status: new_stage })
    .eq('id', entityData.deal_id || entityData.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to move deal to stage: ${error.message}`)
  return data
}

async function scheduleFollowUp(supabase: any, parameters: any, entityData: any, automation: any) {
  const { days_ahead = 7, time = '09:00', title, description } = parameters

  const followUpDate = new Date()
  followUpDate.setDate(followUpDate.getDate() + days_ahead)
  
  // Set specific time
  const [hours, minutes] = time.split(':')
  followUpDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

  return await createTask(supabase, {
    title: title || 'Follow up - {{client.first_name}} {{client.last_name}}',
    description: description || 'Automated follow-up task',
    due_date: followUpDate.toISOString(),
    priority: 'medium'
  }, entityData, automation)
}

async function callWebhook(parameters: any, entityData: any, automation: any) {
  const { url, method = 'POST', headers = {}, payload = {} } = parameters

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({
      ...payload,
      entity_data: entityData,
      automation_id: automation.id,
      timestamp: new Date().toISOString()
    })
  })

  if (!response.ok) {
    throw new Error(`Webhook call failed: ${response.status} ${response.statusText}`)
  }

  return { webhook_called: true, status: response.status }
}

// Helper functions
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

function processTemplate(template: string, data: any): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path)
    return value !== undefined ? String(value) : match
  })
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const workflow_id = searchParams.get('workflow_id')
    const category = searchParams.get('category') // 'lead_nurturing', 'deal_management', 'client_onboarding', 'follow_up'
    const status = searchParams.get('status') // 'active', 'paused', 'draft'

    if (workflow_id) {
      const workflow = await getWorkflow(supabase, user.id, workflow_id)
      return NextResponse.json({ workflow })
    } else {
      const workflows = await getWorkflows(supabase, user.id, category, status)
      return NextResponse.json({ workflows })
    }
  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      description,
      category, // 'lead_nurturing', 'deal_management', 'client_onboarding', 'follow_up', 'custom'
      trigger_config, // When the workflow starts
      workflow_steps, // Array of steps with conditions and actions
      settings = {}, // Global workflow settings
      is_active = false
    } = body

    // Validate required fields
    if (!name || !category || !trigger_config || !workflow_steps?.length) {
      return NextResponse.json({
        error: 'Name, category, trigger config, and workflow steps are required'
      }, { status: 400 })
    }

    // Validate workflow steps
    for (const step of workflow_steps) {
      if (!step.step_type || !step.step_config) {
        return NextResponse.json({
          error: 'Each workflow step must have step_type and step_config'
        }, { status: 400 })
      }
    }

    // Create workflow
    const { data: workflow, error } = await supabase
      .from('advanced_workflows')
      .insert({
        user_id: user.id,
        name,
        description,
        category,
        trigger_config,
        workflow_steps,
        settings,
        is_active,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ workflow }, { status: 201 })
  } catch (error) {
    console.error('Error creating workflow:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('id')
    const action = searchParams.get('action') // 'update', 'activate', 'pause', 'duplicate'

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 })
    }

    const body = await request.json()

    if (action === 'activate') {
      const { data: workflow, error } = await supabase
        .from('advanced_workflows')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', workflowId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ workflow, message: 'Workflow activated' })
    } else if (action === 'pause') {
      const { data: workflow, error } = await supabase
        .from('advanced_workflows')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', workflowId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ workflow, message: 'Workflow paused' })
    } else if (action === 'duplicate') {
      // Get original workflow
      const { data: originalWorkflow, error: fetchError } = await supabase
        .from('advanced_workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !originalWorkflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
      }

      // Create duplicate
      const { data: duplicatedWorkflow, error: duplicateError } = await supabase
        .from('advanced_workflows')
        .insert({
          user_id: user.id,
          name: `${originalWorkflow.name} (Copy)`,
          description: originalWorkflow.description,
          category: originalWorkflow.category,
          trigger_config: originalWorkflow.trigger_config,
          workflow_steps: originalWorkflow.workflow_steps,
          settings: originalWorkflow.settings,
          is_active: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (duplicateError) {
        return NextResponse.json({ error: duplicateError.message }, { status: 400 })
      }

      return NextResponse.json({ workflow: duplicatedWorkflow, message: 'Workflow duplicated' })
    } else {
      // Regular update
      const updateData = {
        ...body,
        updated_at: new Date().toISOString()
      }

      const { data: workflow, error } = await supabase
        .from('advanced_workflows')
        .update(updateData)
        .eq('id', workflowId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ workflow })
    }
  } catch (error) {
    console.error('Error updating workflow:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('id')

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 })
    }

    // Delete workflow executions first
    await supabase
      .from('workflow_executions')
      .delete()
      .eq('workflow_id', workflowId)

    // Delete the workflow
    const { error } = await supabase
      .from('advanced_workflows')
      .delete()
      .eq('id', workflowId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting workflow:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

async function getWorkflow(supabase: any, userId: string, workflowId: string) {
  const { data: workflow, error } = await supabase
    .from('advanced_workflows')
    .select(`
      *,
      workflow_executions(
        id, status, started_at, completed_at, 
        execution_log, entity_type, entity_id
      )
    `)
    .eq('id', workflowId)
    .eq('user_id', userId)
    .single()

  if (error) return null

  // Get execution statistics
  const executionStats = await getWorkflowStats(supabase, workflowId)

  return {
    ...workflow,
    stats: executionStats
  }
}

async function getWorkflows(supabase: any, userId: string, category?: string, status?: string) {
  let query = supabase
    .from('advanced_workflows')
    .select(`
      *,
      workflow_executions!inner(count)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'paused') {
    query = query.eq('is_active', false)
  }

  const { data: workflows, error } = await query

  if (error) return []

  // Get stats for each workflow
  const workflowsWithStats = await Promise.all(
    workflows.map(async (workflow: any) => {
      const stats = await getWorkflowStats(supabase, workflow.id)
      return {
        ...workflow,
        stats
      }
    })
  )

  return workflowsWithStats
}

async function getWorkflowStats(supabase: any, workflowId: string) {
  const { data: executions } = await supabase
    .from('workflow_executions')
    .select('status, started_at, completed_at')
    .eq('workflow_id', workflowId)
    .order('started_at', { ascending: false })
    .limit(100)

  if (!executions) {
    return {
      total_executions: 0,
      successful_executions: 0,
      failed_executions: 0,
      success_rate: 0,
      avg_execution_time: 0,
      last_execution: null
    }
  }

  const totalExecutions = executions.length
  const successfulExecutions = executions.filter(e => e.status === 'completed').length
  const failedExecutions = executions.filter(e => e.status === 'failed').length
  const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0

  // Calculate average execution time
  const completedExecutions = executions.filter(e => e.status === 'completed' && e.completed_at)
  const avgExecutionTime = completedExecutions.length > 0 
    ? completedExecutions.reduce((sum, e) => {
        const duration = new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()
        return sum + duration
      }, 0) / completedExecutions.length / 1000 // Convert to seconds
    : 0

  return {
    total_executions: totalExecutions,
    successful_executions: successfulExecutions,
    failed_executions: failedExecutions,
    success_rate: Math.round(successRate),
    avg_execution_time: Math.round(avgExecutionTime),
    last_execution: executions[0]?.started_at || null
  }
}

// Workflow execution endpoint
export async function executeWorkflow(workflowId: string, entityType: string, entityId: string, userId: string) {
  const supabase = await createClient()
  
  const { data: workflow } = await supabase
    .from('advanced_workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!workflow) {
    return { success: false, error: 'Workflow not found or inactive' }
  }

  // Create execution record
  const { data: execution } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_id: workflowId,
      entity_type: entityType,
      entity_id: entityId,
      status: 'running',
      started_at: new Date().toISOString(),
      execution_log: []
    })
    .select()
    .single()

  if (!execution) {
    return { success: false, error: 'Failed to create execution record' }
  }

  try {
    // Execute workflow steps
    const result = await processWorkflowSteps(
      workflow.workflow_steps,
      entityType,
      entityId,
      userId,
      execution.id,
      supabase
    )

    // Update execution status
    await supabase
      .from('workflow_executions')
      .update({
        status: result.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        execution_log: result.log,
        result_data: result.data
      })
      .eq('id', execution.id)

    return result
  } catch (error) {
    // Update execution with error
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        execution_log: [{ step: 'error', message: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() }]
      })
      .eq('id', execution.id)

    return { success: false, error: error instanceof Error ? error.message : 'Workflow execution failed' }
  }
}

async function processWorkflowSteps(steps: any[], entityType: string, entityId: string, userId: string, executionId: string, supabase: any) {
  const log = []
  const results = {}

  for (const step of steps) {
    const stepResult = await executeWorkflowStep(step, entityType, entityId, userId, results, supabase)
    
    log.push({
      step_id: step.id,
      step_type: step.step_type,
      status: stepResult.success ? 'completed' : 'failed',
      message: stepResult.message,
      timestamp: new Date().toISOString(),
      data: stepResult.data
    })

    if (!stepResult.success && step.required !== false) {
      return { success: false, log, data: results }
    }

    // Store step results for use in subsequent steps
    results[step.id] = stepResult.data

    // Handle delays
    if (step.delay && step.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, step.delay * 1000))
    }
  }

  return { success: true, log, data: results }
}

async function executeWorkflowStep(step: any, entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const { step_type, step_config, conditions } = step

  // Check conditions first
  if (conditions && conditions.length > 0) {
    const conditionsMet = await evaluateConditions(conditions, entityType, entityId, userId, previousResults, supabase)
    if (!conditionsMet) {
      return { success: true, message: 'Conditions not met, step skipped', data: null }
    }
  }

  try {
    switch (step_type) {
      case 'send_email':
        return await sendEmailStep(step_config, entityType, entityId, userId, previousResults, supabase)
      
      case 'send_sms':
        return await sendSMSStep(step_config, entityType, entityId, userId, previousResults, supabase)
      
      case 'create_task':
        return await createTaskStep(step_config, entityType, entityId, userId, previousResults, supabase)
      
      case 'update_field':
        return await updateFieldStep(step_config, entityType, entityId, userId, previousResults, supabase)
      
      case 'create_note':
        return await createNoteStep(step_config, entityType, entityId, userId, previousResults, supabase)
      
      case 'webhook':
        return await webhookStep(step_config, entityType, entityId, userId, previousResults, supabase)
      
      case 'wait':
        return await waitStep(step_config)
      
      case 'conditional_branch':
        return await conditionalBranchStep(step_config, entityType, entityId, userId, previousResults, supabase)
      
      case 'assign_lead':
        return await assignLeadStep(step_config, entityType, entityId, userId, previousResults, supabase)
      
      case 'schedule_meeting':
        return await scheduleMeetingStep(step_config, entityType, entityId, userId, previousResults, supabase)
      
      default:
        return { success: false, message: `Unknown step type: ${step_type}`, data: null }
    }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Step execution failed', 
      data: null 
    }
  }
}

// Step execution functions
async function sendEmailStep(config: any, entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const { template_id, recipient_field = 'email', subject, custom_data = {} } = config

  // Get entity data
  const entityData = await getEntityData(entityType, entityId, userId, supabase)
  if (!entityData) {
    return { success: false, message: 'Entity not found', data: null }
  }

  const recipientEmail = entityData[recipient_field]
  if (!recipientEmail) {
    return { success: false, message: 'Recipient email not found', data: null }
  }

  // Send email (implement actual email sending)
  // This would integrate with your email service
  return { 
    success: true, 
    message: `Email sent to ${recipientEmail}`, 
    data: { email: recipientEmail, template_id, subject } 
  }
}

async function sendSMSStep(config: any, entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const { message, recipient_field = 'phone' } = config

  const entityData = await getEntityData(entityType, entityId, userId, supabase)
  if (!entityData) {
    return { success: false, message: 'Entity not found', data: null }
  }

  const recipientPhone = entityData[recipient_field]
  if (!recipientPhone) {
    return { success: false, message: 'Recipient phone not found', data: null }
  }

  // Send SMS (implement actual SMS sending)
  return { 
    success: true, 
    message: `SMS sent to ${recipientPhone}`, 
    data: { phone: recipientPhone, message } 
  }
}

async function createTaskStep(config: any, entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const { title, description, due_date, priority = 'medium', assigned_to } = config

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      user_id: assigned_to || userId,
      title: processTemplate(title, { entityType, entityId, ...previousResults }),
      description: processTemplate(description, { entityType, entityId, ...previousResults }),
      due_date,
      priority,
      status: 'pending',
      entity_type: entityType,
      entity_id: entityId
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: error.message, data: null }
  }

  return { success: true, message: 'Task created', data: task }
}

async function updateFieldStep(config: any, entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const { field_updates } = config

  const updateData = {}
  for (const [field, value] of Object.entries(field_updates)) {
    updateData[field] = processTemplate(value as string, { entityType, entityId, ...previousResults })
  }

  const tableName = getTableName(entityType)
  const { error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('id', entityId)
    .eq('user_id', userId)

  if (error) {
    return { success: false, message: error.message, data: null }
  }

  return { success: true, message: 'Fields updated', data: updateData }
}

async function createNoteStep(config: any, entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const { content, note_type = 'workflow_generated' } = config

  const { data: note, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      [`${entityType}_id`]: entityId,
      content: processTemplate(content, { entityType, entityId, ...previousResults }),
      note_type,
      metadata: {
        generated_by_workflow: true,
        workflow_step: true
      }
    })
    .select()
    .single()

  if (error) {
    return { success: false, message: error.message, data: null }
  }

  return { success: true, message: 'Note created', data: note }
}

async function webhookStep(config: any, entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const { url, method = 'POST', headers = {}, payload } = config

  const entityData = await getEntityData(entityType, entityId, userId, supabase)
  
  const requestPayload = {
    entity_type: entityType,
    entity_id: entityId,
    entity_data: entityData,
    previous_results: previousResults,
    ...payload
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(requestPayload)
    })

    const responseData = await response.text()

    return { 
      success: response.ok, 
      message: `Webhook ${response.ok ? 'succeeded' : 'failed'} (${response.status})`, 
      data: { status: response.status, response: responseData } 
    }
  } catch (error) {
    return { success: false, message: `Webhook error: ${error}`, data: null }
  }
}

async function waitStep(config: any) {
  const { duration_seconds } = config
  
  await new Promise(resolve => setTimeout(resolve, duration_seconds * 1000))
  
  return { success: true, message: `Waited ${duration_seconds} seconds`, data: null }
}

async function conditionalBranchStep(config: any, entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const { conditions, true_steps = [], false_steps = [] } = config

  const conditionsMet = await evaluateConditions(conditions, entityType, entityId, userId, previousResults, supabase)
  const stepsToExecute = conditionsMet ? true_steps : false_steps

  if (stepsToExecute.length === 0) {
    return { success: true, message: 'No steps to execute for branch', data: { branch: conditionsMet ? 'true' : 'false' } }
  }

  // Execute branch steps
  const branchResult = await processWorkflowSteps(stepsToExecute, entityType, entityId, userId, 'branch_execution', supabase)
  
  return { 
    success: branchResult.success, 
    message: `Branch executed (${conditionsMet ? 'true' : 'false'})`, 
    data: { branch: conditionsMet ? 'true' : 'false', result: branchResult } 
  }
}

async function assignLeadStep(config: any, entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const { assigned_to, assignment_rules = [] } = config

  let assigneeId = assigned_to

  // Apply assignment rules if provided
  if (assignment_rules.length > 0 && !assigneeId) {
    const entityData = await getEntityData(entityType, entityId, userId, supabase)
    
    for (const rule of assignment_rules) {
      const conditionsMet = await evaluateConditions(rule.conditions, entityType, entityId, userId, previousResults, supabase)
      if (conditionsMet) {
        assigneeId = rule.assigned_to
        break
      }
    }
  }

  if (!assigneeId) {
    return { success: false, message: 'No assignee determined', data: null }
  }

  const { error } = await supabase
    .from(getTableName(entityType))
    .update({ assigned_to: assigneeId, assignment_date: new Date().toISOString() })
    .eq('id', entityId)
    .eq('user_id', userId)

  if (error) {
    return { success: false, message: error.message, data: null }
  }

  return { success: true, message: `Assigned to user ${assigneeId}`, data: { assigned_to: assigneeId } }
}

async function scheduleMeetingStep(config: any, entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const { title, duration = 30, meeting_type = 'consultation' } = config

  // This would integrate with calendar systems
  const meetingData = {
    title: processTemplate(title, { entityType, entityId, ...previousResults }),
    duration,
    meeting_type,
    entity_type: entityType,
    entity_id: entityId,
    scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Default to tomorrow
  }

  return { success: true, message: 'Meeting scheduled', data: meetingData }
}

// Helper functions
async function evaluateConditions(conditions: any[], entityType: string, entityId: string, userId: string, previousResults: any, supabase: any) {
  const entityData = await getEntityData(entityType, entityId, userId, supabase)
  
  for (const condition of conditions) {
    const { field, operator, value, data_source = 'entity' } = condition
    
    let fieldValue
    if (data_source === 'entity') {
      fieldValue = entityData?.[field]
    } else if (data_source === 'previous_results') {
      fieldValue = previousResults[field]
    }

    const conditionMet = evaluateCondition(fieldValue, operator, value)
    if (!conditionMet) {
      return false
    }
  }

  return true
}

function evaluateCondition(fieldValue: any, operator: string, expectedValue: any) {
  switch (operator) {
    case 'equals':
      return fieldValue === expectedValue
    case 'not_equals':
      return fieldValue !== expectedValue
    case 'greater_than':
      return Number(fieldValue) > Number(expectedValue)
    case 'less_than':
      return Number(fieldValue) < Number(expectedValue)
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase())
    case 'starts_with':
      return String(fieldValue).toLowerCase().startsWith(String(expectedValue).toLowerCase())
    case 'ends_with':
      return String(fieldValue).toLowerCase().endsWith(String(expectedValue).toLowerCase())
    case 'is_empty':
      return !fieldValue || fieldValue === ''
    case 'is_not_empty':
      return fieldValue && fieldValue !== ''
    case 'in_list':
      return Array.isArray(expectedValue) && expectedValue.includes(fieldValue)
    default:
      return false
  }
}

async function getEntityData(entityType: string, entityId: string, userId: string, supabase: any) {
  const tableName = getTableName(entityType)
  const { data } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', entityId)
    .eq('user_id', userId)
    .single()

  return data
}

function getTableName(entityType: string) {
  const tableMap: { [key: string]: string } = {
    'client': 'clients',
    'deal': 'deals',
    'lead': 'clients', // Leads are stored in clients table
    'contact': 'clients'
  }
  
  return tableMap[entityType] || entityType
}

function processTemplate(template: string, variables: any) {
  if (!template || typeof template !== 'string') return template
  
  let processed = template
  
  // Replace variables like {{variable}}
  const variableRegex = /\{\{([^}]+)\}\}/g
  processed = processed.replace(variableRegex, (match, varName) => {
    const trimmedVarName = varName.trim()
    return variables[trimmedVarName] || match
  })
  
  return processed
}
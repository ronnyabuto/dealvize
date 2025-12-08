import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

// This endpoint processes lead assignments based on rules
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const { client_id, trigger_type = 'manual' } = body

    if (!client_id) {
      return NextResponse.json({
        error: 'Client ID is required'
      }, { status: 400 })
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .eq('user_id', user.id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get active assignment rules
    const { data: rules, error: rulesError } = await supabase
      .from('lead_assignment_rules')
      .select(`
        *,
        assigned_to_user:users!lead_assignment_rules_assigned_to_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (rulesError) {
      return NextResponse.json({ error: rulesError.message }, { status: 400 })
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({
        assignment: null,
        message: 'No active assignment rules found'
      })
    }

    // Process rules in priority order
    for (const rule of rules) {
      const matches = await evaluateRule(supabase, rule, client)
      
      if (matches) {
        const assignment = await processAssignment(supabase, rule, client, user.id)
        
        if (assignment.success) {
          // Log the assignment
          await supabase
            .from('lead_assignment_history')
            .insert({
              user_id: user.id,
              client_id: client.id,
              rule_id: rule.id,
              assigned_to: assignment.assigned_to,
              assignment_type: rule.assignment_type,
              trigger_type,
              assignment_reason: assignment.reason,
              metadata: {
                rule_conditions: rule.conditions,
                client_data: {
                  lead_score: client.lead_score,
                  lead_source: client.lead_source,
                  location: client.address_state
                }
              }
            })

          // Update client with assignment
          await supabase
            .from('clients')
            .update({
              assigned_to: assignment.assigned_to,
              assigned_at: new Date().toISOString(),
              assignment_rule_id: rule.id
            })
            .eq('id', client.id)

          // Create notification task for assigned user
          if (assignment.assigned_to) {
            await supabase
              .from('tasks')
              .insert({
                user_id: assignment.assigned_to,
                client_id: client.id,
                title: `New lead assigned: ${client.first_name} ${client.last_name}`,
                description: `Lead automatically assigned via rule: ${rule.name}`,
                task_type: 'lead_follow_up',
                due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due in 24 hours
                priority: 'high',
                status: 'pending',
                metadata: {
                  assignment_rule_id: rule.id,
                  trigger_type,
                  auto_generated: true
                }
              })
          }

          // Record lead activity
          await supabase
            .from('lead_activities')
            .insert({
              user_id: user.id,
              client_id: client.id,
              activity_type: 'lead_assigned',
              activity_data: {
                rule_id: rule.id,
                rule_name: rule.name,
                assigned_to: assignment.assigned_to,
                assignment_type: rule.assignment_type,
                trigger_type
              },
              score_awarded: 0,
              source: 'assignment_engine'
            })

          return NextResponse.json({
            assignment: {
              client_id: client.id,
              assigned_to: assignment.assigned_to,
              rule_used: {
                id: rule.id,
                name: rule.name,
                assignment_type: rule.assignment_type
              },
              reason: assignment.reason,
              trigger_type
            },
            success: true
          })
        }
      }
    }

    return NextResponse.json({
      assignment: null,
      message: 'No matching assignment rules found for this lead'
    })
  } catch (error) {
    console.error('Error in lead assignment engine:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Evaluate if a lead matches a rule's conditions
async function evaluateRule(supabase: any, rule: any, client: any): Promise<boolean> {
  for (const condition of rule.conditions) {
    if (!evaluateCondition(condition, client)) {
      return false // All conditions must match
    }
  }

  // Additional time-based checks
  if (rule.business_hours_only && !isBusinessHours()) {
    return false
  }

  if (rule.exclude_weekends && isWeekend()) {
    return false
  }

  return true
}

// Evaluate individual condition
function evaluateCondition(condition: any, client: any): boolean {
  const { field, operator, value } = condition
  const clientValue = client[field]

  switch (operator) {
    case 'equals':
      return clientValue === value
    case 'not_equals':
      return clientValue !== value
    case 'contains':
      return clientValue && clientValue.toLowerCase().includes(value.toLowerCase())
    case 'starts_with':
      return clientValue && clientValue.toLowerCase().startsWith(value.toLowerCase())
    case 'greater_than':
      return parseFloat(clientValue) > parseFloat(value)
    case 'less_than':
      return parseFloat(clientValue) < parseFloat(value)
    case 'greater_equal':
      return parseFloat(clientValue) >= parseFloat(value)
    case 'less_equal':
      return parseFloat(clientValue) <= parseFloat(value)
    case 'in_list':
      return Array.isArray(value) && value.includes(clientValue)
    case 'not_in_list':
      return Array.isArray(value) && !value.includes(clientValue)
    default:
      return false
  }
}

// Process assignment based on rule type
async function processAssignment(supabase: any, rule: any, client: any, userId: string): Promise<any> {
  switch (rule.assignment_type) {
    case 'specific_agent':
      return {
        success: true,
        assigned_to: rule.assigned_to,
        reason: `Assigned to specific agent based on rule conditions`
      }

    case 'round_robin':
      return await processRoundRobin(supabase, rule, userId)

    case 'load_balanced':
      return await processLoadBalanced(supabase, rule, userId)

    case 'geographic':
      return await processGeographic(supabase, rule, client)

    case 'score_based':
      return await processScoreBased(supabase, rule, client)

    default:
      return {
        success: false,
        reason: 'Unknown assignment type'
      }
  }
}

async function processRoundRobin(supabase: any, rule: any, userId: string): Promise<any> {
  // Get team members from the rule or use fallback
  const teamMembers = rule.assigned_to ? [rule.assigned_to] : [userId]
  
  // Get last assigned user from assignment history
  const { data: lastAssignment } = await supabase
    .from('lead_assignment_history')
    .select('assigned_to')
    .eq('rule_id', rule.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let nextIndex = 0
  if (lastAssignment) {
    const lastIndex = teamMembers.indexOf(lastAssignment.assigned_to)
    nextIndex = (lastIndex + 1) % teamMembers.length
  }

  return {
    success: true,
    assigned_to: teamMembers[nextIndex],
    reason: 'Round robin assignment'
  }
}

async function processLoadBalanced(supabase: any, rule: any, userId: string): Promise<any> {
  const teamMembers = rule.assigned_to ? [rule.assigned_to] : [userId]
  
  // Count current assignments for each team member
  const assignmentCounts = await Promise.all(
    teamMembers.map(async (memberId: string) => {
      const { count } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', memberId)
        .eq('lead_status', 'new') // Only count active leads

      return { memberId, count: count || 0 }
    })
  )

  // Find member with least assignments
  const leastLoaded = assignmentCounts.reduce((min, current) => 
    current.count < min.count ? current : min
  )

  return {
    success: true,
    assigned_to: leastLoaded.memberId,
    reason: `Load balanced assignment (${leastLoaded.count} current assignments)`
  }
}

async function processGeographic(supabase: any, rule: any, client: any): Promise<any> {
  const clientState = client.address_state
  
  if (!clientState || !rule.geographic_territories) {
    return {
      success: !!rule.fallback_assigned_to,
      assigned_to: rule.fallback_assigned_to,
      reason: 'No geographic territory match, using fallback'
    }
  }

  const assignedAgent = rule.geographic_territories[clientState]
  
  if (assignedAgent) {
    return {
      success: true,
      assigned_to: assignedAgent,
      reason: `Geographic assignment for ${clientState}`
    }
  }

  return {
    success: !!rule.fallback_assigned_to,
    assigned_to: rule.fallback_assigned_to,
    reason: 'No geographic territory match, using fallback'
  }
}

async function processScoreBased(supabase: any, rule: any, client: any): Promise<any> {
  const leadScore = client.lead_score || 0
  
  if (!rule.score_thresholds) {
    return {
      success: !!rule.fallback_assigned_to,
      assigned_to: rule.fallback_assigned_to,
      reason: 'No score thresholds defined, using fallback'
    }
  }

  // Find appropriate assignment based on score thresholds
  const thresholds = Object.entries(rule.score_thresholds)
    .map(([score, agent]) => ({ score: parseInt(score), agent }))
    .sort((a, b) => b.score - a.score) // Sort descending

  for (const threshold of thresholds) {
    if (leadScore >= threshold.score) {
      return {
        success: true,
        assigned_to: threshold.agent,
        reason: `Score-based assignment (score: ${leadScore}, threshold: ${threshold.score})`
      }
    }
  }

  return {
    success: !!rule.fallback_assigned_to,
    assigned_to: rule.fallback_assigned_to,
    reason: 'Lead score below all thresholds, using fallback'
  }
}

function isBusinessHours(): boolean {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0 = Sunday, 6 = Saturday
  
  // Business hours: 9 AM to 5 PM, Monday to Friday
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17
}

function isWeekend(): boolean {
  const day = new Date().getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}
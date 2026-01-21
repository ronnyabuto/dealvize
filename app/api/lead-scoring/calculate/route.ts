import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const { client_id } = body

    if (!client_id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .eq('user_id', user.id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: rules } = await supabase
      .from('scoring_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at')

    const { data: activities } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false })
      .limit(100)

    let totalScore = 0

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const conditions = Array.isArray(rule.conditions) ? rule.conditions : []
        let conditionsMet = true

        for (const condition of conditions) {
          const { field, operator, value } = condition
          const clientValue = client[field]

          if (!evaluateCondition(clientValue, operator, value)) {
            conditionsMet = false
            break
          }
        }

        if (conditionsMet) {
          totalScore += rule.score_impact
        }
      }

      if (activities) {
        for (const activity of activities) {
          const matchingRule = rules.find(r => r.rule_type === 'engagement' && r.name.toLowerCase().includes(activity.activity_type.toLowerCase()))
          if (matchingRule) {
            totalScore += matchingRule.score_impact
          }
        }
      }
    } else {
      totalScore = calculateDefaultScore(client, activities || [])
    }

    const category = totalScore >= 75 ? 'qualified' : totalScore >= 50 ? 'hot' : totalScore >= 25 ? 'warm' : 'cold'

    const { data: leadScore, error: scoreError } = await supabase
      .from('lead_scores')
      .upsert({
        client_id,
        current_score: Math.max(0, Math.min(100, totalScore)),
        max_score: 100,
        category,
        last_activity_date: new Date().toISOString(),
        last_score_change: new Date().toISOString()
      }, {
        onConflict: 'client_id'
      })
      .select()
      .single()

    if (scoreError) {
      return NextResponse.json({ error: scoreError.message }, { status: 400 })
    }

    await supabase
      .from('clients')
      .update({
        lead_score: Math.max(0, Math.min(100, totalScore))
      })
      .eq('id', client_id)

    return NextResponse.json({
      client_id,
      score: Math.max(0, Math.min(100, totalScore)),
      category,
      rules_applied: rules?.length || 0
    })
  } catch (error) {
    console.error('Error calculating lead score:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function evaluateCondition(clientValue: any, operator: string, value: any): boolean {
  switch (operator) {
    case 'equals':
      return clientValue === value
    case 'not_equals':
      return clientValue !== value
    case 'contains':
      return clientValue && String(clientValue).toLowerCase().includes(String(value).toLowerCase())
    case 'starts_with':
      return clientValue && String(clientValue).toLowerCase().startsWith(String(value).toLowerCase())
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

function calculateDefaultScore(client: any, activities: any[]): number {
  let score = 10

  if (client.email) score += 10
  if (client.phone) score += 10
  if (client.company) score += 10
  if (client.status === 'Buyer' || client.status === 'Seller') score += 15

  score += activities.length * 2

  return Math.min(100, score)
}

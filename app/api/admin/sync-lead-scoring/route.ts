/**
 * Admin Endpoint: Sync Lead Scoring System
 * Enterprise-grade lead scoring synchronization for existing data
 * 
 * Following industry best practices for data migration and CRM integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LeadScoringService } from '@/lib/lead-scoring/lead-service'
import { LeadScoringActivities } from '@/lib/lead-scoring-utils'

interface SyncResult {
  clients_processed: number
  lead_scores_created: number
  activities_recorded: number
  errors: string[]
  summary: {
    existing_clients: number
    clients_with_scores: number
    clients_without_scores: number
    coverage_percentage: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get sync options from request
    const body = await request.json().catch(() => ({}))
    const options = {
      force_resync: body.force_resync || false,
      dry_run: body.dry_run || false,
      batch_size: Math.min(body.batch_size || 50, 100) // Prevent overload
    }

    const result: SyncResult = {
      clients_processed: 0,
      lead_scores_created: 0,
      activities_recorded: 0,
      errors: [],
      summary: {
        existing_clients: 0,
        clients_with_scores: 0,
        clients_without_scores: 0,
        coverage_percentage: 0
      }
    }

    // Get all clients for this user
    const { data: allClients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, phone, company, address, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (clientsError) {
      return NextResponse.json({
        error: 'Failed to fetch clients',
        details: clientsError.message
      }, { status: 500 })
    }

    if (!allClients || allClients.length === 0) {
      return NextResponse.json({
        message: 'No clients found for this user',
        result
      })
    }

    result.summary.existing_clients = allClients.length

    // Get existing lead scores to determine which clients need initialization
    const { data: existingScores, error: scoresError } = await supabase
      .from('lead_scores')
      .select('client_id, current_score, score_category')
      .eq('user_id', user.id)

    if (scoresError) {
      return NextResponse.json({
        error: 'Failed to fetch existing lead scores',
        details: scoresError.message
      }, { status: 500 })
    }

    const existingClientIds = new Set((existingScores || []).map(score => score.client_id))
    result.summary.clients_with_scores = existingScores?.length || 0

    // Determine which clients need lead scoring
    const clientsNeedingScores = options.force_resync ? 
      allClients : 
      allClients.filter(client => !existingClientIds.has(client.id))

    result.summary.clients_without_scores = clientsNeedingScores.length

    if (clientsNeedingScores.length === 0) {
      result.summary.coverage_percentage = 100
      return NextResponse.json({
        message: 'All clients already have lead scoring enabled',
        result
      })
    }

    if (options.dry_run) {
      return NextResponse.json({
        message: 'Dry run completed - no changes made',
        would_process: clientsNeedingScores.length,
        result
      })
    }

    // Process clients in batches (enterprise best practice)
    const batches = []
    for (let i = 0; i < clientsNeedingScores.length; i += options.batch_size) {
      batches.push(clientsNeedingScores.slice(i, i + options.batch_size))
    }

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      const batchPromises = batch.map(async (client) => {
        try {
          result.clients_processed++

          // Initialize lead scoring for this client
          const success = await LeadScoringService.ensureLeadScoring(user.id, client.id)
          
          if (success) {
            result.lead_scores_created++
            
            // Record retrospective lead creation activity
            const activitySuccess = await LeadScoringService.recordActivityWithScoring(
              user.id,
              {
                ...LeadScoringActivities.leadCreated(client.id, client.status),
                activity_data: {
                  ...LeadScoringActivities.leadCreated(client.id, client.status).activity_data,
                  retrospective: true,
                  sync_batch: batchIndex + 1,
                  original_created_at: client.created_at,
                  client_data: {
                    has_email: !!client.email,
                    has_phone: !!client.phone,
                    has_company: !!client.company,
                    has_address: !!client.address
                  }
                }
              }
            )
            
            if (activitySuccess) {
              result.activities_recorded++
            }

            // If client has deals, record deal activities too
            const { data: clientDeals } = await supabase
              .from('deals')
              .select('id, title, value, status, created_at')
              .eq('client_id', client.id)
              .eq('user_id', user.id)

            if (clientDeals && clientDeals.length > 0) {
              for (const deal of clientDeals) {
                await LeadScoringService.recordActivityWithScoring(
                  user.id,
                  {
                    ...LeadScoringActivities.dealCreated(client.id, deal.id, deal.value),
                    activity_data: {
                      ...LeadScoringActivities.dealCreated(client.id, deal.id, deal.value).activity_data,
                      retrospective: true,
                      sync_batch: batchIndex + 1,
                      original_created_at: deal.created_at
                    }
                  }
                )
                result.activities_recorded++
              }
            }

          } else {
            result.errors.push(`Failed to initialize lead scoring for ${client.name} (${client.id})`)
          }
        } catch (error) {
          const errorMsg = `Error processing ${client.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(`Lead scoring sync error for client ${client.id}:`, error)
        }
      })

      // Process batch with controlled concurrency
      await Promise.allSettled(batchPromises)

      // Small delay between batches to prevent database overload
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Calculate final coverage
    const finalCoverage = result.summary.existing_clients > 0 ? 
      Math.round(((result.summary.clients_with_scores + result.lead_scores_created) / result.summary.existing_clients) * 100) : 0
    
    result.summary.coverage_percentage = finalCoverage

    return NextResponse.json({
      message: 'Lead scoring synchronization completed',
      result,
      performance: {
        batches_processed: batches.length,
        batch_size: options.batch_size,
        success_rate: result.clients_processed > 0 ? 
          Math.round(((result.clients_processed - result.errors.length) / result.clients_processed) * 100) : 0
      }
    })

  } catch (error) {
    console.error('Error in lead scoring sync:', error)
    return NextResponse.json({ 
      error: 'Internal server error during sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get comprehensive sync status
    const [clientsResult, leadScoresResult, activitiesResult] = await Promise.allSettled([
      supabase.from('clients').select('id, name, created_at', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('lead_scores').select('id, client_id, current_score, score_category', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('lead_activities').select('id, client_id, activity_type', { count: 'exact' }).eq('user_id', user.id)
    ])

    const totalClients = clientsResult.status === 'fulfilled' ? (clientsResult.value.count || 0) : 0
    const totalLeadScores = leadScoresResult.status === 'fulfilled' ? (leadScoresResult.value.count || 0) : 0
    const totalActivities = activitiesResult.status === 'fulfilled' ? (activitiesResult.value.count || 0) : 0

    const coverage = totalClients > 0 ? Math.round((totalLeadScores / totalClients) * 100) : 0

    // Get lead score distribution
    const leadScoreData = leadScoresResult.status === 'fulfilled' ? (leadScoresResult.value.data || []) : []
    const scoreDistribution = {
      qualified: leadScoreData.filter(s => s.score_category === 'qualified').length,
      hot: leadScoreData.filter(s => s.score_category === 'hot').length,
      warm: leadScoreData.filter(s => s.score_category === 'warm').length,
      cold: leadScoreData.filter(s => s.score_category === 'cold').length
    }

    return NextResponse.json({
      sync_status: {
        total_clients: totalClients,
        clients_with_lead_scores: totalLeadScores,
        clients_without_lead_scores: totalClients - totalLeadScores,
        coverage_percentage: coverage,
        total_activities: totalActivities,
        score_distribution: scoreDistribution,
        needs_sync: totalLeadScores < totalClients
      },
      recommendations: {
        should_sync: totalLeadScores < totalClients,
        recommended_batch_size: totalClients > 100 ? 25 : 50,
        estimated_time_minutes: Math.ceil((totalClients - totalLeadScores) / 50)
      }
    })

  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
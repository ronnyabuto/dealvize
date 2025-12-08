/**
 * Admin endpoint to initialize lead scoring for existing clients
 * This is a one-time migration endpoint to backfill lead scores
 * for clients that were created before lead scoring was implemented
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LeadScoringService } from '@/lib/lead-scoring/lead-service'
import { LeadScoringActivities } from '@/lib/lead-scoring-utils'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all clients that don't have lead scores
    const { data: clientsWithoutScores, error: clientsError } = await supabase
      .from('clients')
      .select(`
        id, status, email, phone, company, created_at,
        lead_scores!inner (id)
      `)
      .eq('user_id', user.id)
      .is('lead_scores.id', null)

    if (clientsError) {
      console.error('Error fetching clients without scores:', clientsError)
      return NextResponse.json({ 
        error: 'Failed to fetch clients',
        details: clientsError.message
      }, { status: 500 })
    }

    // Also get clients that have no lead_scores relationship at all
    const { data: allClients, error: allClientsError } = await supabase
      .from('clients')
      .select('id, status, email, phone, company, created_at')
      .eq('user_id', user.id)

    if (allClientsError) {
      console.error('Error fetching all clients:', allClientsError)
      return NextResponse.json({ 
        error: 'Failed to fetch all clients',
        details: allClientsError.message
      }, { status: 500 })
    }

    // Get existing lead scores to filter out clients that already have them
    const { data: existingScores } = await supabase
      .from('lead_scores')
      .select('client_id')
      .eq('user_id', user.id)

    const existingClientIds = new Set(existingScores?.map(score => score.client_id) || [])

    // Filter clients that don't have lead scores
    const clientsNeedingScores = allClients?.filter(client => 
      !existingClientIds.has(client.id)
    ) || []

    if (clientsNeedingScores.length === 0) {
      return NextResponse.json({
        message: 'All clients already have lead scoring enabled',
        initialized: 0,
        skipped: allClients?.length || 0
      })
    }

    const results = {
      initialized: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Initialize lead scoring for each client
    for (const client of clientsNeedingScores) {
      try {
        // Ensure lead scoring is set up for this client
        const success = await LeadScoringService.ensureLeadScoring(user.id, client.id)
        
        if (success) {
          // Record a retrospective lead creation activity
          await LeadScoringService.recordActivityWithScoring(
            user.id,
            {
              ...LeadScoringActivities.leadCreated(client.id, client.status),
              activity_data: {
                ...LeadScoringActivities.leadCreated(client.id, client.status).activity_data,
                retrospective: true,
                original_created_at: client.created_at
              }
            }
          )
          
          results.initialized++
        } else {
          results.failed++
          results.errors.push(`Failed to initialize scoring for client ${client.id}`)
        }
      } catch (error) {
        results.failed++
        results.errors.push(`Error processing client ${client.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.error(`Error initializing lead scoring for client ${client.id}:`, error)
      }
    }

    return NextResponse.json({
      message: 'Lead scoring initialization completed',
      results,
      total_processed: clientsNeedingScores.length
    })

  } catch (error) {
    console.error('Error in lead scoring initialization:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
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

    // Get statistics about lead scoring coverage
    const [clientsResult, leadScoresResult] = await Promise.allSettled([
      supabase.from('clients').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('lead_scores').select('id', { count: 'exact' }).eq('user_id', user.id)
    ])

    const totalClients = clientsResult.status === 'fulfilled' ? (clientsResult.value.count || 0) : 0
    const totalLeadScores = leadScoresResult.status === 'fulfilled' ? (leadScoresResult.value.count || 0) : 0

    const coverage = totalClients > 0 ? Math.round((totalLeadScores / totalClients) * 100) : 0

    return NextResponse.json({
      total_clients: totalClients,
      clients_with_lead_scores: totalLeadScores,
      clients_without_lead_scores: totalClients - totalLeadScores,
      coverage_percentage: coverage,
      needs_initialization: totalLeadScores < totalClients
    })

  } catch (error) {
    console.error('Error getting lead scoring status:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
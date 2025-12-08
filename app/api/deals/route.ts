import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { LeadScoringService } from '@/lib/lead-scoring/lead-service'
import { LeadScoringActivities } from '@/lib/lead-scoring-utils'

const createDealSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  value: z.coerce.number().min(0, 'Value must be positive').optional(),
  status: z.enum(['Qualified', 'In Progress', 'Under Contract', 'Closed', 'Lost']).default('Qualified'),
  probability: z.coerce.number().min(0).max(100, 'Probability must be 0-100').optional(),
  expected_close_date: z.string().optional(),
  commission: z.coerce.number().min(0, 'Commission must be positive').optional(),
  property_address: z.string().max(500, 'Address too long').optional(),
  property_type: z.string().max(50, 'Property type too long').optional(),
  property_bedrooms: z.coerce.number().min(0).max(50).optional(),
  property_bathrooms: z.coerce.number().min(0).max(50).optional(),
  property_sqft: z.coerce.number().min(0).max(1000000).optional()
})

// Helper function for fuzzy search matching
function getSearchVariations(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim()
  const words = normalizedQuery.split(' ').filter(word => word.length > 0)
  
  const variations = [
    normalizedQuery, // original
    words.join(' '), // cleaned spaces
  ]
  
  // Add common typo corrections for deals
  const typoCorrections: Record<string, string> = {
    'oak': 'oak',
    'st': 'street',
    'ave': 'avenue',
    'rd': 'road',
    'dr': 'drive',
    'ln': 'lane',
    'ct': 'court',
    'pl': 'place'
  }
  
  words.forEach(word => {
    if (typoCorrections[word]) {
      const corrected = normalizedQuery.replace(word, typoCorrections[word])
      variations.push(corrected)
    }
  })
  
  return [...new Set(variations)]
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    
    let query = supabase
      .from('deals')
      .select(`
        *,
        clients (
          id,
          name,
          email
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (search) {
      const searchVariations = getSearchVariations(search)
      const searchConditions = []
      
      for (const variation of searchVariations) {
        const words = variation.split(' ').filter(word => word.length > 0)
        words.forEach(word => {
          if (word.length >= 2) {
            searchConditions.push(`title.ilike.%${word}%`)
            searchConditions.push(`property_address.ilike.%${word}%`)
            if (word.length >= 3) {
              searchConditions.push(`status.ilike.%${word}%`)
              searchConditions.push(`property_type.ilike.%${word}%`)
            }
          }
        })
      }
      
      const uniqueConditions = [...new Set(searchConditions)]
      if (uniqueConditions.length > 0) {
        query = query.or(uniqueConditions.join(','))
      }
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: deals, error } = await query

    if (error) {
      console.error('Error fetching deals:', error)
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }

    return NextResponse.json({ deals: deals || [] })
  } catch (error) {
    console.error('Error in GET /api/deals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createDealSchema.parse(body)

    // Verify client belongs to user
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', validatedData.client_id)
      .eq('user_id', user.id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Insert deal
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select(`
        *,
        clients (
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error creating deal:', error)
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    }

    // Record lead activity for deal creation (enterprise-grade automation)
    try {
      // Ensure lead scoring is enabled and record the deal creation
      await LeadScoringService.ensureLeadScoring(user.id, validatedData.client_id)
      
      // Record the deal creation activity with automatic scoring
      await LeadScoringService.recordActivityWithScoring(
        user.id,
        LeadScoringActivities.dealCreated(
          validatedData.client_id,
          deal.id,
          validatedData.value || 0
        )
      )

      // Update client status progression (lead lifecycle automation)
      const { data: currentClient } = await supabase
        .from('clients')
        .select('status')
        .eq('id', validatedData.client_id)
        .eq('user_id', user.id)
        .single()

      if (currentClient?.status === 'Buyer') {
        await supabase
          .from('clients')
          .update({ 
            status: 'In Contract',
            last_contact: new Date().toISOString()
          })
          .eq('id', validatedData.client_id)
          .eq('user_id', user.id)
      }

      // Update score category based on new score
      await LeadScoringService.updateScoreCategory(user.id, validatedData.client_id)
    } catch (leadScoringError) {
      console.warn('Lead scoring update failed for deal creation:', leadScoringError)
      // Don't fail deal creation if lead scoring fails
    }

    return NextResponse.json(deal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Error in POST /api/deals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { LeadScoringService } from '@/lib/lead-scoring/lead-service'
import { LeadScoringActivities } from '@/lib/lead-scoring-utils'

const createDealSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  value: z.coerce.number().min(0, 'Value must be positive').optional(),
  // Aligned with DB migration enum
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
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
          first_name,
          last_name,
          email
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (search) {
      // Optimized search to prevent ReDoS or overly complex SQL
      const cleanSearch = search.replace(/[^\w\s]/gi, '').trim();
      query = query.or(`title.ilike.%${cleanSearch}%,property_address.ilike.%${cleanSearch}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: deals, error } = await query

    if (error) {
      console.error('Database error fetching deals:', error)
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }

    return NextResponse.json({ deals: deals || [] })
  } catch (error) {
    console.error('Critical error in GET /api/deals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createDealSchema.parse(body)

    // Check Client existence (Security check)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, status')
      .eq('id', validatedData.client_id)
      .eq('user_id', user.id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 404 })
    }

    // Insert deal
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select(`*, clients(id, first_name, last_name, email)`)
      .single()

    if (error) {
      console.error('Error creating deal:', error)
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
    }

    // Async processing for scores/updates - Fire and forget pattern to speed up response
    (async () => {
      try {
        await LeadScoringService.ensureLeadScoring(user.id, validatedData.client_id)
        await LeadScoringService.recordActivityWithScoring(
          user.id,
          LeadScoringActivities.dealCreated(
            validatedData.client_id,
            deal.id,
            validatedData.value || 0
          )
        )
        if (client.status === 'Buyer') {
           await supabase.from('clients').update({ 
            status: 'In Contract',
            last_contact: new Date().toISOString()
          }).eq('id', validatedData.client_id)
        }
      } catch (e) {
        console.warn('Background scoring task failed:', e)
      }
    })()

    return NextResponse.json(deal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error in POST /api/deals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { LeadScoringService } from '@/lib/lead-scoring/lead-service'
import { LeadScoringActivities } from '@/lib/lead-scoring-utils'

const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required').max(20, 'Phone too long'),
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  company: z.string().max(100, 'Company name too long').optional().or(z.literal('')),
  status: z.enum(['Buyer', 'Seller', 'In Contract']).default('Buyer')
})

// Helper function to create multiple search variations with fuzzy matching
function getSearchVariations(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim()
  const words = normalizedQuery.split(' ').filter(word => word.length > 0)
  
  const variations = [
    normalizedQuery, // original
    words.join(' '), // cleaned spaces
  ]
  
  // Add reversed word order for names (e.g., "Johnson Sarah" -> "Sarah Johnson")
  if (words.length === 2) {
    variations.push(words.slice().reverse().join(' '))
  }
  
  // Add common typo corrections
  const typoCorrections: Record<string, string> = {
    'jhon': 'john',
    'sara': 'sarah',
    'mik': 'mike',
    'lisaa': 'lisa',
    'chenn': 'chen',
    'jonson': 'johnson',
    'rodrigez': 'rodriguez'
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
    // Environment validation
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ 
        error: 'Configuration error',
        message: 'Service temporarily unavailable' 
      }, { status: 503 })
    }

    const supabase = await createClient()
    
    // Get current user with enhanced error handling
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Auth error in clients API:', userError)
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to access clients',
        details: process.env.NODE_ENV === 'development' ? userError?.message : undefined
      }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    const export_format = searchParams.get('export')

    // Build query
    let query = supabase
      .from('clients')
      .select(`
        *,
        deals (
          value,
          status
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)

    // Apply enhanced search filter with fuzzy matching
    if (search) {
      const searchVariations = getSearchVariations(search)
      const searchConditions = []
      
      // Search each variation
      for (const variation of searchVariations) {
        const words = variation.split(' ').filter(word => word.length > 0)
        
        // Individual field searches for each word
        words.forEach(word => {
          if (word.length >= 2) {
            searchConditions.push(`name.ilike.%${word}%`)
            searchConditions.push(`email.ilike.%${word}%`)
            if (word.length >= 3) {
              searchConditions.push(`company.ilike.%${word}%`)
              searchConditions.push(`phone.ilike.%${word}%`)
            }
          }
        })
      }
      
      // Remove duplicates and create OR query
      const uniqueConditions = [...new Set(searchConditions)]
      if (uniqueConditions.length > 0) {
        query = query.or(uniqueConditions.join(','))
      }
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    switch (sortBy) {
      case 'name':
        query = query.order('name', { ascending })
        break
      case 'lastContact':
        query = query.order('last_contact', { ascending })
        break
      case 'status':
        query = query.order('status', { ascending })
        break
      default:
        query = query.order('created_at', { ascending })
    }

    // Apply pagination only if not exporting
    if (!export_format) {
      query = query.range(offset, offset + limit - 1)
    }

    // Fetch clients with their associated deals for the user
    const { data: clients, error, count } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    // Transform client data with calculated deal values
    const transformedClients = clients?.map(client => {
      // Calculate total deal value for this client
      const totalDealValue = client.deals?.reduce((sum: number, deal: any) => {
        const value = typeof deal.value === 'string' 
          ? parseFloat(deal.value.replace(/[$,]/g, '')) || 0
          : deal.value || 0
        return sum + value
      }, 0) || 0

      return {
        ...client,
        initials: client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        statusColor: getStatusColor(client.status),
        dealValue: totalDealValue > 0 ? `$${totalDealValue.toLocaleString()}` : '$0',
        lastContact: client.last_contact ? new Date(client.last_contact).toLocaleDateString() : 'Never'
      }
    }) || []

    // Handle export formats
    if (export_format === 'csv') {
      const csvHeaders = 'Name,Email,Phone,Company,Status,Address,Deal Value,Last Contact\n'
      const csvData = transformedClients.map(client => 
        `"${client.name}","${client.email}","${client.phone}","${client.company || ''}","${client.status}","${client.address || ''}","${client.dealValue}","${client.lastContact}"`
      ).join('\n')
      
      return new NextResponse(csvHeaders + csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=clients.csv'
        }
      })
    }

    return NextResponse.json({ 
      clients: transformedClients,
      totalCount: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Error in GET /api/clients:', error)
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
    
    return NextResponse.json({ 
      error: 'Failed to load clients',
      message: 'Please try again later',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('POST /api/clients - User check:', { user: user?.id, userError })
    
    if (userError || !user) {
      console.log('POST /api/clients - Auth failed:', { userError, hasUser: !!user })
      return NextResponse.json({ error: 'Unauthorized', details: userError?.message }, { status: 401 })
    }

    console.log('POST /api/clients - User authenticated:', user.id)

    // Check if user profile exists, create if missing
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', user.id)
      .single()

    console.log('POST /api/clients - User profile check:', { userProfile, profileError })

    // If user profile doesn't exist, create it automatically
    if (profileError || !userProfile) {
      console.log('POST /api/clients - Creating missing user profile for:', user.id)
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          role: 'Agent'
        })
        .select('id, name, email')
        .single()

      if (createError) {
        console.error('POST /api/clients - Failed to create user profile:', createError)
        return NextResponse.json({ 
          error: 'Failed to create user profile', 
          details: createError.message,
          user_id: user.id 
        }, { status: 500 })
      }

      userProfile = newProfile
      console.log('POST /api/clients - User profile created successfully:', userProfile)
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createClientSchema.parse(body)

    // Insert client
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        ...validatedData,
        user_id: user.id,
        last_contact: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create client', 
        details: error.message || error.code || 'Unknown database error',
        user_id: user.id
      }, { status: 500 })
    }

    // Initialize lead scoring for new client (enterprise-grade automation)
    try {
      // Ensure lead scoring is properly set up and record initial activity
      await LeadScoringService.ensureLeadScoring(user.id, client.id)
      
      // Record the lead creation activity
      await LeadScoringService.recordActivityWithScoring(
        user.id,
        LeadScoringActivities.leadCreated(client.id, client.status)
      )
    } catch (leadScoringError) {
      console.warn('Lead scoring initialization failed:', leadScoringError)
      // Don't fail client creation if lead scoring fails
    }

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Error in POST /api/clients:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Buyer': return 'bg-green-100 text-green-800'
    case 'Seller': return 'bg-blue-100 text-blue-800'
    case 'In Contract': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}
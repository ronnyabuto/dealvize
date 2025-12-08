import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { LeadScoringService } from '@/lib/lead-scoring/lead-service'
import { LeadScoringActivities } from '@/lib/lead-scoring-utils'

const createClientSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required').max(20, 'Phone too long'),
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  company: z.string().max(100, 'Company name too long').optional().or(z.literal('')),
  status: z.enum(['Buyer', 'Seller', 'In Contract']).default('Buyer')
})

function getStatusColor(status: string): string {
  switch (status) {
    case 'Buyer': return 'bg-green-100 text-green-800'
    case 'Seller': return 'bg-blue-100 text-blue-800'
    case 'In Contract': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getSearchVariations(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim()
  const words = normalizedQuery.split(' ').filter(word => word.length > 0)
  
  const variations = [normalizedQuery, words.join(' ')]
  
  if (words.length === 2) {
    variations.push(words.slice().reverse().join(' '))
  }
  
  const typoCorrections: Record<string, string> = {
    'jhon': 'john', 'sara': 'sarah', 'mik': 'mike', 
    'lisaa': 'lisa', 'chenn': 'chen', 'jonson': 'johnson', 'rodrigez': 'rodriguez'
  }
  
  words.forEach(word => {
    if (typoCorrections[word]) {
      variations.push(normalizedQuery.replace(word, typoCorrections[word]))
    }
  })
  
  return [...new Set(variations)]
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    const export_format = searchParams.get('export')

    // FIX: Simplified join to avoid column ambiguity crash
    // We select specific columns to prevent collision with joined tables
    let query = supabase
      .from('clients')
      .select(`
        id, user_id, first_name, last_name, name, email, phone, status, 
        company, address, lead_score, created_at, last_contact,
        deals (
          value,
          status
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)

    if (search) {
      const searchVariations = getSearchVariations(search)
      const searchConditions = []
      
      for (const variation of searchVariations) {
        // Safe simplified search to prevent regex DoS or sql injection
        const safeTerm = variation.replace(/[^\w\s@.-]/g, '')
        if (safeTerm.length >= 2) {
            searchConditions.push(`name.ilike.%${safeTerm}%`)
            searchConditions.push(`email.ilike.%${safeTerm}%`)
            searchConditions.push(`company.ilike.%${safeTerm}%`)
        }
      }
      
      const uniqueConditions = [...new Set(searchConditions)]
      if (uniqueConditions.length > 0) {
        query = query.or(uniqueConditions.join(','))
      }
    }

    if (status) query = query.eq('status', status)

    const ascending = sortOrder === 'asc'
    const sortCol = ['name', 'last_contact', 'status'].includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortCol, { ascending })

    if (!export_format) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: clients, error, count } = await query

    if (error) {
      console.error('Supabase error fetching clients:', error)
      // Return empty list instead of 500 to prevent UI crash during migration
      return NextResponse.json({ clients: [], totalCount: 0, page, limit, totalPages: 0 }) 
    }

    const transformedClients = clients?.map(client => {
      const totalDealValue = client.deals?.reduce((sum: number, deal: any) => {
        const val = typeof deal.value === 'string' 
          ? parseFloat(deal.value.replace(/[$,]/g, '')) || 0
          : deal.value || 0
        return sum + val
      }, 0) || 0

      // Handle both separate names and full name field
      const displayName = client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown'

      return {
        ...client,
        name: displayName,
        initials: displayName.substring(0, 2).toUpperCase(),
        statusColor: getStatusColor(client.status),
        dealValue: totalDealValue > 0 ? `$${totalDealValue.toLocaleString()}` : '$0',
        lastContact: client.last_contact ? new Date(client.last_contact).toLocaleDateString() : 'Never'
      }
    }) || []

    if (export_format === 'csv') {
      const csvHeaders = 'Name,Email,Phone,Company,Status,Address,Deal Value,Last Contact\n'
      const csvData = transformedClients.map(c => 
        `"${c.name}","${c.email}","${c.phone}","${c.company || ''}","${c.status}","${c.address || ''}","${c.dealValue}","${c.lastContact}"`
      ).join('\n')
      
      return new NextResponse(csvHeaders + csvData, {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=clients.csv' }
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
    console.error('Critical error in GET /api/clients:', error)
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
        const nameParts = body.name ? body.name.split(' ') : [body.first_name || '', body.last_name || ''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const validatedData = createClientSchema.parse({
      ...body,
      first_name: firstName,
      last_name: lastName,
    });

    // Robust user profile check
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
       await supabase.from('users').insert({
          id: user.id,
          name: user.user_metadata?.name || 'User',
          email: user.email,
          role: 'Agent'
        }).select().single()
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
                first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        name: `${validatedData.first_name} ${validatedData.last_name}`.trim(), // Keep name for compatibility
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        company: validatedData.company,
        status: validatedData.status,
        user_id: user.id,
        last_contact: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json({ error: 'Failed to create client', details: error.message }, { status: 500 })
    }

    // Fire-and-forget background tasks
    (async () => {
      try {
        await LeadScoringService.ensureLeadScoring(user.id, client.id)
        await LeadScoringService.recordActivityWithScoring(
          user.id,
          LeadScoringActivities.leadCreated(client.id, client.status)
        )
      } catch (e) {
        console.warn('Background scoring failed:', e)
      }
    })()

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
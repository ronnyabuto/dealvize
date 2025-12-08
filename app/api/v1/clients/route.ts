import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

// RESTful API v1 for Clients
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // API Key authentication for external integrations
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      const authenticatedUserId = await authenticateApiKey(supabase, apiKey)
      if (!authenticatedUserId) {
        return NextResponse.json({ 
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        }, { status: 401 })
      }
    }

    // Query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 per page
    const offset = (page - 1) * limit
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const search = searchParams.get('search')
    const created_after = searchParams.get('created_after')
    const created_before = searchParams.get('created_before')
    const include = searchParams.get('include')?.split(',') || []

    let query = supabase
      .from('clients')
      .select(`
        id, first_name, last_name, email, phone, status, source,
        lead_score, ai_lead_score, budget_min, budget_max,
        preferred_location, property_type, created_at, updated_at,
        last_contact_date, conversion_date, notes_count,
        ${include.includes('deals') ? 'deals(id, title, status, value, stage, created_at),' : ''}
        ${include.includes('activities') ? 'lead_activities(id, activity_type, created_at, score_awarded),' : ''}
        ${include.includes('notes') ? 'notes(id, content, created_at, note_type),' : ''}
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .range(offset, offset + limit - 1)
      .order(sort, { ascending: order === 'asc' })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (source) query = query.eq('source', source)
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }
    if (created_after) query = query.gte('created_at', created_after)
    if (created_before) query = query.lte('created_at', created_before)

    const { data: clients, error, count } = await query

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        code: 'QUERY_ERROR'
      }, { status: 400 })
    }

    // Rate limiting check
    await logApiUsage(supabase, user.id, 'clients', 'read')

    return NextResponse.json({
      data: clients,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit)
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    })
  } catch (error) {
    console.error('Error in clients API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    // API Key authentication for external integrations
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      const authenticatedUserId = await authenticateApiKey(supabase, apiKey)
      if (!authenticatedUserId) {
        return NextResponse.json({ 
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        }, { status: 401 })
      }
    }

    // Validate required fields
    const {
      first_name,
      last_name,
      email,
      phone,
      status = 'lead',
      source,
      budget_min,
      budget_max,
      preferred_location,
      property_type,
      bedrooms,
      bathrooms,
      move_in_date,
      notes,
      tags = [],
      custom_fields = {}
    } = body

    if (!first_name || !last_name || !email) {
      return NextResponse.json({
        error: 'first_name, last_name, and email are required',
        code: 'VALIDATION_ERROR',
        details: {
          missing_fields: ['first_name', 'last_name', 'email'].filter(field => !body[field])
        }
      }, { status: 400 })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        error: 'Invalid email format',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Check for duplicates
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', email)
      .single()

    if (existingClient) {
      return NextResponse.json({
        error: 'Client with this email already exists',
        code: 'DUPLICATE_EMAIL',
        existing_client_id: existingClient.id
      }, { status: 409 })
    }

    // Create client
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        first_name,
        last_name,
        email,
        phone,
        status,
        source,
        budget_min,
        budget_max,
        preferred_location,
        property_type,
        bedrooms,
        bathrooms,
        move_in_date,
        tags,
        custom_fields,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        code: 'CREATE_ERROR'
      }, { status: 400 })
    }

    // Add initial note if provided
    if (notes) {
      await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          client_id: client.id,
          content: notes,
          note_type: 'general',
          created_at: new Date().toISOString()
        })
    }

    // Log activity
    await supabase
      .from('lead_activities')
      .insert({
        user_id: user.id,
        client_id: client.id,
        activity_type: 'client_created',
        activity_data: {
          source,
          created_via: 'api'
        },
        score_awarded: 10,
        source: 'api',
        created_at: new Date().toISOString()
      })

    // Rate limiting check
    await logApiUsage(supabase, user.id, 'clients', 'create')

    return NextResponse.json({
      data: client,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// Single client operations
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('id')
    const body = await request.json()

    if (!clientId) {
      return NextResponse.json({
        error: 'Client ID is required',
        code: 'MISSING_CLIENT_ID'
      }, { status: 400 })
    }

    // API Key authentication for external integrations
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      const authenticatedUserId = await authenticateApiKey(supabase, apiKey)
      if (!authenticatedUserId) {
        return NextResponse.json({ 
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        }, { status: 401 })
      }
    }

    // Check if client exists and user has access
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, email')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single()

    if (!existingClient) {
      return NextResponse.json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 404 })
    }

    // Prepare update data
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    }

    // Remove fields that shouldn't be updated via API
    delete updateData.id
    delete updateData.user_id
    delete updateData.created_at

    // Email validation if email is being updated
    if (body.email && body.email !== existingClient.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json({
          error: 'Invalid email format',
          code: 'VALIDATION_ERROR'
        }, { status: 400 })
      }

      // Check for email duplicates
      const { data: duplicateClient } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .eq('email', body.email)
        .neq('id', clientId)
        .single()

      if (duplicateClient) {
        return NextResponse.json({
          error: 'Another client with this email already exists',
          code: 'DUPLICATE_EMAIL'
        }, { status: 409 })
      }
    }

    // Update client
    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        code: 'UPDATE_ERROR'
      }, { status: 400 })
    }

    // Log activity
    await supabase
      .from('lead_activities')
      .insert({
        user_id: user.id,
        client_id: clientId,
        activity_type: 'client_updated',
        activity_data: {
          updated_fields: Object.keys(body),
          updated_via: 'api'
        },
        score_awarded: 5,
        source: 'api',
        created_at: new Date().toISOString()
      })

    // Rate limiting check
    await logApiUsage(supabase, user.id, 'clients', 'update')

    return NextResponse.json({
      data: client,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('id')

    if (!clientId) {
      return NextResponse.json({
        error: 'Client ID is required',
        code: 'MISSING_CLIENT_ID'
      }, { status: 400 })
    }

    // API Key authentication for external integrations
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      const authenticatedUserId = await authenticateApiKey(supabase, apiKey)
      if (!authenticatedUserId) {
        return NextResponse.json({ 
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        }, { status: 401 })
      }
    }

    // Check if client exists
    const { data: client } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single()

    if (!client) {
      return NextResponse.json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 404 })
    }

    // Soft delete (update status instead of hard delete)
    const { error } = await supabase
      .from('clients')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        code: 'DELETE_ERROR'
      }, { status: 400 })
    }

    // Log activity
    await supabase
      .from('lead_activities')
      .insert({
        user_id: user.id,
        client_id: clientId,
        activity_type: 'client_deleted',
        activity_data: {
          deleted_via: 'api',
          client_name: `${client.first_name} ${client.last_name}`,
          client_email: client.email
        },
        score_awarded: 0,
        source: 'api',
        created_at: new Date().toISOString()
      })

    // Rate limiting check
    await logApiUsage(supabase, user.id, 'clients', 'delete')

    return NextResponse.json({
      message: 'Client deleted successfully',
      data: { id: clientId },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// Helper functions
async function authenticateApiKey(supabase: any, apiKey: string) {
  const { data: key } = await supabase
    .from('api_keys')
    .select('user_id, is_active, last_used_at, rate_limit_per_hour')
    .eq('key_hash', hashApiKey(apiKey)) // In production, hash the API key
    .eq('is_active', true)
    .single()

  if (!key) return null

  // Update last used timestamp
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', hashApiKey(apiKey))

  return key.user_id
}

async function logApiUsage(supabase: any, userId: string, resource: string, operation: string) {
  await supabase
    .from('api_usage_logs')
    .insert({
      user_id: userId,
      resource,
      operation,
      timestamp: new Date().toISOString(),
      ip_address: null, // Would get from request headers in production
      user_agent: null  // Would get from request headers in production
    })
}

function hashApiKey(apiKey: string): string {
  // In production, use a proper hashing library like bcrypt or crypto
  // This is just for demonstration
  return Buffer.from(apiKey).toString('base64')
}
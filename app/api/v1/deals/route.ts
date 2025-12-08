import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

// RESTful API v1 for Deals
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = (page - 1) * limit
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const status = searchParams.get('status')
    const stage = searchParams.get('stage')
    const client_id = searchParams.get('client_id')
    const value_min = searchParams.get('value_min')
    const value_max = searchParams.get('value_max')
    const search = searchParams.get('search')
    const include = searchParams.get('include')?.split(',') || []

    let query = supabase
      .from('deals')
      .select(`
        id, title, description, status, stage, value, probability,
        expected_close_date, actual_close_date, client_id, source,
        created_at, updated_at, next_follow_up, priority,
        ${include.includes('client') ? 'client:clients(id, first_name, last_name, email, phone),' : ''}
        ${include.includes('activities') ? 'deal_activities(id, activity_type, created_at, notes),' : ''}
        ${include.includes('notes') ? 'notes(id, content, created_at, note_type),' : ''}
        ${include.includes('documents') ? 'deal_documents(id, file_name, file_type, file_size, uploaded_at),' : ''}
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .range(offset, offset + limit - 1)
      .order(sort, { ascending: order === 'asc' })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (stage) query = query.eq('stage', stage)
    if (client_id) query = query.eq('client_id', client_id)
    if (value_min) query = query.gte('value', parseFloat(value_min))
    if (value_max) query = query.lte('value', parseFloat(value_max))
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: deals, error, count } = await query

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        code: 'QUERY_ERROR'
      }, { status: 400 })
    }

    // Rate limiting check
    await logApiUsage(supabase, user.id, 'deals', 'read')

    return NextResponse.json({
      data: deals,
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
    console.error('Error in deals API:', error)
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
      title,
      description,
      client_id,
      value = 0,
      status = 'lead',
      stage = 'initial_contact',
      probability = 10,
      expected_close_date,
      priority = 'medium',
      source,
      custom_fields = {},
      tags = []
    } = body

    if (!title || !client_id) {
      return NextResponse.json({
        error: 'title and client_id are required',
        code: 'VALIDATION_ERROR',
        details: {
          missing_fields: ['title', 'client_id'].filter(field => !body[field])
        }
      }, { status: 400 })
    }

    // Verify client exists and belongs to user
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('user_id', user.id)
      .single()

    if (!client) {
      return NextResponse.json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 404 })
    }

    // Validate probability range
    if (probability < 0 || probability > 100) {
      return NextResponse.json({
        error: 'Probability must be between 0 and 100',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Validate value
    if (value < 0) {
      return NextResponse.json({
        error: 'Value cannot be negative',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Create deal
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        user_id: user.id,
        title,
        description,
        client_id,
        value,
        status,
        stage,
        probability,
        expected_close_date,
        priority,
        source,
        custom_fields,
        tags,
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

    // Log activity
    await supabase
      .from('lead_activities')
      .insert({
        user_id: user.id,
        client_id,
        activity_type: 'deal_created',
        activity_data: {
          deal_id: deal.id,
          deal_title: title,
          deal_value: value,
          created_via: 'api'
        },
        score_awarded: 25,
        source: 'api',
        created_at: new Date().toISOString()
      })

    // Update client status if it's still a lead
    await supabase
      .from('clients')
      .update({ 
        status: 'prospect',
        updated_at: new Date().toISOString()
      })
      .eq('id', client_id)
      .eq('status', 'lead')

    // Rate limiting check
    await logApiUsage(supabase, user.id, 'deals', 'create')

    return NextResponse.json({
      data: deal,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const dealId = searchParams.get('id')
    const body = await request.json()

    if (!dealId) {
      return NextResponse.json({
        error: 'Deal ID is required',
        code: 'MISSING_DEAL_ID'
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

    // Check if deal exists and user has access
    const { data: existingDeal } = await supabase
      .from('deals')
      .select('id, status, stage, value, client_id')
      .eq('id', dealId)
      .eq('user_id', user.id)
      .single()

    if (!existingDeal) {
      return NextResponse.json({
        error: 'Deal not found',
        code: 'DEAL_NOT_FOUND'
      }, { status: 404 })
    }

    // Validate data if provided
    if (body.probability !== undefined && (body.probability < 0 || body.probability > 100)) {
      return NextResponse.json({
        error: 'Probability must be between 0 and 100',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    if (body.value !== undefined && body.value < 0) {
      return NextResponse.json({
        error: 'Value cannot be negative',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
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

    // Handle status changes
    if (body.status && body.status !== existingDeal.status) {
      if (body.status === 'closed_won') {
        updateData.actual_close_date = new Date().toISOString()
        updateData.probability = 100
      } else if (body.status === 'closed_lost') {
        updateData.actual_close_date = new Date().toISOString()
        updateData.probability = 0
      }
    }

    // Update deal
    const { data: deal, error } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', dealId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        code: 'UPDATE_ERROR'
      }, { status: 400 })
    }

    // Log activity for significant changes
    const significantChanges = ['status', 'stage', 'value', 'probability']
    const changedFields = Object.keys(body).filter(field => significantChanges.includes(field))
    
    if (changedFields.length > 0) {
      await supabase
        .from('lead_activities')
        .insert({
          user_id: user.id,
          client_id: existingDeal.client_id,
          activity_type: 'deal_updated',
          activity_data: {
            deal_id: dealId,
            updated_fields: changedFields,
            previous_values: {
              status: existingDeal.status,
              stage: existingDeal.stage,
              value: existingDeal.value
            },
            updated_via: 'api'
          },
          score_awarded: 10,
          source: 'api',
          created_at: new Date().toISOString()
        })
    }

    // Rate limiting check
    await logApiUsage(supabase, user.id, 'deals', 'update')

    return NextResponse.json({
      data: deal,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    })
  } catch (error) {
    console.error('Error updating deal:', error)
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
    const dealId = searchParams.get('id')

    if (!dealId) {
      return NextResponse.json({
        error: 'Deal ID is required',
        code: 'MISSING_DEAL_ID'
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

    // Check if deal exists
    const { data: deal } = await supabase
      .from('deals')
      .select('id, title, value, client_id')
      .eq('id', dealId)
      .eq('user_id', user.id)
      .single()

    if (!deal) {
      return NextResponse.json({
        error: 'Deal not found',
        code: 'DEAL_NOT_FOUND'
      }, { status: 404 })
    }

    // Soft delete (update status instead of hard delete)
    const { error } = await supabase
      .from('deals')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', dealId)
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
        client_id: deal.client_id,
        activity_type: 'deal_deleted',
        activity_data: {
          deal_id: dealId,
          deal_title: deal.title,
          deal_value: deal.value,
          deleted_via: 'api'
        },
        score_awarded: 0,
        source: 'api',
        created_at: new Date().toISOString()
      })

    // Rate limiting check
    await logApiUsage(supabase, user.id, 'deals', 'delete')

    return NextResponse.json({
      message: 'Deal deleted successfully',
      data: { id: dealId },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1'
      }
    })
  } catch (error) {
    console.error('Error deleting deal:', error)
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
    .eq('key_hash', hashApiKey(apiKey))
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
      ip_address: null,
      user_agent: null
    })
}

function hashApiKey(apiKey: string): string {
  return Buffer.from(apiKey).toString('base64')
}
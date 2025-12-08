import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select(`
        id, name, description, is_active, created_at, last_used_at,
        expires_at, rate_limit_per_hour, scopes, key_preview
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ api_keys: apiKeys || [] })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      description,
      expires_in_days = 365,
      rate_limit_per_hour = 1000,
      scopes = ['read', 'write']
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json({
        error: 'Name is required'
      }, { status: 400 })
    }

    // Validate scopes
    const validScopes = ['read', 'write', 'delete', 'admin']
    const invalidScopes = scopes.filter((scope: string) => !validScopes.includes(scope))
    if (invalidScopes.length > 0) {
      return NextResponse.json({
        error: `Invalid scopes: ${invalidScopes.join(', ')}`,
        valid_scopes: validScopes
      }, { status: 400 })
    }

    // Check if user has reached API key limit
    const { data: existingKeys } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const MAX_API_KEYS = 10 // Configurable limit
    if (existingKeys && existingKeys.length >= MAX_API_KEYS) {
      return NextResponse.json({
        error: `Maximum of ${MAX_API_KEYS} API keys allowed`
      }, { status: 400 })
    }

    // Generate API key
    const apiKey = generateApiKey()
    const keyHash = hashApiKey(apiKey)
    const keyPreview = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`

    // Calculate expiration date
    const expiresAt = expires_in_days > 0 
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    // Create API key record
    const { data: keyRecord, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name,
        description,
        key_hash: keyHash,
        key_preview: keyPreview,
        scopes,
        rate_limit_per_hour,
        expires_at: expiresAt,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select(`
        id, name, description, is_active, created_at, expires_at,
        rate_limit_per_hour, scopes, key_preview
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log the key creation
    await supabase
      .from('api_key_activity_logs')
      .insert({
        api_key_id: keyRecord.id,
        activity_type: 'key_created',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        created_at: new Date().toISOString()
      })

    // Return the API key only once (never stored in plain text)
    return NextResponse.json({
      api_key: apiKey,
      key_details: keyRecord,
      message: 'API key created successfully. Please save it securely as it will not be shown again.'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')
    const body = await request.json()

    if (!keyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 })
    }

    // Check if key exists and belongs to user
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', keyId)
      .eq('user_id', user.id)
      .single()

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Validate scopes if provided
    if (body.scopes) {
      const validScopes = ['read', 'write', 'delete', 'admin']
      const invalidScopes = body.scopes.filter((scope: string) => !validScopes.includes(scope))
      if (invalidScopes.length > 0) {
        return NextResponse.json({
          error: `Invalid scopes: ${invalidScopes.join(', ')}`,
          valid_scopes: validScopes
        }, { status: 400 })
      }
    }

    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    }

    // Remove fields that shouldn't be updated
    delete updateData.id
    delete updateData.user_id
    delete updateData.key_hash
    delete updateData.key_preview
    delete updateData.created_at

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', keyId)
      .eq('user_id', user.id)
      .select(`
        id, name, description, is_active, created_at, last_used_at,
        expires_at, rate_limit_per_hour, scopes, key_preview, updated_at
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log the update
    await supabase
      .from('api_key_activity_logs')
      .insert({
        api_key_id: keyId,
        activity_type: 'key_updated',
        activity_data: { updated_fields: Object.keys(body) },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ api_key: apiKey })
  } catch (error) {
    console.error('Error updating API key:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 })
    }

    // Check if key exists and belongs to user
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('id, name')
      .eq('id', keyId)
      .eq('user_id', user.id)
      .single()

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Soft delete (deactivate) the key
    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log the deletion
    await supabase
      .from('api_key_activity_logs')
      .insert({
        api_key_id: keyId,
        activity_type: 'key_deleted',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      message: 'API key deleted successfully',
      key_name: existingKey.name
    })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

// Generate a secure API key
function generateApiKey(): string {
  const prefix = 'dk' // Dealvize Key
  const randomPart = randomBytes(32).toString('hex')
  return `${prefix}_${randomPart}`
}

// Hash API key for storage
function hashApiKey(apiKey: string): string {
  // In production, use a proper hashing library like bcrypt
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}
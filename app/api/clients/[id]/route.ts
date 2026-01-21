import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Update client schema - all fields optional for partial updates
const updateClientSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long').optional(),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long').optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone too long').optional(),
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  company: z.string().max(100, 'Company name too long').optional().or(z.literal('')),
  status: z.enum(['Buyer', 'Seller', 'In Contract']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const resolvedParams = await params
    
    // Validate UUID format to prevent "new" being treated as ID
    if (!UUID_REGEX.test(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error in GET /api/clients/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const resolvedParams = await params
    
    // Validate UUID format
    if (!UUID_REGEX.test(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()

    // Validate request body with Zod
    const validation = updateClientSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      }, { status: 400 })
    }

    const { first_name, last_name, email, phone, address, company, status } = validation.data

    const { data: client, error } = await supabase
      .from('clients')
      .update({
        first_name,
        last_name,
        email,
        phone,
        address,
        company,
        status,
        last_contact: new Date().toISOString(),
      })
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating client:', error)
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error in PUT /api/clients/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const resolvedParams = await params
    
    // Validate UUID format
    if (!UUID_REGEX.test(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting client:', error)
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/clients/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
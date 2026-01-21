import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { z } from 'zod'

// Update deal schema - all fields optional for partial updates
const updateDealSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  value: z.coerce.number().min(0, 'Value must be positive').optional(),
  status: z.enum(['Lead', 'In Progress', 'Under Contract', 'Closed', 'Lost']).optional(),
  probability: z.coerce.number().min(0).max(100, 'Probability must be 0-100').optional(),
  expected_close_date: z.string().datetime().optional().or(z.literal('')),
  commission: z.coerce.number().min(0, 'Commission must be positive').optional(),
  property_address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  property_type: z.string().max(50, 'Property type too long').optional().or(z.literal('')),
  property_bedrooms: z.coerce.number().min(0).max(50).optional(),
  property_bathrooms: z.coerce.number().min(0).max(50).optional(),
  property_sqft: z.coerce.number().min(0).max(1000000).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const resolvedParams = await params
    
    const { data: deal, error } = await supabase
      .from('deals')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone,
          company,
          initials
        )
      `)
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    return NextResponse.json(deal)
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const resolvedParams = await params
    
    const body = await request.json()

    // Validate request body with Zod
    const validation = updateDealSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      }, { status: 400 })
    }

    const {
      title,
      value,
      status,
      probability,
      expected_close_date,
      commission,
      property_address,
      property_type,
      property_bedrooms,
      property_bathrooms,
      property_sqft
    } = validation.data

    const { data: deal, error } = await supabase
      .from('deals')
      .update({
        title,
        value,
        status,
        probability,
        expected_close_date,
        commission,
        property_address,
        property_type,
        property_bedrooms,
        property_bathrooms,
        property_sqft,
      })
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone,
          company,
          initials
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(deal)
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const resolvedParams = await params
    
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Deal deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
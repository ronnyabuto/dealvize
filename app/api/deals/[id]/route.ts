import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

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
    } = body

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
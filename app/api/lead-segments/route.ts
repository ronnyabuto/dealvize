import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get segments with client counts
    const { data: segments, error } = await supabase
      .from('lead_segments')
      .select(`
        *,
        client_count:client_segments(count)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Format the response to include client counts
    const segmentsWithCounts = segments?.map(segment => ({
      ...segment,
      client_count: segment.client_count?.[0]?.count || 0
    })) || []

    return NextResponse.json({ segments: segmentsWithCounts })
  } catch (error) {
    console.error('Error fetching lead segments:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      segment_name,
      description,
      criteria,
      color = 'blue',
      auto_assign = true,
      priority = 1
    } = body

    // Validate required fields
    if (!segment_name || !criteria) {
      return NextResponse.json({ 
        error: 'Segment name and criteria are required' 
      }, { status: 400 })
    }

    const { data: segment, error } = await supabase
      .from('lead_segments')
      .insert({
        user_id: user.id,
        segment_name,
        description,
        criteria,
        color,
        auto_assign,
        priority
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ segment }, { status: 201 })
  } catch (error) {
    console.error('Error creating lead segment:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const segmentId = searchParams.get('id')
    const body = await request.json()

    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID is required' }, { status: 400 })
    }

    const {
      segment_name,
      description,
      criteria,
      color,
      auto_assign,
      is_active,
      priority
    } = body

    const updateData: any = { updated_at: new Date().toISOString() }

    if (segment_name) updateData.segment_name = segment_name
    if (description !== undefined) updateData.description = description
    if (criteria) updateData.criteria = criteria
    if (color) updateData.color = color
    if (typeof auto_assign === 'boolean') updateData.auto_assign = auto_assign
    if (typeof is_active === 'boolean') updateData.is_active = is_active
    if (priority !== undefined) updateData.priority = priority

    const { data: segment, error } = await supabase
      .from('lead_segments')
      .update(updateData)
      .eq('id', segmentId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ segment })
  } catch (error) {
    console.error('Error updating lead segment:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const segmentId = searchParams.get('id')

    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID is required' }, { status: 400 })
    }

    // Delete segment assignments first
    await supabase
      .from('client_segments')
      .delete()
      .eq('segment_id', segmentId)

    // Delete the segment
    const { error } = await supabase
      .from('lead_segments')
      .delete()
      .eq('id', segmentId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lead segment:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
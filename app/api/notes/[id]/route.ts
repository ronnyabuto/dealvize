import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { z } from 'zod'

const updateNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000, 'Note too long'),
  type: z.enum(['note', 'call', 'meeting', 'email']).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const resolvedParams = await params
    
    const { data: note, error } = await supabase
      .from('notes')
      .select(`
        *,
        clients (
          id,
          name,
          initials
        ),
        deals (
          id,
          title
        ),
        tasks (
          id,
          title
        )
      `)
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json(note)
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

    const validation = updateNoteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      }, { status: 400 })
    }

    const { content, type } = validation.data

    const updateData: any = { content }
    if (type) {
      updateData.type = type
    }

    const { data: note, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .select(`
        *,
        clients (
          id,
          name,
          initials
        ),
        deals (
          id,
          title
        ),
        tasks (
          id,
          title
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(note)
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
      .from('notes')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Note deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
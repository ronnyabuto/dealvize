import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: channels, error } = await supabase
      .from('communication_channels')
      .select('*')
      .eq('is_active', true)
      .order('display_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Error fetching communication channels:', error)
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
  }
}
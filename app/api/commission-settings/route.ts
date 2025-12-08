import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { DEFAULT_COMMISSION_PERCENTAGE } from '@/lib/commission'

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: settings, error } = await supabase
      .from('commission_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!settings) {
      const { data: newSettings, error: createError } = await supabase
        .from('commission_settings')
        .insert({
          user_id: user.id,
          default_percentage: DEFAULT_COMMISSION_PERCENTAGE,
          broker_split: 70 // Default broker split percentage
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 })
      }

      return NextResponse.json(newSettings)
    }

    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const body = await request.json()
    const { default_percentage, broker_split } = body

    if (typeof default_percentage !== 'number' || default_percentage < 0 || default_percentage > 100) {
      return NextResponse.json({ error: 'Invalid commission percentage' }, { status: 400 })
    }

    if (broker_split !== undefined && (typeof broker_split !== 'number' || broker_split < 0 || broker_split > 100)) {
      return NextResponse.json({ error: 'Invalid broker split percentage' }, { status: 400 })
    }

    const updateData: any = {
      user_id: user.id,
      default_percentage,
      updated_at: new Date().toISOString()
    }

    // Only include broker_split if it was provided
    if (broker_split !== undefined) {
      updateData.broker_split = broker_split
    }

    const { data: settings, error } = await supabase
      .from('commission_settings')
      .upsert(updateData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
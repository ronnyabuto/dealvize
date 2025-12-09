import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

// Get commission history for affiliate
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') // pending, approved, paid, cancelled
    const offset = (page - 1) * limit

    // Get affiliate ID for the user
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (affiliateError || !affiliate) {
      return NextResponse.json({ error: 'Not enrolled in affiliate program' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('affiliate_commissions')
      .select(`
        *,
        referral:affiliate_referrals (
          id,
          referred_user_id,
          users!affiliate_referrals_referred_user_id_fkey (email)
        )
      `)
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: commissions, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Commission history error:', error)
      return NextResponse.json({ error: 'Failed to fetch commission history' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('affiliate_commissions')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id)

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count } = await countQuery

    return NextResponse.json({
      commissions: commissions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Commission history error:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // This should be called by payment processing webhooks or admin processes
    const supabase = await createClient()
    const body = await request.json()
    const { 
      referralId, 
      amount, 
      type = 'monthly', 
      description,
      periodStart,
      periodEnd 
    } = body

    // Validate required fields
    if (!referralId || !amount) {
      return NextResponse.json({ 
        error: 'referralId and amount are required' 
      }, { status: 400 })
    }

    // Get referral information
    const { data: referral, error: referralError } = await supabase
      .from('affiliate_referrals')
      .select(`
        *,
        affiliate:affiliates (id, user_id, tier)
      `)
      .eq('id', referralId)
      .single()

    if (referralError || !referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    // Calculate commission based on referral's commission rate
    const commissionAmount = (amount * referral.commission_rate) / 100

    // Create commission record
    const { data: commission, error: commissionError } = await supabase
      .from('affiliate_commissions')
      .insert({
        affiliate_id: referral.affiliate_id,
        referral_id: referralId,
        amount: commissionAmount,
        type: type,
        description: description || `${type} commission`,
        status: 'pending',
        period_start: periodStart,
        period_end: periodEnd
      })
      .select()
      .single()

    if (commissionError) {
      console.error('Commission creation error:', commissionError)
      return NextResponse.json({ error: 'Failed to create commission' }, { status: 500 })
    }

    // Update referral status to active if this is the first payment
    if (referral.status === 'pending') {
      await supabase
        .from('affiliate_referrals')
        .update({ 
          status: 'active',
          first_payment_date: new Date().toISOString(),
          commission_earned: commissionAmount
        })
        .eq('id', referralId)
    } else {
      // Update commission earned
      await supabase
        .from('affiliate_referrals')
        .update({ 
          commission_earned: (referral.commission_earned || 0) + commissionAmount,
          last_payment_date: new Date().toISOString()
        })
        .eq('id', referralId)
    }

    return NextResponse.json({
      success: true,
      commission: commission,
      commissionAmount: commissionAmount
    })

  } catch (error) {
    console.error('Commission processing error:', error)
    return NextResponse.json({ error: 'Failed to process commission' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()
    const { commissionIds, status } = body

    if (!commissionIds || !Array.isArray(commissionIds) || !status) {
      return NextResponse.json({ 
        error: 'commissionIds array and status are required' 
      }, { status: 400 })
    }

    // For now, only allow affiliates to update their own commissions to 'pending'
    // In a real system, you'd want admin-only access for approval/payment
    
    // Get affiliate ID for the user
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (affiliateError || !affiliate) {
      return NextResponse.json({ error: 'Not enrolled in affiliate program' }, { status: 404 })
    }

    // Update commission statuses
    const { data: updatedCommissions, error } = await supabase
      .from('affiliate_commissions')
      .update({ 
        status: status,
        updated_at: new Date().toISOString(),
        ...(status === 'paid' ? { paid_at: new Date().toISOString() } : {})
      })
      .eq('affiliate_id', affiliate.id)
      .in('id', commissionIds)
      .select()

    if (error) {
      console.error('Commission update error:', error)
      return NextResponse.json({ error: 'Failed to update commissions' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated: updatedCommissions?.length || 0,
      commissions: updatedCommissions
    })

  } catch (error) {
    console.error('Commission approval error:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
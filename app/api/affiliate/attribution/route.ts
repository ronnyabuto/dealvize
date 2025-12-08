import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()
    const { referralCode } = body

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
    }

    // Check if user already has a referral attribution
    const { data: existingReferral } = await supabase
      .from('affiliate_referrals')
      .select('id')
      .eq('referred_user_id', user.id)
      .single()

    if (existingReferral) {
      return NextResponse.json({ 
        message: 'User already attributed to a referral',
        existing: true 
      })
    }

    // Find the affiliate by referral code (updated table name)
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliate_programs')
      .select('id, tier, user_id, commission_rate')
      .eq('referral_code', referralCode.toUpperCase())
      .eq('status', 'active')
      .single()

    if (affiliateError || !affiliate) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    // Don't allow self-referral
    if (affiliate.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
    }

    // Create the referral attribution
    const { data: referral, error: referralError } = await supabase
      .from('affiliate_referrals')
      .insert({
        affiliate_id: affiliate.id,
        referred_user_id: user.id,
        referral_code: referralCode.toUpperCase(),
        status: 'pending', // Will become 'confirmed' when user makes first payment
        commission_amount: 0 // Will be calculated on conversion
      })
      .select()
      .single()

    if (referralError) {
      console.error('Failed to create referral attribution:', referralError)
      return NextResponse.json({ error: 'Failed to attribute referral' }, { status: 500 })
    }

    // Update affiliate referral count
    await supabase
      .from('affiliate_programs')
      .update({ 
        total_referrals: affiliate.total_referrals + 1 
      })
      .eq('id', affiliate.id)

    // Update the referral click to mark as converted (updated table name)
    await supabase
      .from('affiliate_clicks')
      .update({ 
        converted: true, 
        converted_user_id: user.id 
      })
      .eq('affiliate_id', affiliate.id)
      .eq('referral_code', referralCode.toUpperCase())
      .is('converted_user_id', null)
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({
      success: true,
      message: 'Referral attributed successfully',
      referralId: referral.id,
      affiliateTier: affiliate.tier,
      commissionRate: affiliate.commission_rate
    })

  } catch (error) {
    console.error('Attribution error:', error)
    return NextResponse.json({ error: 'Authentication required or attribution failed' }, { status: 401 })
  }
}

// Get attribution info for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: referral, error } = await supabase
      .from('affiliate_referrals')
      .select(`
        *,
        affiliate:affiliate_programs (
          referral_code,
          user_id,
          tier,
          commission_rate
        )
      `)
      .eq('referred_user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Attribution lookup error:', error)
      return NextResponse.json({ error: 'Failed to lookup attribution' }, { status: 500 })
    }

    if (!referral) {
      return NextResponse.json({ attributed: false })
    }

    return NextResponse.json({
      attributed: true,
      referralCode: referral.referral_code,
      status: referral.status,
      signupDate: referral.created_at,
      commissionAmount: referral.commission_amount,
      affiliateTier: referral.affiliate?.tier,
      commissionRate: referral.affiliate?.commission_rate
    })

  } catch (error) {
    console.error('Attribution lookup error:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
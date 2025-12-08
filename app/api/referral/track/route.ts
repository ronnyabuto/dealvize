import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { referralCode } = body

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
    }

    // Get client IP and user agent for tracking
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || ''
    const referrer = request.headers.get('referer') || ''

    // Parse UTM parameters from the request
    const url = new URL(request.url)
    const utmSource = url.searchParams.get('utm_source')
    const utmMedium = url.searchParams.get('utm_medium')
    const utmCampaign = url.searchParams.get('utm_campaign')

    // Find the affiliate by referral code
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliate_programs')
      .select('id')
      .eq('referral_code', referralCode.toUpperCase())
      .eq('status', 'active')
      .single()

    if (affiliateError || !affiliate) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    // Track the click
    const { error: clickError } = await supabase
      .from('affiliate_clicks')
      .insert({
        affiliate_id: affiliate.id,
        referral_code: referralCode.toUpperCase(),
        ip_address: ip,
        user_agent: userAgent,
        referrer_url: referrer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign
      })

    if (clickError) {
      console.error('Failed to track referral click:', clickError)
      // Don't fail the request if click tracking fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Referral tracked successfully'
    })

  } catch (error) {
    console.error('Referral tracking error:', error)
    return NextResponse.json({ error: 'Failed to track referral' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const referralCode = searchParams.get('code')

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Validate referral code exists and is active
    const { data: affiliate, error } = await supabase
      .from('affiliate_programs')
      .select('id, referral_code, user_id, users!affiliate_programs_user_id_fkey(email)')
      .eq('referral_code', referralCode.toUpperCase())
      .eq('status', 'active')
      .single()

    if (error || !affiliate) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid or inactive referral code' 
      }, { status: 404 })
    }

    return NextResponse.json({
      valid: true,
      referralCode: affiliate.referral_code,
      affiliateId: affiliate.id
    })

  } catch (error) {
    console.error('Referral validation error:', error)
    return NextResponse.json({ error: 'Failed to validate referral' }, { status: 500 })
  }
}
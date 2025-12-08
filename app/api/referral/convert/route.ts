/**
 * Referral Conversion API
 * Handles conversion tracking when users sign up via referral
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ConversionSchema = z.object({
  referralCode: z.string().min(3).max(20),
  userId: z.string().uuid(),
  subscriptionAmount: z.number().optional(),
  planType: z.string().optional()
})

// POST - Track referral conversion
export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient()
    const body = await request.json()
    const validatedData = ConversionSchema.parse(body)

    // Find the affiliate program
    const { data: affiliate, error: affiliateError } = await serviceClient
      .from('affiliate_programs')
      .select('id, user_id, commission_rate')
      .eq('referral_code', validatedData.referralCode.toUpperCase())
      .eq('status', 'active')
      .single()

    if (affiliateError || !affiliate) {
      return NextResponse.json(
        { error: 'Invalid referral code' },
        { status: 404 }
      )
    }

    // Check if conversion already exists
    const { data: existingConversion } = await serviceClient
      .from('affiliate_referrals')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('referred_user_id', validatedData.userId)
      .single()

    if (existingConversion) {
      return NextResponse.json(
        { message: 'Conversion already tracked' }
      )
    }

    // Calculate commission
    const subscriptionAmount = validatedData.subscriptionAmount || 29.99 // Default monthly
    const commissionAmount = subscriptionAmount * (affiliate.commission_rate / 100)

    // Create referral record
    const { data: referral, error: referralError } = await serviceClient
      .from('affiliate_referrals')
      .insert({
        affiliate_id: affiliate.id,
        referred_user_id: validatedData.userId,
        referral_code: validatedData.referralCode.toUpperCase(),
        status: 'confirmed', // Confirmed on signup
        commission_amount: commissionAmount,
        subscription_amount: subscriptionAmount,
        conversion_date: new Date().toISOString()
      })
      .select('id')
      .single()

    if (referralError) throw referralError

    // Update affiliate stats
    const { error: statsError } = await serviceClient
      .from('affiliate_programs')
      .update({
        total_referrals: affiliate.total_referrals + 1,
        total_earnings: affiliate.total_earnings + commissionAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliate.id)

    if (statsError) {
      console.error('Failed to update affiliate stats:', statsError)
    }

    // Update any tracking clicks as converted
    await serviceClient
      .from('affiliate_clicks')
      .update({
        converted: true,
        converted_user_id: validatedData.userId
      })
      .eq('affiliate_id', affiliate.id)
      .eq('converted', false)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    // Check if tier upgrade needed
    await serviceClient.rpc('check_and_upgrade_affiliate_tier', {
      affiliate_id: affiliate.id
    })

    return NextResponse.json({
      success: true,
      message: 'Referral conversion tracked successfully',
      referral: {
        id: referral.id,
        affiliateId: affiliate.id,
        commissionAmount,
        referralCode: validatedData.referralCode.toUpperCase()
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    console.error('Referral conversion error:', error)
    return NextResponse.json(
      { error: 'Failed to track referral conversion' },
      { status: 500 }
    )
  }
}
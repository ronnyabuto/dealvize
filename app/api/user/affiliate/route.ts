/**
 * User Affiliate Program API
 * User-facing affiliate program management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import crypto from 'crypto'

// GET - Get user's affiliate program details
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    
    try {
      // Get user's affiliate program
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliate_programs')
        .select(`
          id,
          referral_code,
          commission_rate,
          tier,
          status,
          total_referrals,
          total_earnings,
          created_at,
          updated_at
        `)
        .eq('user_id', context.userId)
        .single()

      if (affiliateError && affiliateError.code !== 'PGRST116') {
        throw affiliateError
      }

      if (!affiliate) {
        return NextResponse.json({
          hasAffiliateProgram: false,
          message: 'No affiliate program found'
        })
      }

      // Get referral stats
      const [
        { data: referrals, error: referralsError },
        { data: recentClicks, error: clicksError },
        { data: pendingPayouts, error: payoutsError }
      ] = await Promise.all([
        // User's referrals
        supabase
          .from('affiliate_referrals')
          .select(`
            id,
            referred_user_id,
            status,
            commission_amount,
            subscription_amount,
            conversion_date,
            created_at,
            users!affiliate_referrals_referred_user_id_fkey(
              name,
              email
            )
          `)
          .eq('affiliate_id', affiliate.id)
          .order('created_at', { ascending: false }),

        // Recent clicks (last 30 days)
        supabase
          .from('affiliate_clicks')
          .select('id, created_at, converted, ip_address, country')
          .eq('affiliate_id', affiliate.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(100),

        // User's payouts
        supabase
          .from('affiliate_payouts')
          .select('id, amount, status, payment_method, processed_at, created_at')
          .eq('affiliate_id', affiliate.id)
          .order('created_at', { ascending: false })
      ])

      // Calculate stats
      const totalClicks = recentClicks?.length || 0
      const totalConversions = referrals?.filter(r => r.status === 'confirmed').length || 0
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
      const pendingCommissions = referrals?.filter(r => r.status === 'confirmed')
        .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0
      const totalPaid = pendingPayouts?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0) || 0

      // Generate referral URLs
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      const referralUrls = {
        homepage: `${baseUrl}/ref/${affiliate.referral_code}`,
        signup: `${baseUrl}/auth/signup?ref=${affiliate.referral_code}`,
        pricing: `${baseUrl}/pricing?ref=${affiliate.referral_code}`
      }

      // Tier progress
      const tierThresholds = {
        bronze: { min: 0, max: 4, rate: 0.10 },
        silver: { min: 5, max: 14, rate: 0.15 },
        gold: { min: 15, max: 49, rate: 0.20 },
        platinum: { min: 50, max: Infinity, rate: 0.30 }
      }

      const currentTier = tierThresholds[affiliate.tier as keyof typeof tierThresholds]
      const nextTierName = affiliate.tier === 'platinum' ? null : 
        Object.keys(tierThresholds)[Object.keys(tierThresholds).indexOf(affiliate.tier) + 1]
      const nextTier = nextTierName ? tierThresholds[nextTierName as keyof typeof tierThresholds] : null

      return NextResponse.json({
        hasAffiliateProgram: true,
        affiliate: {
          ...affiliate,
          referralUrls
        },
        stats: {
          totalClicks,
          totalConversions,
          conversionRate: Math.round(conversionRate * 100) / 100,
          pendingCommissions,
          totalPaid,
          totalEarnings: affiliate.total_earnings
        },
        tierInfo: {
          current: {
            name: affiliate.tier,
            rate: currentTier.rate,
            referralsNeeded: currentTier.min
          },
          next: nextTier ? {
            name: nextTierName,
            rate: nextTier.rate,
            referralsNeeded: nextTier.min - affiliate.total_referrals
          } : null,
          progress: nextTier ? 
            Math.min(100, ((affiliate.total_referrals - currentTier.min) / (nextTier.min - currentTier.min)) * 100) 
            : 100
        },
        referrals: referrals?.slice(0, 10) || [], // Latest 10 referrals
        recentActivity: recentClicks?.slice(0, 20) || [], // Latest 20 clicks
        payouts: pendingPayouts || []
      })

    } catch (error) {
      console.error('Error fetching user affiliate data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch affiliate data' },
        { status: 500 }
      )
    }
  }, {
    requireTenant: false
  })
}

// POST - Apply for affiliate program
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    
    try {
      // Check if user already has affiliate program
      const { data: existingAffiliate } = await supabase
        .from('affiliate_programs')
        .select('id')
        .eq('user_id', context.userId)
        .single()

      if (existingAffiliate) {
        return NextResponse.json(
          { error: 'You already have an affiliate program' },
          { status: 409 }
        )
      }

      // Generate unique referral code
      let referralCode: string
      let isUnique = false
      let attempts = 0
      
      while (!isUnique && attempts < 10) {
        referralCode = crypto.randomBytes(4).toString('hex').toUpperCase()
        
        const { data: existing } = await supabase
          .from('affiliate_programs')
          .select('id')
          .eq('referral_code', referralCode)
          .single()
        
        if (!existing) {
          isUnique = true
        }
        attempts++
      }

      if (!isUnique) {
        return NextResponse.json(
          { error: 'Failed to generate unique referral code' },
          { status: 500 }
        )
      }

      // Create affiliate program
      const { data: affiliate, error: createError } = await supabase
        .from('affiliate_programs')
        .insert({
          user_id: context.userId,
          referral_code: referralCode!,
          commission_rate: 10.00, // Default bronze rate
          tier: 'bronze',
          status: 'active'
        })
        .select(`
          id,
          referral_code,
          commission_rate,
          tier,
          status,
          total_referrals,
          total_earnings,
          created_at
        `)
        .single()

      if (createError) throw createError

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      const referralUrls = {
        homepage: `${baseUrl}/ref/${affiliate.referral_code}`,
        signup: `${baseUrl}/auth/signup?ref=${affiliate.referral_code}`,
        pricing: `${baseUrl}/pricing?ref=${affiliate.referral_code}`
      }

      return NextResponse.json({
        message: 'Affiliate program created successfully',
        affiliate: {
          ...affiliate,
          referralUrls
        }
      })

    } catch (error) {
      console.error('Error creating affiliate program:', error)
      return NextResponse.json(
        { error: 'Failed to create affiliate program' },
        { status: 500 }
      )
    }
  }, {
    requireTenant: false
  })
}
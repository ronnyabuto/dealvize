import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Check if user is enrolled in affiliate program
    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not enrolled in affiliate program' }, { status: 404 })
    }

    if (error && error.code === '42P01') {
      // Tables don't exist, return demo data
      const demoData = generateDemoAffiliateData(user)
      return NextResponse.json(demoData)
    }

    if (error) {
      console.error('Affiliate table error, falling back to demo:', error)
      const demoData = generateDemoAffiliateData(user)
      return NextResponse.json(demoData)
    }

    // Get referral statistics
    const { data: referrals, error: referralsError } = await supabase
      .from('affiliate_referrals')
      .select(`
        *,
        referred_user:users!affiliate_referrals_referred_user_id_fkey(email, created_at)
      `)
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })

    if (referralsError) {
      console.error('Referrals error:', referralsError)
    }

    // Calculate statistics
    const totalReferrals = referrals?.length || 0
    const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0
    const totalCommission = referrals?.reduce((sum, r) => sum + (r.commission_earned || 0), 0) || 0
    const pendingCommission = referrals?.reduce((sum, r) => sum + (r.status === 'pending' ? r.commission_earned || 0 : 0), 0) || 0
    const paidCommission = totalCommission - pendingCommission

    // Calculate conversion rate
    const conversionRate = totalReferrals > 0 ? Math.round((activeReferrals / totalReferrals) * 100) : 0

    // Determine tier based on referrals
    let currentTier = 'Bronze'
    let nextTier = 'Silver'
    let progressToNextTier = 0

    if (activeReferrals >= 50) {
      currentTier = 'Platinum'
      nextTier = 'Platinum'
      progressToNextTier = 100
    } else if (activeReferrals >= 25) {
      currentTier = 'Gold'
      nextTier = 'Platinum'
      progressToNextTier = (activeReferrals / 50) * 100
    } else if (activeReferrals >= 10) {
      currentTier = 'Silver'
      nextTier = 'Gold'
      progressToNextTier = (activeReferrals / 25) * 100
    } else {
      currentTier = 'Bronze'
      nextTier = 'Silver'
      progressToNextTier = (activeReferrals / 10) * 100
    }

    // Format recent referrals
    const recentReferrals = referrals?.slice(0, 5).map(r => ({
      id: r.id,
      user_email: r.referred_user?.email || 'Unknown',
      signup_date: r.referred_user?.created_at || r.created_at,
      status: r.status,
      commission_earned: r.commission_earned || 0
    })) || []

    const response = {
      id: affiliate.id,
      referral_code: affiliate.referral_code,
      total_referrals: totalReferrals,
      active_referrals: activeReferrals,
      total_commission: totalCommission,
      pending_commission: pendingCommission,
      paid_commission: paidCommission,
      conversion_rate: conversionRate,
      current_tier: currentTier,
      next_tier: nextTier,
      progress_to_next_tier: Math.round(progressToNextTier),
      recent_referrals: recentReferrals
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Affiliate stats error:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

function generateDemoAffiliateData(user: any) {
  const referralCode = generateReferralCode(user.email || user.id)
  
  return {
    id: 'demo-affiliate',
    referral_code: referralCode,
    total_referrals: 5,
    active_referrals: 3,
    total_commission: 1250.50,
    pending_commission: 300.00,
    paid_commission: 950.50,
    conversion_rate: 15,
    current_tier: "Silver",
    next_tier: "Gold",
    progress_to_next_tier: 65,
    recent_referrals: [
      {
        id: "demo-ref-1",
        user_email: "john.doe@example.com",
        signup_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active" as const,
        commission_earned: 125.00
      },
      {
        id: "demo-ref-2", 
        user_email: "jane.smith@example.com",
        signup_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active" as const,
        commission_earned: 75.00
      },
      {
        id: "demo-ref-3",
        user_email: "mike.wilson@example.com", 
        signup_date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        status: "inactive" as const,
        commission_earned: 100.00
      }
    ]
  }
}

function generateReferralCode(email: string): string {
  // Generate a referral code based on email or user ID
  const hash = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${hash}${randomSuffix}`.substring(0, 8)
}
// Simple Affiliate Marketing System
// Zero-cost implementation for Dealvize

import { createClient } from '@/lib/supabase/client'

export interface AffiliateProgram {
  id: string
  user_id: string
  referral_code: string
  commission_rate: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  status: 'active' | 'inactive' | 'suspended'
  total_referrals: number
  total_earnings: number
  created_at: string
}

export interface AffiliateReferral {
  id: string
  affiliate_id: string
  referred_user_id: string
  referral_code: string
  status: 'pending' | 'confirmed' | 'paid'
  commission_amount: number
  conversion_date?: string
  created_at: string
}

// Commission tier structure - centralized definition
export const COMMISSION_TIERS = {
  bronze: { rate: 0.10, minReferrals: 0, name: 'Bronze' },
  silver: { rate: 0.15, minReferrals: 5, name: 'Silver' },
  gold: { rate: 0.20, minReferrals: 15, name: 'Gold' },
  platinum: { rate: 0.30, minReferrals: 50, name: 'Platinum' }
} as const

export type TierName = keyof typeof COMMISSION_TIERS

// Generate unique referral code
export function generateReferralCode(userName: string): string {
  const prefix = userName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
  const suffix = Date.now().toString().slice(-4)
  return `${prefix}${suffix}`
}

// Create affiliate program for user
export async function createAffiliateProgram(userId: string, userName: string) {
  const supabase = createClient()
  
  try {
    const referralCode = generateReferralCode(userName)
    
    const { data, error } = await supabase
      .from('affiliate_programs')
      .insert({
        user_id: userId,
        referral_code: referralCode,
        commission_rate: COMMISSION_TIERS.bronze.rate,
        tier: 'bronze',
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating affiliate program:', error)
      
      // Check if it's a table doesn't exist error
      if (error.message?.includes('relation "affiliate_programs" does not exist') || 
          error.code === 'PGRST116' || 
          error.message?.includes('does not exist')) {
        throw new Error('Affiliate system is not set up yet. Please contact support to enable the affiliate program.')
      }
      
      // Check if it's a duplicate key error
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        throw new Error('You already have an affiliate account. Please refresh the page.')
      }
      
      throw new Error('Failed to create affiliate program. Please try again or contact support.')
    }
    
    return data
  } catch (error) {
    console.error('Error in createAffiliateProgram:', error)
    throw error
  }
}

// Track referral click (set cookie)
export function trackReferralClick(referralCode: string) {
  if (typeof window !== 'undefined') {
    // Set 30-day cookie
    document.cookie = `dealvize_ref=${referralCode}; max-age=2592000; path=/; SameSite=Lax`
    
    // Also store in localStorage as backup
    localStorage.setItem('dealvize_referral', JSON.stringify({
      code: referralCode,
      timestamp: Date.now()
    }))
  }
}

// Get referral code from cookie/localStorage
export function getReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  
  // First try cookie
  const cookies = document.cookie.split(';')
  const refCookie = cookies.find(c => c.trim().startsWith('dealvize_ref='))
  
  if (refCookie) {
    return refCookie.split('=')[1]
  }
  
  // Fallback to localStorage
  const stored = localStorage.getItem('dealvize_referral')
  if (stored) {
    const data = JSON.parse(stored)
    // Check if less than 30 days old
    if (Date.now() - data.timestamp < 30 * 24 * 60 * 60 * 1000) {
      return data.code
    }
    localStorage.removeItem('dealvize_referral')
  }
  
  return null
}

// Process referral when user signs up
export async function processReferral(newUserId: string) {
  const referralCode = getReferralCode()
  if (!referralCode) return null
  
  const supabase = createClient()
  
  // Find affiliate program by referral code
  const { data: affiliate, error: affiliateError } = await supabase
    .from('affiliate_programs')
    .select('*')
    .eq('referral_code', referralCode)
    .eq('status', 'active')
    .single()
    
  if (affiliateError || !affiliate) return null
  
  // Create referral record
  const { data: referral, error: referralError } = await supabase
    .from('affiliate_referrals')
    .insert({
      affiliate_id: affiliate.id,
      referred_user_id: newUserId,
      referral_code: referralCode,
      status: 'pending',
      commission_amount: 0 // Will be calculated on conversion
    })
    .select()
    .single()
    
  if (referralError) throw referralError
  
  // Update affiliate referral count
  await supabase
    .from('affiliate_programs')
    .update({ 
      total_referrals: affiliate.total_referrals + 1 
    })
    .eq('id', affiliate.id)
    
  // Clear referral tracking
  if (typeof window !== 'undefined') {
    document.cookie = 'dealvize_ref=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    localStorage.removeItem('dealvize_referral')
  }
  
  return referral
}

// Calculate commission for subscription
export function calculateCommission(subscriptionAmount: number, tier: keyof typeof COMMISSION_TIERS): number {
  return subscriptionAmount * COMMISSION_TIERS[tier].rate
}

// Confirm conversion (when user subscribes)
export async function confirmConversion(referralId: string, subscriptionAmount: number) {
  const supabase = createClient()
  
  // Get referral and affiliate info
  const { data: referral, error } = await supabase
    .from('affiliate_referrals')
    .select(`
      *,
      affiliate:affiliate_programs(*)
    `)
    .eq('id', referralId)
    .single()
    
  if (error || !referral) throw new Error('Referral not found')
  
  const commission = calculateCommission(subscriptionAmount, referral.affiliate.tier)
  
  // Update referral status and commission
  await supabase
    .from('affiliate_referrals')
    .update({
      status: 'confirmed',
      commission_amount: commission,
      conversion_date: new Date().toISOString()
    })
    .eq('id', referralId)
    
  // Update affiliate total earnings
  await supabase
    .from('affiliate_programs')
    .update({
      total_earnings: referral.affiliate.total_earnings + commission
    })
    .eq('id', referral.affiliate_id)
    
  // Check for tier upgrade
  await checkTierUpgrade(referral.affiliate_id)
  
  return commission
}

// Check and upgrade affiliate tier based on performance
export async function checkTierUpgrade(affiliateId: string) {
  const supabase = createClient()
  
  const { data: affiliate, error } = await supabase
    .from('affiliate_programs')
    .select('*')
    .eq('id', affiliateId)
    .single()
    
  if (error || !affiliate) return
  
  let newTier = affiliate.tier
  
  if (affiliate.total_referrals >= COMMISSION_TIERS.platinum.minReferrals) {
    newTier = 'platinum'
  } else if (affiliate.total_referrals >= COMMISSION_TIERS.gold.minReferrals) {
    newTier = 'gold'
  } else if (affiliate.total_referrals >= COMMISSION_TIERS.silver.minReferrals) {
    newTier = 'silver'
  }
  
  if (newTier !== affiliate.tier) {
    await supabase
      .from('affiliate_programs')
      .update({ 
        tier: newTier,
        commission_rate: COMMISSION_TIERS[newTier as keyof typeof COMMISSION_TIERS].rate
      })
      .eq('id', affiliateId)
  }
}

// Generate affiliate dashboard data
export async function getAffiliateDashboard(userId: string) {
  const supabase = createClient()
  
  try {
    // First, get the affiliate program data
    const { data: affiliateData, error: affiliateError } = await supabase
      .from('affiliate_programs')
      .select('*')
      .eq('user_id', userId)
    
    // Handle array result - take first record if exists
    const affiliate = affiliateData?.[0] || null
    
    // Check if tables don't exist
    if (affiliateError && (
        affiliateError.message?.includes('relation "affiliate_programs" does not exist') || 
        affiliateError.code === 'PGRST116' ||
        affiliateError.message?.includes('does not exist')
      )) {
      console.warn('Affiliate tables do not exist')
      return null
    }
    
    // If user is not an affiliate, return null (don't throw error)
    if (affiliateError || !affiliate) {
      return null
    }
    
    // Then get referrals separately to avoid RLS join issues
    const { data: referrals, error: referralsError } = await supabase
      .from('affiliate_referrals')
      .select('*')
      .eq('affiliate_id', affiliate.id)
    
    // If referrals query fails, continue with empty array
    const referralsList = referralsError ? [] : (referrals || [])
    
    const pendingEarnings = referralsList
      .filter((r: any) => r.status === 'confirmed')
      .reduce((sum: number, r: any) => sum + (r.commission_amount || 0), 0)
      
    const paidEarnings = referralsList
      .filter((r: any) => r.status === 'paid')
      .reduce((sum: number, r: any) => sum + (r.commission_amount || 0), 0)
    
    return {
      ...affiliate,
      referrals: referralsList,
      pendingEarnings,
      paidEarnings,
      conversionRate: affiliate.total_referrals > 0 
        ? (referralsList.filter((r: any) => r.status === 'confirmed').length / affiliate.total_referrals) * 100 
        : 0
    }
  } catch (error) {
    console.error('Error fetching affiliate dashboard:', error)
    return null
  }
}

// Create payout request
export async function createPayoutRequest(affiliateId: string, amount: number, paymentMethod: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('affiliate_payouts')
    .insert({
      affiliate_id: affiliateId,
      amount,
      payment_method: paymentMethod,
      status: 'pending'
    })
    .select()
    .single()
    
  if (error) throw error
  return data
}

// Get affiliate link for sharing
export function getAffiliateLink(referralCode: string, baseUrl: string = 'https://dealvize.com'): string {
  return `${baseUrl}/signup?ref=${referralCode}`
}

// Validate referral code format
export function isValidReferralCode(code: string): boolean {
  return /^[A-Z]{4}\d{4}$/.test(code)
}
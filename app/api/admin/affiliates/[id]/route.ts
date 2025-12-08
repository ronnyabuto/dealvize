/**
 * Individual Affiliate Management API
 * Admin operations for specific affiliate programs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

interface Params {
  id: string
}

const UpdateAffiliateSchema = z.object({
  commissionRate: z.number().min(0).max(100).optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
})

// GET - Get specific affiliate with stats
export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const affiliateId = params.id

    try {
      // Get affiliate details
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliate_programs')
        .select(`
          id,
          user_id,
          referral_code,
          commission_rate,
          tier,
          status,
          total_referrals,
          total_earnings,
          created_at,
          updated_at,
          users!affiliate_programs_user_id_fkey(
            id,
            name,
            email,
            created_at
          )
        `)
        .eq('id', affiliateId)
        .single()

      if (affiliateError || !affiliate) {
        return NextResponse.json(
          { error: 'Affiliate not found' },
          { status: 404 }
        )
      }

      // Get referral stats
      const [
        { data: referrals, error: referralsError },
        { data: recentClicks, error: clicksError },
        { data: payouts, error: payoutsError }
      ] = await Promise.all([
        // Recent referrals
        supabase
          .from('affiliate_referrals')
          .select(`
            id,
            referred_user_id,
            status,
            commission_amount,
            conversion_date,
            created_at,
            users!affiliate_referrals_referred_user_id_fkey(
              name,
              email
            )
          `)
          .eq('affiliate_id', affiliateId)
          .order('created_at', { ascending: false })
          .limit(20),

        // Recent clicks
        supabase
          .from('affiliate_clicks')
          .select('id, ip_address, country, created_at, converted')
          .eq('affiliate_id', affiliateId)
          .order('created_at', { ascending: false })
          .limit(50),

        // Payouts
        supabase
          .from('affiliate_payouts')
          .select('id, amount, status, payment_method, processed_at, created_at')
          .eq('affiliate_id', affiliateId)
          .order('created_at', { ascending: false })
      ])

      // Calculate stats
      const totalClicks = recentClicks?.length || 0
      const totalConversions = referrals?.filter(r => r.status === 'confirmed').length || 0
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
      const pendingCommissions = referrals?.filter(r => r.status === 'confirmed')
        .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0
      const totalPaid = payouts?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0) || 0

      return NextResponse.json({
        affiliate,
        stats: {
          totalClicks,
          totalConversions,
          conversionRate: Math.round(conversionRate * 100) / 100,
          pendingCommissions,
          totalPaid,
          totalEarnings: affiliate.total_earnings
        },
        referrals,
        recentClicks,
        payouts
      })

    } catch (error) {
      console.error('Error fetching affiliate details:', error)
      return NextResponse.json(
        { error: 'Failed to fetch affiliate details' },
        { status: 500 }
      )
    }
  }, {
    resource: 'affiliates',
    action: 'view',
    requireTenant: false
  })
}

// PUT - Update affiliate program
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const affiliateId = params.id

    try {
      const body = await request.json()
      const validatedData = UpdateAffiliateSchema.parse(body)

      // Verify affiliate exists
      const { data: existingAffiliate, error: fetchError } = await serviceClient
        .from('affiliate_programs')
        .select('id, user_id, tier, commission_rate, status')
        .eq('id', affiliateId)
        .single()

      if (fetchError || !existingAffiliate) {
        return NextResponse.json(
          { error: 'Affiliate not found' },
          { status: 404 }
        )
      }

      // Update affiliate program
      const { data: updatedAffiliate, error: updateError } = await serviceClient
        .from('affiliate_programs')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliateId)
        .select(`
          id,
          user_id,
          referral_code,
          commission_rate,
          tier,
          status,
          total_referrals,
          total_earnings,
          created_at,
          updated_at,
          users!affiliate_programs_user_id_fkey(
            name,
            email
          )
        `)
        .single()

      if (updateError) throw updateError

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId || null,
          user_id: context.userId,
          action: 'affiliate.updated',
          entity_type: 'affiliate_program',
          entity_id: affiliateId,
          metadata: {
            changes: validatedData,
            previous: {
              tier: existingAffiliate.tier,
              commission_rate: existingAffiliate.commission_rate,
              status: existingAffiliate.status
            }
          }
        })

      return NextResponse.json({
        message: 'Affiliate program updated successfully',
        affiliate: updatedAffiliate
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

      console.error('Error updating affiliate:', error)
      return NextResponse.json(
        { error: 'Failed to update affiliate program' },
        { status: 500 }
      )
    }
  }, {
    resource: 'affiliates',
    action: 'manage',
    requireTenant: false
  })
}

// DELETE - Suspend affiliate program
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const affiliateId = params.id

    try {
      // Verify affiliate exists
      const { data: existingAffiliate, error: fetchError } = await serviceClient
        .from('affiliate_programs')
        .select('id, user_id, referral_code')
        .eq('id', affiliateId)
        .single()

      if (fetchError || !existingAffiliate) {
        return NextResponse.json(
          { error: 'Affiliate not found' },
          { status: 404 }
        )
      }

      // Suspend instead of delete (preserve referral data)
      const { error: updateError } = await serviceClient
        .from('affiliate_programs')
        .update({
          status: 'suspended',
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliateId)

      if (updateError) throw updateError

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId || null,
          user_id: context.userId,
          action: 'affiliate.suspended',
          entity_type: 'affiliate_program',
          entity_id: affiliateId,
          metadata: {
            affiliate_user_id: existingAffiliate.user_id,
            referral_code: existingAffiliate.referral_code
          }
        })

      return NextResponse.json({
        message: 'Affiliate program suspended successfully'
      })

    } catch (error) {
      console.error('Error suspending affiliate:', error)
      return NextResponse.json(
        { error: 'Failed to suspend affiliate program' },
        { status: 500 }
      )
    }
  }, {
    resource: 'affiliates',
    action: 'manage',
    requireTenant: false
  })
}
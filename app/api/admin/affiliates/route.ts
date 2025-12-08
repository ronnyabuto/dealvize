/**
 * Affiliate Management API
 * Admin endpoints for managing affiliate programs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'
import crypto from 'crypto'

const CreateAffiliateSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  commissionRate: z.number().min(0).max(100).default(10),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).default('bronze'),
  customReferralCode: z.string().min(3).max(20).optional()
})

const UpdateAffiliateSchema = z.object({
  commissionRate: z.number().min(0).max(100).optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
})

// GET - List all affiliates with stats
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    try {
      let query = supabase
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
            email
          )
        `)

      // Apply filters
      if (status) {
        query = query.eq('status', status)
      }

      if (search) {
        query = query.or(`
          referral_code.ilike.%${search}%,
          users.name.ilike.%${search}%,
          users.email.ilike.%${search}%
        `)
      }

      // Get total count for pagination
      const { count } = await supabase
        .from('affiliate_programs')
        .select('*', { count: 'exact', head: true })

      // Get paginated results
      const { data: affiliates, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return NextResponse.json({
        affiliates,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })

    } catch (error) {
      console.error('Error fetching affiliates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch affiliates' },
        { status: 500 }
      )
    }
  }, {
    resource: 'affiliates',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create new affiliate program
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()

    try {
      const body = await request.json()
      const validatedData = CreateAffiliateSchema.parse(body)

      // Check if user already has affiliate program
      const { data: existingAffiliate } = await serviceClient
        .from('affiliate_programs')
        .select('id')
        .eq('user_id', validatedData.userId)
        .single()

      if (existingAffiliate) {
        return NextResponse.json(
          { error: 'User already has an affiliate program' },
          { status: 409 }
        )
      }

      // Generate unique referral code
      let referralCode = validatedData.customReferralCode?.toUpperCase()
      if (!referralCode) {
        // Generate random code
        referralCode = crypto.randomBytes(4).toString('hex').toUpperCase()
      }

      // Ensure referral code is unique
      const { data: existingCode } = await serviceClient
        .from('affiliate_programs')
        .select('id')
        .eq('referral_code', referralCode)
        .single()

      if (existingCode) {
        return NextResponse.json(
          { error: 'Referral code already exists' },
          { status: 409 }
        )
      }

      // Create affiliate program
      const { data: affiliate, error: affiliateError } = await serviceClient
        .from('affiliate_programs')
        .insert({
          user_id: validatedData.userId,
          referral_code: referralCode,
          commission_rate: validatedData.commissionRate,
          tier: validatedData.tier,
          status: 'active'
        })
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
          users!affiliate_programs_user_id_fkey(
            name,
            email
          )
        `)
        .single()

      if (affiliateError) throw affiliateError

      // Log the activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId || null,
          user_id: context.userId,
          action: 'affiliate.created',
          entity_type: 'affiliate_program',
          entity_id: affiliate.id,
          metadata: {
            affiliate_user_id: validatedData.userId,
            referral_code: referralCode,
            commission_rate: validatedData.commissionRate
          }
        })

      return NextResponse.json({
        message: 'Affiliate program created successfully',
        affiliate
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

      console.error('Error creating affiliate:', error)
      return NextResponse.json(
        { error: 'Failed to create affiliate program' },
        { status: 500 }
      )
    }
  }, {
    resource: 'affiliates',
    action: 'create',
    requireTenant: false
  })
}
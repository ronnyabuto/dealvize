/**
 * Commission Calculation API
 * Calculate commission splits and amounts based on user settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { CommissionCalculationSchema } from '@/lib/validations/commission'
import { z } from 'zod'

// POST - Calculate commission split
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()

    try {
      const body = await req.json()
      const validatedData = CommissionCalculationSchema.parse(body)

      const targetUserId = validatedData.userId || context.userId
      const targetTenantId = validatedData.tenantId || context.tenantId

      // Check permissions for calculating other users' commissions
      if (targetUserId !== context.userId) {
        const hasAccess = context.userPermissions.includes('DEALS_VIEW_ALL') ||
                         ['admin', 'owner', 'manager'].includes(context.userRole)
        
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          )
        }
      }

      // Use the database function to calculate commission split
      const { data, error } = await supabase
        .rpc('calculate_commission_split', {
          commission_amount: validatedData.commissionAmount,
          user_id: targetUserId,
          tenant_id: targetTenantId
        })

      if (error) {
        console.error('Error calculating commission split:', error)
        return NextResponse.json(
          { error: 'Failed to calculate commission split' },
          { status: 500 }
        )
      }

      const result = data[0]
      if (!result) {
        return NextResponse.json(
          { error: 'No commission settings found' },
          { status: 404 }
        )
      }

      // Calculate additional metrics if deal value is provided
      let effectiveRate = null
      if (validatedData.dealValue) {
        effectiveRate = (validatedData.commissionAmount / validatedData.dealValue) * 100
      }

      const response = {
        agentAmount: parseFloat(result.agent_amount),
        brokerAmount: parseFloat(result.broker_amount),
        splitPercentage: parseFloat(result.split_percentage),
        totalCommission: validatedData.commissionAmount,
        effectiveRate: effectiveRate ? parseFloat(effectiveRate.toFixed(4)) : null,
        calculation: {
          dealValue: validatedData.dealValue || null,
          commissionAmount: validatedData.commissionAmount,
          agentPercentage: 100 - parseFloat(result.split_percentage),
          brokerPercentage: parseFloat(result.split_percentage)
        }
      }

      return NextResponse.json(response)

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

      console.error('Commission calculation error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }, {
    requireTenant: true
  })
}
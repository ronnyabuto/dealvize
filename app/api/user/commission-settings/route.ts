/**
 * Commission Settings API
 * Handles CRUD operations for user commission rates and broker splits
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC, RBACContext } from '@/lib/rbac/middleware'
import { 
  CommissionSettingsSchema, 
  UpdateCommissionSettingsSchema,
  DEFAULT_COMMISSION_SETTINGS 
} from '@/lib/validations/commission'
import { z } from 'zod'

// GET - Fetch user's commission settings
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const url = new URL(req.url)
    const targetUserId = url.searchParams.get('userId') || context.userId

    if (targetUserId !== context.userId) {
      const hasAdminAccess = context.userPermissions.includes('MEMBERS_VIEW') ||
                            ['admin', 'owner'].includes(context.userRole)
      
      if (!hasAdminAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    try {
      // Use the database function to get settings with defaults
      const { data, error } = await supabase
        .rpc('get_user_commission_settings', {
          target_user_id: targetUserId,
          target_tenant_id: context.tenantId
        })

      if (error) {
        console.error('Error fetching commission settings:', error)
        return NextResponse.json(
          { error: 'Failed to fetch commission settings' },
          { status: 500 }
        )
      }

      // Transform database response to API format
      const settings = data[0] || null
      const response = settings ? {
        id: settings.id,
        defaultCommissionRate: parseFloat(settings.default_commission_rate),
        brokerSplitPercentage: parseFloat(settings.broker_split_percentage),
        commissionStructure: settings.commission_structure,
        customRates: settings.custom_rates || {},
        currency: settings.currency,
        effectiveDate: settings.effective_date,
        notes: settings.notes,
        isActive: settings.is_active,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at
      } : {
        ...DEFAULT_COMMISSION_SETTINGS,
        id: null,
        isActive: true,
        effectiveDate: new Date().toISOString().split('T')[0]
      }

      return NextResponse.json({ settings: response })

    } catch (error) {
      console.error('Commission settings GET error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }, {
    requireTenant: true
  })
}

// POST - Create commission settings
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()

    try {
      const body = await req.json()
      const validatedData = CommissionSettingsSchema.parse(body)

      // Check if settings already exist
      const { data: existing } = await supabase
        .from('commission_settings')
        .select('id')
        .eq('user_id', context.userId)
        .eq('tenant_id', context.tenantId)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Commission settings already exist. Use PUT to update.' },
          { status: 409 }
        )
      }

      // Create new commission settings
      const { data: settings, error } = await supabase
        .from('commission_settings')
        .insert({
          user_id: context.userId,
          tenant_id: context.tenantId,
          default_commission_rate: validatedData.defaultCommissionRate,
          broker_split_percentage: validatedData.brokerSplitPercentage,
          commission_structure: validatedData.commissionStructure,
          custom_rates: validatedData.customRates || {},
          currency: validatedData.currency,
          effective_date: validatedData.effectiveDate || new Date().toISOString().split('T')[0],
          notes: validatedData.notes || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating commission settings:', error)
        return NextResponse.json(
          { error: 'Failed to create commission settings' },
          { status: 500 }
        )
      }

      // Transform response
      const response = {
        id: settings.id,
        defaultCommissionRate: parseFloat(settings.default_commission_rate),
        brokerSplitPercentage: parseFloat(settings.broker_split_percentage),
        commissionStructure: settings.commission_structure,
        customRates: settings.custom_rates,
        currency: settings.currency,
        effectiveDate: settings.effective_date,
        notes: settings.notes,
        isActive: settings.is_active
      }

      return NextResponse.json({ 
        message: 'Commission settings created successfully',
        settings: response 
      }, { status: 201 })

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

      console.error('Commission settings POST error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }, {
    requireTenant: true
  })
}

// PUT - Update commission settings
export async function PUT(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()

    try {
      const body = await req.json()
      const { userId: targetUserId, ...updateData } = body
      const validatedData = UpdateCommissionSettingsSchema.parse(updateData)
      
      const finalUserId = targetUserId || context.userId

      // Check permissions for updating other users' settings
      if (finalUserId !== context.userId) {
        const hasAdminAccess = context.userPermissions.includes('MEMBERS_MANAGE') ||
                              ['admin', 'owner'].includes(context.userRole)
        
        if (!hasAdminAccess) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          )
        }
      }

      // Build update object
      const updateObject: any = {}
      
      if (validatedData.defaultCommissionRate !== undefined) {
        updateObject.default_commission_rate = validatedData.defaultCommissionRate
      }
      if (validatedData.brokerSplitPercentage !== undefined) {
        updateObject.broker_split_percentage = validatedData.brokerSplitPercentage
      }
      if (validatedData.commissionStructure !== undefined) {
        updateObject.commission_structure = validatedData.commissionStructure
      }
      if (validatedData.customRates !== undefined) {
        updateObject.custom_rates = validatedData.customRates
      }
      if (validatedData.currency !== undefined) {
        updateObject.currency = validatedData.currency
      }
      if (validatedData.effectiveDate !== undefined) {
        updateObject.effective_date = validatedData.effectiveDate
      }
      if (validatedData.notes !== undefined) {
        updateObject.notes = validatedData.notes || null
      }

      // Add updated_at timestamp
      updateObject.updated_at = new Date().toISOString()

      // Upsert commission settings
      const { data: settings, error } = await supabase
        .from('commission_settings')
        .upsert({
          user_id: finalUserId,
          tenant_id: context.tenantId,
          ...updateObject
        }, {
          onConflict: 'user_id,tenant_id'
        })
        .select()
        .single()

      if (error) {
        console.error('Error updating commission settings:', error)
        return NextResponse.json(
          { error: 'Failed to update commission settings' },
          { status: 500 }
        )
      }

      // Transform response
      const response = {
        id: settings.id,
        defaultCommissionRate: parseFloat(settings.default_commission_rate),
        brokerSplitPercentage: parseFloat(settings.broker_split_percentage),
        commissionStructure: settings.commission_structure,
        customRates: settings.custom_rates,
        currency: settings.currency,
        effectiveDate: settings.effective_date,
        notes: settings.notes,
        isActive: settings.is_active
      }

      return NextResponse.json({ 
        message: 'Commission settings updated successfully',
        settings: response 
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

      console.error('Commission settings PUT error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }, {
    requireTenant: true
  })
}

export async function DELETE(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const url = new URL(req.url)
    const targetUserId = url.searchParams.get('userId') || context.userId

    // Check permissions for deleting other users' settings
    if (targetUserId !== context.userId) {
      const hasOwnerAccess = context.userRole === 'owner'
      
      if (!hasOwnerAccess) {
        return NextResponse.json(
          { error: 'Only tenant owners can delete other users\' commission settings' },
          { status: 403 }
        )
      }
    }

    try {
      const { error } = await supabase
        .from('commission_settings')
        .delete()
        .eq('user_id', targetUserId)
        .eq('tenant_id', context.tenantId)

      if (error) {
        console.error('Error deleting commission settings:', error)
        return NextResponse.json(
          { error: 'Failed to delete commission settings' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        message: 'Commission settings deleted successfully. Default settings will be used.' 
      })

    } catch (error) {
      console.error('Commission settings DELETE error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }, {
    requireTenant: true
  })
}
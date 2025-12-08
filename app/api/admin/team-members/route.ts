/**
 * Team Members Management API
 * CRUD operations for managing team members within a tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const UpdateMemberSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  status: z.enum(['active', 'inactive']).optional()
})

// GET - List all team members
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || 'all'
    const role = url.searchParams.get('role') || 'all'

    try {
      let query = supabase
        .from('tenant_members')
        .select(`
          id,
          user_id,
          role,
          status,
          joined_at,
          last_active_at,
          users (
            email,
            name,
            avatar_url
          )
        `)
        .eq('tenant_id', context.tenantId)

      // Apply filters
      if (search) {
        query = query.or(`users.name.ilike.%${search}%,users.email.ilike.%${search}%`)
      }

      if (status !== 'all') {
        query = query.eq('status', status)
      }

      if (role !== 'all') {
        query = query.eq('role', role)
      }

      // Apply pagination
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1).order('joined_at', { ascending: false })

      const { data: members, error, count } = await query

      if (error) {
        throw error
      }

      // Transform the data for frontend consumption
      const transformedMembers = (members || []).map(member => ({
        id: member.id,
        user_id: member.user_id,
        email: member.users?.email || '',
        name: member.users?.name || 'Unknown User',
        avatar_url: member.users?.avatar_url,
        role: member.role,
        status: member.status,
        joined_at: member.joined_at,
        last_active: member.last_active_at
      }))

      return NextResponse.json({
        members: transformedMembers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })

    } catch (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'view',
    requireTenant: true
  })
}

// PUT - Update team member (role, status)
export async function PUT(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()

    try {
      const body = await req.json()
      const { memberId, ...updateData } = body
      const validatedData = UpdateMemberSchema.parse(updateData)

      if (!memberId) {
        return NextResponse.json(
          { error: 'Member ID is required' },
          { status: 400 }
        )
      }

      // Verify the member belongs to this tenant
      const { data: existingMember, error: fetchError } = await supabase
        .from('tenant_members')
        .select('id, user_id, role')
        .eq('id', memberId)
        .eq('tenant_id', context.tenantId)
        .single()

      if (fetchError || !existingMember) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 404 }
        )
      }

      // Prevent downgrading the last owner
      if (existingMember.role === 'owner' && validatedData.role !== 'owner') {
        const { count: ownerCount } = await supabase
          .from('tenant_members')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', context.tenantId)
          .eq('role', 'owner')
          .eq('status', 'active')

        if ((ownerCount || 0) <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last owner. Assign another owner first.' },
            { status: 400 }
          )
        }
      }

      // Update the member
      const { data: updatedMember, error: updateError } = await supabase
        .from('tenant_members')
        .update({
          role: validatedData.role,
          status: validatedData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .eq('tenant_id', context.tenantId)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Log the activity
      await supabase
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          action: 'member.role_updated',
          entity_type: 'member',
          entity_id: memberId,
          metadata: {
            old_role: existingMember.role,
            new_role: validatedData.role,
            target_user_id: existingMember.user_id
          }
        })

      return NextResponse.json({
        message: 'Member updated successfully',
        member: updatedMember
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

      console.error('Error updating team member:', error)
      return NextResponse.json(
        { error: 'Failed to update team member' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'manage',
    requireTenant: true
  })
}

// DELETE - Remove team member
export async function DELETE(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const url = new URL(req.url)
    const memberId = url.searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    try {
      // Verify the member belongs to this tenant and get their info
      const { data: existingMember, error: fetchError } = await supabase
        .from('tenant_members')
        .select('id, user_id, role, users(name, email)')
        .eq('id', memberId)
        .eq('tenant_id', context.tenantId)
        .single()

      if (fetchError || !existingMember) {
        return NextResponse.json(
          { error: 'Member not found' },
          { status: 404 }
        )
      }

      // Prevent removing the last owner
      if (existingMember.role === 'owner') {
        const { count: ownerCount } = await supabase
          .from('tenant_members')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', context.tenantId)
          .eq('role', 'owner')
          .eq('status', 'active')

        if ((ownerCount || 0) <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last owner of the tenant' },
            { status: 400 }
          )
        }
      }

      // Remove the member
      const { error: deleteError } = await supabase
        .from('tenant_members')
        .delete()
        .eq('id', memberId)
        .eq('tenant_id', context.tenantId)

      if (deleteError) {
        throw deleteError
      }

      // Log the activity
      await supabase
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          action: 'member.removed',
          entity_type: 'member',
          entity_id: memberId,
          metadata: {
            removed_user_id: existingMember.user_id,
            removed_user_name: existingMember.users?.name,
            removed_user_email: existingMember.users?.email,
            role: existingMember.role
          }
        })

      return NextResponse.json({
        message: 'Member removed successfully'
      })

    } catch (error) {
      console.error('Error removing team member:', error)
      return NextResponse.json(
        { error: 'Failed to remove team member' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'manage',
    requireTenant: true
  })
}
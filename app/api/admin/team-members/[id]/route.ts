/**
 * Individual Team Member Management API
 * Operations for specific team member by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const UpdateMemberSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  status: z.enum(['active', 'inactive']).optional()
})

interface Params {
  id: string
}

// PUT - Update specific team member
export async function PUT(request: NextRequest, { params }: { params: Promise<Params> }) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { id } = await params
    const memberId = id

    try {
      const body = await req.json()
      const validatedData = UpdateMemberSchema.parse(body)

      // Verify the member belongs to this tenant
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

      // Prevent user from modifying their own role unless they're transferring ownership
      if (existingMember.user_id === context.userId && validatedData.role !== existingMember.role) {
        // Allow owner to transfer ownership, but not downgrade themselves unless there's another owner
        if (existingMember.role === 'owner' && validatedData.role !== 'owner') {
          const { count: ownerCount } = await supabase
            .from('tenant_members')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', context.tenantId)
            .eq('role', 'owner')
            .eq('status', 'active')

          if ((ownerCount || 0) <= 1) {
            return NextResponse.json(
              { error: 'Cannot remove yourself as the last owner. Assign another owner first.' },
              { status: 400 }
            )
          }
        } else if (existingMember.role !== 'owner') {
          return NextResponse.json(
            { error: 'Cannot modify your own role' },
            { status: 403 }
          )
        }
      }

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
        .select(`
          id,
          user_id,
          role,
          status,
          joined_at,
          users(name, email, avatar_url)
        `)
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
            target_user_id: existingMember.user_id,
            target_user_name: (existingMember.users as any)?.name,
            target_user_email: (existingMember.users as any)?.email,
            status_changed: validatedData.status ? true : false
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

// DELETE - Remove specific team member
export async function DELETE(request: NextRequest, { params }: { params: Promise<Params> }) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { id } = await params
    const memberId = id

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

      // Prevent removing yourself
      if (existingMember.user_id === context.userId) {
        return NextResponse.json(
          { error: 'Cannot remove yourself from the team' },
          { status: 400 }
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
            removed_user_name: (existingMember.users as any)?.name,
            removed_user_email: (existingMember.users as any)?.email,
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
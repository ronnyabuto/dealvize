/**
 * Role Management API
 * CRUD operations for tenant-specific roles and permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC, RBACContext } from '@/lib/rbac/middleware'
import { SYSTEM_ROLES, Role } from '@/lib/rbac/permissions'
import { z } from 'zod'

// Validation schemas
const CreateRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  permissions: z.array(z.string()).min(1),
  color: z.string().optional(),
  icon: z.string().optional()
})

const UpdateRoleSchema = CreateRoleSchema.partial()

// GET - List roles for tenant
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const includeSystem = req.nextUrl.searchParams.get('includeSystem') === 'true'

    try {
      let roles: Role[] = []

      // Add system roles if requested
      if (includeSystem) {
        roles = [...SYSTEM_ROLES]
      }

      // Get custom tenant roles
      const { data: customRoles, error } = await supabase
        .from('tenant_roles')
        .select('*')
        .eq('tenant_id', context.tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      // Convert custom roles to Role interface
      const convertedCustomRoles: Role[] = (customRoles || []).map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions || [],
        isSystem: false,
        tenantId: role.tenant_id,
        color: role.color,
        icon: role.icon
      }))

      roles = [...roles, ...convertedCustomRoles]

      return NextResponse.json({ roles })

    } catch (error) {
      console.error('Error fetching roles:', error)
      return NextResponse.json(
        { error: 'Failed to fetch roles' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'view',
    requireTenant: true
  })
}

// POST - Create new custom role
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()

    try {
      const body = await req.json()
      const roleData = CreateRoleSchema.parse(body)

      // Check if role name already exists in tenant
      const { data: existing } = await supabase
        .from('tenant_roles')
        .select('id')
        .eq('tenant_id', context.tenantId)
        .eq('name', roleData.name)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Role name already exists' },
          { status: 409 }
        )
      }

      // Validate permissions exist in system
      const validPermissions = Object.keys(import('@/lib/rbac/permissions').then(m => m.CORE_PERMISSIONS))
      const invalidPermissions = roleData.permissions.filter(p => !validPermissions.includes(p))
      
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
          { status: 400 }
        )
      }

      // Create the role
      const { data: newRole, error } = await supabase
        .from('tenant_roles')
        .insert({
          tenant_id: context.tenantId,
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
          color: roleData.color,
          icon: roleData.icon,
          created_by: context.userId,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Log role creation
      await supabase
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          action: 'role.created',
          entity_type: 'role',
          entity_id: newRole.id,
          metadata: {
            role_name: roleData.name,
            permissions_count: roleData.permissions.length
          }
        })

      // Convert to Role interface
      const role: Role = {
        id: newRole.id,
        name: newRole.name,
        description: newRole.description,
        permissions: newRole.permissions || [],
        isSystem: false,
        tenantId: newRole.tenant_id,
        color: newRole.color,
        icon: newRole.icon
      }

      return NextResponse.json({ role }, { status: 201 })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid role data', details: error.errors },
          { status: 400 }
        )
      }

      console.error('Error creating role:', error)
      return NextResponse.json(
        { error: 'Failed to create role' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'manage',
    requireTenant: true
  })
}

// PUT - Update custom role
export async function PUT(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()

    try {
      const body = await req.json()
      const { id, ...updateData } = body
      const roleData = UpdateRoleSchema.parse(updateData)

      if (!id) {
        return NextResponse.json(
          { error: 'Role ID is required' },
          { status: 400 }
        )
      }

      // Check if role exists and belongs to tenant
      const { data: existingRole, error: fetchError } = await supabase
        .from('tenant_roles')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', context.tenantId)
        .single()

      if (fetchError || !existingRole) {
        return NextResponse.json(
          { error: 'Role not found' },
          { status: 404 }
        )
      }

      if (roleData.name && roleData.name !== existingRole.name) {
        const { data: nameConflict } = await supabase
          .from('tenant_roles')
          .select('id')
          .eq('tenant_id', context.tenantId)
          .eq('name', roleData.name)
          .neq('id', id)
          .single()

        if (nameConflict) {
          return NextResponse.json(
            { error: 'Role name already exists' },
            { status: 409 }
          )
        }
      }

      // Update the role
      const { data: updatedRole, error: updateError } = await supabase
        .from('tenant_roles')
        .update({
          ...roleData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', context.tenantId)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // Log role update
      await supabase
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          action: 'role.updated',
          entity_type: 'role',
          entity_id: id,
          metadata: {
            role_name: updatedRole.name,
            changes: Object.keys(roleData)
          }
        })

      // Convert to Role interface
      const role: Role = {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions: updatedRole.permissions || [],
        isSystem: false,
        tenantId: updatedRole.tenant_id,
        color: updatedRole.color,
        icon: updatedRole.icon
      }

      return NextResponse.json({ role })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid role data', details: error.errors },
          { status: 400 }
        )
      }

      console.error('Error updating role:', error)
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'manage',
    requireTenant: true
  })
}

// DELETE - Delete custom role
export async function DELETE(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const roleId = req.nextUrl.searchParams.get('id')

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      )
    }

    try {
      // Check if role exists and belongs to tenant
      const { data: existingRole, error: fetchError } = await supabase
        .from('tenant_roles')
        .select('*')
        .eq('id', roleId)
        .eq('tenant_id', context.tenantId)
        .single()

      if (fetchError || !existingRole) {
        return NextResponse.json(
          { error: 'Role not found' },
          { status: 404 }
        )
      }

      // Check if role is still in use
      const { data: membersWithRole, error: memberError } = await supabase
        .from('tenant_members')
        .select('id')
        .eq('tenant_id', context.tenantId)
        .eq('role', roleId)
        .limit(1)

      if (memberError) {
        throw memberError
      }

      if (membersWithRole && membersWithRole.length > 0) {
        return NextResponse.json(
          { error: 'Cannot delete role that is assigned to members' },
          { status: 409 }
        )
      }

      // Soft delete the role
      const { error: deleteError } = await supabase
        .from('tenant_roles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId)
        .eq('tenant_id', context.tenantId)

      if (deleteError) {
        throw deleteError
      }

      // Log role deletion
      await supabase
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          action: 'role.deleted',
          entity_type: 'role',
          entity_id: roleId,
          metadata: {
            role_name: existingRole.name
          }
        })

      return NextResponse.json({ success: true })

    } catch (error) {
      console.error('Error deleting role:', error)
      return NextResponse.json(
        { error: 'Failed to delete role' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'manage',
    requireTenant: true
  })
}
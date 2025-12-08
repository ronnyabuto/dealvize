import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const tenant_id = searchParams.get('tenant_id')
    const member_id = searchParams.get('member_id')
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    // Check if user has permission to view members
    const hasPermission = await checkTenantPermission(supabase, user.id, tenant_id, 'view_members')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (member_id) {
      return await getTenantMember(supabase, tenant_id, member_id)
    } else {
      return await getTenantMembers(supabase, tenant_id, role, status)
    }
  } catch (error) {
    console.error('Error fetching tenant members:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      tenant_id,
      email,
      role = 'member',
      permissions = [],
      send_invite_email = true,
      invite_message
    } = body

    // Validate required fields
    if (!tenant_id || !email) {
      return NextResponse.json({
        error: 'Tenant ID and email are required'
      }, { status: 400 })
    }

    // Check if user has permission to invite members
    const hasPermission = await checkTenantPermission(supabase, user.id, tenant_id, 'manage_members')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    let userId = existingUser?.id

    // If user doesn't exist, create an invitation
    if (!userId) {
      const { data: invitation, error: inviteError } = await supabase
        .from('tenant_invitations')
        .insert({
          tenant_id,
          email,
          role,
          permissions,
          invited_by: user.id,
          invite_message,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (inviteError) {
        return NextResponse.json({ error: inviteError.message }, { status: 400 })
      }

      // Send invitation email if requested
      if (send_invite_email) {
        await sendInvitationEmail(supabase, invitation.id, email, tenant_id, user.id, invite_message)
      }

      return NextResponse.json({ 
        invitation, 
        message: 'Invitation sent successfully'
      }, { status: 201 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('tenant_members')
      .select('id, status')
      .eq('tenant_id', tenant_id)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json({
          error: 'User is already a member of this tenant'
        }, { status: 409 })
      } else {
        // Reactivate existing member
        const { data: member, error } = await supabase
          .from('tenant_members')
          .update({
            role,
            permissions,
            status: 'active',
            invited_by: user.id,
            joined_at: new Date().toISOString()
          })
          .eq('id', existingMember.id)
          .select(`
            *,
            user:users(id, email, full_name, avatar_url),
            invited_by_user:users!tenant_members_invited_by_fkey(id, email, full_name)
          `)
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ member }, { status: 200 })
      }
    }

    // Add user as member
    const { data: member, error } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id,
        user_id: userId,
        role,
        permissions,
        invited_by: user.id,
        joined_at: new Date().toISOString(),
        status: 'active'
      })
      .select(`
        *,
        user:users(id, email, full_name, avatar_url),
        invited_by_user:users!tenant_members_invited_by_fkey(id, email, full_name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log activity
    await logTenantActivity(supabase, tenant_id, user.id, 'member_added', {
      member_id: member.id,
      member_email: email,
      role
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Error adding tenant member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')
    const body = await request.json()

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    // Get member details to check tenant
    const { data: currentMember } = await supabase
      .from('tenant_members')
      .select('tenant_id, user_id, role')
      .eq('id', memberId)
      .single()

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check permissions
    const hasPermission = await checkTenantPermission(supabase, user.id, currentMember.tenant_id, 'manage_members')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prevent users from changing their own role (except owner)
    const { data: userMembership } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', currentMember.tenant_id)
      .eq('user_id', user.id)
      .single()

    if (currentMember.user_id === user.id && userMembership?.role !== 'owner') {
      return NextResponse.json({
        error: 'Cannot modify your own membership'
      }, { status: 403 })
    }

    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    }

    const { data: member, error } = await supabase
      .from('tenant_members')
      .update(updateData)
      .eq('id', memberId)
      .select(`
        *,
        user:users(id, email, full_name, avatar_url),
        invited_by_user:users!tenant_members_invited_by_fkey(id, email, full_name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log activity
    await logTenantActivity(supabase, currentMember.tenant_id, user.id, 'member_updated', {
      member_id: memberId,
      changes: body
    })

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Error updating tenant member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    // Get member details
    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id, user_id, role')
      .eq('id', memberId)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check permissions
    const hasPermission = await checkTenantPermission(supabase, user.id, member.tenant_id, 'manage_members')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prevent removing the last owner
    if (member.role === 'owner') {
      const { data: owners } = await supabase
        .from('tenant_members')
        .select('id')
        .eq('tenant_id', member.tenant_id)
        .eq('role', 'owner')
        .eq('status', 'active')

      if (owners && owners.length <= 1) {
        return NextResponse.json({
          error: 'Cannot remove the last owner of the tenant'
        }, { status: 400 })
      }
    }

    // Soft delete the member (set status to inactive)
    const { error } = await supabase
      .from('tenant_members')
      .update({
        status: 'inactive',
        removed_at: new Date().toISOString(),
        removed_by: user.id
      })
      .eq('id', memberId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Log activity
    await logTenantActivity(supabase, member.tenant_id, user.id, 'member_removed', {
      member_id: memberId,
      removed_user_id: member.user_id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing tenant member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getTenantMember(supabase: any, tenantId: string, memberId: string) {
  const { data: member, error } = await supabase
    .from('tenant_members')
    .select(`
      *,
      user:users(id, email, full_name, avatar_url, created_at, last_sign_in_at),
      invited_by_user:users!tenant_members_invited_by_fkey(id, email, full_name),
      tenant:tenants(id, name, subdomain, plan_type)
    `)
    .eq('tenant_id', tenantId)
    .eq('id', memberId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ member })
}

async function getTenantMembers(supabase: any, tenantId: string, role?: string, status?: string) {
  let query = supabase
    .from('tenant_members')
    .select(`
      *,
      user:users(id, email, full_name, avatar_url, created_at, last_sign_in_at),
      invited_by_user:users!tenant_members_invited_by_fkey(id, email, full_name)
    `)
    .eq('tenant_id', tenantId)
    .order('joined_at', { ascending: false })

  if (role) {
    query = query.eq('role', role)
  }

  if (status) {
    query = query.eq('status', status)
  } else {
    query = query.eq('status', 'active') // Default to active members only
  }

  const { data: members, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ members: members || [] })
}

async function checkTenantPermission(supabase: any, userId: string, tenantId: string, permission: string) {
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role, permissions, status')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .single()

  if (!membership || membership.status !== 'active') {
    return false
  }

  // Owner and admin have all permissions
  if (['owner', 'admin'].includes(membership.role)) {
    return true
  }

  // Check specific permission
  return membership.permissions?.includes(permission) || membership.permissions?.includes('all')
}

async function logTenantActivity(supabase: any, tenantId: string, userId: string, activityType: string, activityData: any) {
  await supabase
    .from('tenant_activity_logs')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      activity_type: activityType,
      activity_data: activityData,
      ip_address: null, // Would get from request in production
      user_agent: null, // Would get from request in production
      created_at: new Date().toISOString()
    })
}

async function sendInvitationEmail(supabase: any, invitationId: string, email: string, tenantId: string, invitedBy: string, message?: string) {
  // Get tenant and inviter details
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, subdomain')
    .eq('id', tenantId)
    .single()

  const { data: inviter } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', invitedBy)
    .single()

  // In production, this would integrate with your email service
  const inviteLink = `https://${tenant?.subdomain}.dealvize.com/invite/${invitationId}`
  
  console.log(`
    Invitation Email:
    To: ${email}
    From: ${inviter?.full_name} (${inviter?.email})
    Subject: You're invited to join ${tenant?.name} on Dealvize
    
    Hi there,
    
    ${inviter?.full_name} has invited you to join ${tenant?.name} on Dealvize.
    
    ${message ? `Message: ${message}` : ''}
    
    Click here to accept the invitation: ${inviteLink}
    
    This invitation will expire in 7 days.
    
    Best regards,
    The Dealvize Team
  `)

  // Log the email send attempt
  await supabase
    .from('tenant_invitation_emails')
    .insert({
      invitation_id: invitationId,
      email,
      sent_at: new Date().toISOString(),
      status: 'sent' // In production: 'sent', 'delivered', 'failed'
    })
}
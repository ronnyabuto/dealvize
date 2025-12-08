/**
 * Invitation Verification API
 * Verify invitation token and return invitation details
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  token: string
}

// GET - Verify invitation token and return details
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { token } = params
  
  if (!token) {
    return NextResponse.json(
      { error: 'Token is required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  try {
    // Get invitation details with related data
    const { data: invitation, error } = await supabase
      .from('tenant_invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        custom_message,
        tenant:tenants!inner(
          id,
          name,
          industry,
          settings
        ),
        invited_by_user:users!tenant_invitations_invited_by_fkey(
          name,
          email
        )
      `)
      .eq('token', token)
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    // Check if invitation is expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (expiresAt < now) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Check invitation status
    if (invitation.status !== 'pending') {
      const statusMessages = {
        accepted: 'This invitation has already been accepted',
        cancelled: 'This invitation has been cancelled',
        expired: 'This invitation has expired'
      }
      
      return NextResponse.json(
        { error: statusMessages[invitation.status as keyof typeof statusMessages] || 'Invalid invitation status' },
        { status: 400 }
      )
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', invitation.email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      )
    }

    // Check if user is already a member of this tenant
    const { data: existingMember } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', invitation.tenant.id)
      .eq('email', invitation.email.toLowerCase())
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 409 }
      )
    }

    // Return invitation details
    const invitationData = {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expires_at: invitation.expires_at,
      custom_message: invitation.custom_message,
      tenant: {
        id: invitation.tenant.id,
        name: invitation.tenant.name,
        industry: invitation.tenant.industry
      },
      invited_by: {
        name: invitation.invited_by_user?.name || 'Unknown',
        email: invitation.invited_by_user?.email || ''
      }
    }

    return NextResponse.json({
      valid: true,
      invitation: invitationData
    })

  } catch (error) {
    console.error('Error verifying invitation:', error)
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    )
  }
}
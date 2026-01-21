/**
 * Invitation Acceptance API
 * Process invitation acceptance and create user account
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

interface Params {
  token: string
}

const AcceptInvitationSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number')
})

// POST - Accept invitation and create account
export async function POST(request: NextRequest, { params }: { params: Promise<Params> }) {
  const { token } = await params
  
  if (!token) {
    return NextResponse.json(
      { error: 'Token is required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const serviceClient = createServiceClient()

  try {
    const body = await request.json()
    const validatedData = AcceptInvitationSchema.parse(body)

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('tenant_invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        tenant_id,
        tenant:tenants!inner(
          id,
          name,
          plan_type
        )
      `)
      .eq('token', token)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    // Validate invitation
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (expiresAt < now) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'This invitation is no longer valid' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', invitation.email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', invitation.tenant_id)
      .eq('email', invitation.email.toLowerCase())
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 409 }
      )
    }

    // Check tenant user limits
    const { count: currentMemberCount } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', invitation.tenant_id)
      .eq('status', 'active')

    const planLimits = {
      starter: 5,
      professional: 25,
      enterprise: 100
    }

    const maxUsers = planLimits[(invitation.tenant as any).plan_type as keyof typeof planLimits] || 5
    
    if ((currentMemberCount || 0) >= maxUsers) {
      return NextResponse.json(
        { error: 'This organization has reached its user limit for the current plan' },
        { status: 403 }
      )
    }

    // Create user account via Supabase Auth
    const fullName = `${validatedData.firstName} ${validatedData.lastName}`.trim()
    
    const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
      email: invitation.email.toLowerCase(),
      password: validatedData.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: validatedData.firstName,
        last_name: validatedData.lastName
      }
    })

    if (authError || !authUser.user) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create user profile
    const { error: profileError } = await serviceClient
      .from('users')
      .insert({
        id: authUser.user.id,
        email: invitation.email.toLowerCase(),
        name: fullName,
        role: 'Agent', // Default role in users table
        created_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to clean up auth user if profile creation fails
      await serviceClient.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Add user to tenant
    const { error: memberError } = await serviceClient
      .from('tenant_members')
      .insert({
        tenant_id: invitation.tenant_id,
        user_id: authUser.user.id,
        email: invitation.email.toLowerCase(),
        role: invitation.role,
        status: 'active',
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Member creation error:', memberError)
      // Clean up user and profile if member creation fails
      await serviceClient.auth.admin.deleteUser(authUser.user.id)
      await serviceClient
        .from('users')
        .delete()
        .eq('id', authUser.user.id)
      
      return NextResponse.json(
        { error: 'Failed to add user to organization' },
        { status: 500 }
      )
    }

    // Initialize user preferences
    try {
      await serviceClient
        .from('user_preferences')
        .insert({
          user_id: authUser.user.id,
          preferences: {
            theme: 'system',
            language: 'en',
            timezone: 'America/New_York',
            emailNotifications: {
              newDeals: true,
              taskReminders: true,
              systemUpdates: true,
              marketingEmails: false,
              weeklyDigest: true
            }
          }
        })
    } catch (prefError) {
      console.warn('User preferences initialization failed:', prefError)
    }

    // Initialize commission settings
    try {
      await serviceClient
        .from('commission_settings')
        .insert({
          user_id: authUser.user.id,
          tenant_id: invitation.tenant_id,
          default_commission_rate: 3.00,
          broker_split_percentage: 50.00
        })
    } catch (commissionError) {
      console.warn('Commission settings initialization failed:', commissionError)
    }

    // Mark invitation as accepted
    const { error: updateInvitationError } = await supabase
      .from('tenant_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('token', token)

    if (updateInvitationError) {
      console.error('Error updating invitation status:', updateInvitationError)
    }

    // Log the activity
    await serviceClient
      .from('tenant_activity_logs')
      .insert({
        tenant_id: invitation.tenant_id,
        user_id: authUser.user.id,
        action: 'invitation.accepted',
        entity_type: 'invitation',
        entity_id: invitation.id,
        metadata: {
          email: invitation.email,
          role: invitation.role,
          user_name: fullName
        }
      })

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: authUser.user.id,
        email: invitation.email,
        name: fullName,
        role: invitation.role
      },
      tenant: {
        id: invitation.tenant_id,
        name: (invitation.tenant as any).name
      }
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

    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
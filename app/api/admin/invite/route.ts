import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'admin']),
  message: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, subscription_plan')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'Admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role, message } = inviteSchema.parse(body)

    // Check plan limits
    const planLimits = {
      'Tier 1': 3,
      'Tier 2': 7, 
      'Tier 3': 10
    }
    
    const currentPlan = userProfile.subscription_plan || 'Tier 1'
    const maxUsers = planLimits[currentPlan as keyof typeof planLimits]

    // Count current team members
    const { data: currentMembers, error: countError } = await supabase
      .from('team_members')
      .select('id')
      .eq('organization_id', user.id)

    if (countError) {
      return NextResponse.json({ error: 'Failed to check current team size' }, { status: 500 })
    }

    // +1 for the admin user
    if ((currentMembers?.length || 0) + 1 >= maxUsers) {
      return NextResponse.json({ 
        error: `Your ${currentPlan} plan allows up to ${maxUsers} users. Upgrade to add more team members.` 
      }, { status: 400 })
    }

    // Check if email is already invited or is the admin
    if (email === user.email) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
    }

    const { data: existingInvite, error: existingError } = await supabase
      .from('team_members')
      .select('id')
      .eq('organization_id', user.id)
      .eq('email', email)
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'User already invited or is a team member' }, { status: 400 })
    }

    // Generate invitation token
    const inviteToken = crypto.randomUUID()

    // Create team member invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('team_members')
      .insert({
        organization_id: user.id,
        email,
        role,
        status: 'pending',
        invited_date: new Date().toISOString(),
        invite_token: inviteToken,
        custom_message: message
      })
      .select()
      .single()

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    // Send invitation email (in a real app, you'd use a proper email service)
    // For now, we'll just log the invitation details
    console.log('Team invitation sent:', {
      to: email,
      role,
      inviteToken,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`,
      message
    })

    // In a real implementation, you'd send an email here:
    // await sendInvitationEmail({
    //   to: email,
    //   inviterName: user.email,
    //   role,
    //   inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`,
    //   customMessage: message
    // })

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email,
        role,
        status: 'pending'
      }
    })
  } catch (error) {
    console.error('Team invitation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid invitation data' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
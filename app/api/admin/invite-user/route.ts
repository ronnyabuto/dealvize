/**
 * User Invitation API
 * Secure token-based user invitation system with email notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'
import crypto from 'crypto'

const InviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
  sendWelcomeEmail: z.boolean().default(true),
  customMessage: z.string().max(500, 'Message too long').optional()
})

// POST - Send user invitation
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()

    try {
      const body = await req.json()
      const validatedData = InviteUserSchema.parse(body)

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('tenant_members')
        .select('id, status')
        .eq('tenant_id', context.tenantId)
        .eq('email', validatedData.email.toLowerCase())
        .single()

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this tenant' },
          { status: 409 }
        )
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await supabase
        .from('tenant_invitations')
        .select('id, status, expires_at')
        .eq('tenant_id', context.tenantId)
        .eq('email', validatedData.email.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single()

      if (existingInvitation) {
        return NextResponse.json(
          { error: 'An active invitation already exists for this email' },
          { status: 409 }
        )
      }

      // Get tenant info for invitation context
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, settings')
        .eq('id', context.tenantId)
        .single()

      // Get inviter info
      const { data: inviter } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', context.userId)
        .single()

      // Generate secure invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      // Create invitation record
      const { data: invitation, error: invitationError } = await supabase
        .from('tenant_invitations')
        .insert({
          tenant_id: context.tenantId,
          email: validatedData.email.toLowerCase(),
          role: validatedData.role,
          token: invitationToken,
          invited_by: context.userId,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
          custom_message: validatedData.customMessage
        })
        .select()
        .single()

      if (invitationError) {
        throw invitationError
      }

      // Send invitation email if requested
      if (validatedData.sendWelcomeEmail) {
        try {
          await sendInvitationEmail({
            to: validatedData.email,
            token: invitationToken,
            role: validatedData.role,
            tenantName: tenant?.name || 'Dealvize Team',
            inviterName: inviter?.name || 'Team Administrator',
            customMessage: validatedData.customMessage,
            expiresAt: expiresAt
          })
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError)
          // Don't fail the invitation if email fails
        }
      }

      // Log the activity
      await supabase
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          action: 'invitation.sent',
          entity_type: 'invitation',
          entity_id: invitation.id,
          metadata: {
            invited_email: validatedData.email,
            role: validatedData.role,
            expires_at: expiresAt.toISOString()
          }
        })

      const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitationToken}`

      return NextResponse.json({
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          email: validatedData.email,
          role: validatedData.role,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          invitation_url: invitationUrl
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

      console.error('Error sending invitation:', error)
      return NextResponse.json(
        { error: 'Failed to send invitation' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'invite',
    requireTenant: true
  })
}

// Email sending function
async function sendInvitationEmail(params: {
  to: string
  token: string
  role: string
  tenantName: string
  inviterName: string
  customMessage?: string
  expiresAt: Date
}) {
  const { to, token, role, tenantName, inviterName, customMessage, expiresAt } = params
  
  // In a real implementation, you would use a service like Resend, SendGrid, or similar
  // For now, we'll use a mock implementation or log the email details
  
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  const expiryDate = expiresAt.toLocaleDateString()
  
  const emailContent = {
    to,
    subject: `You're invited to join ${tenantName} on Dealvize`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
        </div>
        
        <div style="padding: 30px; background: #f8fafc;">
          <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
            Hi there,
          </p>
          
          <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
            <strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> on Dealvize as a <strong>${role}</strong>.
          </p>
          
          ${customMessage ? `
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #0369a1; font-style: italic;">"${customMessage}"</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
            This invitation will expire on <strong>${expiryDate}</strong>. If you can't click the button above, copy and paste this link into your browser:
          </p>
          
          <p style="font-size: 12px; color: #64748b; word-break: break-all; background: #f1f5f9; padding: 10px; border-radius: 4px;">
            ${invitationUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            Powered by Dealvize CRM - Real Estate Customer Management
          </p>
        </div>
      </div>
    `
  }

  // TODO: Integrate with actual email service
  console.log('Email would be sent:', emailContent)
  
  // Example integration with Resend (uncomment when ready):
  /*
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    await resend.emails.send({
      from: 'Dealvize <noreply@dealvize.com>',
      to: emailContent.to,
      subject: emailContent.subject,
      html: emailContent.html
    })
  } catch (error) {
    console.error('Failed to send email via Resend:', error)
    throw error
  }
  */
}
/**
 * Resend Invitation API
 * Resend invitation email with new token and expiry
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import crypto from 'crypto'

interface Params {
  id: string
}

// POST - Resend invitation
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const invitationId = params.id

    try {
      // Get invitation details
      const { data: invitation, error: fetchError } = await supabase
        .from('tenant_invitations')
        .select('id, email, role, status, custom_message')
        .eq('id', invitationId)
        .eq('tenant_id', context.tenantId)
        .single()

      if (fetchError || !invitation) {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        )
      }

      // Check if invitation can be resent
      if (invitation.status === 'accepted') {
        return NextResponse.json(
          { error: 'Cannot resend accepted invitation' },
          { status: 400 }
        )
      }

      if (invitation.status === 'cancelled') {
        return NextResponse.json(
          { error: 'Cannot resend cancelled invitation' },
          { status: 400 }
        )
      }

      // Generate new token and expiry
      const newToken = crypto.randomBytes(32).toString('hex')
      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 7) // 7 days from now

      // Update invitation with new token and expiry
      const { error: updateError } = await supabase
        .from('tenant_invitations')
        .update({
          token: newToken,
          expires_at: newExpiresAt.toISOString(),
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('tenant_id', context.tenantId)

      if (updateError) {
        throw updateError
      }

      // Get tenant and inviter info for email
      const [tenantResult, inviterResult] = await Promise.all([
        supabase
          .from('tenants')
          .select('name')
          .eq('id', context.tenantId)
          .single(),
        supabase
          .from('users')
          .select('name, email')
          .eq('id', context.userId)
          .single()
      ])

      // Send new invitation email
      try {
        await sendInvitationEmail({
          to: invitation.email,
          token: newToken,
          role: invitation.role,
          tenantName: tenantResult.data?.name || 'Dealvize Team',
          inviterName: inviterResult.data?.name || 'Team Administrator',
          customMessage: invitation.custom_message,
          expiresAt: newExpiresAt,
          isResend: true
        })
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError)
        // Don't fail the request if email fails
      }

      // Log the activity
      await supabase
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          action: 'invitation.resent',
          entity_type: 'invitation',
          entity_id: invitationId,
          metadata: {
            email: invitation.email,
            role: invitation.role,
            new_expires_at: newExpiresAt.toISOString()
          }
        })

      const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${newToken}`

      return NextResponse.json({
        message: 'Invitation resent successfully',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: 'pending',
          expires_at: newExpiresAt.toISOString(),
          invitation_url: invitationUrl
        }
      })

    } catch (error) {
      console.error('Error resending invitation:', error)
      return NextResponse.json(
        { error: 'Failed to resend invitation' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'invite',
    requireTenant: true
  })
}

async function sendInvitationEmail(params: {
  to: string
  token: string
  role: string
  tenantName: string
  inviterName: string
  customMessage?: string
  expiresAt: Date
  isResend?: boolean
}) {
  const { to, token, role, tenantName, inviterName, customMessage, expiresAt, isResend } = params
  
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  const expiryDate = expiresAt.toLocaleDateString()
  
  const emailContent = {
    to,
    subject: isResend 
      ? `Reminder: You're invited to join ${tenantName} on Dealvize`
      : `You're invited to join ${tenantName} on Dealvize`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">
            ${isResend ? 'Invitation Reminder' : 'You\'re Invited!'}
          </h1>
        </div>
        
        <div style="padding: 30px; background: #f8fafc;">
          ${isResend ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-weight: bold;">
                📧 This is a reminder - we've updated your invitation with a new link and expiry date.
              </p>
            </div>
          ` : ''}
          
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
}
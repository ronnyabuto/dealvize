/**
 * Individual Invitation Management API
 * Operations for specific invitation by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import crypto from 'crypto'

interface Params {
  id: string
}

// DELETE - Cancel invitation
export async function DELETE(request: NextRequest, { params }: { params: Promise<Params> }) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { id } = await params
    const invitationId = id

    try {
      // Verify invitation belongs to this tenant
      const { data: invitation, error: fetchError } = await supabase
        .from('tenant_invitations')
        .select('id, email, status, role')
        .eq('id', invitationId)
        .eq('tenant_id', context.tenantId)
        .single()

      if (fetchError || !invitation) {
        return NextResponse.json(
          { error: 'Invitation not found' },
          { status: 404 }
        )
      }

      // Check if invitation can be cancelled
      if (invitation.status !== 'pending') {
        return NextResponse.json(
          { error: `Cannot cancel ${invitation.status} invitation` },
          { status: 400 }
        )
      }

      // Update invitation status to cancelled
      const { error: updateError } = await supabase
        .from('tenant_invitations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('tenant_id', context.tenantId)

      if (updateError) {
        throw updateError
      }

      // Log the activity
      await supabase
        .from('tenant_activity_logs')
        .insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          action: 'invitation.cancelled',
          entity_type: 'invitation',
          entity_id: invitationId,
          metadata: {
            cancelled_email: invitation.email,
            role: invitation.role
          }
        })

      return NextResponse.json({
        message: 'Invitation cancelled successfully'
      })

    } catch (error) {
      console.error('Error cancelling invitation:', error)
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'manage',
    requireTenant: true
  })
}
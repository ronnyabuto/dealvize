/**
 * Invitations Management API
 * CRUD operations for managing tenant invitations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'

// GET - List all invitations for tenant
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'all'
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    try {
      let query = supabase
        .from('tenant_invitations')
        .select(`
          id,
          email,
          role,
          status,
          invited_at,
          expires_at,
          accepted_at,
          custom_message,
          invited_by_user:users!tenant_invitations_invited_by_fkey(name, email)
        `)
        .eq('tenant_id', context.tenantId)

      // Apply status filter
      if (status !== 'all') {
        query = query.eq('status', status)
      }

      // Apply pagination
      const offset = (page - 1) * limit
      query = query
        .range(offset, offset + limit - 1)
        .order('invited_at', { ascending: false })

      const { data: invitations, error, count } = await query

      if (error) {
        throw error
      }

      // Transform data for frontend
      const transformedInvitations = (invitations || []).map(invitation => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        invited_at: invitation.invited_at,
        expires_at: invitation.expires_at,
        accepted_at: invitation.accepted_at,
        custom_message: invitation.custom_message,
        invited_by: invitation.invited_by_user?.name || 'Unknown',
        invited_by_email: invitation.invited_by_user?.email
      }))

      return NextResponse.json({
        invitations: transformedInvitations,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })

    } catch (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }
  }, {
    resource: 'members',
    action: 'view',
    requireTenant: true
  })
}
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET() {
    try {
        const user = await requireAuth()
        const supabase = await createClient()

        const { data: integration } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .single()

        if (!integration) {
            return NextResponse.json({ connected: false })
        }

        const isExpired = integration.expires_at && new Date(integration.expires_at) < new Date()

        return NextResponse.json({
            connected: !isExpired,
            email: integration.metadata?.email,
            scopes: integration.scopes,
            expires_at: integration.expires_at,
            last_sync: integration.updated_at
        })
    } catch (error) {
        return NextResponse.json({ connected: false })
    }
}

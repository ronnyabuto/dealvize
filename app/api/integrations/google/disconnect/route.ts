import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { stopWatch } from '@/lib/google/gmail'
import { stopCalendarWatch } from '@/lib/google/calendar'

export async function POST() {
    try {
        const user = await requireAuth()
        const supabase = await createClient()

        const { data: integration } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .single()

        if (integration?.access_token) {
            try {
                await stopWatch(integration.access_token, integration.refresh_token)
            } catch (e) {
                console.error('Failed to stop Gmail watch:', e)
            }

            const { data: syncState } = await supabase
                .from('sync_states')
                .select('channel_id, resource_id')
                .eq('user_id', user.id)
                .eq('provider', 'calendar')
                .single()

            if (syncState?.channel_id && syncState?.resource_id) {
                try {
                    await stopCalendarWatch(
                        integration.access_token,
                        integration.refresh_token,
                        syncState.channel_id,
                        syncState.resource_id
                    )
                } catch (e) {
                    console.error('Failed to stop Calendar watch:', e)
                }
            }
        }

        await supabase
            .from('user_integrations')
            .delete()
            .eq('user_id', user.id)
            .eq('provider', 'google')

        await supabase
            .from('sync_states')
            .delete()
            .eq('user_id', user.id)
            .in('provider', ['gmail', 'calendar'])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Google disconnect error:', error)
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }
}

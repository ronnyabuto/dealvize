import { NextRequest, NextResponse } from 'next/server'
import { checkIdempotency } from '@/lib/redis-utils'
import { getUpdatedEvents, isClosingEvent } from '@/lib/google'
import { createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
    const channelId = request.headers.get('x-goog-channel-id')
    const resourceState = request.headers.get('x-goog-resource-state')
    const channelToken = request.headers.get('x-goog-channel-token')

    if (channelToken !== process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    if (resourceState === 'sync') {
        return NextResponse.json({ status: 'sync_acknowledged' }, { status: 200 })
    }

    if (!channelId) {
        await logger.warn('calendar_webhook', 'Missing channel ID', { headers: Object.fromEntries(request.headers) })
        return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 })
    }

    try {
        const idempotencyResult = await checkIdempotency(`cal:${channelId}:${Date.now()}`, 60)
        if (idempotencyResult === 'DUPLICATE') {
            await logger.debug('calendar_webhook', 'Duplicate sync ignored', { channelId })
            return NextResponse.json({ status: 'duplicate' }, { status: 200 })
        }

        const supabase = createServiceClient()

        // Look up integration by the channel_id stored in sync_states
        const { data: syncStateWithUser } = await supabase
            .from('sync_states')
            .select('user_id')
            .eq('channel_id', channelId)
            .eq('provider', 'calendar')
            .single()

        if (!syncStateWithUser?.user_id) {
            await logger.error('calendar_webhook', 'No sync state found for channel', { channelId })
            return NextResponse.json({ status: 'no_sync_state' }, { status: 200 })
        }

        const { data: integration } = await supabase
            .from('user_integrations')
            .select('*')
            .eq('user_id', syncStateWithUser.user_id)
            .eq('provider', 'google')
            .single()

        if (!integration?.access_token) {
            await logger.error('calendar_webhook', 'No integration found for user', { userId: syncStateWithUser.user_id })
            return NextResponse.json({ status: 'no_integration' }, { status: 200 })
        }

        const { data: syncState } = await supabase
            .from('sync_states')
            .select('sync_token')
            .eq('user_id', integration.user_id)
            .eq('provider', 'calendar')
            .single()

        const { events, nextSyncToken } = await getUpdatedEvents(
            integration.access_token,
            integration.refresh_token,
            'primary',
            syncState?.sync_token
        )

        await logger.info('calendar_webhook', 'Fetched updated events', { count: events.length, userId: integration.user_id })

        for (const event of events) {
            if (!event.id || event.status === 'cancelled') continue

            const eventIdempotency = await checkIdempotency(`event:${event.id}:${event.updated}`, 604800)
            if (eventIdempotency === 'DUPLICATE') continue

            if (isClosingEvent(event)) {
                await logger.info('calendar_webhook', 'Detected closing event', { summary: event.summary, id: event.id })
                const eventStart = event.start?.dateTime || event.start?.date
                const dueDate = eventStart ? new Date(eventStart) : new Date()
                dueDate.setDate(dueDate.getDate() - 1)

                await supabase.from('tasks').insert({
                    user_id: integration.user_id,
                    title: `Prepare for closing: ${event.summary}`,
                    description: `Calendar event: ${event.summary}\nLocation: ${event.location || 'TBD'}\nTime: ${eventStart}`,
                    status: 'pending',
                    priority: 'high',
                    type: 'closing',
                    due_date: dueDate.toISOString(),
                })
                await logger.info('calendar_webhook', 'Created closing task', { summary: event.summary })
            }
        }

        if (nextSyncToken) {
            await supabase.from('sync_states').upsert({
                user_id: integration.user_id,
                provider: 'calendar',
                sync_token: nextSyncToken,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,provider'
            })
        }

        return NextResponse.json({ status: 'processed', events_checked: events.length }, { status: 200 })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        await logger.error('calendar_webhook', 'CRITICAL_FAILURE', { error: errorMessage })
        console.error('Calendar webhook error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

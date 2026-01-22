import { google, calendar_v3 } from 'googleapis'
import { getAuthenticatedClient } from './auth'

export async function watchCalendar(
    accessToken: string,
    refreshToken: string,
    calendarId: string = 'primary',
    webhookUrl: string
): Promise<calendar_v3.Schema$Channel> {
    const auth = getAuthenticatedClient(accessToken, refreshToken)
    const calendar = google.calendar({ version: 'v3', auth })

    const channelId = crypto.randomUUID()
    const response = await calendar.events.watch({
        calendarId,
        requestBody: {
            id: channelId,
            type: 'web_hook',
            address: webhookUrl,
            token: process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN,
            expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    })

    return response.data
}

export async function stopCalendarWatch(
    accessToken: string,
    refreshToken: string,
    channelId: string,
    resourceId: string
): Promise<void> {
    const auth = getAuthenticatedClient(accessToken, refreshToken)
    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.channels.stop({
        requestBody: {
            id: channelId,
            resourceId,
        },
    })
}

export async function getEvent(
    accessToken: string,
    refreshToken: string,
    calendarId: string,
    eventId: string
): Promise<calendar_v3.Schema$Event> {
    const auth = getAuthenticatedClient(accessToken, refreshToken)
    const calendar = google.calendar({ version: 'v3', auth })

    const response = await calendar.events.get({
        calendarId,
        eventId,
    })

    return response.data
}

export async function getUpdatedEvents(
    accessToken: string,
    refreshToken: string,
    calendarId: string = 'primary',
    syncToken?: string
): Promise<{ events: calendar_v3.Schema$Event[]; nextSyncToken?: string }> {
    const auth = getAuthenticatedClient(accessToken, refreshToken)
    const calendar = google.calendar({ version: 'v3', auth })

    const params: calendar_v3.Params$Resource$Events$List = {
        calendarId,
        singleEvents: true,
        orderBy: 'startTime',
    }

    if (syncToken) {
        params.syncToken = syncToken
    } else {
        params.timeMin = new Date().toISOString()
        params.timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    const response = await calendar.events.list(params)

    return {
        events: response.data.items || [],
        nextSyncToken: response.data.nextSyncToken || undefined,
    }
}

const CLOSING_KEYWORDS = [
    'closing',
    'settlement',
    'final walkthrough',
    'walk-through',
    'signing',
    'title company',
    'escrow',
    'deed transfer',
    'keys handover',
]

export function isClosingEvent(event: calendar_v3.Schema$Event): boolean {
    const title = (event.summary || '').toLowerCase()
    const description = (event.description || '').toLowerCase()
    const location = (event.location || '').toLowerCase()

    const combined = `${title} ${description} ${location}`

    for (const keyword of CLOSING_KEYWORDS) {
        if (combined.includes(keyword)) {
            return true
        }
    }

    return false
}

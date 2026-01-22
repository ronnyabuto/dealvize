import { google, gmail_v1 } from 'googleapis'
import { getAuthenticatedClient } from './auth'

export async function watchUserMailbox(
    accessToken: string,
    refreshToken: string,
    topicName: string
): Promise<gmail_v1.Schema$WatchResponse> {
    const auth = getAuthenticatedClient(accessToken, refreshToken)
    const gmail = google.gmail({ version: 'v1', auth })

    const response = await gmail.users.watch({
        userId: 'me',
        requestBody: {
            topicName,
            labelIds: ['INBOX'],
            labelFilterBehavior: 'INCLUDE',
        },
    })

    return response.data
}

export async function stopWatch(
    accessToken: string,
    refreshToken: string
): Promise<void> {
    const auth = getAuthenticatedClient(accessToken, refreshToken)
    const gmail = google.gmail({ version: 'v1', auth })

    await gmail.users.stop({ userId: 'me' })
}

export async function getMessage(
    accessToken: string,
    refreshToken: string,
    messageId: string
): Promise<gmail_v1.Schema$Message> {
    const auth = getAuthenticatedClient(accessToken, refreshToken)
    const gmail = google.gmail({ version: 'v1', auth })

    const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
    })

    return response.data
}

export async function getHistoryChanges(
    accessToken: string,
    refreshToken: string,
    startHistoryId: string
): Promise<gmail_v1.Schema$History[]> {
    const auth = getAuthenticatedClient(accessToken, refreshToken)
    const gmail = google.gmail({ version: 'v1', auth })

    const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
        labelId: 'INBOX',
    })

    return response.data.history || []
}

export function parseEmailContent(message: gmail_v1.Schema$Message): {
    subject: string
    from: string
    body: string
    date: number
} {
    const headers = message.payload?.headers || []
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || ''
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || ''
    const dateStr = headers.find(h => h.name?.toLowerCase() === 'date')?.value || ''

    let body = ''
    const parts = message.payload?.parts || []

    for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8')
            break
        }
    }

    if (!body && message.payload?.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
    }

    return {
        subject,
        from,
        body,
        date: dateStr ? new Date(dateStr).getTime() : Date.now(),
    }
}

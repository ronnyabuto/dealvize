import { google } from 'googleapis'

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar.readonly',
]

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
)

export function getAuthUrl(state: string): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state,
        prompt: 'consent',
    })
}

export async function getTokensFromCode(code: string) {
    const { tokens } = await oauth2Client.getToken(code)
    return tokens
}

export function getAuthenticatedClient(accessToken: string, refreshToken?: string) {
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    )
    client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    })
    return client
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
    try {
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
        oauth2Client.setCredentials({ access_token: accessToken })
        const { data } = await oauth2.userinfo.get()
        return data.email || null
    } catch (error) {
        console.error('Failed to get user email:', error)
        return null
    }
}

export { oauth2Client }

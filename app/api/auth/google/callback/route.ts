import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode, watchUserMailbox, watchCalendar } from '@/lib/google'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_denied`
        )
    }

    if (!code || !state) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=missing_params`
        )
    }

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/login?redirect=/settings`
            )
        }

        const tokens = await getTokensFromCode(code)

        if (!tokens.access_token) {
            throw new Error('No access token received')
        }

        await supabase.from('user_integrations').upsert({
            user_id: user.id,
            provider: 'google',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
            scopes: tokens.scope?.split(' ') || [],
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,provider'
        })

        if (process.env.GOOGLE_PUBSUB_TOPIC) {
            try {
                await watchUserMailbox(
                    tokens.access_token,
                    tokens.refresh_token!,
                    process.env.GOOGLE_PUBSUB_TOPIC
                )
            } catch (watchError) {
                console.error('Failed to set up Gmail watch:', watchError)
            }
        }

        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google/calendar`
        try {
            await watchCalendar(
                tokens.access_token,
                tokens.refresh_token!,
                'primary',
                webhookUrl
            )
        } catch (watchError) {
            console.error('Failed to set up Calendar watch:', watchError)
        }

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=google_connected`
        )
    } catch (error) {
        console.error('Google OAuth callback error:', error)
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`
        )
    }
}

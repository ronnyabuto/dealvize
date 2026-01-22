import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const state = Buffer.from(JSON.stringify({
            user_id: user.id,
            timestamp: Date.now()
        })).toString('base64')

        const authUrl = getAuthUrl(state)

        return NextResponse.json({ auth_url: authUrl })
    } catch (error) {
        console.error('Google auth initiation error:', error)
        return NextResponse.json({ error: 'Failed to initiate Google auth' }, { status: 500 })
    }
}

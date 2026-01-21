import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Note: Signout intentionally does NOT use CSRF protection
// because it should work even when the session is expired or tokens are stale
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Server-side signout error:', error)
      // Continue anyway - we still want to clear cookies
    }

    // Create response that will clear all auth cookies
    const response = NextResponse.json(
      { success: true, message: 'Signed out successfully' },
      { status: 200 }
    )

    // Clear all Supabase session cookies manually
    const cookieNames = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase.auth.token',
      'supabase-auth-token',
      'sb-cpozywyxhknzfhtzykag-auth-token', // Your current Supabase instance
      'sb-ndbvounbrbekgqvbposb-auth-token', // Previous Supabase instance
      'dealvize-session'
    ]

    cookieNames.forEach(cookieName => {
      response.cookies.set({
        name: cookieName,
        value: '',
        expires: new Date(0), // Expire immediately
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    })

    // Also clear any cookies that match Supabase patterns
    const requestCookies = request.cookies.getAll()
    requestCookies.forEach(cookie => {
      if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
        response.cookies.set({
          name: cookie.name,
          value: '',
          expires: new Date(0),
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        })
      }
    })

    return response
  } catch (error) {
    console.error('Signout API error:', error)
    // Still return success - client will redirect anyway
    return NextResponse.json(
      { success: true, message: 'Signout processed' },
      { status: 200 }
    )
  }
}
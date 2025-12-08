import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withCSRFProtection } from '@/lib/security/csrf'

export const POST = withCSRFProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient()
    
    // Sign out from Supabase (this clears the session server-side)
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Server-side signout error:', error)
      return NextResponse.json(
        { error: 'Failed to sign out' }, 
        { status: 500 }
      )
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
      'sb-ndbvounbrbekgqvbposb-auth-token', // Your specific Supabase instance
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
    return NextResponse.json(
      { error: 'Internal server error during signout' }, 
      { status: 500 }
    )
  }
})
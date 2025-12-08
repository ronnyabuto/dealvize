import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=missing_code_or_state`)
  }

  try {
    // Decode state to get user and provider info
    const stateData = JSON.parse(atob(state))
    const { user_id, provider_id } = stateData

    const supabase = await createClient()

    // Get the provider details
    const { data: provider, error: providerError } = await supabase
      .from('integration_providers')
      .select('*')
      .eq('id', provider_id)
      .single()

    if (providerError || !provider) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=invalid_provider`)
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(provider, code)
    
    if (!tokenResponse.success) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=${encodeURIComponent(tokenResponse.error)}`)
    }

    // Get user profile from the provider (optional, for metadata)
    const userProfile = await getUserProfile(provider, tokenResponse.tokens.access_token)

    // Store the integration
    const { error: insertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id,
        provider_id,
        status: 'connected',
        access_token: encrypt(tokenResponse.tokens.access_token),
        refresh_token: tokenResponse.tokens.refresh_token ? encrypt(tokenResponse.tokens.refresh_token) : null,
        token_expires_at: tokenResponse.tokens.expires_at ? new Date(tokenResponse.tokens.expires_at).toISOString() : null,
        metadata: userProfile || {},
        config: {}
      })

    if (insertError) {
      console.error('Error storing integration:', insertError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=storage_error`)
    }

    // Redirect back to integrations page with success
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?success=${provider.name}`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=callback_error`)
  }
}

// Helper function to exchange authorization code for tokens
async function exchangeCodeForTokens(provider: any, code: string): Promise<{ success: boolean; tokens?: any; error?: string }> {
  try {
    const clientId = process.env[`${provider.name.toUpperCase()}_CLIENT_ID`]
    const clientSecret = process.env[`${provider.name.toUpperCase()}_CLIENT_SECRET`]

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Missing OAuth credentials' }
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/oauth/callback`
    })

    const response = await fetch(provider.oauth_token_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `Token exchange failed: ${errorText}` }
    }

    const tokens = await response.json()
    
    // Calculate token expiration if expires_in is provided
    if (tokens.expires_in) {
      tokens.expires_at = Date.now() + (tokens.expires_in * 1000)
    }

    return { success: true, tokens }
  } catch (error) {
    return { success: false, error: `Token exchange error: ${error}` }
  }
}

// Helper function to get user profile from provider
async function getUserProfile(provider: any, accessToken: string): Promise<any> {
  try {
    let profileUrl = ''
    let headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`
    }

    switch (provider.name) {
      case 'mailchimp':
        // Get server prefix first
        const metadataResponse = await fetch('https://login.mailchimp.com/oauth2/metadata', { headers })
        const metadata = await metadataResponse.json()
        profileUrl = `https://${metadata.dc}.api.mailchimp.com/3.0/`
        break
      
      case 'hubspot':
        profileUrl = 'https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken
        break
      
      case 'slack':
        profileUrl = 'https://slack.com/api/auth.test'
        break
      
      case 'google_calendar':
        profileUrl = 'https://www.googleapis.com/oauth2/v2/userinfo'
        break
      
      case 'docusign':
        profileUrl = 'https://account.docusign.com/oauth/userinfo'
        break
      
      case 'quickbooks':
        profileUrl = 'https://sandbox-quickbooks.api.intuit.com/v3/company/companyinfo'
        break
      
      default:
        return null
    }

    if (profileUrl) {
      const response = await fetch(profileUrl, { headers })
      if (response.ok) {
        return await response.json()
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

// Simple encryption function (in production, use proper encryption)
function encrypt(text: string): string {
  // In production, use proper encryption like crypto.createCipher
  // For now, just base64 encode (NOT SECURE - replace with real encryption)
  return Buffer.from(text).toString('base64')
}

// Simple decryption function
function decrypt(encryptedText: string): string {
  // In production, use proper decryption
  // For now, just base64 decode
  return Buffer.from(encryptedText, 'base64').toString()
}
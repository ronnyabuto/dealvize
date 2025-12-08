import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get all available integration providers
    const { data: providers, error: providersError } = await supabase
      .from('integration_providers')
      .select('*')
      .eq('is_active', true)
      .order('display_name')

    if (providersError) {
      return NextResponse.json({ error: providersError.message }, { status: 400 })
    }

    // Get user's connected integrations
    const { data: userIntegrations, error: userIntegrationsError } = await supabase
      .from('user_integrations')
      .select(`
        *,
        provider:integration_providers(*)
      `)
      .eq('user_id', user.id)

    if (userIntegrationsError) {
      return NextResponse.json({ error: userIntegrationsError.message }, { status: 400 })
    }

    // Combine the data
    const integrationsWithStatus = providers?.map(provider => {
      const userIntegration = userIntegrations?.find(ui => ui.provider_id === provider.id)
      return {
        ...provider,
        connected: !!userIntegration,
        status: userIntegration?.status || 'disconnected',
        last_sync_at: userIntegration?.last_sync_at,
        error_message: userIntegration?.error_message,
        config: userIntegration?.config || {}
      }
    })

    return NextResponse.json({ integrations: integrationsWithStatus })
  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const body = await request.json()
    const { provider_name, action, config } = body

    if (!provider_name || !action) {
      return NextResponse.json({ error: 'Provider name and action are required' }, { status: 400 })
    }

    // Get the provider
    const { data: provider, error: providerError } = await supabase
      .from('integration_providers')
      .select('*')
      .eq('name', provider_name)
      .eq('is_active', true)
      .single()

    if (providerError || !provider) {
      return NextResponse.json({ error: 'Integration provider not found' }, { status: 404 })
    }

    if (action === 'connect') {
      // Handle connection initiation
      if (provider.auth_type === 'oauth2') {
        // Generate OAuth URL
        const state = btoa(JSON.stringify({ user_id: user.id, provider_id: provider.id }))
        const params = new URLSearchParams({
          client_id: process.env[`${provider_name.toUpperCase()}_CLIENT_ID`] || '',
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/oauth/callback`,
          response_type: 'code',
          scope: provider.oauth_scope || '',
          state
        })

        const authUrl = `${provider.oauth_authorize_url}?${params.toString()}`
        
        return NextResponse.json({ auth_url: authUrl, requires_redirect: true })
      } else if (provider.auth_type === 'api_key') {
        // Handle API key based integration
        if (!config?.api_key) {
          return NextResponse.json({ error: 'API key is required' }, { status: 400 })
        }

        // Validate API key by making a test request (implement per provider)
        const isValid = await validateApiKey(provider_name, config.api_key, config)
        
        if (!isValid) {
          return NextResponse.json({ error: 'Invalid API key' }, { status: 400 })
        }

        // Save the integration
        const { data: integration, error } = await supabase
          .from('user_integrations')
          .upsert({
            user_id: user.id,
            provider_id: provider.id,
            status: 'connected',
            config: config,
            metadata: { connected_at: new Date().toISOString() }
          })
          .select()
          .single()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true, integration })
      }
    } else if (action === 'disconnect') {
      // Handle disconnection
      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('provider_id', provider.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    } else if (action === 'sync') {
      // Handle manual sync
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider_id', provider.id)
        .single()

      if (!integration) {
        return NextResponse.json({ error: 'Integration not connected' }, { status: 400 })
      }

      // Trigger sync (implement per provider)
      const syncResult = await triggerSync(provider_name, integration)
      
      return NextResponse.json({ success: true, sync_result: syncResult })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error managing integration:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

// Helper function to validate API keys
async function validateApiKey(providerName: string, apiKey: string, config: any): Promise<boolean> {
  try {
    switch (providerName) {
      case 'idevaffiliate':
        // Validate iDevAffiliate API key
        const response = await fetch(`${config.base_url}/api/affiliates.php`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        })
        return response.ok
      
      case 'post_affiliate_pro':
        // Validate Post Affiliate Pro API key
        const papResponse = await fetch(`${config.merchant_url}/scripts/server.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'C': 'Gpf_Api_AuthService',
            'M': 'authenticate',
            'username': apiKey,
            'password': '', // API key acts as username
            'rememberMe': 'N',
            'language': 'en-US'
          })
        })
        return papResponse.ok
      
      default:
        // For unknown providers, assume valid for now
        return true
    }
  } catch (error) {
    console.error(`Error validating API key for ${providerName}:`, error)
    return false
  }
}

// Helper function to trigger sync
async function triggerSync(providerName: string, integration: any): Promise<any> {
  // This would be implemented per provider
  // For now, return a mock response
  return {
    status: 'completed',
    records_synced: 0,
    message: 'Sync functionality will be implemented per provider'
  }
}
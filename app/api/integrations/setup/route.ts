import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

const defaultIntegrationProviders = [
  {
    name: 'mailchimp',
    display_name: 'Mailchimp',
    description: 'Email marketing and newsletter management',
    category: 'Marketing',
    auth_type: 'oauth2',
    is_active: true,
    oauth_authorize_url: 'https://login.mailchimp.com/oauth2/authorize',
    oauth_token_url: 'https://login.mailchimp.com/oauth2/token',
    oauth_scope: 'read write',
    config_schema: {
      type: 'object',
      properties: {
        api_key: { type: 'string', required: true }
      }
    }
  },
  {
    name: 'hubspot',
    display_name: 'HubSpot',
    description: 'CRM and marketing automation platform',
    category: 'CRM',
    auth_type: 'oauth2',
    is_active: true,
    oauth_authorize_url: 'https://app.hubspot.com/oauth/authorize',
    oauth_token_url: 'https://api.hubapi.com/oauth/v1/token',
    oauth_scope: 'contacts content',
    config_schema: {
      type: 'object',
      properties: {
        portal_id: { type: 'string' }
      }
    }
  },
  {
    name: 'slack',
    display_name: 'Slack',
    description: 'Team communication and notifications',
    category: 'Communication',
    auth_type: 'oauth2',
    is_active: true,
    oauth_authorize_url: 'https://slack.com/oauth/v2/authorize',
    oauth_token_url: 'https://slack.com/api/oauth.v2.access',
    oauth_scope: 'chat:write channels:read',
    config_schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', required: true }
      }
    }
  },
  {
    name: 'google_calendar',
    display_name: 'Google Calendar',
    description: 'Schedule management and appointment booking',
    category: 'Productivity',
    auth_type: 'oauth2',
    is_active: true,
    oauth_authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    oauth_token_url: 'https://oauth2.googleapis.com/token',
    oauth_scope: 'https://www.googleapis.com/auth/calendar',
    config_schema: {
      type: 'object',
      properties: {
        calendar_id: { type: 'string' }
      }
    }
  },
  {
    name: 'docusign',
    display_name: 'DocuSign',
    description: 'Digital document signing and contracts',
    category: 'Documents',
    auth_type: 'oauth2',
    is_active: true,
    oauth_authorize_url: 'https://account.docusign.com/oauth/auth',
    oauth_token_url: 'https://account.docusign.com/oauth/token',
    oauth_scope: 'signature',
    config_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' }
      }
    }
  },
  {
    name: 'quickbooks',
    display_name: 'QuickBooks',
    description: 'Accounting and financial management',
    category: 'Finance',
    auth_type: 'oauth2',
    is_active: true,
    oauth_authorize_url: 'https://appcenter.intuit.com/connect/oauth2',
    oauth_token_url: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    oauth_scope: 'com.intuit.quickbooks.accounting',
    config_schema: {
      type: 'object',
      properties: {
        company_id: { type: 'string' }
      }
    }
  },
  {
    name: 'idevaffiliate',
    display_name: 'iDevAffiliate',
    description: 'Complete affiliate tracking and management system',
    category: 'Affiliate',
    auth_type: 'api_key',
    is_active: true,
    config_schema: {
      type: 'object',
      properties: {
        api_key: { type: 'string', required: true },
        base_url: { type: 'string', required: true },
        username: { type: 'string', required: true }
      }
    }
  },
  {
    name: 'post_affiliate_pro',
    display_name: 'Post Affiliate Pro',
    description: 'Advanced affiliate marketing software',
    category: 'Affiliate',
    auth_type: 'api_key',
    is_active: true,
    config_schema: {
      type: 'object',
      properties: {
        api_key: { type: 'string', required: true },
        merchant_url: { type: 'string', required: true },
        username: { type: 'string', required: true }
      }
    }
  }
]

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Try to check if we have any providers
    const { data: existingProviders, error: checkError } = await supabase
      .from('integration_providers')
      .select('id')
      .limit(1)

    if (checkError) {
      console.error('Database tables may not exist:', checkError)
      return NextResponse.json({ 
        error: 'Integration tables not configured. Please contact administrator to set up database schema.',
        details: checkError.message 
      }, { status: 500 })
    }

    // Insert default providers if they don't exist
    const { data: insertedProviders, error: insertError } = await supabase
      .from('integration_providers')
      .upsert(defaultIntegrationProviders, { 
        onConflict: 'name',
        ignoreDuplicates: true 
      })
      .select()

    if (insertError) {
      console.error('Error inserting providers:', insertError)
      return NextResponse.json({ 
        error: 'Failed to setup integration providers',
        details: insertError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Integration providers setup completed',
      providers_count: defaultIntegrationProviders.length
    })

  } catch (error) {
    console.error('Error setting up integrations:', error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}
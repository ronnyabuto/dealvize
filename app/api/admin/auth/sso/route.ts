/**
 * Enterprise SSO Integration API
 * SAML, OAuth, and OIDC provider management for enterprise authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const SSOProviderSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  type: z.enum(['saml', 'oauth', 'oidc']),
  domain: z.string().min(1, 'Domain is required'),
  configuration: z.object({
    // SAML configuration
    sso_url: z.string().url().optional(),
    entity_id: z.string().optional(),
    x509_certificate: z.string().optional(),
    
    // OAuth/OIDC configuration
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
    authorization_url: z.string().url().optional(),
    token_url: z.string().url().optional(),
    userinfo_url: z.string().url().optional(),
    discovery_url: z.string().url().optional(),
    
    // Common configuration
    scopes: z.array(z.string()).optional(),
    attribute_mapping: z.object({
      email: z.string().default('email'),
      first_name: z.string().default('first_name'),
      last_name: z.string().default('last_name'),
      display_name: z.string().default('name'),
      groups: z.string().optional()
    }).optional()
  }),
  is_active: z.boolean().default(true),
  auto_provision: z.boolean().default(false),
  default_role: z.enum(['admin', 'member', 'viewer']).default('member'),
  allowed_domains: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
})

// GET - List SSO providers with configuration and statistics
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const type = searchParams.get('type')
    const domain = searchParams.get('domain')
    const active = searchParams.get('active')

    try {
      let query = serviceClient
        .from('sso_providers')
        .select(`
          *,
          usage_stats:sso_login_attempts(
            id,
            success,
            created_at
          )
        `)

      // Apply filters
      if (type) query = query.eq('type', type)
      if (domain) query = query.eq('domain', domain)
      if (active === 'true') query = query.eq('is_active', true)
      if (active === 'false') query = query.eq('is_active', false)

      const { data: providers, error } = await query
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calculate usage statistics
      const providersWithStats = (providers || []).map(provider => {
        const loginAttempts = provider.usage_stats || []
        const last30Days = loginAttempts.filter(attempt => 
          new Date(attempt.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        )
        const successfulLogins = last30Days.filter(attempt => attempt.success)

        return {
          ...provider,
          // Don't expose sensitive configuration
          configuration: {
            ...provider.configuration,
            client_secret: provider.configuration?.client_secret ? '***hidden***' : undefined,
            x509_certificate: provider.configuration?.x509_certificate ? '***hidden***' : undefined
          },
          statistics: {
            total_attempts: loginAttempts.length,
            successful_logins: successfulLogins.length,
            success_rate: last30Days.length > 0 ? 
              Math.round((successfulLogins.length / last30Days.length) * 100) : 0,
            attempts_30d: last30Days.length,
            last_used: loginAttempts[0]?.created_at || null
          }
        }
      })

      return NextResponse.json({
        providers: providersWithStats,
        summary: {
          total_providers: providers?.length || 0,
          active_providers: providers?.filter(p => p.is_active).length || 0,
          types: {
            saml: providers?.filter(p => p.type === 'saml').length || 0,
            oauth: providers?.filter(p => p.type === 'oauth').length || 0,
            oidc: providers?.filter(p => p.type === 'oidc').length || 0
          }
        }
      })

    } catch (error) {
      console.error('Error fetching SSO providers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch SSO providers' },
        { status: 500 }
      )
    }
  }, {
    resource: 'sso',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create SSO provider or initiate SSO login
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'create'

    try {
      const body = await request.json()

      if (action === 'create') {
        const validatedData = SSOProviderSchema.parse(body)

        // Check for duplicate domain
        const { data: existing } = await serviceClient
          .from('sso_providers')
          .select('id')
          .eq('domain', validatedData.domain)
          .single()

        if (existing) {
          return NextResponse.json({
            error: 'SSO provider for this domain already exists'
          }, { status: 400 })
        }

        // Generate provider-specific configuration
        const enhancedConfig = await enhanceProviderConfiguration(
          validatedData.type,
          validatedData.configuration
        )

        const providerData = {
          ...validatedData,
          configuration: enhancedConfig,
          created_by: context.userId
        }

        const { data: provider, error } = await serviceClient
          .from('sso_providers')
          .insert(providerData)
          .select()
          .single()

        if (error) throw error

        // Log the activity
        await serviceClient
          .from('tenant_activity_logs')
          .insert({
            user_id: context.userId,
            action: 'sso_provider.created',
            entity_type: 'sso_provider',
            entity_id: provider.id,
            metadata: {
              provider_name: validatedData.name,
              type: validatedData.type,
              domain: validatedData.domain
            }
          })

        return NextResponse.json({
          message: 'SSO provider created successfully',
          provider: {
            ...provider,
            configuration: {
              ...provider.configuration,
              client_secret: provider.configuration?.client_secret ? '***hidden***' : undefined,
              x509_certificate: provider.configuration?.x509_certificate ? '***hidden***' : undefined
            }
          }
        }, { status: 201 })
      }

      if (action === 'test') {
        const { provider_id } = body

        if (!provider_id) {
          return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 })
        }

        const testResult = await testSSOProvider(serviceClient, provider_id)
        return NextResponse.json(testResult)
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }, { status: 400 })
      }

      console.error('Error in SSO operation:', error)
      return NextResponse.json(
        { error: 'Failed to process SSO operation' },
        { status: 500 }
      )
    }
  }, {
    resource: 'sso',
    action: 'manage',
    requireTenant: false
  })
}

// PUT - Update SSO provider
export async function PUT(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 })
    }

    try {
      const body = await request.json()
      const validatedData = SSOProviderSchema.partial().parse(body)

      // Get current provider data
      const { data: currentProvider, error: fetchError } = await serviceClient
        .from('sso_providers')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Merge configuration updates
      let updatedConfig = currentProvider.configuration
      if (validatedData.configuration) {
        updatedConfig = {
          ...currentProvider.configuration,
          ...validatedData.configuration
        }
      }

      const updateData = {
        ...validatedData,
        configuration: updatedConfig,
        updated_at: new Date().toISOString()
      }

      const { data: provider, error } = await serviceClient
        .from('sso_providers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          user_id: context.userId,
          action: 'sso_provider.updated',
          entity_type: 'sso_provider',
          entity_id: id,
          metadata: {
            provider_name: provider.name,
            changes: Object.keys(validatedData)
          }
        })

      return NextResponse.json({
        message: 'SSO provider updated successfully',
        provider: {
          ...provider,
          configuration: {
            ...provider.configuration,
            client_secret: provider.configuration?.client_secret ? '***hidden***' : undefined,
            x509_certificate: provider.configuration?.x509_certificate ? '***hidden***' : undefined
          }
        }
      })

    } catch (error) {
      console.error('Error updating SSO provider:', error)
      return NextResponse.json(
        { error: 'Failed to update SSO provider' },
        { status: 500 }
      )
    }
  }, {
    resource: 'sso',
    action: 'manage',
    requireTenant: false
  })
}

// Helper functions
async function enhanceProviderConfiguration(type: string, config: any) {
  const enhancedConfig = { ...config }

  switch (type) {
    case 'saml':
      // Generate SAML metadata URL
      enhancedConfig.metadata_url = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/metadata`
      enhancedConfig.acs_url = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/acs`
      break

    case 'oauth':
    case 'oidc':
      // Generate OAuth redirect URI
      enhancedConfig.redirect_uri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/${type}`
      break
  }

  return enhancedConfig
}

async function testSSOProvider(serviceClient: any, providerId: string) {
  try {
    const { data: provider, error } = await serviceClient
      .from('sso_providers')
      .select('*')
      .eq('id', providerId)
      .single()

    if (error) throw error

    const testResults = {
      provider_id: providerId,
      provider_name: provider.name,
      type: provider.type,
      tests: []
    }

    // Test based on provider type
    switch (provider.type) {
      case 'saml':
        testResults.tests = await testSAMLProvider(provider)
        break
      case 'oauth':
        testResults.tests = await testOAuthProvider(provider)
        break
      case 'oidc':
        testResults.tests = await testOIDCProvider(provider)
        break
    }

    const allTestsPassed = testResults.tests.every(test => test.passed)
    
    // Log test result
    await serviceClient
      .from('sso_provider_tests')
      .insert({
        provider_id: providerId,
        test_results: testResults,
        success: allTestsPassed,
        created_at: new Date().toISOString()
      })

    return {
      success: allTestsPassed,
      message: allTestsPassed ? 'All tests passed' : 'Some tests failed',
      results: testResults
    }

  } catch (error) {
    return {
      success: false,
      message: 'Test failed with error',
      error: error.message
    }
  }
}

async function testSAMLProvider(provider: any) {
  const tests = []
  const config = provider.configuration

  // Test SSO URL reachability
  if (config.sso_url) {
    try {
      const response = await fetch(config.sso_url, { method: 'GET', timeout: 10000 })
      tests.push({
        name: 'SSO URL Reachability',
        passed: response.ok,
        details: `HTTP ${response.status}`
      })
    } catch (error) {
      tests.push({
        name: 'SSO URL Reachability',
        passed: false,
        details: error.message
      })
    }
  }

  // Test certificate validity
  if (config.x509_certificate) {
    try {
      // Basic certificate format validation
      const certValid = config.x509_certificate.includes('BEGIN CERTIFICATE') &&
                       config.x509_certificate.includes('END CERTIFICATE')
      tests.push({
        name: 'Certificate Format',
        passed: certValid,
        details: certValid ? 'Valid PEM format' : 'Invalid certificate format'
      })
    } catch (error) {
      tests.push({
        name: 'Certificate Format',
        passed: false,
        details: error.message
      })
    }
  }

  // Test entity ID format
  tests.push({
    name: 'Entity ID Configuration',
    passed: !!config.entity_id,
    details: config.entity_id ? 'Entity ID configured' : 'Entity ID missing'
  })

  return tests
}

async function testOAuthProvider(provider: any) {
  const tests = []
  const config = provider.configuration

  // Test authorization URL
  if (config.authorization_url) {
    try {
      const url = new URL(config.authorization_url)
      tests.push({
        name: 'Authorization URL Format',
        passed: true,
        details: `Valid URL: ${url.hostname}`
      })
    } catch (error) {
      tests.push({
        name: 'Authorization URL Format',
        passed: false,
        details: 'Invalid URL format'
      })
    }
  }

  // Test token endpoint
  if (config.token_url) {
    try {
      const response = await fetch(config.token_url, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
        timeout: 10000
      })
      tests.push({
        name: 'Token Endpoint Reachability',
        passed: response.status !== 404,
        details: `HTTP ${response.status}`
      })
    } catch (error) {
      tests.push({
        name: 'Token Endpoint Reachability',
        passed: false,
        details: error.message
      })
    }
  }

  // Test client credentials
  tests.push({
    name: 'Client Credentials',
    passed: !!(config.client_id && config.client_secret),
    details: config.client_id && config.client_secret ? 'Credentials configured' : 'Missing client credentials'
  })

  return tests
}

async function testOIDCProvider(provider: any) {
  const tests = []
  const config = provider.configuration

  // Test discovery endpoint
  if (config.discovery_url) {
    try {
      const response = await fetch(config.discovery_url, { timeout: 10000 })
      const data = await response.json()
      
      tests.push({
        name: 'Discovery Endpoint',
        passed: response.ok && data.issuer,
        details: response.ok ? `Issuer: ${data.issuer}` : `HTTP ${response.status}`
      })

      // Validate required OIDC endpoints
      const requiredEndpoints = ['authorization_endpoint', 'token_endpoint', 'userinfo_endpoint']
      const missingEndpoints = requiredEndpoints.filter(endpoint => !data[endpoint])
      
      tests.push({
        name: 'Required OIDC Endpoints',
        passed: missingEndpoints.length === 0,
        details: missingEndpoints.length === 0 ? 'All endpoints present' : `Missing: ${missingEndpoints.join(', ')}`
      })

    } catch (error) {
      tests.push({
        name: 'Discovery Endpoint',
        passed: false,
        details: error.message
      })
    }
  }

  // Test client credentials
  tests.push({
    name: 'Client Credentials',
    passed: !!(config.client_id && config.client_secret),
    details: config.client_id && config.client_secret ? 'Credentials configured' : 'Missing client credentials'
  })

  return tests
}
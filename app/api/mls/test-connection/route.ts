/**
 * MLS Test Connection API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { MLSClient } from '@/lib/mls/client'
import { mlsErrorHandler } from '@/lib/mls/error-handler'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider, clientId, clientSecret, apiUrl } = await request.json()

    if (!provider || !clientId || !clientSecret || !apiUrl) {
      return NextResponse.json(
        { error: 'Missing required connection parameters' },
        { status: 400 }
      )
    }

    // Create temporary MLS client for testing
    const testClient = new MLSClient({
      provider: provider as any,
      environment: 'production',
      credentials: {
        clientId,
        clientSecret,
        apiUrl
      },
      rateLimiting: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      caching: {
        propertyCacheTTL: 300,
        searchCacheTTL: 180,
        photosCacheTTL: 1800
      }
    })

    // Test connection with error handling
    const testResult = await mlsErrorHandler.withRetry(
      async () => {
        // Test authentication
        const authResult = await testClient.authenticate()
        if (!authResult.success) {
          throw new Error('Authentication failed')
        }

        // Test basic API call - search with minimal criteria
        const searchResult = await testClient.searchProperties({
          limit: 1,
          standardStatus: ['Active' as any]
        })

        return {
          authenticated: true,
          apiAccessible: true,
          sampleDataCount: searchResult.totalCount
        }
      },
      { name: 'test_connection', endpoint: apiUrl }
    )

    return NextResponse.json({
      success: true,
      message: 'Connection test successful',
      details: testResult
    })

  } catch (error) {
    console.error('MLS connection test error:', error)
    
    let errorMessage = 'Connection test failed'
    let errorDetails = null

    if (error instanceof Error) {
      errorMessage = error.message
    }

    // Check for specific error types
    if (error.message?.includes('authentication')) {
      errorDetails = 'Invalid credentials or authentication failed'
    } else if (error.message?.includes('network')) {
      errorDetails = 'Unable to reach MLS API endpoint'
    } else if (error.message?.includes('timeout')) {
      errorDetails = 'Connection timed out'
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails
    })
  }
}
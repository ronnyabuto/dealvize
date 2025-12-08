/**
 * MLS Sync Statistics API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { MLSClient } from '@/lib/mls/client'
import { MLSSyncService } from '@/lib/mls/sync-service'
import { createClient } from '@/lib/supabase/server'

let mlsClient: MLSClient
let syncService: MLSSyncService

function initializeMLSServices() {
  if (!mlsClient) {
    mlsClient = new MLSClient({
      provider: 'CMLS' as any,
      environment: 'production',
      credentials: {
        clientId: process.env.MLS_CLIENT_ID || 'demo',
        clientSecret: process.env.MLS_CLIENT_SECRET || 'demo',
        apiUrl: process.env.MLS_API_URL || 'https://api.columbusrealtors.com'
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

    syncService = new MLSSyncService(mlsClient)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    initializeMLSServices()

    const stats = syncService.getCacheStats()

    return NextResponse.json(stats)

  } catch (error) {
    console.error('MLS sync stats API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get sync statistics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
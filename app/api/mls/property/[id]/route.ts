/**
 * MLS Property Details API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { RapidAPIRealEstateClient } from '@/lib/mls/rapidapi-client'
import { createClient } from '@/lib/supabase/server'

let rapidAPIClient: RapidAPIRealEstateClient

function initializeRapidAPIClient() {
  if (!rapidAPIClient) {
    const apiKey = process.env.RAPIDAPI_KEY || process.env.MLS_CLIENT_ID || 'demo-key'
    rapidAPIClient = new RapidAPIRealEstateClient(apiKey)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    initializeRapidAPIClient()

    const { id } = params
    const { searchParams } = new URL(request.url)
    const includeAnalysis = searchParams.get('includeAnalysis') === 'true'
    const includeHistory = searchParams.get('includeHistory') === 'true'

    // Get property data from RapidAPI
    const property = await rapidAPIClient.getPropertyDetails(id)

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const result: any = { property }

    // Note: Market analysis and history features would require additional 
    // RapidAPI endpoints or third-party services for full implementation
    if (includeAnalysis) {
      result.marketAnalysisError = 'Market analysis requires additional API subscriptions'
    }

    if (includeHistory) {
      result.historyError = 'Property history requires additional API subscriptions'
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('RapidAPI property API error:', error)
    return NextResponse.json(
      { error: 'Property fetch failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
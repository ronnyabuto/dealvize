/**
 * MLS Property Search API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { RapidAPIRealEstateClient } from '@/lib/mls/rapidapi-client'
import { MLSSearchCriteria, PropertyType, StandardStatus } from '@/lib/mls/types'
import { createClient } from '@/lib/supabase/server'

let rapidAPIClient: RapidAPIRealEstateClient

// Initialize RapidAPI client
function initializeRapidAPIClient() {
  if (!rapidAPIClient) {
    const apiKey = process.env.RAPIDAPI_KEY || process.env.MLS_CLIENT_ID || 'demo-key'
    rapidAPIClient = new RapidAPIRealEstateClient(apiKey)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    initializeRapidAPIClient()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const city = searchParams.get('city')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const propertyType = searchParams.get('propertyType') as PropertyType
    const minBedrooms = searchParams.get('minBedrooms')
    const maxBedrooms = searchParams.get('maxBedrooms')
    const minBathrooms = searchParams.get('minBathrooms')
    const maxBathrooms = searchParams.get('maxBathrooms')
    const status = searchParams.get('status') as StandardStatus
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build search criteria
    const searchCriteria: MLSSearchCriteria = {
      limit,
      offset,
      sortBy: 'ModificationTimestamp' as any,
      sortOrder: 'desc'
    }

    // Add location filters
    if (city) {
      searchCriteria.city = [city]
    } else if (query) {
      // For natural language queries, try to extract city
      const cityMatch = query.match(/in\s+([^,]+)/i)
      if (cityMatch) {
        searchCriteria.city = [cityMatch[1].trim()]
      } else {
        // Default to Columbus for this implementation
        searchCriteria.city = ['Columbus']
      }
    } else {
      // Default to Columbus, OH for this implementation
      searchCriteria.city = ['Columbus']
    }

    // Add price filters
    if (minPrice) {
      searchCriteria.minListPrice = parseInt(minPrice)
    }
    if (maxPrice) {
      searchCriteria.maxListPrice = parseInt(maxPrice)
    }

    // Add property filters
    if (propertyType) {
      searchCriteria.propertyType = [propertyType]
    }
    if (minBedrooms) {
      searchCriteria.minBedrooms = parseInt(minBedrooms)
    }
    if (maxBedrooms) {
      searchCriteria.maxBedrooms = parseInt(maxBedrooms)
    }
    if (minBathrooms) {
      searchCriteria.minBathrooms = parseInt(minBathrooms)
    }
    if (maxBathrooms) {
      searchCriteria.maxBathrooms = parseInt(maxBathrooms)
    }

    // Add status filter
    if (status) {
      searchCriteria.standardStatus = [status]
    }

    const result = await rapidAPIClient.searchProperties(searchCriteria)

    return NextResponse.json(result)

  } catch (error) {
    console.error('RapidAPI search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    initializeMLSServices()

    const body = await request.json()
    const { criteria, useCache = true } = body

    if (!criteria) {
      return NextResponse.json({ error: 'Search criteria required' }, { status: 400 })
    }

    const cacheKey = `post_search:${JSON.stringify(criteria)}`
    
    if (useCache) {
      const result = await syncService.getCachedData(
        cacheKey,
        () => mlsClient.searchProperties(criteria),
        300000 // 5 minutes cache
      )
      return NextResponse.json(result)
    } else {
      // Force fresh search
      const result = await mlsClient.searchProperties(criteria)
      return NextResponse.json(result)
    }

  } catch (error) {
    console.error('MLS search POST API error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
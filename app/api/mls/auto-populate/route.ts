/**
 * MLS Auto-Populate API Endpoint
 * For deal creation forms to auto-populate property details
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    initializeRapidAPIClient()

    const body = await request.json()
    const { address, mlsNumber } = body

    if (!address && !mlsNumber) {
      return NextResponse.json(
        { error: 'Either address or MLS number is required' },
        { status: 400 }
      )
    }

    let result

    if (mlsNumber) {
      // Search by MLS/property ID
      const property = await rapidAPIClient.getPropertyDetails(mlsNumber)
      result = property ? {
        success: true,
        confidence: 1.0,
        property: formatPropertyForDealForm(property),
        source: 'property_id'
      } : { success: false, error: 'Property not found' }
    } else {
      // Search by address
      const property = await rapidAPIClient.getPropertyByAddress(address)
      result = property ? {
        success: true,
        confidence: 0.9, // Slightly lower confidence for address search
        property: formatPropertyForDealForm(property),
        source: 'address'
      } : { success: false, error: 'Property not found' }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('RapidAPI auto-populate error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Auto-populate failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * Format MLS property data for deal creation form
 */
function formatPropertyForDealForm(property: any) {
  const address = property.address
  const formattedAddress = [
    address.streetNumber,
    address.streetName,
    address.streetSuffix,
    address.unitNumber
  ].filter(Boolean).join(' ')

  return {
    // Property Details
    address: formattedAddress,
    city: address.city,
    state: address.stateOrProvince,
    zipCode: address.postalCode,
    county: address.county,
    
    // Property Information
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    squareFeet: property.squareFeet,
    lotSize: property.lotSizeSquareFeet,
    lotSizeAcres: property.lotSizeAcres,
    yearBuilt: property.yearBuilt,
    
    // Pricing Information
    listPrice: property.listPrice,
    originalListPrice: property.originalListPrice,
    pricePerSqFt: property.squareFeet ? Math.round(property.listPrice / property.squareFeet) : null,
    
    // MLS Information
    mlsNumber: property.listingId,
    mlsStatus: property.standardStatus,
    onMarketDate: property.onMarketDate,
    
    // Agent Information
    listingAgent: property.listingAgent ? {
      name: property.listingAgent.name,
      email: property.listingAgent.email,
      phone: property.listingAgent.phone,
      mlsId: property.listingAgent.mlsId
    } : null,
    
    listingOffice: property.listingOffice ? {
      name: property.listingOffice.name,
      phone: property.listingOffice.phone,
      mlsId: property.listingOffice.mlsId
    } : null,
    
    // Property Features
    appliances: property.appliances,
    heating: property.heating,
    cooling: property.cooling,
    parking: property.parking,
    
    // HOA Information
    hoaFee: property.hoa?.fee,
    hoaFrequency: property.hoa?.feeFrequency,
    hoaAmenities: property.hoa?.amenities,
    
    // Tax Information
    taxAmount: property.taxes?.amount,
    taxYear: property.taxes?.year,
    
    schools: property.schools,
    
    // Description
    description: property.publicRemarks,
    
    // Photos
    photos: property.photos?.slice(0, 5), // Limit to first 5 photos
    
    // Coordinates for mapping
    coordinates: property.coordinates,
    
    // Timestamps
    lastUpdated: property.modificationTimestamp
  }
}
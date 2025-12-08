/**
 * RapidAPI Real Estate Client
 * Free tier integration for immediate functionality
 */

import { 
  MLSProperty, 
  MLSSearchCriteria, 
  MLSSearchResult, 
  PropertyType,
  StandardStatus 
} from './types'
import { mlsErrorHandler } from './error-handler'

interface RapidAPIConfig {
  apiKey: string
  baseUrl: string
}

interface RapidAPIProperty {
  property_id: string
  listing_id: string
  plan_id?: string
  status: string
  photo?: {
    href: string
  }
  list_price: number
  list_date: string
  last_update_date: string
  address: {
    line: string
    city: string
    state_code: string
    state: string
    postal_code: string
    country?: string
    coordinate?: {
      lat: number
      lon: number
    }
  }
  description?: {
    beds?: number
    baths?: number
    baths_full?: number
    baths_half?: number
    sqft?: number
    lot_sqft?: number
    year_built?: number
    text?: string
    type?: string
  }
  primary_photo?: {
    href: string
  }
  photos?: Array<{
    href: string
    tags?: Array<{
      label: string
      probability: number
    }>
  }>
  agents?: Array<{
    primary: boolean
    advertiser_id: string
    id: string
    name: string
    nrds_id?: string
    phone?: Array<{
      number: string
      type: string
      primary: boolean
    }>
    email?: string
  }>
  office?: {
    id: string
    name: string
    advertiser_id: string
    phones?: Array<{
      number: string
      type: string
    }>
  }
  branding?: Array<{
    name: string
    photo?: string
    type: string
  }>
}

interface RapidAPIResponse {
  meta: {
    build: string
    schema: string
    tracking_params: {
      ldpVariant: string
      pageType: string
      requestId: string
      listingActivity: string
      channel: string
      trackingID: string
    }
    returned_rows: number
    matching_rows: number
  }
  properties: RapidAPIProperty[]
}

export class RapidAPIRealEstateClient {
  private config: RapidAPIConfig
  private baseHeaders: Record<string, string>

  constructor(apiKey: string) {
    this.config = {
      apiKey,
      baseUrl: 'https://us-real-estate.p.rapidapi.com'
    }
    
    this.baseHeaders = {
      'X-RapidAPI-Key': this.config.apiKey,
      'X-RapidAPI-Host': 'us-real-estate.p.rapidapi.com',
      'Content-Type': 'application/json'
    }
  }

  /**
   * Search properties using RapidAPI US Real Estate
   */
  async searchProperties(criteria: MLSSearchCriteria): Promise<MLSSearchResult> {
    return mlsErrorHandler.withRetry(
      async () => {
        const searchParams = this.buildSearchParams(criteria)
        
        const response = await fetch(
          `${this.config.baseUrl}/properties/v3/list?${searchParams}`,
          {
            method: 'GET',
            headers: this.baseHeaders
          }
        )

        if (!response.ok) {
          throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`)
        }

        const data: RapidAPIResponse = await response.json()
        
        return this.transformSearchResponse(data, criteria)
      },
      { name: 'rapidapi_property_search', endpoint: '/properties/v3/list' }
    )
  }

  /**
   * Get property details by address
   */
  async getPropertyByAddress(address: string): Promise<MLSProperty | null> {
    return mlsErrorHandler.withRetry(
      async () => {
        // Parse address for city and state
        const addressParts = this.parseAddress(address)
        
        const searchParams = new URLSearchParams({
          city: addressParts.city,
          state_code: addressParts.state,
          limit: '1',
          offset: '0',
          sort: 'relevance'
        })

        // Add street address if available
        if (addressParts.street) {
          searchParams.append('address', addressParts.street)
        }

        const response = await fetch(
          `${this.config.baseUrl}/properties/v3/list?${searchParams}`,
          {
            method: 'GET',
            headers: this.baseHeaders
          }
        )

        if (!response.ok) {
          throw new Error(`RapidAPI request failed: ${response.status}`)
        }

        const data: RapidAPIResponse = await response.json()
        
        if (data.properties.length === 0) {
          return null
        }

        return this.transformProperty(data.properties[0])
      },
      { name: 'rapidapi_property_details', endpoint: '/properties/v3/list' }
    )
  }

  /**
   * Get property details by property ID
   */
  async getPropertyDetails(propertyId: string): Promise<MLSProperty | null> {
    return mlsErrorHandler.withRetry(
      async () => {
        const response = await fetch(
          `${this.config.baseUrl}/properties/v2/detail?property_id=${propertyId}`,
          {
            method: 'GET',
            headers: this.baseHeaders
          }
        )

        if (!response.ok) {
          throw new Error(`RapidAPI request failed: ${response.status}`)
        }

        const data = await response.json()
        
        if (!data.properties || data.properties.length === 0) {
          return null
        }

        return this.transformProperty(data.properties[0])
      },
      { name: 'rapidapi_property_detail', endpoint: '/properties/v2/detail' }
    )
  }

  /**
   * Build search parameters for RapidAPI
   */
  private buildSearchParams(criteria: MLSSearchCriteria): string {
    const params = new URLSearchParams()

    // Location filters
    if (criteria.city && criteria.city.length > 0) {
      params.append('city', criteria.city[0])
    }

    if (criteria.postalCode && criteria.postalCode.length > 0) {
      params.append('postal_code', criteria.postalCode[0])
    }

    // Price filters
    if (criteria.minListPrice) {
      params.append('price_min', criteria.minListPrice.toString())
    }
    if (criteria.maxListPrice) {
      params.append('price_max', criteria.maxListPrice.toString())
    }

    // Property filters
    if (criteria.minBedrooms) {
      params.append('beds_min', criteria.minBedrooms.toString())
    }
    if (criteria.maxBedrooms) {
      params.append('beds_max', criteria.maxBedrooms.toString())
    }
    if (criteria.minBathrooms) {
      params.append('baths_min', criteria.minBathrooms.toString())
    }
    if (criteria.maxBathrooms) {
      params.append('baths_max', criteria.maxBathrooms.toString())
    }

    // Square footage
    if (criteria.minSquareFeet) {
      params.append('sqft_min', criteria.minSquareFeet.toString())
    }
    if (criteria.maxSquareFeet) {
      params.append('sqft_max', criteria.maxSquareFeet.toString())
    }

    // Property type
    if (criteria.propertyType && criteria.propertyType.length > 0) {
      const rapidApiType = this.mapPropertyType(criteria.propertyType[0])
      if (rapidApiType) {
        params.append('type', rapidApiType)
      }
    }

    // Status filter - RapidAPI uses different status values
    if (criteria.standardStatus && criteria.standardStatus.length > 0) {
      const status = this.mapStatus(criteria.standardStatus[0])
      if (status) {
        params.append('status', status)
      }
    } else {
      params.append('status', 'for_sale') // Default to for sale
    }

    // Pagination
    params.append('limit', (criteria.limit || 20).toString())
    params.append('offset', (criteria.offset || 0).toString())

    // Sort
    params.append('sort', 'relevance')

    return params.toString()
  }

  /**
   * Transform RapidAPI response to MLS format
   */
  private transformSearchResponse(data: RapidAPIResponse, criteria: MLSSearchCriteria): MLSSearchResult {
    const properties = data.properties.map(prop => this.transformProperty(prop))

    return {
      properties,
      totalCount: data.meta.matching_rows || data.properties.length,
      hasMore: data.meta.returned_rows === (criteria.limit || 20),
      nextOffset: (criteria.offset || 0) + data.meta.returned_rows
    }
  }

  /**
   * Transform RapidAPI property to MLS format
   */
  private transformProperty(prop: RapidAPIProperty): MLSProperty {
    return {
      listingId: prop.property_id || prop.listing_id,
      listingKey: prop.property_id,
      propertyType: this.reverseMapPropertyType(prop.description?.type) || PropertyType.RESIDENTIAL,
      
      address: {
        streetNumber: this.extractStreetNumber(prop.address.line),
        streetName: this.extractStreetName(prop.address.line),
        streetSuffix: this.extractStreetSuffix(prop.address.line),
        city: prop.address.city,
        stateOrProvince: prop.address.state_code,
        postalCode: prop.address.postal_code,
        country: prop.address.country || 'US'
      },

      coordinates: prop.address.coordinate ? {
        latitude: prop.address.coordinate.lat,
        longitude: prop.address.coordinate.lon
      } : undefined,

      bedrooms: prop.description?.beds,
      bathrooms: prop.description?.baths,
      bathroomsFull: prop.description?.baths_full,
      bathroomsHalf: prop.description?.baths_half,
      squareFeet: prop.description?.sqft,
      lotSizeSquareFeet: prop.description?.lot_sqft,
      yearBuilt: prop.description?.year_built,

      listPrice: prop.list_price,
      standardStatus: this.reverseMapStatus(prop.status),

      publicRemarks: prop.description?.text,

      photos: prop.photos?.map((photo, index) => ({
        url: photo.href,
        order: index + 1,
        caption: photo.tags?.[0]?.label
      })),

      listingAgent: prop.agents?.find(agent => agent.primary) ? {
        id: prop.agents.find(agent => agent.primary)!.id,
        name: prop.agents.find(agent => agent.primary)!.name,
        email: prop.agents.find(agent => agent.primary)!.email,
        phone: prop.agents.find(agent => agent.primary)!.phone?.[0]?.number,
        mlsId: prop.agents.find(agent => agent.primary)!.nrds_id
      } : undefined,

      listingOffice: prop.office ? {
        id: prop.office.id,
        name: prop.office.name,
        phone: prop.office.phones?.[0]?.number
      } : undefined,

      modificationTimestamp: new Date(prop.last_update_date || prop.list_date),
      onMarketDate: new Date(prop.list_date)
    }
  }

  /**
   * Parse address string
   */
  private parseAddress(address: string): { street?: string; city: string; state: string } {
    // Simple address parsing - could be enhanced
    const parts = address.split(',').map(p => p.trim())
    
    if (parts.length >= 3) {
      return {
        street: parts[0],
        city: parts[1],
        state: parts[2].split(' ')[0]
      }
    } else if (parts.length === 2) {
      return {
        city: parts[0],
        state: parts[1].split(' ')[0]
      }
    }
    
    return {
      city: 'Columbus',
      state: 'OH'
    }
  }

  /**
   * Extract street number from address line
   */
  private extractStreetNumber(line: string): string {
    const match = line.match(/^(\d+)/)
    return match ? match[1] : ''
  }

  /**
   * Extract street name from address line
   */
  private extractStreetName(line: string): string {
    const parts = line.split(' ')
    if (parts.length > 1) {
      return parts.slice(1, -1).join(' ')
    }
    return line
  }

  /**
   * Extract street suffix from address line
   */
  private extractStreetSuffix(line: string): string {
    const suffixes = ['St', 'Ave', 'Rd', 'Dr', 'Ln', 'Ct', 'Pl', 'Blvd', 'Way']
    const parts = line.split(' ')
    const lastPart = parts[parts.length - 1]
    
    if (suffixes.includes(lastPart)) {
      return lastPart
    }
    return ''
  }

  /**
   * Map MLS property type to RapidAPI type
   */
  private mapPropertyType(type: PropertyType): string {
    switch (type) {
      case PropertyType.RESIDENTIAL:
        return 'single_family'
      case PropertyType.CONDO:
        return 'condo'
      case PropertyType.TOWNHOUSE:
        return 'townhomes'
      case PropertyType.LAND:
        return 'land'
      case PropertyType.COMMERCIAL:
        return 'commercial'
      default:
        return 'single_family'
    }
  }

  /**
   * Reverse map RapidAPI type to MLS property type
   */
  private reverseMapPropertyType(type?: string): PropertyType {
    if (!type) return PropertyType.RESIDENTIAL
    
    switch (type.toLowerCase()) {
      case 'single_family':
      case 'single family':
        return PropertyType.RESIDENTIAL
      case 'condo':
      case 'condominium':
        return PropertyType.CONDO
      case 'townhomes':
      case 'townhouse':
        return PropertyType.TOWNHOUSE
      case 'land':
        return PropertyType.LAND
      case 'commercial':
        return PropertyType.COMMERCIAL
      default:
        return PropertyType.RESIDENTIAL
    }
  }

  /**
   * Map MLS status to RapidAPI status
   */
  private mapStatus(status: StandardStatus): string {
    switch (status) {
      case StandardStatus.ACTIVE:
        return 'for_sale'
      case StandardStatus.CLOSED:
        return 'sold'
      case StandardStatus.PENDING:
        return 'for_sale'
      default:
        return 'for_sale'
    }
  }

  /**
   * Reverse map RapidAPI status to MLS status
   */
  private reverseMapStatus(status: string): StandardStatus {
    switch (status.toLowerCase()) {
      case 'for_sale':
      case 'active':
        return StandardStatus.ACTIVE
      case 'sold':
        return StandardStatus.CLOSED
      case 'pending':
        return StandardStatus.PENDING
      case 'off_market':
        return StandardStatus.WITHDRAWN
      default:
        return StandardStatus.ACTIVE
    }
  }
}
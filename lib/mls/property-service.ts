import { MLSClient } from '@/lib/mls/client'
import { 
  MLSProperty, 
  MLSSearchCriteria, 
  MLSSearchResult,
  PropertyType,
  StandardStatus
} from '@/lib/mls/types'
import { AddressValidator } from '@/lib/mls/validators'

/**
 * Property Service
 * High-level service for property search and auto-population features
 */
export class PropertyService {
  private mlsClient: MLSClient

  constructor(mlsClient: MLSClient) {
    this.mlsClient = mlsClient
  }

  /**
   * Search properties with intelligent defaults and suggestions
   */
  async searchProperties(query: string | MLSSearchCriteria): Promise<{
    success: boolean
    results?: MLSSearchResult
    suggestions?: PropertySearchSuggestion[]
    error?: string
  }> {
    try {
      let searchCriteria: MLSSearchCriteria

      if (typeof query === 'string') {
        // Parse natural language query
        searchCriteria = await this.parseNaturalLanguageQuery(query)
      } else {
        searchCriteria = query
      }

      // Add Columbus-specific defaults
      searchCriteria = this.addColumbusDefaults(searchCriteria)

      const result = await this.mlsClient.searchProperties(searchCriteria)
      
      if (!result.success) {
        return {
          success: false,
          error: result.error?.message || 'Search failed'
        }
      }

      // Generate search suggestions for refinement
      const suggestions = await this.generateSearchSuggestions(searchCriteria, result.data!)

      return {
        success: true,
        results: result.data!,
        suggestions
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }
    }
  }

  /**
   * Auto-populate property details from address
   * This is the key feature for deal form integration
   */
  async autoPopulateFromAddress(address: string): Promise<{
    success: boolean
    property?: PropertyAutoPopulateData
    suggestions?: MLSProperty[]
    confidence?: number
    error?: string
  }> {
    try {
      // Validate and format the address
      const addressValidation = AddressValidator.validateColumbusAddress(address)
      if (!addressValidation.isValid) {
        return {
          success: false,
          error: `Invalid address: ${addressValidation.errors?.join(', ')}`
        }
      }

      const formattedAddress = addressValidation.formatted!

      // Search for exact address match
      const searchCriteria: MLSSearchCriteria = {
        city: ['Columbus'],
        limit: 10
      }

      // Try to extract address components for better searching
      if (addressValidation.components?.streetNumber && addressValidation.components?.streetName) {
        // Create a flexible address search
        const addressPatterns = [
          formattedAddress,
          `${addressValidation.components.streetNumber} ${addressValidation.components.streetName}`,
          address.trim()
        ]

        const searchResults: MLSProperty[] = []
        
        for (const pattern of addressPatterns) {
          const result = await this.mlsClient.searchProperties({
            ...searchCriteria,
            // Note: In real MLS integration, you'd search by address field
            // For now, we'll simulate this with a broader search
          })

          if (result.success && result.data?.properties) {
            // Filter results by address similarity
            const matchingProperties = result.data.properties.filter(property => 
              this.isAddressMatch(property.address, addressValidation.components!)
            )
            searchResults.push(...matchingProperties)
          }
        }

        // Remove duplicates and sort by relevance
        const uniqueProperties = this.removeDuplicateProperties(searchResults)
        const sortedProperties = this.sortPropertiesByAddressRelevance(uniqueProperties, formattedAddress)

        if (sortedProperties.length === 0) {
          return {
            success: false,
            error: 'No matching properties found in MLS'
          }
        }

        // Use the best match for auto-population
        const bestMatch = sortedProperties[0]
        const confidence = this.calculateAddressMatchConfidence(bestMatch.address, addressValidation.components!)

        // Transform MLS property to auto-populate format
        const autoPopulateData = this.transformToAutoPopulateData(bestMatch)

        return {
          success: true,
          property: autoPopulateData,
          suggestions: sortedProperties.slice(1, 5), // Additional suggestions
          confidence
        }
      }

      return {
        success: false,
        error: 'Unable to parse address for MLS search'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Auto-populate failed'
      }
    }
  }

  /**
   * Get property suggestions as user types (for autocomplete)
   */
  async getPropertySuggestions(partialAddress: string): Promise<{
    success: boolean
    suggestions?: PropertySuggestion[]
    error?: string
  }> {
    try {
      if (partialAddress.length < 3) {
        return { success: true, suggestions: [] }
      }

      // Search with broad criteria
      const result = await this.mlsClient.searchProperties({
        city: ['Columbus'],
        limit: 10,
        // In real implementation, this would search address fields
      })

      if (!result.success || !result.data?.properties) {
        return { success: true, suggestions: [] }
      }

      // Filter and format suggestions
      const suggestions = result.data.properties
        .filter(property => 
          this.addressMatchesPartial(property.address, partialAddress)
        )
        .slice(0, 5)
        .map(property => ({
          listingId: property.listingId,
          address: this.formatAddressForDisplay(property.address),
          price: property.listPrice,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          squareFeet: property.squareFeet,
          propertyType: property.propertyType,
          status: property.standardStatus
        }))

      return {
        success: true,
        suggestions
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get suggestions'
      }
    }
  }

  /**
   * Get recent comparable sales for pricing guidance
   */
  async getRecentComparables(address: string, options: {
    radius?: number
    maxResults?: number
    daysBack?: number
  } = {}): Promise<{
    success: boolean
    comparables?: PropertyComparable[]
    marketInsights?: MarketInsights
    error?: string
  }> {
    try {
      const { radius = 0.5, maxResults = 6, daysBack = 90 } = options

      const marketAnalysis = await this.mlsClient.getMarketAnalysis(address, {
        radius,
        maxComps: maxResults
      })

      if (!marketAnalysis.success) {
        return {
          success: false,
          error: marketAnalysis.error?.message || 'Failed to get comparables'
        }
      }

      const comparables = marketAnalysis.data!.comparables.map(comp => ({
        listingId: comp.listingId,
        address: this.formatAddressForDisplay(comp.address),
        price: comp.listPrice,
        pricePerSqft: comp.squareFeet ? Math.round(comp.listPrice / comp.squareFeet) : undefined,
        bedrooms: comp.bedrooms,
        bathrooms: comp.bathrooms,
        squareFeet: comp.squareFeet,
        yearBuilt: comp.yearBuilt,
        distance: comp.distance,
        daysOnMarket: this.calculateDaysOnMarket(comp.onMarketDate),
        status: comp.standardStatus,
        listingDate: comp.onMarketDate
      }))

      const marketInsights: MarketInsights = {
        averagePrice: marketAnalysis.data!.marketStatistics.averageListPrice,
        medianPrice: marketAnalysis.data!.marketStatistics.medianListPrice,
        averagePricePerSqft: marketAnalysis.data!.marketStatistics.averagePricePerSqft,
        averageDaysOnMarket: marketAnalysis.data!.marketStatistics.averageDaysOnMarket,
        activeListings: marketAnalysis.data!.marketStatistics.totalActiveListings,
        priceEstimate: marketAnalysis.data!.priceEstimate
      }

      return {
        success: true,
        comparables,
        marketInsights
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get comparables'
      }
    }
  }

  /**
   * Private helper methods
   */
  private async parseNaturalLanguageQuery(query: string): Promise<MLSSearchCriteria> {
    const criteria: MLSSearchCriteria = {
      city: ['Columbus'], // Default to Columbus
      limit: 50
    }

    const lowerQuery = query.toLowerCase()

    // Extract price range
    const priceMatches = query.match(/\$?([\d,]+)\s*[-to]\s*\$?([\d,]+)/i)
    if (priceMatches) {
      criteria.minListPrice = parseInt(priceMatches[1].replace(/,/g, ''))
      criteria.maxListPrice = parseInt(priceMatches[2].replace(/,/g, ''))
    } else {
      const singlePriceMatch = query.match(/under\s+\$?([\d,]+)/i) || query.match(/below\s+\$?([\d,]+)/i)
      if (singlePriceMatch) {
        criteria.maxListPrice = parseInt(singlePriceMatch[1].replace(/,/g, ''))
      }
      
      const minPriceMatch = query.match(/over\s+\$?([\d,]+)/i) || query.match(/above\s+\$?([\d,]+)/i)
      if (minPriceMatch) {
        criteria.minListPrice = parseInt(minPriceMatch[1].replace(/,/g, ''))
      }
    }

    // Extract bedrooms
    const bedroomMatches = query.match(/(\d+)\s*(?:bed|bedroom|br)/i)
    if (bedroomMatches) {
      criteria.minBedrooms = parseInt(bedroomMatches[1])
    }

    // Extract bathrooms
    const bathroomMatches = query.match(/(\d+(?:\.\d)?)\s*(?:bath|bathroom|ba)/i)
    if (bathroomMatches) {
      criteria.minBathrooms = parseFloat(bathroomMatches[1])
    }

    // Extract property types
    if (lowerQuery.includes('condo')) {
      criteria.propertyType = [PropertyType.CONDO]
    } else if (lowerQuery.includes('townhouse') || lowerQuery.includes('town house')) {
      criteria.propertyType = [PropertyType.TOWNHOUSE]
    } else if (lowerQuery.includes('land') || lowerQuery.includes('lot')) {
      criteria.propertyType = [PropertyType.LAND]
    }

    // Extract neighborhoods/areas
    const neighborhoods = this.extractColumbusNeighborhoods(query)
    if (neighborhoods.length > 0) {
      // In real implementation, you'd map neighborhoods to MLS regions
      criteria.city = neighborhoods
    }

    return criteria
  }

  private extractColumbusNeighborhoods(query: string): string[] {
    const columbusNeighborhoods = [
      'German Village', 'Short North', 'Victorian Village', 'Clintonville',
      'Grandview Heights', 'Bexley', 'Westerville', 'Gahanna', 'Upper Arlington',
      'Dublin', 'Powell', 'Delaware', 'Worthington', 'Hilliard', 'Grove City',
      'Pickerington', 'Reynoldsburg', 'Canal Winchester', 'Groveport'
    ]

    const lowerQuery = query.toLowerCase()
    return columbusNeighborhoods.filter(neighborhood =>
      lowerQuery.includes(neighborhood.toLowerCase())
    )
  }

  private addColumbusDefaults(criteria: MLSSearchCriteria): MLSSearchCriteria {
    return {
      // Default to Columbus if no city specified
      city: criteria.city || ['Columbus'],
      // Default to active listings only
      standardStatus: criteria.standardStatus || [StandardStatus.ACTIVE],
      // Default limit
      limit: criteria.limit || 50,
      ...criteria
    }
  }

  private async generateSearchSuggestions(
    criteria: MLSSearchCriteria, 
    results: MLSSearchResult
  ): Promise<PropertySearchSuggestion[]> {
    const suggestions: PropertySearchSuggestion[] = []

    // If no results, suggest broader criteria
    if (results.properties.length === 0) {
      if (criteria.minListPrice || criteria.maxListPrice) {
        suggestions.push({
          type: 'price_range',
          title: 'Expand Price Range',
          description: 'Try a broader price range to see more properties',
          modifiedCriteria: {
            ...criteria,
            minListPrice: criteria.minListPrice ? criteria.minListPrice * 0.8 : undefined,
            maxListPrice: criteria.maxListPrice ? criteria.maxListPrice * 1.2 : undefined
          }
        })
      }

      if (criteria.minBedrooms) {
        suggestions.push({
          type: 'bedrooms',
          title: 'Reduce Bedroom Requirement',
          description: `Try ${criteria.minBedrooms - 1}+ bedrooms`,
          modifiedCriteria: {
            ...criteria,
            minBedrooms: Math.max(1, criteria.minBedrooms - 1)
          }
        })
      }
    }

    // If too many results, suggest refinements
    if (results.properties.length > 100) {
      const avgPrice = results.properties.reduce((sum, p) => sum + p.listPrice, 0) / results.properties.length
      
      suggestions.push({
        type: 'price_range',
        title: 'Refine Price Range',
        description: `Average price is $${Math.round(avgPrice).toLocaleString()}`,
        modifiedCriteria: {
          ...criteria,
          minListPrice: Math.round(avgPrice * 0.8),
          maxListPrice: Math.round(avgPrice * 1.2)
        }
      })
    }

    return suggestions
  }

  private isAddressMatch(
    mlsAddress: MLSProperty['address'], 
    components: NonNullable<ReturnType<typeof AddressValidator.validateColumbusAddress>['components']>
  ): boolean {
    const mlsStreetNumber = mlsAddress.streetNumber || ''
    const mlsStreetName = (mlsAddress.streetName || '').toLowerCase()
    
    const searchStreetNumber = components.streetNumber || ''
    const searchStreetName = (components.streetName || '').toLowerCase()

    // Must match street number exactly
    if (mlsStreetNumber !== searchStreetNumber) {
      return false
    }

    // Street name must be similar (allow for abbreviations and variations)
    return this.isStreetNameMatch(mlsStreetName, searchStreetName)
  }

  private isStreetNameMatch(mlsStreetName: string, searchStreetName: string): boolean {
    if (mlsStreetName === searchStreetName) {
      return true
    }

    // Handle common abbreviations
    const normalizedMls = mlsStreetName.replace(/\b(north|south|east|west)\b/g, match => 
      match.charAt(0).toUpperCase() + '.'
    )
    const normalizedSearch = searchStreetName.replace(/\b(north|south|east|west)\b/g, match => 
      match.charAt(0).toUpperCase() + '.'
    )

    if (normalizedMls === normalizedSearch) {
      return true
    }

    // Check if one contains the other (for partial matches)
    return mlsStreetName.includes(searchStreetName) || searchStreetName.includes(mlsStreetName)
  }

  private removeDuplicateProperties(properties: MLSProperty[]): MLSProperty[] {
    const seen = new Set<string>()
    return properties.filter(property => {
      if (seen.has(property.listingId)) {
        return false
      }
      seen.add(property.listingId)
      return true
    })
  }

  private sortPropertiesByAddressRelevance(properties: MLSProperty[], targetAddress: string): MLSProperty[] {
    return properties.sort((a, b) => {
      const scoreA = this.calculateAddressRelevanceScore(a.address, targetAddress)
      const scoreB = this.calculateAddressRelevanceScore(b.address, targetAddress)
      return scoreB - scoreA // Higher score first
    })
  }

  private calculateAddressRelevanceScore(mlsAddress: MLSProperty['address'], targetAddress: string): number {
    let score = 0
    const target = targetAddress.toLowerCase()
    const mls = this.formatAddressForDisplay(mlsAddress).toLowerCase()

    // Exact match gets highest score
    if (mls === target) {
      return 1000
    }

    // Street number match
    if (mlsAddress.streetNumber && target.includes(mlsAddress.streetNumber)) {
      score += 100
    }

    // Street name match
    if (mlsAddress.streetName && target.includes(mlsAddress.streetName.toLowerCase())) {
      score += 50
    }

    // City match
    if (mlsAddress.city && target.includes(mlsAddress.city.toLowerCase())) {
      score += 25
    }

    // ZIP code match
    if (mlsAddress.postalCode && target.includes(mlsAddress.postalCode)) {
      score += 10
    }

    return score
  }

  private calculateAddressMatchConfidence(
    mlsAddress: MLSProperty['address'], 
    components: NonNullable<ReturnType<typeof AddressValidator.validateColumbusAddress>['components']>
  ): number {
    let confidence = 0

    // Street number match (most important)
    if (mlsAddress.streetNumber === components.streetNumber) {
      confidence += 40
    }

    // Street name match
    if (mlsAddress.streetName?.toLowerCase() === components.streetName?.toLowerCase()) {
      confidence += 30
    } else if (mlsAddress.streetName && components.streetName && 
               this.isStreetNameMatch(mlsAddress.streetName.toLowerCase(), components.streetName.toLowerCase())) {
      confidence += 20
    }

    // ZIP code match
    if (mlsAddress.postalCode === components.zipCode) {
      confidence += 20
    }

    // City match
    if (mlsAddress.city?.toLowerCase() === components.city?.toLowerCase()) {
      confidence += 10
    }

    return Math.min(confidence, 100)
  }

  private transformToAutoPopulateData(property: MLSProperty): PropertyAutoPopulateData {
    return {
      listingId: property.listingId,
      address: this.formatAddressForDisplay(property.address),
      listPrice: property.listPrice,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      squareFeet: property.squareFeet,
      lotSize: property.lotSizeSquareFeet,
      yearBuilt: property.yearBuilt,
      propertyType: property.propertyType,
      description: property.publicRemarks,
      features: this.extractPropertyFeatures(property),
      mlsStatus: property.standardStatus,
      listingAgent: property.listingAgent ? {
        name: property.listingAgent.name,
        phone: property.listingAgent.phone,
        email: property.listingAgent.email
      } : undefined,
      coordinates: property.coordinates
    }
  }

  private extractPropertyFeatures(property: MLSProperty): string[] {
    const features: string[] = []
    
    if (property.parking?.garageSpaces && property.parking.garageSpaces > 0) {
      features.push(`${property.parking.garageSpaces}-car garage`)
    }

    if (property.yearBuilt) {
      const age = new Date().getFullYear() - property.yearBuilt
      if (age < 5) {
        features.push('Newly built')
      } else if (age < 15) {
        features.push('Recently built')
      }
    }

    if (property.hoa?.fee && property.hoa.fee > 0) {
      features.push('HOA community')
    }

    return features
  }

  private addressMatchesPartial(address: MLSProperty['address'], partial: string): boolean {
    const fullAddress = this.formatAddressForDisplay(address).toLowerCase()
    const partialLower = partial.toLowerCase()
    
    return fullAddress.includes(partialLower) || 
           (address.streetNumber && address.streetNumber.startsWith(partial)) ||
           (address.streetName && address.streetName.toLowerCase().includes(partialLower))
  }

  private formatAddressForDisplay(address: MLSProperty['address']): string {
    const parts: string[] = []
    
    if (address.streetNumber) parts.push(address.streetNumber)
    if (address.streetName) parts.push(address.streetName)
    if (address.streetSuffix) parts.push(address.streetSuffix)
    if (address.unitNumber) parts.push(`#${address.unitNumber}`)
    
    let result = parts.join(' ')
    
    if (address.city) result += `, ${address.city}`
    if (address.stateOrProvince) result += `, ${address.stateOrProvince}`
    if (address.postalCode) result += ` ${address.postalCode}`
    
    return result
  }

  private calculateDaysOnMarket(onMarketDate?: Date): number | undefined {
    if (!onMarketDate) return undefined
    
    const now = new Date()
    const diffTime = now.getTime() - onMarketDate.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
}

// Type definitions for the service responses
export interface PropertyAutoPopulateData {
  listingId: string
  address: string
  listPrice: number
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  lotSize?: number
  yearBuilt?: number
  propertyType: PropertyType
  description?: string
  features: string[]
  mlsStatus: StandardStatus
  listingAgent?: {
    name: string
    phone?: string
    email?: string
  }
  coordinates?: {
    latitude: number
    longitude: number
  }
}

export interface PropertySuggestion {
  listingId: string
  address: string
  price: number
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  propertyType: PropertyType
  status: StandardStatus
}

export interface PropertyComparable {
  listingId: string
  address: string
  price: number
  pricePerSqft?: number
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  yearBuilt?: number
  distance?: number
  daysOnMarket?: number
  status: StandardStatus
  listingDate?: Date
}

export interface MarketInsights {
  averagePrice: number
  medianPrice: number
  averagePricePerSqft: number
  averageDaysOnMarket: number
  activeListings: number
  priceEstimate?: {
    low: number
    high: number
    estimate: number
    confidence: number
  }
}

export interface PropertySearchSuggestion {
  type: 'price_range' | 'bedrooms' | 'bathrooms' | 'property_type' | 'location'
  title: string
  description: string
  modifiedCriteria: MLSSearchCriteria
}
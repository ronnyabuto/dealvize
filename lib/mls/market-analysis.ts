/**
 * MLS Market Analysis and Comparables Service
 * Columbus MLS Integration
 */

import { MLSClient } from '@/lib/mls/client'
import { 
  MLSProperty, 
  MLSComparableProperty, 
  MLSMarketAnalysis, 
  MLSSearchCriteria,
  PropertyType,
  StandardStatus 
} from '@/lib/mls/types'
import { validateMLSProperty } from '@/lib/mls/validators'

export class MLSMarketAnalysisService {
  private client: MLSClient

  constructor(client: MLSClient) {
    this.client = client
  }

  /**
   * Generate comprehensive market analysis for a property
   */
  async generateMarketAnalysis(
    subjectProperty: {
      address: string
      coordinates?: { latitude: number; longitude: number }
      propertyType?: PropertyType
      squareFeet?: number
      bedrooms?: number
      bathrooms?: number
      yearBuilt?: number
    },
    radius: number = 1.0 // miles
  ): Promise<MLSMarketAnalysis> {
    try {
      // Get subject property details if coordinates not provided
      let coordinates = subjectProperty.coordinates
      if (!coordinates) {
        const geocoded = await this.geocodeAddress(subjectProperty.address)
        coordinates = geocoded
      }

      // Find comparable properties
      const comparables = await this.findComparableProperties({
        coordinates,
        propertyType: subjectProperty.propertyType,
        squareFeet: subjectProperty.squareFeet,
        bedrooms: subjectProperty.bedrooms,
        bathrooms: subjectProperty.bathrooms,
        yearBuilt: subjectProperty.yearBuilt
      }, radius)

      // Calculate market statistics
      const marketStats = this.calculateMarketStatistics(comparables)

      // Generate price estimate
      const priceEstimate = this.calculatePriceEstimate(
        subjectProperty,
        comparables
      )

      return {
        subjectProperty: {
          address: subjectProperty.address,
          coordinates
        },
        comparables,
        marketStatistics: marketStats,
        priceEstimate
      }

    } catch (error) {
      console.error('Market analysis generation failed:', error)
      throw new Error('Failed to generate market analysis')
    }
  }

  /**
   * Find comparable properties within radius
   */
  private async findComparableProperties(
    criteria: {
      coordinates: { latitude: number; longitude: number }
      propertyType?: PropertyType
      squareFeet?: number
      bedrooms?: number
      bathrooms?: number
      yearBuilt?: number
    },
    radius: number = 1.0
  ): Promise<MLSComparableProperty[]> {
    const searchRadius = radius * 0.0145 // Convert miles to degrees (approximate)

    const searchCriteria: MLSSearchCriteria = {
      coordinates: {
        northEast: {
          lat: criteria.coordinates.latitude + searchRadius,
          lng: criteria.coordinates.longitude + searchRadius
        },
        southWest: {
          lat: criteria.coordinates.latitude - searchRadius,
          lng: criteria.coordinates.longitude - searchRadius
        }
      },
      propertyType: criteria.propertyType ? [criteria.propertyType] : undefined,
      standardStatus: [StandardStatus.ACTIVE, StandardStatus.CLOSED],
      limit: 50,
      sortBy: 'ModificationTimestamp' as any,
      sortOrder: 'desc'
    }

    // Add size filters with 25% variance
    if (criteria.squareFeet) {
      const variance = criteria.squareFeet * 0.25
      searchCriteria.minSquareFeet = Math.floor(criteria.squareFeet - variance)
      searchCriteria.maxSquareFeet = Math.ceil(criteria.squareFeet + variance)
    }

    // Add bedroom filters
    if (criteria.bedrooms) {
      searchCriteria.minBedrooms = Math.max(1, criteria.bedrooms - 1)
      searchCriteria.maxBedrooms = criteria.bedrooms + 1
    }

    // Add bathroom filters
    if (criteria.bathrooms) {
      searchCriteria.minBathrooms = Math.max(1, criteria.bathrooms - 1)
      searchCriteria.maxBathrooms = criteria.bathrooms + 1
    }

    const searchResult = await this.client.searchProperties(searchCriteria)

    if (!searchResult.success || !searchResult.data) {
      return []
    }

    return searchResult.data.properties.map(property => ({
      ...property,
      distance: this.calculateDistance(
        criteria.coordinates,
        property.coordinates || { latitude: 0, longitude: 0 }
      ),
      adjustments: this.calculateAdjustments(property, criteria)
    })).sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }

  /**
   * Calculate distance between two coordinates in miles
   */
  private calculateDistance(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 3959 // Earth's radius in miles
    const dLat = this.deg2rad(coord2.latitude - coord1.latitude)
    const dLon = this.deg2rad(coord2.longitude - coord1.longitude)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1.latitude)) * Math.cos(this.deg2rad(coord2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180)
  }

  /**
   * Calculate price adjustments for comparable property
   */
  private calculateAdjustments(
    property: MLSProperty,
    subject: {
      squareFeet?: number
      bedrooms?: number
      bathrooms?: number
      yearBuilt?: number
    }
  ): MLSComparableProperty['adjustments'] {
    let adjustedPrice = property.listPrice
    const adjustmentFactors: Record<string, number> = {}

    // Square footage adjustment ($100 per sq ft difference)
    if (property.squareFeet && subject.squareFeet) {
      const sqftDiff = subject.squareFeet - property.squareFeet
      const sqftAdjustment = sqftDiff * 100
      adjustedPrice += sqftAdjustment
      adjustmentFactors.squareFeet = sqftAdjustment
    }

    // Bedroom adjustment ($5,000 per bedroom)
    if (property.bedrooms && subject.bedrooms) {
      const bedroomDiff = subject.bedrooms - property.bedrooms
      const bedroomAdjustment = bedroomDiff * 5000
      adjustedPrice += bedroomAdjustment
      adjustmentFactors.bedrooms = bedroomAdjustment
    }

    // Bathroom adjustment ($3,000 per bathroom)
    if (property.bathrooms && subject.bathrooms) {
      const bathroomDiff = subject.bathrooms - property.bathrooms
      const bathroomAdjustment = bathroomDiff * 3000
      adjustedPrice += bathroomAdjustment
      adjustmentFactors.bathrooms = bathroomAdjustment
    }

    // Age adjustment ($1,000 per year newer)
    if (property.yearBuilt && subject.yearBuilt) {
      const ageDiff = (subject.yearBuilt || new Date().getFullYear()) - property.yearBuilt
      const ageAdjustment = ageDiff * 1000
      adjustedPrice += ageAdjustment
      adjustmentFactors.age = ageAdjustment
    }

    return {
      pricePerSqft: property.squareFeet ? Math.round(property.listPrice / property.squareFeet) : undefined,
      adjustedPrice: Math.round(adjustedPrice),
      adjustmentFactors
    }
  }

  /**
   * Calculate market statistics from comparables
   */
  private calculateMarketStatistics(comparables: MLSComparableProperty[]) {
    const prices = comparables.map(c => c.listPrice)
    const pricesPerSqft = comparables
      .filter(c => c.squareFeet && c.squareFeet > 0)
      .map(c => c.listPrice / c.squareFeet!)

    const activeSales = comparables.filter(c => c.standardStatus === StandardStatus.ACTIVE)
    const recentSales = comparables.filter(c => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return c.closeDate && new Date(c.closeDate) > thirtyDaysAgo
    })

    const ninetyDaysSales = comparables.filter(c => {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      return c.closeDate && new Date(c.closeDate) > ninetyDaysAgo
    })

    // Calculate days on market for active listings
    const daysOnMarket = activeSales
      .filter(c => c.onMarketDate)
      .map(c => {
        const onMarket = new Date(c.onMarketDate!)
        const now = new Date()
        return Math.floor((now.getTime() - onMarket.getTime()) / (1000 * 60 * 60 * 24))
      })

    return {
      averageListPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      medianListPrice: prices.length > 0 ? Math.round(this.calculateMedian(prices)) : 0,
      averagePricePerSqft: pricesPerSqft.length > 0 ? Math.round(pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length) : 0,
      averageDaysOnMarket: daysOnMarket.length > 0 ? Math.round(daysOnMarket.reduce((a, b) => a + b, 0) / daysOnMarket.length) : 0,
      totalActiveListings: activeSales.length,
      soldLast30Days: recentSales.length,
      soldLast90Days: ninetyDaysSales.length
    }
  }

  /**
   * Calculate price estimate based on comparables
   */
  private calculatePriceEstimate(
    subject: {
      squareFeet?: number
      bedrooms?: number
      bathrooms?: number
      yearBuilt?: number
    },
    comparables: MLSComparableProperty[]
  ) {
    if (comparables.length === 0) return undefined

    const adjustedPrices = comparables
      .filter(c => c.adjustments?.adjustedPrice)
      .map(c => c.adjustments!.adjustedPrice!)
      .slice(0, 6) // Use top 6 closest comparables

    if (adjustedPrices.length === 0) return undefined

    const average = adjustedPrices.reduce((a, b) => a + b, 0) / adjustedPrices.length
    const standardDeviation = Math.sqrt(
      adjustedPrices.reduce((sq, n) => sq + Math.pow(n - average, 2), 0) / adjustedPrices.length
    )

    // Confidence based on number of comparables and price variance
    let confidence = Math.min(0.95, 0.5 + (adjustedPrices.length * 0.1))
    if (standardDeviation > average * 0.2) confidence *= 0.8

    return {
      estimate: Math.round(average),
      low: Math.round(average - standardDeviation),
      high: Math.round(average + standardDeviation),
      confidence: Math.round(confidence * 100) / 100
    }
  }

  /**
   * Calculate median of array
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid]
  }

  /**
   * Geocode address to coordinates
   */
  private async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    // In production, use a geocoding service like Google Maps API
    // For now, return Columbus, OH coordinates as fallback
    return {
      latitude: 39.9612,
      longitude: -82.9988
    }
  }

  /**
   * Get neighborhood market trends for Columbus
   */
  async getNeighborhoodTrends(
    coordinates: { latitude: number; longitude: number },
    timeframe: '1month' | '3months' | '6months' | '1year' = '6months'
  ) {
    try {
      const days = {
        '1month': 30,
        '3months': 90,
        '6months': 180,
        '1year': 365
      }[timeframe]

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const searchCriteria: MLSSearchCriteria = {
        coordinates: {
          northEast: {
            lat: coordinates.latitude + 0.01,
            lng: coordinates.longitude + 0.01
          },
          southWest: {
            lat: coordinates.latitude - 0.01,
            lng: coordinates.longitude - 0.01
          }
        },
        modifiedSince: cutoffDate,
        standardStatus: [StandardStatus.CLOSED],
        limit: 100
      }

      const result = await this.client.searchProperties(searchCriteria)

      if (!result.success || !result.data) {
        return {
          timeframe,
          totalSales: 0,
          priceAppreciation: 0,
          averagePrice: 0,
          medianDaysOnMarket: 0,
          inventoryLevel: 'Low' as const,
          trend: 'Stable' as const
        }
      }

      const sales = result.data.properties.filter(p => p.closeDate)

      // Calculate trends
      const priceHistory = sales.map(p => ({
        date: new Date(p.closeDate!),
        price: p.listPrice,
        pricePerSqft: p.squareFeet ? p.listPrice / p.squareFeet : 0
      })).sort((a, b) => a.date.getTime() - b.date.getTime())

      const firstHalf = priceHistory.slice(0, Math.floor(priceHistory.length / 2))
      const secondHalf = priceHistory.slice(Math.floor(priceHistory.length / 2))

      const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.price, 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.price, 0) / secondHalf.length

      const priceAppreciation = firstHalf.length > 0 && secondHalf.length > 0
        ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
        : 0

      return {
        timeframe,
        totalSales: sales.length,
        priceAppreciation: Math.round(priceAppreciation * 100) / 100,
        averagePrice: sales.length > 0 ? Math.round(sales.reduce((sum, s) => sum + s.listPrice, 0) / sales.length) : 0,
        medianDaysOnMarket: this.calculateMedianDaysOnMarket(sales),
        inventoryLevel: this.calculateInventoryLevel(sales.length),
        trend: priceAppreciation > 2 ? 'Increasing' : priceAppreciation < -2 ? 'Decreasing' : 'Stable'
      }

    } catch (error) {
      console.error('Neighborhood trends calculation failed:', error)
      throw new Error('Failed to calculate neighborhood trends')
    }
  }

  private calculateMedianDaysOnMarket(properties: MLSProperty[]): number {
    const daysOnMarket = properties
      .filter(p => p.onMarketDate && p.closeDate)
      .map(p => {
        const onMarket = new Date(p.onMarketDate!)
        const closed = new Date(p.closeDate!)
        return Math.floor((closed.getTime() - onMarket.getTime()) / (1000 * 60 * 60 * 24))
      })
      .filter(days => days > 0)

    if (daysOnMarket.length === 0) return 0
    return Math.round(this.calculateMedian(daysOnMarket))
  }

  private calculateInventoryLevel(salesCount: number): 'Low' | 'Medium' | 'High' {
    // Columbus market-specific thresholds
    if (salesCount < 20) return 'Low'
    if (salesCount < 50) return 'Medium'
    return 'High'
  }
}
/**
 * MLS Property History Service
 * Columbus MLS Integration - Property History Tracking
 */

import { MLSClient } from '@/lib/mls/client'
import { 
  MLSProperty, 
  MLSPropertyHistory, 
  MLSHistoryEvent, 
  StandardStatus 
} from '@/lib/mls/types'

export class MLSPropertyHistoryService {
  private client: MLSClient

  constructor(client: MLSClient) {
    this.client = client
  }

  /**
   * Get complete property history including price changes, status changes, and market events
   */
  async getPropertyHistory(listingId: string): Promise<MLSPropertyHistory> {
    try {
      // Get current property details
      const property = await this.client.getPropertyDetails(listingId)
      if (!property) {
        throw new Error('Property not found')
      }

      // Fetch historical data from MLS
      const historyData = await this.fetchPropertyHistoryData(listingId)
      
      // Process and normalize events
      const events = this.processHistoryEvents(property, historyData)

      return {
        listingId,
        events: events.sort((a, b) => b.date.getTime() - a.date.getTime())
      }

    } catch (error) {
      console.error(`Property history fetch failed for ${listingId}:`, error)
      throw new Error('Failed to retrieve property history')
    }
  }

  /**
   * Get property price history over time
   */
  async getPriceHistory(listingId: string): Promise<{
    listingId: string
    priceChanges: Array<{
      date: Date
      price: number
      changeAmount: number
      changePercent: number
      daysOnMarket: number
    }>
    currentPrice: number
    originalPrice: number
    totalPriceChange: number
    totalPriceChangePercent: number
  }> {
    try {
      const history = await this.getPropertyHistory(listingId)
      const priceEvents = history.events.filter(e => e.event === 'Price Change')

      const priceChanges = priceEvents.map((event, index) => {
        const currentPrice = event.details.newValue as number
        const previousPrice = event.details.previousValue as number
        const changeAmount = currentPrice - previousPrice
        const changePercent = (changeAmount / previousPrice) * 100

        // Calculate days on market at time of change
        const listingEvent = history.events.find(e => e.event === 'Listed')
        const daysOnMarket = listingEvent 
          ? Math.floor((event.date.getTime() - listingEvent.date.getTime()) / (1000 * 60 * 60 * 24))
          : 0

        return {
          date: event.date,
          price: currentPrice,
          changeAmount: Math.round(changeAmount),
          changePercent: Math.round(changePercent * 100) / 100,
          daysOnMarket
        }
      })

      const currentPrice = priceChanges.length > 0 ? priceChanges[0].price : 0
      const originalPrice = priceChanges.length > 0 ? priceChanges[priceChanges.length - 1].price : currentPrice
      const totalPriceChange = currentPrice - originalPrice
      const totalPriceChangePercent = originalPrice > 0 ? (totalPriceChange / originalPrice) * 100 : 0

      return {
        listingId,
        priceChanges: priceChanges.reverse(), // Chronological order
        currentPrice,
        originalPrice,
        totalPriceChange: Math.round(totalPriceChange),
        totalPriceChangePercent: Math.round(totalPriceChangePercent * 100) / 100
      }

    } catch (error) {
      console.error(`Price history fetch failed for ${listingId}:`, error)
      throw new Error('Failed to retrieve price history')
    }
  }

  /**
   * Get market timing analysis for a property
   */
  async getMarketTimingAnalysis(listingId: string): Promise<{
    listingId: string
    originalListDate: Date
    currentStatus: StandardStatus
    totalDaysOnMarket: number
    averageDaysOnMarket: number // For similar properties in area
    marketTiming: 'Excellent' | 'Good' | 'Fair' | 'Poor'
    priceStrategy: 'Aggressive' | 'Market' | 'Conservative'
    recommendations: string[]
  }> {
    try {
      const property = await this.client.getPropertyDetails(listingId)
      if (!property) {
        throw new Error('Property not found')
      }

      const history = await this.getPropertyHistory(listingId)
      const priceHistory = await this.getPriceHistory(listingId)

      // Calculate days on market
      const listingEvent = history.events.find(e => e.event === 'Listed')
      const totalDaysOnMarket = listingEvent
        ? Math.floor((new Date().getTime() - listingEvent.date.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      // Get comparable properties for market comparison
      const comparablesDaysOnMarket = await this.getComparablesDaysOnMarket(property)

      // Determine market timing
      const marketTiming = this.calculateMarketTiming(totalDaysOnMarket, comparablesDaysOnMarket)
      
      // Analyze price strategy
      const priceStrategy = this.analyzePriceStrategy(priceHistory, property)

      // Generate recommendations
      const recommendations = this.generateMarketRecommendations(
        totalDaysOnMarket,
        comparablesDaysOnMarket,
        marketTiming,
        priceStrategy,
        priceHistory
      )

      return {
        listingId,
        originalListDate: listingEvent?.date || new Date(),
        currentStatus: property.standardStatus,
        totalDaysOnMarket,
        averageDaysOnMarket: comparablesDaysOnMarket,
        marketTiming,
        priceStrategy,
        recommendations
      }

    } catch (error) {
      console.error(`Market timing analysis failed for ${listingId}:`, error)
      throw new Error('Failed to generate market timing analysis')
    }
  }

  /**
   * Get property status change timeline
   */
  async getStatusTimeline(listingId: string): Promise<{
    listingId: string
    statusChanges: Array<{
      date: Date
      fromStatus: string
      toStatus: string
      daysInStatus: number
    }>
    currentStatus: StandardStatus
    totalTimeOnMarket: number
  }> {
    try {
      const history = await this.getPropertyHistory(listingId)
      const statusEvents = history.events.filter(e => e.event === 'Status Change' || e.event === 'Listed')

      const statusChanges = []
      let previousEvent = statusEvents[statusEvents.length - 1] // Start with oldest (Listed)

      for (let i = statusEvents.length - 2; i >= 0; i--) {
        const currentEvent = statusEvents[i]
        const daysInStatus = Math.floor(
          (currentEvent.date.getTime() - previousEvent.date.getTime()) / (1000 * 60 * 60 * 24)
        )

        statusChanges.push({
          date: currentEvent.date,
          fromStatus: previousEvent.details.newValue as string || 'Listed',
          toStatus: currentEvent.details.newValue as string,
          daysInStatus
        })

        previousEvent = currentEvent
      }

      // Add current status duration
      if (statusEvents.length > 0) {
        const lastEvent = statusEvents[0]
        const currentDaysInStatus = Math.floor(
          (new Date().getTime() - lastEvent.date.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (currentDaysInStatus > 0) {
          statusChanges.unshift({
            date: new Date(),
            fromStatus: lastEvent.details.newValue as string,
            toStatus: 'Current',
            daysInStatus: currentDaysInStatus
          })
        }
      }

      const firstEvent = statusEvents[statusEvents.length - 1]
      const totalTimeOnMarket = firstEvent
        ? Math.floor((new Date().getTime() - firstEvent.date.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      const property = await this.client.getPropertyDetails(listingId)

      return {
        listingId,
        statusChanges,
        currentStatus: property?.standardStatus || StandardStatus.ACTIVE,
        totalTimeOnMarket
      }

    } catch (error) {
      console.error(`Status timeline fetch failed for ${listingId}:`, error)
      throw new Error('Failed to retrieve status timeline')
    }
  }

  /**
   * Fetch raw property history data from MLS
   */
  private async fetchPropertyHistoryData(listingId: string): Promise<any[]> {
    // In production, this would make specific API calls to get history data
    // For now, simulate based on property details
    const property = await this.client.getPropertyDetails(listingId)
    if (!property) return []

    const events = []

    // Add listing event
    if (property.listingContractDate) {
      events.push({
        date: property.listingContractDate,
        type: 'Listed',
        price: property.originalListPrice || property.listPrice,
        status: StandardStatus.ACTIVE
      })
    }

    // Add price change if different from original
    if (property.originalListPrice && property.originalListPrice !== property.listPrice) {
      events.push({
        date: property.priceChangeTimestamp || new Date(),
        type: 'PriceChange',
        previousPrice: property.originalListPrice,
        newPrice: property.listPrice
      })
    }

    // Add status changes based on current status
    if (property.standardStatus !== StandardStatus.ACTIVE) {
      events.push({
        date: property.offMarketDate || new Date(),
        type: 'StatusChange',
        previousStatus: StandardStatus.ACTIVE,
        newStatus: property.standardStatus
      })
    }

    return events
  }

  /**
   * Process and normalize history events
   */
  private processHistoryEvents(property: MLSProperty, historyData: any[]): MLSHistoryEvent[] {
    const events: MLSHistoryEvent[] = []

    for (const data of historyData) {
      switch (data.type) {
        case 'Listed':
          events.push({
            date: new Date(data.date),
            event: 'Listed',
            details: {
              newValue: data.price,
              description: `Property listed at $${data.price.toLocaleString()}`
            }
          })
          break

        case 'PriceChange':
          const changeAmount = data.newPrice - data.previousPrice
          const changePercent = (changeAmount / data.previousPrice) * 100
          const changeType = changeAmount > 0 ? 'increased' : 'decreased'
          
          events.push({
            date: new Date(data.date),
            event: 'Price Change',
            details: {
              previousValue: data.previousPrice,
              newValue: data.newPrice,
              description: `Price ${changeType} by $${Math.abs(changeAmount).toLocaleString()} (${Math.abs(changePercent).toFixed(1)}%)`
            }
          })
          break

        case 'StatusChange':
          events.push({
            date: new Date(data.date),
            event: 'Status Change',
            details: {
              previousValue: data.previousStatus,
              newValue: data.newStatus,
              description: `Status changed from ${data.previousStatus} to ${data.newStatus}`
            }
          })
          break
      }
    }

    return events
  }

  /**
   * Get average days on market for comparable properties
   */
  private async getComparablesDaysOnMarket(property: MLSProperty): Promise<number> {
    try {
      // This would typically query similar properties in the area
      // For Columbus market, return typical days on market (about 25-30 days)
      return 28
    } catch (error) {
      return 30 // Default fallback
    }
  }

  /**
   * Calculate market timing quality
   */
  private calculateMarketTiming(
    totalDays: number, 
    averageDays: number
  ): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    const ratio = totalDays / averageDays
    
    if (ratio <= 0.5) return 'Excellent'
    if (ratio <= 0.8) return 'Good'
    if (ratio <= 1.2) return 'Fair'
    return 'Poor'
  }

  /**
   * Analyze pricing strategy
   */
  private analyzePriceStrategy(
    priceHistory: any,
    property: MLSProperty
  ): 'Aggressive' | 'Market' | 'Conservative' {
    if (priceHistory.priceChanges.length === 0) {
      // No price changes - analyze original pricing
      return 'Market' // Default assumption
    }

    const totalPriceChange = priceHistory.totalPriceChangePercent
    
    if (totalPriceChange < -10) return 'Aggressive' // Started too high
    if (totalPriceChange > 5) return 'Conservative' // Started too low, had to increase
    return 'Market'
  }

  /**
   * Generate market-based recommendations
   */
  private generateMarketRecommendations(
    daysOnMarket: number,
    averageDays: number,
    timing: string,
    strategy: string,
    priceHistory: any
  ): string[] {
    const recommendations = []

    // Days on market recommendations
    if (daysOnMarket > averageDays * 1.5) {
      recommendations.push('Consider a price reduction to attract more buyers')
      recommendations.push('Review and update listing photos and description')
    }

    if (daysOnMarket > averageDays * 2) {
      recommendations.push('Reassess pricing strategy - property may be overpriced for current market')
    }

    // Price strategy recommendations
    if (strategy === 'Aggressive' && priceHistory.priceChanges.length > 2) {
      recommendations.push('Consider more aggressive pricing to generate interest')
    }

    if (strategy === 'Conservative' && daysOnMarket < averageDays * 0.5) {
      recommendations.push('Strong market interest suggests pricing could be optimized higher')
    }

    // Seasonal recommendations (Columbus-specific)
    const currentMonth = new Date().getMonth()
    if (currentMonth >= 10 || currentMonth <= 2) { // Winter months
      recommendations.push('Consider enhanced staging and lighting for winter showing season')
    }

    if (currentMonth >= 2 && currentMonth <= 5) { // Spring selling season
      recommendations.push('Optimal selling season - maintain competitive pricing')
    }

    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push('Monitor market conditions and comparable sales')
      recommendations.push('Ensure listing is well-maintained and showcased')
    }

    return recommendations
  }
}
import { 
  MLSConfig, 
  MLSProperty, 
  MLSSearchCriteria, 
  MLSSearchResult, 
  MLSApiResponse, 
  MLSAuthResponse,
  MLSIntegrationStatus,
  MLSMarketAnalysis,
  MLSPropertyHistory 
} from '@/lib/mls/types'
import { MLSDataTransformer, mlsSearchCriteriaSchema } from '@/lib/mls/validators'
import { mlsErrorHandler, MLSFallbackStrategies } from '@/lib/mls/error-handler'

/**
 * Enterprise MLS API Client
 * Handles authentication, rate limiting, caching, and error recovery
 */
export class MLSClient {
  private config: MLSConfig
  private accessToken?: string
  private tokenExpiry?: Date
  private rateLimiter: RateLimiter
  private cache: MLSCache
  private requestQueue: RequestQueue

  constructor(config: MLSConfig) {
    this.config = config
    this.rateLimiter = new RateLimiter(config.rateLimiting)
    this.cache = new MLSCache(config.caching)
    this.requestQueue = new RequestQueue()
  }

  /**
   * Initialize MLS client with authentication
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      const authResult = await this.authenticate()
      if (!authResult.success) {
        return { success: false, error: authResult.error }
      }

      // Test connection with a simple request
      const status = await this.getStatus()
      if (!status.isConnected) {
        return { success: false, error: 'Failed to establish MLS connection' }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Initialization failed' 
      }
    }
  }

  /**
   * Search for properties with advanced filtering
   */
  async searchProperties(criteria: MLSSearchCriteria): Promise<MLSApiResponse<MLSSearchResult>> {
    try {
      // Validate search criteria
      const validatedCriteria = mlsSearchCriteriaSchema.parse(criteria)

      // Check cache first
      const cacheKey = this.generateCacheKey('search', validatedCriteria)
      const cachedResult = this.cache.get<MLSSearchResult>(cacheKey)
      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
          metadata: {
            requestId: this.generateRequestId(),
            timestamp: new Date()
          }
        }
      }

      // Check rate limits
      const rateLimitCheck = await this.rateLimiter.checkLimit()
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Try again at ${rateLimitCheck.resetTime?.toISOString()}`
          }
        }
      }

      // Build search parameters
      const searchParams = this.buildSearchParams(validatedCriteria)
      
      // Execute search request
      const response = await this.makeAuthenticatedRequest(
        'GET',
        '/Property',
        { params: searchParams }
      )

      if (!response.success) {
        return response
      }

      // Transform and validate response data
      const properties = response.data?.value || response.data || []
      const transformedProperties = properties
        .map((property: any) => MLSDataTransformer.transformRawProperty(property))
        .filter((property: MLSProperty | null): property is MLSProperty => property !== null)

      const result: MLSSearchResult = {
        properties: transformedProperties,
        totalCount: response.data?.['@odata.count'] || transformedProperties.length,
        hasMore: (validatedCriteria.offset + transformedProperties.length) < (response.data?.['@odata.count'] || 0),
        nextOffset: validatedCriteria.offset + transformedProperties.length,
        searchId: this.generateRequestId()
      }

      // Cache the result
      this.cache.set(cacheKey, result, this.config.caching.searchCacheTTL)

      return {
        success: true,
        data: result,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          rateLimit: rateLimitCheck.rateLimit
        }
      }
    } catch (error) {
      console.error('MLS search failed:', error)
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error instanceof Error ? error.message : 'Search request failed'
        }
      }
    }
  }

  /**
   * Get detailed property information by listing ID
   */
  async getProperty(listingId: string): Promise<MLSApiResponse<MLSProperty>> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('property', listingId)
      const cachedProperty = this.cache.get<MLSProperty>(cacheKey)
      if (cachedProperty) {
        return {
          success: true,
          data: cachedProperty,
          metadata: {
            requestId: this.generateRequestId(),
            timestamp: new Date()
          }
        }
      }

      // Check rate limits
      const rateLimitCheck = await this.rateLimiter.checkLimit()
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded'
          }
        }
      }

      // Make request
      const response = await this.makeAuthenticatedRequest(
        'GET',
        `/Property('${listingId}')`
      )

      if (!response.success || !response.data) {
        return {
          success: false,
          error: {
            code: 'PROPERTY_NOT_FOUND',
            message: `Property with listing ID ${listingId} not found`
          }
        }
      }

      // Transform response data
      const transformedProperty = MLSDataTransformer.transformRawProperty(response.data)
      if (!transformedProperty) {
        return {
          success: false,
          error: {
            code: 'DATA_TRANSFORMATION_FAILED',
            message: 'Failed to process property data'
          }
        }
      }

      // Cache the result
      this.cache.set(cacheKey, transformedProperty, this.config.caching.propertyCacheTTL)

      return {
        success: true,
        data: transformedProperty,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date()
        }
      }
    } catch (error) {
      console.error('Get property failed:', error)
      return {
        success: false,
        error: {
          code: 'GET_PROPERTY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get property'
        }
      }
    }
  }

  /**
   * Get market analysis and comparable properties
   */
  async getMarketAnalysis(
    address: string, 
    options: {
      radius?: number
      maxComps?: number
      propertyTypes?: string[]
    } = {}
  ): Promise<MLSApiResponse<MLSMarketAnalysis>> {
    try {
      const { radius = 0.5, maxComps = 10, propertyTypes = [] } = options

      // First, geocode the address to get coordinates
      const geocodeResult = await this.geocodeAddress(address)
      if (!geocodeResult.success || !geocodeResult.data) {
        return {
          success: false,
          error: {
            code: 'GEOCODING_FAILED',
            message: 'Unable to find location for the provided address'
          }
        }
      }

      const { latitude, longitude } = geocodeResult.data

      // Search for comparable properties
      const searchCriteria: MLSSearchCriteria = {
        coordinates: {
          northEast: {
            lat: latitude + (radius / 69), // Approximate degrees per mile
            lng: longitude + (radius / 54.6)
          },
          southWest: {
            lat: latitude - (radius / 69),
            lng: longitude - (radius / 54.6)
          }
        },
        limit: maxComps * 2, // Get more than needed for better selection
        sortBy: 'ModificationTimestamp' as any
      }

      if (propertyTypes.length > 0) {
        searchCriteria.propertyType = propertyTypes as any[]
      }

      const searchResult = await this.searchProperties(searchCriteria)
      if (!searchResult.success || !searchResult.data) {
        return {
          success: false,
          error: searchResult.error || { code: 'SEARCH_FAILED', message: 'Comparable search failed' }
        }
      }

      // Calculate distances and select best comparables
      const comparables = searchResult.data.properties
        .map(property => {
          if (!property.coordinates) return null
          
          const distance = this.calculateDistance(
            latitude,
            longitude,
            property.coordinates.latitude,
            property.coordinates.longitude
          )

          return {
            ...property,
            distance
          }
        })
        .filter((comp): comp is NonNullable<typeof comp> => comp !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxComps)

      // Calculate market statistics
      const marketStatistics = this.calculateMarketStatistics(comparables)

      // Generate price estimate (basic algorithm)
      const priceEstimate = this.generatePriceEstimate(comparables, marketStatistics)

      const analysis: MLSMarketAnalysis = {
        subjectProperty: {
          address,
          coordinates: { latitude, longitude }
        },
        comparables,
        marketStatistics,
        priceEstimate
      }

      return {
        success: true,
        data: analysis,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date()
        }
      }
    } catch (error) {
      console.error('Market analysis failed:', error)
      return {
        success: false,
        error: {
          code: 'MARKET_ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Market analysis failed'
        }
      }
    }
  }

  /**
   * Get MLS integration status
   */
  async getStatus(): Promise<MLSIntegrationStatus> {
    try {
      // Check authentication status
      const isTokenValid = this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry
      
      // Get rate limit status
      const rateLimitStatus = this.rateLimiter.getStatus()

      // Test API connectivity
      let apiStatus: 'healthy' | 'degraded' | 'down' = 'down'
      try {
        const testResponse = await this.makeAuthenticatedRequest('GET', '/Property/$count')
        apiStatus = testResponse.success ? 'healthy' : 'degraded'
      } catch {
        apiStatus = 'down'
      }

      return {
        isConnected: isTokenValid && apiStatus !== 'down',
        lastSync: this.cache.getLastUpdate(),
        apiStatus,
        authStatus: isTokenValid ? 'valid' : 'expired',
        rateLimitStatus: {
          remainingRequests: rateLimitStatus.remaining,
          resetTime: rateLimitStatus.resetTime
        }
      }
    } catch (error) {
      return {
        isConnected: false,
        apiStatus: 'down',
        authStatus: 'invalid',
        rateLimitStatus: {
          remainingRequests: 0,
          resetTime: new Date()
        },
        errors: [error instanceof Error ? error.message : 'Status check failed']
      }
    }
  }

  /**
   * Private: Handle authentication with the MLS provider
   */
  private async authenticate(): Promise<{ success: boolean; error?: string }> {
    try {
      const authUrl = this.config.credentials.loginUrl || `${this.config.credentials.apiUrl}/Token`
      
      const authData = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.credentials.clientId,
        client_secret: this.config.credentials.clientSecret
      })

      // Add username/password if provided (some MLS systems require this)
      if (this.config.credentials.username && this.config.credentials.password) {
        authData.append('username', this.config.credentials.username)
        authData.append('password', this.config.credentials.password)
      }

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: authData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`)
      }

      const authResponse: MLSAuthResponse = await response.json()
      
      this.accessToken = authResponse.accessToken
      this.tokenExpiry = new Date(Date.now() + (authResponse.expiresIn * 1000))

      return { success: true }
    } catch (error) {
      console.error('MLS authentication failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      }
    }
  }

  /**
   * Private: Make authenticated API request
   */
  private async makeAuthenticatedRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    options: {
      params?: Record<string, any>
      body?: any
      headers?: Record<string, string>
    } = {}
  ): Promise<MLSApiResponse<any>> {
    try {
      // Check if token needs refresh
      if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
        const authResult = await this.authenticate()
        if (!authResult.success) {
          return {
            success: false,
            error: {
              code: 'AUTHENTICATION_FAILED',
              message: authResult.error || 'Authentication failed'
            }
          }
        }
      }

      // Build URL with parameters
      const url = new URL(`${this.config.credentials.apiUrl}${endpoint}`)
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value))
          }
        })
      }

      // Prepare headers
      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'Dealvize-CRM/1.0',
        ...options.headers
      }

      if (method !== 'GET' && options.body) {
        headers['Content-Type'] = 'application/json'
      }

      // Make request with retry logic
      const response = await this.requestQueue.execute(async () => {
        const result = await fetch(url.toString(), {
          method,
          headers,
          body: method !== 'GET' && options.body ? JSON.stringify(options.body) : undefined
        })

        if (!result.ok) {
          const errorText = await result.text()
          throw new Error(`Request failed: ${result.status} - ${errorText}`)
        }

        return result
      })

      const data = await response.json()

      return {
        success: true,
        data,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date()
        }
      }
    } catch (error) {
      console.error('MLS API request failed:', error)
      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: error instanceof Error ? error.message : 'Request failed'
        }
      }
    }
  }

  /**
   * Private: Build search parameters for MLS API
   */
  private buildSearchParams(criteria: MLSSearchCriteria): Record<string, any> {
    const params: Record<string, any> = {}
    
    // RESO OData parameters
    params['$top'] = criteria.limit
    params['$skip'] = criteria.offset
    
    // Build filter conditions
    const filters: string[] = []
    
    if (criteria.city && criteria.city.length > 0) {
      const cityFilter = criteria.city.map(city => `City eq '${city}'`).join(' or ')
      filters.push(`(${cityFilter})`)
    }
    
    if (criteria.propertyType && criteria.propertyType.length > 0) {
      const typeFilter = criteria.propertyType.map(type => `PropertyType eq '${type}'`).join(' or ')
      filters.push(`(${typeFilter})`)
    }
    
    if (criteria.minListPrice) {
      filters.push(`ListPrice ge ${criteria.minListPrice}`)
    }
    
    if (criteria.maxListPrice) {
      filters.push(`ListPrice le ${criteria.maxListPrice}`)
    }
    
    if (criteria.minBedrooms) {
      filters.push(`BedroomsTotal ge ${criteria.minBedrooms}`)
    }
    
    if (criteria.maxBedrooms) {
      filters.push(`BedroomsTotal le ${criteria.maxBedrooms}`)
    }
    
    if (criteria.standardStatus && criteria.standardStatus.length > 0) {
      const statusFilter = criteria.standardStatus.map(status => `StandardStatus eq '${status}'`).join(' or ')
      filters.push(`(${statusFilter})`)
    }
    
    if (criteria.modifiedSince) {
      filters.push(`ModificationTimestamp ge ${criteria.modifiedSince.toISOString()}`)
    }
    
    if (filters.length > 0) {
      params['$filter'] = filters.join(' and ')
    }
    
    // Sort order
    const sortDirection = criteria.sortOrder === 'asc' ? 'asc' : 'desc'
    params['$orderby'] = `${criteria.sortBy} ${sortDirection}`
    
    return params
  }

  /**
   * Private utility methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCacheKey(type: string, data: any): string {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data)
    return `mls_${type}_${Buffer.from(dataString).toString('base64').substr(0, 20)}`
  }

  private async geocodeAddress(address: string): Promise<MLSApiResponse<{ latitude: number; longitude: number }>> {
    // This would integrate with a geocoding service (Google Maps, HERE, etc.)
    // For now, return mock coordinates for Columbus, OH
    return {
      success: true,
      data: {
        latitude: 39.9612,
        longitude: -82.9988
      }
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private calculateMarketStatistics(properties: any[]): MLSMarketAnalysis['marketStatistics'] {
    if (properties.length === 0) {
      return {
        averageListPrice: 0,
        medianListPrice: 0,
        averagePricePerSqft: 0,
        averageDaysOnMarket: 0,
        totalActiveListings: 0,
        soldLast30Days: 0,
        soldLast90Days: 0
      }
    }

    const prices = properties.map(p => p.listPrice).filter(p => p > 0)
    const pricesPerSqft = properties
      .filter(p => p.squareFeet > 0)
      .map(p => p.listPrice / p.squareFeet)

    return {
      averageListPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      medianListPrice: this.calculateMedian(prices),
      averagePricePerSqft: pricesPerSqft.reduce((sum, price) => sum + price, 0) / pricesPerSqft.length,
      averageDaysOnMarket: 30, // This would be calculated from actual data
      totalActiveListings: properties.length,
      soldLast30Days: 0, // This would require additional queries
      soldLast90Days: 0   // This would require additional queries
    }
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  }

  private generatePriceEstimate(
    comparables: any[], 
    stats: MLSMarketAnalysis['marketStatistics']
  ): MLSMarketAnalysis['priceEstimate'] {
    if (comparables.length === 0) {
      return undefined
    }

    const estimate = stats.averageListPrice
    const range = stats.averageListPrice * 0.1 // 10% range

    return {
      low: estimate - range,
      high: estimate + range,
      estimate,
      confidence: Math.min(comparables.length * 10, 90) // Basic confidence based on number of comps
    }
  }
}

/**
 * Rate Limiter Implementation
 */
class RateLimiter {
  private requests: { timestamp: number }[] = []
  private config: MLSConfig['rateLimiting']

  constructor(config: MLSConfig['rateLimiting']) {
    this.config = config
  }

  async checkLimit(): Promise<{
    allowed: boolean
    rateLimit?: {
      remaining: number
      resetTime: Date
    }
    resetTime?: Date
  }> {
    const now = Date.now()
    
    // Clean old requests (older than 1 hour)
    this.requests = this.requests.filter(req => now - req.timestamp < 3600000)
    
    // Check per-minute limit
    const minuteAgo = now - 60000
    const recentRequests = this.requests.filter(req => req.timestamp > minuteAgo)
    
    if (recentRequests.length >= this.config.requestsPerMinute) {
      return {
        allowed: false,
        resetTime: new Date(recentRequests[0].timestamp + 60000)
      }
    }

    // Add current request
    this.requests.push({ timestamp: now })

    return {
      allowed: true,
      rateLimit: {
        remaining: this.config.requestsPerMinute - recentRequests.length - 1,
        resetTime: new Date(now + 60000)
      }
    }
  }

  getStatus() {
    const now = Date.now()
    const minuteAgo = now - 60000
    const recentRequests = this.requests.filter(req => req.timestamp > minuteAgo)
    
    return {
      remaining: Math.max(0, this.config.requestsPerMinute - recentRequests.length),
      resetTime: new Date(now + 60000)
    }
  }
}

/**
 * Caching Implementation
 */
class MLSCache {
  private cache = new Map<string, { data: any; expiry: number }>()
  private config: MLSConfig['caching']
  private lastUpdate?: Date

  constructor(config: MLSConfig['caching']) {
    this.config = config
    
    // Clean expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry || Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    })
    this.lastUpdate = new Date()
  }

  getLastUpdate(): Date | undefined {
    return this.lastUpdate
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * Request Queue for handling retries and concurrency
 */
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private maxRetries = 3
  private retryDelay = 1000

  async execute<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        let attempts = 0
        
        while (attempts < this.maxRetries) {
          try {
            const result = await request()
            resolve(result)
            return
          } catch (error) {
            attempts++
            if (attempts >= this.maxRetries) {
              reject(error)
              return
            }
            
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempts - 1)))
          }
        }
      })
      
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true
    
    while (this.queue.length > 0) {
      const request = this.queue.shift()
      if (request) {
        try {
          await request()
        } catch (error) {
          console.error('Request queue error:', error)
        }
      }
    }
    
    this.processing = false
  }
}
/**
 * MLS Integration Error Handler
 * Comprehensive error handling and fallback strategies
 */

export enum MLSErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATA_FORMAT_ERROR = 'DATA_FORMAT_ERROR',
  CACHE_ERROR = 'CACHE_ERROR'
}

export interface MLSError {
  type: MLSErrorType
  code: string
  message: string
  details?: any
  timestamp: Date
  retryable: boolean
  retryAfter?: number // seconds
  endpoint?: string
  requestId?: string
}

export interface ErrorHandlerConfig {
  maxRetries: number
  retryDelayMs: number
  exponentialBackoff: boolean
  fallbackEnabled: boolean
  logErrors: boolean
  alertThreshold: number // errors per minute
}

export class MLSErrorHandler {
  private config: ErrorHandlerConfig
  private errorCount: Map<string, { count: number; lastReset: Date }> = new Map()

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      fallbackEnabled: true,
      logErrors: true,
      alertThreshold: 10,
      ...config
    }
  }

  /**
   * Handle MLS API errors with retry logic
   */
  async handleError(error: any, context: {
    operation: string
    endpoint?: string
    requestId?: string
    attempt?: number
  }): Promise<MLSError> {
    const mlsError = this.parseError(error, context)
    
    if (this.config.logErrors) {
      this.logError(mlsError, context)
    }

    this.trackErrorRate(mlsError.type)
    
    return mlsError
  }

  /**
   * Execute operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: { name: string; endpoint?: string }
  ): Promise<T> {
    let lastError: MLSError | null = null
    
    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = await this.handleError(error, {
          operation: context.name,
          endpoint: context.endpoint,
          attempt
        })

        // Don't retry on non-retryable errors
        if (!lastError.retryable || attempt > this.config.maxRetries) {
          break
        }

        // Wait before retry
        const delay = this.calculateRetryDelay(attempt, lastError.retryAfter)
        await this.sleep(delay)
      }
    }

    throw new MLSIntegrationError(lastError!)
  }

  /**
   * Execute with fallback strategies
   */
  async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackStrategies: Array<() => Promise<T>>,
    context: { name: string }
  ): Promise<T> {
    try {
      return await this.withRetry(primaryOperation, { name: `${context.name}_primary` })
    } catch (primaryError) {
      if (!this.config.fallbackEnabled || fallbackStrategies.length === 0) {
        throw primaryError
      }

      console.warn(`Primary operation failed for ${context.name}, trying fallback strategies`)

      for (let i = 0; i < fallbackStrategies.length; i++) {
        try {
          const result = await fallbackStrategies[i]()
          console.info(`Fallback strategy ${i + 1} succeeded for ${context.name}`)
          return result
        } catch (fallbackError) {
          console.warn(`Fallback strategy ${i + 1} failed for ${context.name}:`, fallbackError)
        }
      }

      // All fallback strategies failed
      throw primaryError
    }
  }

  /**
   * Parse various error types into standardized MLSError
   */
  private parseError(error: any, context: any): MLSError {
    const timestamp = new Date()
    
    // Network/Fetch errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        type: MLSErrorType.NETWORK_ERROR,
        code: 'NETWORK_UNREACHABLE',
        message: 'Unable to connect to MLS API',
        details: error.message,
        timestamp,
        retryable: true,
        endpoint: context.endpoint
      }
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      return {
        type: MLSErrorType.TIMEOUT_ERROR,
        code: 'REQUEST_TIMEOUT',
        message: 'MLS API request timed out',
        details: error.message,
        timestamp,
        retryable: true,
        retryAfter: 5,
        endpoint: context.endpoint
      }
    }

    // HTTP Response errors
    if (error.response) {
      const status = error.response.status
      const data = error.response.data || {}

      switch (status) {
        case 401:
          return {
            type: MLSErrorType.AUTHENTICATION_ERROR,
            code: 'AUTH_FAILED',
            message: 'MLS authentication failed',
            details: data,
            timestamp,
            retryable: false,
            endpoint: context.endpoint
          }

        case 403:
          return {
            type: MLSErrorType.QUOTA_EXCEEDED,
            code: 'ACCESS_DENIED',
            message: 'MLS access denied - check permissions',
            details: data,
            timestamp,
            retryable: false,
            endpoint: context.endpoint
          }

        case 429:
          const retryAfter = parseInt(error.response.headers['retry-after']) || 60
          return {
            type: MLSErrorType.RATE_LIMIT_ERROR,
            code: 'RATE_LIMITED',
            message: 'MLS API rate limit exceeded',
            details: data,
            timestamp,
            retryable: true,
            retryAfter,
            endpoint: context.endpoint
          }

        case 500:
        case 502:
        case 503:
        case 504:
          return {
            type: MLSErrorType.SERVICE_UNAVAILABLE,
            code: `HTTP_${status}`,
            message: 'MLS service temporarily unavailable',
            details: data,
            timestamp,
            retryable: true,
            retryAfter: 30,
            endpoint: context.endpoint
          }

        case 400:
          return {
            type: MLSErrorType.VALIDATION_ERROR,
            code: 'BAD_REQUEST',
            message: data.message || 'Invalid request to MLS API',
            details: data,
            timestamp,
            retryable: false,
            endpoint: context.endpoint
          }

        default:
          return {
            type: MLSErrorType.API_ERROR,
            code: `HTTP_${status}`,
            message: data.message || `MLS API error: ${status}`,
            details: data,
            timestamp,
            retryable: status >= 500,
            endpoint: context.endpoint
          }
      }
    }

    // Zod validation errors
    if (error.name === 'ZodError') {
      return {
        type: MLSErrorType.DATA_FORMAT_ERROR,
        code: 'VALIDATION_FAILED',
        message: 'MLS data validation failed',
        details: error.issues,
        timestamp,
        retryable: false,
        endpoint: context.endpoint
      }
    }

    // Cache errors
    if (error.message?.includes('cache') || error.code === 'CACHE_ERROR') {
      return {
        type: MLSErrorType.CACHE_ERROR,
        code: 'CACHE_OPERATION_FAILED',
        message: 'MLS cache operation failed',
        details: error.message,
        timestamp,
        retryable: true,
        endpoint: context.endpoint
      }
    }

    // Generic error
    return {
      type: MLSErrorType.API_ERROR,
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Unknown MLS error occurred',
      details: error,
      timestamp,
      retryable: false,
      endpoint: context.endpoint,
      requestId: context.requestId
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter * 1000 // Convert to milliseconds
    }

    if (!this.config.exponentialBackoff) {
      return this.config.retryDelayMs
    }

    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelayMs * Math.pow(2, attempt - 1)
    const jitter = Math.random() * 1000 // Add up to 1 second of jitter
    return Math.min(baseDelay + jitter, 30000) // Cap at 30 seconds
  }

  /**
   * Track error rates for alerting
   */
  private trackErrorRate(errorType: MLSErrorType) {
    const now = new Date()
    const key = errorType
    const current = this.errorCount.get(key)

    if (!current || (now.getTime() - current.lastReset.getTime()) > 60000) {
      // Reset counter every minute
      this.errorCount.set(key, { count: 1, lastReset: now })
    } else {
      current.count++
      
      if (current.count >= this.config.alertThreshold) {
        this.triggerAlert(errorType, current.count)
        // Reset to avoid spam
        this.errorCount.set(key, { count: 0, lastReset: now })
      }
    }
  }

  /**
   * Log error details
   */
  private logError(error: MLSError, context: any) {
    const logLevel = error.retryable ? 'warn' : 'error'
    const logMessage = `MLS ${error.type}: ${error.message}`
    
    const logData = {
      error: {
        type: error.type,
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        endpoint: error.endpoint
      },
      context: {
        operation: context.operation,
        attempt: context.attempt,
        requestId: context.requestId
      },
      timestamp: error.timestamp
    }

    console[logLevel](logMessage, logData)

    // In production, send to logging service
    // await sendToLoggingService(logLevel, logMessage, logData)
  }

  /**
   * Trigger alert for high error rates
   */
  private triggerAlert(errorType: MLSErrorType, count: number) {
    console.error(`MLS ALERT: High error rate detected - ${errorType}: ${count} errors/minute`)
    
    // In production, send alerts to monitoring service
    // await sendAlert({
    //   type: 'MLS_HIGH_ERROR_RATE',
    //   errorType,
    //   count,
    //   timestamp: new Date()
    // })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats: Record<string, number> = {}
    for (const [errorType, data] of this.errorCount) {
      stats[errorType] = data.count
    }
    return stats
  }

  /**
   * Reset error counters
   */
  resetErrorStats() {
    this.errorCount.clear()
  }
}

/**
 * Custom MLS Integration Error class
 */
export class MLSIntegrationError extends Error {
  public mlsError: MLSError

  constructor(mlsError: MLSError) {
    super(mlsError.message)
    this.name = 'MLSIntegrationError'
    this.mlsError = mlsError
  }

  get isRetryable(): boolean {
    return this.mlsError.retryable
  }

  get errorType(): MLSErrorType {
    return this.mlsError.type
  }

  get retryAfter(): number | undefined {
    return this.mlsError.retryAfter
  }
}

/**
 * Fallback strategies for common MLS operations
 */
export class MLSFallbackStrategies {
  /**
   * Property search fallbacks
   */
  static getPropertySearchFallbacks(originalCriteria: any) {
    return [
      // Try with relaxed criteria
      async () => {
        const relaxedCriteria = { ...originalCriteria }
        if (relaxedCriteria.minListPrice) relaxedCriteria.minListPrice *= 0.9
        if (relaxedCriteria.maxListPrice) relaxedCriteria.maxListPrice *= 1.1
        if (relaxedCriteria.minSquareFeet) relaxedCriteria.minSquareFeet *= 0.9
        if (relaxedCriteria.maxSquareFeet) relaxedCriteria.maxSquareFeet *= 1.1
        // Implement relaxed search logic here
        throw new Error('Fallback not implemented')
      },
      
      // Try cached results
      async () => {
        // Return cached results if available
        throw new Error('No cached results available')
      }
    ]
  }

  /**
   * Property details fallbacks
   */
  static getPropertyDetailsFallbacks(listingId: string) {
    return [
      // Try alternative data source
      async () => {
        // Implement alternative data source lookup
        throw new Error('Alternative source not available')
      },
      
      // Return basic cached data
      async () => {
        // Return minimal cached property data
        throw new Error('No cached data available')
      }
    ]
  }

  /**
   * Market analysis fallbacks
   */
  static getMarketAnalysisFallbacks(address: string) {
    return [
      // Use broader geographic area
      async () => {
        // Implement broader area analysis
        throw new Error('Broader analysis not available')
      },
      
      // Use historical averages
      async () => {
        // Return market averages for the area
        throw new Error('Historical averages not available')
      }
    ]
  }
}

/**
 * Global error handler instance
 */
export const mlsErrorHandler = new MLSErrorHandler({
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
  fallbackEnabled: true,
  logErrors: true,
  alertThreshold: 10
})
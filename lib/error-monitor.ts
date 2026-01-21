/**
 * Error Monitoring Utilities
 * Centralized error tracking and logging for API operations
 */

export interface ErrorLogEntry {
    timestamp: string
    type: 'api_error' | 'validation_error' | 'auth_error' | 'schema_error'
    message: string
    endpoint?: string
    statusCode?: number
    details?: Record<string, any>
    userId?: string
}

// In-memory error buffer (for development/debugging)
const errorBuffer: ErrorLogEntry[] = []
const MAX_BUFFER_SIZE = 100

/**
 * Log an error to the monitoring system
 */
export const logError = (entry: Omit<ErrorLogEntry, 'timestamp'>): void => {
    const fullEntry: ErrorLogEntry = {
        ...entry,
        timestamp: new Date().toISOString()
    }

    // Add to buffer (circular)
    if (errorBuffer.length >= MAX_BUFFER_SIZE) {
        errorBuffer.shift()
    }
    errorBuffer.push(fullEntry)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error('[ERROR_MONITOR]', fullEntry)
    }

    // In production, you would send to external service
    // sendToMonitoringService(fullEntry)
}

/**
 * Log an API error with structured data
 */
export const logApiError = (
    endpoint: string,
    statusCode: number,
    errorMessage: string,
    details?: Record<string, any>
): void => {
    let type: ErrorLogEntry['type'] = 'api_error'

    if (statusCode === 401 || statusCode === 403) {
        type = 'auth_error'
    } else if (statusCode === 400) {
        type = 'validation_error'
    } else if (statusCode === 500 && errorMessage.includes('column')) {
        type = 'schema_error'
    }

    logError({
        type,
        message: errorMessage,
        endpoint,
        statusCode,
        details
    })
}

/**
 * Check for schema-related errors (missing columns, etc.)
 */
export const isSchemaError = (error: any): boolean => {
    if (!error) return false

    const schemaPatterns = [
        /column.*does not exist/i,
        /Could not find.*column/i,
        /relation.*does not exist/i,
        /PGRST204/i,
        /42703/i // PostgreSQL error code for undefined column
    ]

    const errorMessage = typeof error === 'string'
        ? error
        : error.message || error.error || JSON.stringify(error)

    return schemaPatterns.some(pattern => pattern.test(errorMessage))
}

/**
 * Get recent errors for debugging
 */
export const getRecentErrors = (count: number = 10): ErrorLogEntry[] => {
    return errorBuffer.slice(-count)
}

/**
 * Get errors by type
 */
export const getErrorsByType = (type: ErrorLogEntry['type']): ErrorLogEntry[] => {
    return errorBuffer.filter(entry => entry.type === type)
}

/**
 * Clear error buffer (for testing)
 */
export const clearErrorBuffer = (): void => {
    errorBuffer.length = 0
}

/**
 * Create error summary for monitoring dashboards
 */
export const getErrorSummary = (): Record<string, number> => {
    const summary: Record<string, number> = {
        api_error: 0,
        validation_error: 0,
        auth_error: 0,
        schema_error: 0,
        total: 0
    }

    errorBuffer.forEach(entry => {
        summary[entry.type]++
        summary.total++
    })

    return summary
}

/**
 * Wrapper for fetch that automatically logs errors
 */
export const monitoredFetch = async (
    url: string,
    options?: RequestInit
): Promise<Response> => {
    try {
        const response = await fetch(url, options)

        if (!response.ok) {
            const errorData = await response.clone().json().catch(() => ({}))
            logApiError(
                url,
                response.status,
                errorData.error || `HTTP ${response.status}`,
                errorData
            )
        }

        return response
    } catch (error) {
        logError({
            type: 'api_error',
            message: error instanceof Error ? error.message : 'Network error',
            endpoint: url,
            details: { error }
        })
        throw error
    }
}

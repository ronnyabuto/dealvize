import { offlineManager } from '@/lib/chat/offline-manager'

export interface ChatError {
  code: string
  message: string
  userMessage: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  recoverable: boolean
  retryable: boolean
  context?: Record<string, any>
}

export interface ErrorAction {
  label: string
  action: () => void | Promise<void>
  primary?: boolean
}

export interface ErrorHandlingResult {
  error: ChatError
  actions: ErrorAction[]
  autoRetry?: boolean
  retryDelay?: number
}

class ChatErrorHandler {
  private errorHistory: Map<string, { count: number; lastSeen: Date }> = new Map()
  private maxRetries: Record<string, number> = {
    network: 3,
    server: 2,
    validation: 1,
    auth: 1
  }

  /**
   * Handle and categorize errors with user-friendly messages and actions
   */
  handleError(error: any, context?: Record<string, any>): ErrorHandlingResult {
    const chatError = this.categorizeError(error, context)
    const actions = this.generateActions(chatError, context)
    const shouldAutoRetry = this.shouldAutoRetry(chatError)

    // Track error frequency
    this.trackError(chatError.code)

    return {
      error: chatError,
      actions,
      autoRetry: shouldAutoRetry && chatError.retryable,
      retryDelay: this.getRetryDelay(chatError)
    }
  }

  /**
   * Categorize raw errors into structured chat errors
   */
  private categorizeError(error: any, context?: Record<string, any>): ChatError {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to server',
        userMessage: offlineManager.getOnlineStatus() 
          ? 'Connection problem. Please check your internet connection.'
          : 'You\'re currently offline. Messages will be sent when connection is restored.',
        severity: 'warning',
        recoverable: true,
        retryable: true,
        context
      }
    }

    // HTTP errors
    if (error.status) {
      switch (error.status) {
        case 400:
          return {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            userMessage: 'Please check your message and try again.',
            severity: 'error',
            recoverable: true,
            retryable: false,
            context
          }
          
        case 401:
          return {
            code: 'AUTH_ERROR',
            message: 'Authentication required',
            userMessage: 'Your session has expired. Please sign in again.',
            severity: 'error',
            recoverable: true,
            retryable: false,
            context
          }
          
        case 403:
          return {
            code: 'PERMISSION_ERROR',
            message: 'Permission denied',
            userMessage: 'You don\'t have permission to perform this action.',
            severity: 'error',
            recoverable: false,
            retryable: false,
            context
          }
          
        case 404:
          return {
            code: 'NOT_FOUND_ERROR',
            message: 'Resource not found',
            userMessage: 'The conversation or message could not be found.',
            severity: 'error',
            recoverable: false,
            retryable: false,
            context
          }
          
        case 413:
          return {
            code: 'MESSAGE_TOO_LARGE',
            message: 'Message too large',
            userMessage: 'Your message is too long. Please shorten it and try again.',
            severity: 'warning',
            recoverable: true,
            retryable: false,
            context
          }
          
        case 429:
          return {
            code: 'RATE_LIMIT_ERROR',
            message: 'Too many requests',
            userMessage: 'You\'re sending messages too quickly. Please wait a moment.',
            severity: 'warning',
            recoverable: true,
            retryable: true,
            context
          }
          
        case 500:
        case 502:
        case 503:
          return {
            code: 'SERVER_ERROR',
            message: 'Server error',
            userMessage: 'Something went wrong on our end. Please try again in a moment.',
            severity: 'error',
            recoverable: true,
            retryable: true,
            context
          }
          
        default:
          return {
            code: 'HTTP_ERROR',
            message: `HTTP ${error.status}`,
            userMessage: 'An unexpected error occurred. Please try again.',
            severity: 'error',
            recoverable: true,
            retryable: true,
            context
          }
      }
    }

    // WebSocket/Realtime errors
    if (error.message?.includes('realtime') || error.message?.includes('websocket')) {
      return {
        code: 'REALTIME_ERROR',
        message: 'Real-time connection error',
        userMessage: 'Lost connection to live chat. Attempting to reconnect...',
        severity: 'warning',
        recoverable: true,
        retryable: true,
        context
      }
    }

    // Validation errors
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Validation error',
        userMessage: 'Please check your message and try again.',
        severity: 'warning',
        recoverable: true,
        retryable: false,
        context
      }
    }

    // Timeout errors
    if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
      return {
        code: 'TIMEOUT_ERROR',
        message: 'Request timeout',
        userMessage: 'The request took too long. Please try again.',
        severity: 'warning',
        recoverable: true,
        retryable: true,
        context
      }
    }

    // Generic fallback
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error',
      userMessage: 'Something unexpected happened. Please try again.',
      severity: 'error',
      recoverable: true,
      retryable: true,
      context
    }
  }

  /**
   * Generate appropriate actions for the error
   */
  private generateActions(error: ChatError, context?: Record<string, any>): ErrorAction[] {
    const actions: ErrorAction[] = []

    // Retry action for retryable errors
    if (error.retryable && context?.retryCallback) {
      actions.push({
        label: 'Try Again',
        action: context.retryCallback,
        primary: true
      })
    }

    // Specific actions based on error type
    switch (error.code) {
      case 'AUTH_ERROR':
        actions.push({
          label: 'Sign In',
          action: () => {
            // Redirect to login or trigger auth modal
            if (context?.redirectToLogin) {
              context.redirectToLogin()
            } else {
              window.location.href = '/login'
            }
          },
          primary: true
        })
        break
        
      case 'NETWORK_ERROR':
        if (!offlineManager.getOnlineStatus()) {
          actions.push({
            label: 'View Offline Messages',
            action: () => {
              if (context?.showOfflineMessages) {
                context.showOfflineMessages()
              }
            }
          })
        }
        break
        
      case 'REALTIME_ERROR':
        actions.push({
          label: 'Reconnect',
          action: async () => {
            if (context?.forceReconnect) {
              await context.forceReconnect()
            }
          },
          primary: true
        })
        break
        
      case 'MESSAGE_TOO_LARGE':
        actions.push({
          label: 'Edit Message',
          action: () => {
            if (context?.editMessage) {
              context.editMessage()
            }
          },
          primary: true
        })
        break
        
      case 'RATE_LIMIT_ERROR':
        // Auto-retry after delay, no manual action needed
        break
        
      case 'PERMISSION_ERROR':
        actions.push({
          label: 'Contact Support',
          action: () => {
            if (context?.contactSupport) {
              context.contactSupport()
            }
          }
        })
        break
    }

    // Generic "Dismiss" action
    if (context?.dismissError) {
      actions.push({
        label: 'Dismiss',
        action: context.dismissError
      })
    }

    return actions
  }

  /**
   * Determine if error should be auto-retried
   */
  private shouldAutoRetry(error: ChatError): boolean {
    if (!error.retryable) return false
    
    const errorCount = this.getErrorCount(error.code)
    const maxRetries = this.maxRetries[error.code.toLowerCase().split('_')[0]] || 1
    
    return errorCount < maxRetries
  }

  /**
   * Get retry delay based on error type and count
   */
  private getRetryDelay(error: ChatError): number {
    const baseDelays: Record<string, number> = {
      NETWORK_ERROR: 2000,
      SERVER_ERROR: 3000,
      RATE_LIMIT_ERROR: 5000,
      REALTIME_ERROR: 1000,
      TIMEOUT_ERROR: 2000
    }
    
    const baseDelay = baseDelays[error.code] || 1000
    const errorCount = this.getErrorCount(error.code)
    
    // Exponential backoff
    return baseDelay * Math.pow(2, errorCount - 1)
  }

  /**
   * Track error occurrence
   */
  private trackError(errorCode: string): void {
    const existing = this.errorHistory.get(errorCode)
    if (existing) {
      existing.count++
      existing.lastSeen = new Date()
    } else {
      this.errorHistory.set(errorCode, { count: 1, lastSeen: new Date() })
    }

    // Clean up old error history (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    for (const [code, history] of this.errorHistory) {
      if (history.lastSeen < oneHourAgo) {
        this.errorHistory.delete(code)
      }
    }
  }

  /**
   * Get error count for a specific error code
   */
  private getErrorCount(errorCode: string): number {
    return this.errorHistory.get(errorCode)?.count || 0
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory.clear()
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, { count: number; lastSeen: Date }> {
    return Object.fromEntries(this.errorHistory)
  }

  /**
   * Check if an error code indicates a critical system issue
   */
  isCriticalError(errorCode: string): boolean {
    const criticalErrors = [
      'AUTH_ERROR',
      'PERMISSION_ERROR', 
      'SERVER_ERROR'
    ]
    return criticalErrors.includes(errorCode)
  }

  /**
   * Get user-friendly error message with context
   */
  getContextualErrorMessage(error: ChatError, isOffline: boolean = false): string {
    if (isOffline && error.retryable) {
      return `${error.userMessage} Your message will be sent when you're back online.`
    }
    
    if (this.getErrorCount(error.code) > 2) {
      return `${error.userMessage} This issue persists. Please contact support if it continues.`
    }
    
    return error.userMessage
  }
}

export const chatErrorHandler = new ChatErrorHandler()

/**
 * Utility function to handle async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<{ success: true; data: T } | { success: false; error: ErrorHandlingResult }> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    const errorResult = chatErrorHandler.handleError(error, context)
    return { success: false, error: errorResult }
  }
}
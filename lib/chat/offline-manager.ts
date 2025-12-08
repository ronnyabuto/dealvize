interface OfflineMessage {
  id: string
  conversationId: string
  content: string
  timestamp: Date
  attempts: number
  lastAttempt?: Date
}

interface CachedData {
  conversations: any[]
  messages: Record<string, any[]>
  lastSync: Date
}

/**
 * Manages offline functionality for chat system
 * Handles message queueing, data caching, and sync when online
 */
class OfflineManager {
  private isOnline: boolean = navigator.onLine
  private pendingMessages: Map<string, OfflineMessage> = new Map()
  private cachedData: CachedData = {
    conversations: [],
    messages: {},
    lastSync: new Date(0)
  }
  private maxRetries = 5
  private retryInterval = 5000
  private cacheKey = 'dealvize_offline_cache'
  private pendingKey = 'dealvize_pending_messages'
  
  private onlineListeners: Set<(isOnline: boolean) => void> = new Set()
  private syncListeners: Set<() => void> = new Set()

  constructor() {
    this.loadFromStorage()
    this.setupNetworkListeners()
    this.startRetryTimer()
  }

  /**
   * Check if currently online
   */
  getOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * Subscribe to online status changes
   */
  onOnlineStatusChange(listener: (isOnline: boolean) => void): () => void {
    this.onlineListeners.add(listener)
    return () => this.onlineListeners.delete(listener)
  }

  /**
   * Subscribe to sync events
   */
  onSync(listener: () => void): () => void {
    this.syncListeners.add(listener)
    return () => this.syncListeners.delete(listener)
  }

  /**
   * Queue message for offline sending
   */
  queueMessage(conversationId: string, content: string): string {
    const messageId = crypto.randomUUID()
    const offlineMessage: OfflineMessage = {
      id: messageId,
      conversationId,
      content,
      timestamp: new Date(),
      attempts: 0
    }

    this.pendingMessages.set(messageId, offlineMessage)
    this.savePendingMessages()

    // If online, try to send immediately
    if (this.isOnline) {
      this.processPendingMessages()
    }

    return messageId
  }

  /**
   * Get pending message count
   */
  getPendingMessageCount(): number {
    return this.pendingMessages.size
  }

  /**
   * Get pending messages for a conversation
   */
  getPendingMessages(conversationId?: string): OfflineMessage[] {
    const messages = Array.from(this.pendingMessages.values())
    return conversationId 
      ? messages.filter(m => m.conversationId === conversationId)
      : messages
  }

  /**
   * Cache conversations data
   */
  cacheConversations(conversations: any[]): void {
    this.cachedData.conversations = conversations
    this.cachedData.lastSync = new Date()
    this.saveCache()
  }

  /**
   * Cache messages for a conversation
   */
  cacheMessages(conversationId: string, messages: any[]): void {
    this.cachedData.messages[conversationId] = messages
    this.cachedData.lastSync = new Date()
    this.saveCache()
  }

  /**
   * Get cached conversations
   */
  getCachedConversations(): { data: any[], lastSync: Date } {
    return {
      data: this.cachedData.conversations,
      lastSync: this.cachedData.lastSync
    }
  }

  /**
   * Get cached messages for conversation
   */
  getCachedMessages(conversationId: string): { data: any[], lastSync: Date } {
    return {
      data: this.cachedData.messages[conversationId] || [],
      lastSync: this.cachedData.lastSync
    }
  }

  /**
   * Check if we have recent cached data
   */
  hasRecentCache(maxAge: number = 300000): boolean { // 5 minutes default
    return Date.now() - this.cachedData.lastSync.getTime() < maxAge
  }

  /**
   * Process pending messages (try to send)
   */
  private async processPendingMessages(): Promise<void> {
    if (!this.isOnline || this.pendingMessages.size === 0) return

    const pendingArray = Array.from(this.pendingMessages.values())
    const sendPromises = pendingArray.map(message => this.attemptSendMessage(message))

    try {
      await Promise.allSettled(sendPromises)
    } catch (error) {
      console.error('Error processing pending messages:', error)
    }
  }

  /**
   * Attempt to send a single pending message
   */
  private async attemptSendMessage(message: OfflineMessage): Promise<void> {
    try {
      message.attempts++
      message.lastAttempt = new Date()

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: message.conversationId,
          content: message.content,
          message_type: 'text',
          priority: 'normal'
        })
      })

      if (response.ok) {
        // Success - remove from pending
        this.pendingMessages.delete(message.id)
        this.savePendingMessages()
        
        // Notify sync listeners
        this.syncListeners.forEach(listener => {
          try {
            listener()
          } catch (error) {
            console.error('Error in sync listener:', error)
          }
        })
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.warn(`Failed to send message ${message.id} (attempt ${message.attempts}):`, error)
      
      // Remove if max retries reached
      if (message.attempts >= this.maxRetries) {
        this.pendingMessages.delete(message.id)
        this.savePendingMessages()
      }
    }
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    const handleOnline = () => {
      this.isOnline = true
      this.notifyOnlineListeners()
      // Process pending messages when coming back online
      setTimeout(() => this.processPendingMessages(), 1000)
    }

    const handleOffline = () => {
      this.isOnline = false
      this.notifyOnlineListeners()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Also check periodically in case events don't fire
    setInterval(() => {
      const currentOnlineStatus = navigator.onLine
      if (currentOnlineStatus !== this.isOnline) {
        this.isOnline = currentOnlineStatus
        this.notifyOnlineListeners()
        
        if (currentOnlineStatus) {
          setTimeout(() => this.processPendingMessages(), 1000)
        }
      }
    }, 10000)
  }

  /**
   * Notify online status listeners
   */
  private notifyOnlineListeners(): void {
    this.onlineListeners.forEach(listener => {
      try {
        listener(this.isOnline)
      } catch (error) {
        console.error('Error in online status listener:', error)
      }
    })
  }

  /**
   * Start retry timer for failed messages
   */
  private startRetryTimer(): void {
    setInterval(async () => {
      if (this.isOnline && this.pendingMessages.size > 0) {
        // Only retry messages that haven't been attempted recently
        const now = new Date()
        const retryableMessages = Array.from(this.pendingMessages.values())
          .filter(msg => 
            msg.attempts < this.maxRetries && 
            (!msg.lastAttempt || now.getTime() - msg.lastAttempt.getTime() > this.retryInterval)
          )

        for (const message of retryableMessages) {
          await this.attemptSendMessage(message)
        }
      }
    }, this.retryInterval)
  }

  /**
   * Save cache to localStorage
   */
  private saveCache(): void {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(this.cachedData))
    } catch (error) {
      console.warn('Failed to save offline cache:', error)
    }
  }

  /**
   * Save pending messages to localStorage
   */
  private savePendingMessages(): void {
    try {
      const pendingArray = Array.from(this.pendingMessages.entries())
      localStorage.setItem(this.pendingKey, JSON.stringify(pendingArray))
    } catch (error) {
      console.warn('Failed to save pending messages:', error)
    }
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage(): void {
    try {
      // Load cache
      const savedCache = localStorage.getItem(this.cacheKey)
      if (savedCache) {
        const parsed = JSON.parse(savedCache)
        this.cachedData = {
          ...parsed,
          lastSync: new Date(parsed.lastSync)
        }
      }

      // Load pending messages
      const savedPending = localStorage.getItem(this.pendingKey)
      if (savedPending) {
        const pendingArray = JSON.parse(savedPending)
        this.pendingMessages = new Map(
          pendingArray.map(([id, message]: [string, any]) => [
            id,
            {
              ...message,
              timestamp: new Date(message.timestamp),
              lastAttempt: message.lastAttempt ? new Date(message.lastAttempt) : undefined
            }
          ])
        )
      }
    } catch (error) {
      console.warn('Failed to load offline data:', error)
    }
  }

  /**
   * Clear all offline data
   */
  clearOfflineData(): void {
    this.pendingMessages.clear()
    this.cachedData = {
      conversations: [],
      messages: {},
      lastSync: new Date(0)
    }
    localStorage.removeItem(this.cacheKey)
    localStorage.removeItem(this.pendingKey)
  }

  /**
   * Manual sync trigger
   */
  async syncNow(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline')
    }

    await this.processPendingMessages()
    
    // Notify listeners that sync completed
    this.syncListeners.forEach(listener => {
      try {
        listener()
      } catch (error) {
        console.error('Error in sync listener:', error)
      }
    })
  }
}

export const offlineManager = new OfflineManager()
export { OfflineManager }
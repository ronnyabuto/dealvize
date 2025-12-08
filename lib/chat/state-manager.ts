import { Message, Conversation } from '@/lib/types/chat'

interface MessageQueue {
  id: string
  conversationId: string
  content: string
  tempId: string
  timestamp: Date
  retryCount: number
  status: 'pending' | 'sending' | 'failed'
}

interface ConversationState {
  messages: Message[]
  isLoading: boolean
  hasMore: boolean
  lastFetched?: Date
  optimisticMessages: Set<string>
}

interface ChatState {
  conversations: Map<string, ConversationState>
  activeConversationId: string | null
  sendQueue: Map<string, MessageQueue>
  connectionState: 'connected' | 'disconnected' | 'reconnecting'
}

type StateListener = (state: ChatState) => void

/**
 * Centralized state management for chat system
 * Handles race conditions, optimistic updates, and message queuing
 */
class ChatStateManager {
  private state: ChatState = {
    conversations: new Map(),
    activeConversationId: null,
    sendQueue: new Map(),
    connectionState: 'disconnected'
  }

  private listeners: Set<StateListener> = new Set()
  private persistenceKey = 'dealvize_chat_state'
  private maxRetries = 3
  private retryDelay = 1000

  constructor() {
    this.loadFromPersistence()
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Get current state (immutable copy)
   */
  getState(): Readonly<ChatState> {
    return {
      ...this.state,
      conversations: new Map(this.state.conversations),
      sendQueue: new Map(this.state.sendQueue)
    }
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<ChatState>): void {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
    this.persistState()
  }

  private notifyListeners(): void {
    const immutableState = this.getState()
    this.listeners.forEach(listener => {
      try {
        listener(immutableState)
      } catch (error) {
        console.error('Error in state listener:', error)
      }
    })
  }

  /**
   * Set active conversation
   */
  setActiveConversation(conversationId: string | null): void {
    this.updateState({ activeConversationId: conversationId })
  }

  /**
   * Get conversation state
   */
  getConversationState(conversationId: string): ConversationState | null {
    return this.state.conversations.get(conversationId) || null
  }

  /**
   * Initialize conversation state if not exists
   */
  private ensureConversationState(conversationId: string): ConversationState {
    if (!this.state.conversations.has(conversationId)) {
      const newState: ConversationState = {
        messages: [],
        isLoading: false,
        hasMore: true,
        optimisticMessages: new Set()
      }
      this.state.conversations.set(conversationId, newState)
    }
    return this.state.conversations.get(conversationId)!
  }

  /**
   * Set loading state for conversation
   */
  setConversationLoading(conversationId: string, isLoading: boolean): void {
    const convState = this.ensureConversationState(conversationId)
    convState.isLoading = isLoading
    this.notifyListeners()
  }

  /**
   * Add messages to conversation (handles deduplication and ordering)
   */
  addMessages(conversationId: string, messages: Message[], append: boolean = true): void {
    const convState = this.ensureConversationState(conversationId)
    
    // Create a map for efficient lookup
    const existingMessageIds = new Set(convState.messages.map(m => m.id))
    
    // Filter out duplicates and temporary messages that were confirmed
    const newMessages = messages.filter(msg => {
      const isDuplicate = existingMessageIds.has(msg.id)
      if (isDuplicate && convState.optimisticMessages.has(msg.id)) {
        // Remove from optimistic set as it's now confirmed
        convState.optimisticMessages.delete(msg.id)
      }
      return !isDuplicate
    })

    if (newMessages.length > 0) {
      if (append) {
        convState.messages = [...convState.messages, ...newMessages]
      } else {
        convState.messages = [...newMessages, ...convState.messages]
      }
      
      // Sort by timestamp to maintain order
      convState.messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      
      convState.lastFetched = new Date()
      this.notifyListeners()
    }
  }

  /**
   * Add optimistic message (before server confirmation)
   */
  addOptimisticMessage(conversationId: string, message: Omit<Message, 'id'> & { tempId: string }): string {
    const convState = this.ensureConversationState(conversationId)
    
    const optimisticMessage: Message = {
      ...message,
      id: message.tempId, // Use tempId as id temporarily
      status: 'sent', // Will be updated when confirmed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Mark as optimistic
    convState.optimisticMessages.add(message.tempId)
    
    // Add to messages
    convState.messages = [...convState.messages, optimisticMessage]
    
    this.notifyListeners()
    return message.tempId
  }

  /**
   * Update message (handles optimistic to real message conversion)
   */
  updateMessage(conversationId: string, messageId: string, updates: Partial<Message>): void {
    const convState = this.state.conversations.get(conversationId)
    if (!convState) return

    const messageIndex = convState.messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const updatedMessage = {
      ...convState.messages[messageIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }

    convState.messages[messageIndex] = updatedMessage

    // If this was an optimistic message that got a real ID, update it
    if (updates.id && updates.id !== messageId) {
      updatedMessage.id = updates.id
      convState.optimisticMessages.delete(messageId)
    }

    this.notifyListeners()
  }

  /**
   * Remove message
   */
  removeMessage(conversationId: string, messageId: string): void {
    const convState = this.state.conversations.get(conversationId)
    if (!convState) return

    convState.messages = convState.messages.filter(m => m.id !== messageId)
    convState.optimisticMessages.delete(messageId)
    this.notifyListeners()
  }

  /**
   * Queue message for sending (handles network failures)
   */
  queueMessage(conversationId: string, content: string, tempId: string): void {
    const queueItem: MessageQueue = {
      id: crypto.randomUUID(),
      conversationId,
      content,
      tempId,
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending'
    }

    this.state.sendQueue.set(queueItem.id, queueItem)
    this.notifyListeners()
  }

  /**
   * Mark queued message as sending
   */
  markQueuedMessageSending(queueId: string): void {
    const queueItem = this.state.sendQueue.get(queueId)
    if (queueItem) {
      queueItem.status = 'sending'
      this.notifyListeners()
    }
  }

  /**
   * Remove message from queue (successful send)
   */
  removeFromQueue(queueId: string): void {
    this.state.sendQueue.delete(queueId)
    this.notifyListeners()
  }

  /**
   * Mark queued message as failed
   */
  markQueuedMessageFailed(queueId: string): void {
    const queueItem = this.state.sendQueue.get(queueId)
    if (queueItem) {
      queueItem.status = 'failed'
      queueItem.retryCount++
      
      if (queueItem.retryCount >= this.maxRetries) {
        // Remove from queue after max retries
        this.state.sendQueue.delete(queueId)
        // Update optimistic message to show failed state
        this.updateMessage(queueItem.conversationId, queueItem.tempId, { status: 'failed' })
      }
      
      this.notifyListeners()
    }
  }

  /**
   * Get failed messages that can be retried
   */
  getRetryableMessages(): MessageQueue[] {
    return Array.from(this.state.sendQueue.values())
      .filter(item => item.status === 'failed' && item.retryCount < this.maxRetries)
  }

  /**
   * Update connection state
   */
  setConnectionState(state: 'connected' | 'disconnected' | 'reconnecting'): void {
    this.updateState({ connectionState: state })
  }

  /**
   * Clear conversation data
   */
  clearConversation(conversationId: string): void {
    this.state.conversations.delete(conversationId)
    // Remove any queued messages for this conversation
    for (const [queueId, item] of this.state.sendQueue) {
      if (item.conversationId === conversationId) {
        this.state.sendQueue.delete(queueId)
      }
    }
    this.notifyListeners()
  }

  /**
   * Persist state to localStorage
   */
  private persistState(): void {
    try {
      const persistableState = {
        activeConversationId: this.state.activeConversationId,
        conversations: Array.from(this.state.conversations.entries()).map(([id, state]) => [
          id,
          {
            ...state,
            optimisticMessages: Array.from(state.optimisticMessages)
          }
        ]),
        sendQueue: Array.from(this.state.sendQueue.entries())
      }
      
      localStorage.setItem(this.persistenceKey, JSON.stringify(persistableState))
    } catch (error) {
      console.warn('Failed to persist chat state:', error)
    }
  }

  /**
   * Load state from localStorage
   */
  private loadFromPersistence(): void {
    try {
      const saved = localStorage.getItem(this.persistenceKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        
        this.state.activeConversationId = parsed.activeConversationId
        
        if (parsed.conversations) {
          this.state.conversations = new Map(
            parsed.conversations.map(([id, state]: [string, any]) => [
              id,
              {
                ...state,
                optimisticMessages: new Set(state.optimisticMessages || [])
              }
            ])
          )
        }
        
        if (parsed.sendQueue) {
          this.state.sendQueue = new Map(parsed.sendQueue)
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted chat state:', error)
    }
  }

  /**
   * Clear all persisted data
   */
  clearPersistedData(): void {
    localStorage.removeItem(this.persistenceKey)
    this.state = {
      conversations: new Map(),
      activeConversationId: null,
      sendQueue: new Map(),
      connectionState: 'disconnected'
    }
    this.notifyListeners()
  }
}

export const chatStateManager = new ChatStateManager()
export { ChatStateManager }
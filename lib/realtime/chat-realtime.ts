'use client'

import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_id: string | null
  sender_name: string | null
  sender_email: string | null
  content: string
  message_type: 'text' | 'html' | 'file' | 'image' | 'audio' | 'video' | 'system'
  direction: 'inbound' | 'outbound'
  status: 'draft' | 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_read: boolean
  is_starred: boolean
  attachments: any[]
  created_at: string
  updated_at: string
  sent_at?: string
}

export interface Conversation {
  id: string
  title?: string
  customer_id: string | null
  deal_id: string | null
  assigned_agent_id: string | null
  channel_type: string
  status: 'open' | 'assigned' | 'resolved' | 'closed' | 'archived'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  message_count: number
  created_at: string
  updated_at: string
  last_message?: ConversationMessage
}

export interface TypingIndicator {
  conversation_id: string
  user_id: string
  user_name: string
  is_typing: boolean
  timestamp: number
}

export interface PresenceState {
  user_id: string
  online_at: string
  status: 'online' | 'away' | 'busy' | 'offline'
  conversation_id?: string
}

class ChatRealtimeManager {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()
  private presenceChannel: RealtimeChannel | null = null
  private userId: string | null = null
  private connectionRetryCount = 0
  private maxRetries = 5
  private retryDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  
  // Event listeners
  private messageListeners: Map<string, (message: ConversationMessage) => void> = new Map()
  private conversationListeners: Map<string, (conversation: Conversation) => void> = new Map()
  private typingListeners: Map<string, (typing: TypingIndicator) => void> = new Map()
  private presenceListeners: Map<string, (presence: PresenceState[]) => void> = new Map()
  private connectionListeners: Map<string, (status: 'connected' | 'disconnected' | 'reconnecting' | 'error') => void> = new Map()

  async initialize(userId: string) {
    this.userId = userId
    await this.initializePresence()
    this.startHeartbeat()
  }

  private async initializePresence() {
    if (!this.userId) return

    this.presenceChannel = this.supabase.channel('online-users', {
      config: {
        presence: {
          key: this.userId
        }
      }
    })

    this.presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel!.presenceState()
        const users = Object.keys(state).map(userId => ({
          user_id: userId,
          ...state[userId][0]
        })) as unknown as PresenceState[]
        
        this.notifyPresenceListeners(users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const users = newPresences.map(presence => ({
          user_id: key,
          ...presence
        })) as unknown as PresenceState[]

        this.notifyPresenceListeners(users)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const users = leftPresences.map(presence => ({
          user_id: key,
          ...presence
        })) as unknown as PresenceState[]
        
        this.notifyPresenceListeners(users)
      })

    await this.presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.presenceChannel!.track({
          online_at: new Date().toISOString(),
          status: 'online'
        })
        this.notifyConnectionListeners('connected')
      } else if (status === 'CHANNEL_ERROR') {
        this.notifyConnectionListeners('error')
        this.handleReconnection()
      }
    })
  }

  async subscribeToConversation(
    conversationId: string,
    callbacks: {
      onMessage?: (message: ConversationMessage) => void
      onMessageUpdate?: (message: ConversationMessage) => void
      onTyping?: (typing: TypingIndicator) => void
      onConversationUpdate?: (conversation: Conversation) => void
    }
  ) {
    if (!this.userId) {
      throw new Error('Must initialize with userId first')
    }

    // Unsubscribe if already subscribed
    await this.unsubscribeFromConversation(conversationId)

    const channelName = `conversation:${conversationId}`
    const channel = this.supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false // Don't receive our own broadcasts
        }
      }
    })

    // Listen for new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload: RealtimePostgresChangesPayload<ConversationMessage>) => {
        if (callbacks.onMessage && payload.new) {
          callbacks.onMessage(payload.new as ConversationMessage)
        }
      }
    )

    // Listen for message updates (read status, etc.)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload: RealtimePostgresChangesPayload<ConversationMessage>) => {
        if (callbacks.onMessageUpdate && payload.new) {
          callbacks.onMessageUpdate(payload.new as ConversationMessage)
        }
      }
    )

    // Listen for conversation updates
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      },
      (payload: RealtimePostgresChangesPayload<Conversation>) => {
        if (callbacks.onConversationUpdate && payload.new) {
          callbacks.onConversationUpdate(payload.new as Conversation)
        }
      }
    )

    // Listen for typing indicators
    channel.on(
      'broadcast',
      { event: 'typing' },
      (payload: { payload: TypingIndicator }) => {
        if (callbacks.onTyping && payload.payload.user_id !== this.userId) {
          callbacks.onTyping(payload.payload)
        }
      }
    )

    // Listen for live message updates (optimistic updates)
    channel.on(
      'broadcast',
      { event: 'message_optimistic' },
      (payload: { payload: ConversationMessage }) => {
        if (callbacks.onMessage && payload.payload.sender_id !== this.userId) {
          callbacks.onMessage(payload.payload)
        }
      }
    )

    await channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to conversation ${conversationId}`)
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Failed to subscribe to conversation ${conversationId}`)
        this.handleReconnection()
      }
    })

    this.channels.set(conversationId, channel)
  }

  async unsubscribeFromConversation(conversationId: string) {
    const channel = this.channels.get(conversationId)
    if (channel) {
      await this.supabase.removeChannel(channel)
      this.channels.delete(conversationId)
      console.log(`🔌 Unsubscribed from conversation ${conversationId}`)
    }
  }

  async sendTypingIndicator(conversationId: string, isTyping: boolean) {
    if (!this.userId) return

    const channel = this.channels.get(conversationId)
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          conversation_id: conversationId,
          user_id: this.userId,
          user_name: 'Current User', // Should get from user context
          is_typing: isTyping,
          timestamp: Date.now()
        }
      })
    }
  }

  async broadcastOptimisticMessage(conversationId: string, message: ConversationMessage) {
    const channel = this.channels.get(conversationId)
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'message_optimistic',
        payload: message
      })
    }
  }

  async updatePresenceStatus(status: 'online' | 'away' | 'busy' | 'offline', conversationId?: string) {
    if (this.presenceChannel) {
      await this.presenceChannel.track({
        online_at: new Date().toISOString(),
        status,
        conversation_id: conversationId
      })
    }
  }

  // Event listener management
  onMessage(listenerId: string, callback: (message: ConversationMessage) => void) {
    this.messageListeners.set(listenerId, callback)
  }

  onConversationUpdate(listenerId: string, callback: (conversation: Conversation) => void) {
    this.conversationListeners.set(listenerId, callback)
  }

  onTyping(listenerId: string, callback: (typing: TypingIndicator) => void) {
    this.typingListeners.set(listenerId, callback)
  }

  onPresence(listenerId: string, callback: (presence: PresenceState[]) => void) {
    this.presenceListeners.set(listenerId, callback)
  }

  onConnection(listenerId: string, callback: (status: 'connected' | 'disconnected' | 'reconnecting' | 'error') => void) {
    this.connectionListeners.set(listenerId, callback)
  }

  // Remove event listeners
  removeListener(listenerId: string) {
    this.messageListeners.delete(listenerId)
    this.conversationListeners.delete(listenerId)
    this.typingListeners.delete(listenerId)
    this.presenceListeners.delete(listenerId)
    this.connectionListeners.delete(listenerId)
  }

  private notifyPresenceListeners(presence: PresenceState[]) {
    this.presenceListeners.forEach(callback => callback(presence))
  }

  private notifyConnectionListeners(status: 'connected' | 'disconnected' | 'reconnecting' | 'error') {
    this.connectionListeners.forEach(callback => callback(status))
  }

  private async handleReconnection() {
    if (this.connectionRetryCount >= this.maxRetries) {
      console.error('❌ Max reconnection attempts reached')
      this.notifyConnectionListeners('error')
      return
    }

    this.connectionRetryCount++
    this.notifyConnectionListeners('reconnecting')
    
    console.log(`🔄 Attempting reconnection ${this.connectionRetryCount}/${this.maxRetries}`)
    
    await new Promise(resolve => setTimeout(resolve, this.retryDelay * this.connectionRetryCount))
    
    try {
      await this.cleanup()
      if (this.userId) {
        await this.initialize(this.userId)
        this.connectionRetryCount = 0
        this.notifyConnectionListeners('connected')
      }
    } catch (error) {
      console.error('Reconnection failed:', error)
      this.handleReconnection()
    }
  }

  private startHeartbeat() {
    // Send heartbeat every 30 seconds to maintain connection
    this.heartbeatInterval = setInterval(async () => {
      if (this.presenceChannel) {
        await this.updatePresenceStatus('online')
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  async cleanup() {
    this.stopHeartbeat()
    
    // Unsubscribe from all conversation channels
    for (const [conversationId] of this.channels) {
      await this.unsubscribeFromConversation(conversationId)
    }

    // Unsubscribe from presence channel
    if (this.presenceChannel) {
      await this.supabase.removeChannel(this.presenceChannel)
      this.presenceChannel = null
    }

    // Clear all listeners
    this.messageListeners.clear()
    this.conversationListeners.clear()
    this.typingListeners.clear()
    this.presenceListeners.clear()
    this.connectionListeners.clear()

    this.userId = null
    this.connectionRetryCount = 0
  }

  // Utility method to check connection status
  isConnected(): boolean {
    return this.presenceChannel?.state === 'joined'
  }

  // Get current presence state
  getCurrentPresence(): PresenceState[] {
    if (!this.presenceChannel) return []
    
    const state = this.presenceChannel.presenceState()
    return Object.keys(state).map(userId => ({
      user_id: userId,
      ...state[userId][0]
    })) as unknown as PresenceState[]
  }
}

// Singleton instance
export const chatRealtime = new ChatRealtimeManager()

// React hook for easier usage
export function useChatRealtime() {
  return chatRealtime
}
'use client'

import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import type { Message, Conversation, TypingIndicator, PresenceState } from '@/lib/types/chat'

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  lastConnected?: Date
  reconnectAttempts: number
  error?: string
}

interface RealtimeCallbacks {
  onMessage?: (message: Message) => void
  onMessageUpdate?: (message: Message) => void
  onTyping?: (typing: TypingIndicator) => void
  onConnectionStateChange?: (state: ConnectionState) => void
}

class ChatRealtime {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()
  private presenceChannel: RealtimeChannel | null = null
  private userId: string | null = null
  private connectionState: ConnectionState = {
    status: 'disconnected',
    reconnectAttempts: 0
  }
  private reconnectTimer: NodeJS.Timeout | null = null
  private maxReconnectAttempts = 5
  private baseReconnectDelay = 1000
  private callbacks: Map<string, RealtimeCallbacks> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null

  async initialize(userId: string): Promise<void> {
    this.userId = userId
    this.updateConnectionState({ status: 'connecting', reconnectAttempts: 0 })
    
    try {
      await this.initializePresence()
      this.startHeartbeat()
      this.updateConnectionState({ 
        status: 'connected', 
        lastConnected: new Date(),
        reconnectAttempts: 0 
      })
    } catch (error) {
      this.updateConnectionState({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Connection failed'
      })
      this.scheduleReconnect()
    }
  }

  private async initializePresence(): Promise<void> {
    if (!this.userId) throw new Error('User ID required for presence')

    return new Promise((resolve, reject) => {
      this.presenceChannel = this.supabase.channel('presence', {
        config: { presence: { key: this.userId } }
      })

      let subscribeTimeout: NodeJS.Timeout

      this.presenceChannel.subscribe(async (status) => {
        clearTimeout(subscribeTimeout)
        
        if (status === 'SUBSCRIBED') {
          try {
            await this.presenceChannel!.track({
              user_id: this.userId,
              status: 'online',
              online_at: new Date().toISOString()
            })
            resolve()
          } catch (error) {
            reject(error)
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`Presence subscription failed: ${status}`))
        }
      })

      // Timeout for subscription
      subscribeTimeout = setTimeout(() => {
        reject(new Error('Presence subscription timeout'))
      }, 10000)
    })
  }

  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates }
    
    // Notify all conversation callbacks of connection state changes
    this.callbacks.forEach(callback => {
      callback.onConnectionStateChange?.(this.connectionState)
    })
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.presenceChannel && this.userId) {
        try {
          await this.presenceChannel.track({
            user_id: this.userId,
            status: 'online',
            online_at: new Date().toISOString()
          })
        } catch (error) {
          console.warn('Heartbeat failed:', error)
          this.handleConnectionError(error)
        }
      }
    }, 30000) // Heartbeat every 30 seconds
  }

  private scheduleReconnect(): void {
    if (this.connectionState.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionState({ 
        status: 'error', 
        error: 'Max reconnection attempts reached' 
      })
      return
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.connectionState.reconnectAttempts)
    
    this.reconnectTimer = setTimeout(async () => {
      if (this.userId) {
        this.updateConnectionState({ 
          reconnectAttempts: this.connectionState.reconnectAttempts + 1 
        })
        await this.initialize(this.userId)
      }
    }, delay)
  }

  private handleConnectionError(error: any): void {
    this.updateConnectionState({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Connection error'
    })
    this.scheduleReconnect()
  }

  async subscribeToConversation(conversationId: string, callbacks: RealtimeCallbacks): Promise<void> {
    if (this.channels.has(conversationId)) {
      await this.unsubscribeFromConversation(conversationId)
    }

    // Store callbacks for connection state updates
    this.callbacks.set(conversationId, callbacks)

    if (this.connectionState.status !== 'connected') {
      throw new Error('Cannot subscribe to conversation: not connected to realtime')
    }

    return new Promise((resolve, reject) => {
      const channel = this.supabase.channel(`conversation:${conversationId}`)
      let subscribeTimeout: NodeJS.Timeout

      // Enhanced error handling for postgres changes
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        try {
          if (callbacks.onMessage && payload.new) {
            callbacks.onMessage(payload.new as Message)
          }
        } catch (error) {
          console.error('Error processing new message:', error)
        }
      })

      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        try {
          if (callbacks.onMessageUpdate && payload.new) {
            callbacks.onMessageUpdate(payload.new as Message)
          }
        } catch (error) {
          console.error('Error processing message update:', error)
        }
      })

      // Enhanced typing indicator with validation
      channel.on('broadcast', { event: 'typing' }, (payload) => {
        try {
          if (callbacks.onTyping && 
              payload.payload.user_id !== this.userId &&
              payload.payload.conversation_id === conversationId) {
            callbacks.onTyping(payload.payload as TypingIndicator)
          }
        } catch (error) {
          console.error('Error processing typing indicator:', error)
        }
      })

      // Handle channel status changes
      channel.subscribe(async (status) => {
        clearTimeout(subscribeTimeout)
        
        if (status === 'SUBSCRIBED') {
          this.channels.set(conversationId, channel)
          resolve()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.callbacks.delete(conversationId)
          reject(new Error(`Channel subscription failed: ${status}`))
        } else if (status === 'CLOSED') {
          // Handle unexpected channel closure
          this.channels.delete(conversationId)
          this.callbacks.delete(conversationId)
          this.handleConnectionError(new Error('Channel closed unexpectedly'))
        }
      })

      // Subscription timeout
      subscribeTimeout = setTimeout(() => {
        this.callbacks.delete(conversationId)
        reject(new Error('Channel subscription timeout'))
      }, 10000)
    })
  }

  async unsubscribeFromConversation(conversationId: string): Promise<void> {
    const channel = this.channels.get(conversationId)
    if (channel) {
      try {
        await this.supabase.removeChannel(channel)
      } catch (error) {
        console.warn('Error removing channel:', error)
      } finally {
        this.channels.delete(conversationId)
        this.callbacks.delete(conversationId)
      }
    }
  }

  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    if (!this.userId || this.connectionState.status !== 'connected') {
      return
    }

    const channel = this.channels.get(conversationId)
    if (channel) {
      try {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            conversation_id: conversationId,
            user_id: this.userId,
            user_name: '', // Will be filled by the UI layer
            is_typing: isTyping,
            timestamp: Date.now()
          }
        })
      } catch (error) {
        console.warn('Failed to send typing indicator:', error)
      }
    }
  }

  async updatePresenceStatus(status: 'online' | 'away' | 'offline'): Promise<void> {
    if (this.presenceChannel && this.userId) {
      try {
        await this.presenceChannel.track({
          user_id: this.userId,
          status,
          online_at: new Date().toISOString()
        })
      } catch (error) {
        console.warn('Failed to update presence status:', error)
      }
    }
  }

  async cleanup(): Promise<void> {
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Unsubscribe from all channels
    const unsubscribePromises = Array.from(this.channels.keys()).map(
      conversationId => this.unsubscribeFromConversation(conversationId)
    )
    
    await Promise.allSettled(unsubscribePromises)

    // Clean up presence
    if (this.presenceChannel) {
      try {
        await this.supabase.removeChannel(this.presenceChannel)
      } catch (error) {
        console.warn('Error removing presence channel:', error)
      } finally {
        this.presenceChannel = null
      }
    }

    // Reset state
    this.userId = null
    this.callbacks.clear()
    this.updateConnectionState({ 
      status: 'disconnected', 
      reconnectAttempts: 0,
      error: undefined 
    })
  }

  isConnected(): boolean {
    return this.connectionState.status === 'connected'
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  // Force reconnection (useful for manual retry)
  async forceReconnect(): Promise<void> {
    if (this.userId) {
      await this.cleanup()
      await this.initialize(this.userId)
    }
  }
}

export const chatRealtime = new ChatRealtime()
export { ChatRealtime }
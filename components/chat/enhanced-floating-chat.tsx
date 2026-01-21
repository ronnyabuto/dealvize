'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  MessageCircle, X, Send, Minimize2, Maximize2, 
  Bot, User, ArrowLeft, Search, Loader2, AlertTriangle,
  Wifi, WifiOff, RotateCcw, Clock, CheckCircle, XCircle,
  Paperclip, Image, Smile, MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

// Enhanced imports for industry-standard features
import { chatRealtime } from '@/lib/chat/realtime'
import { chatStateManager } from '@/lib/chat/state-manager'
import { offlineManager } from '@/lib/chat/offline-manager'
import { chatErrorHandler, withErrorHandling, type ErrorAction } from '@/lib/chat/error-handler'
import { useKeyboardNavigation, useConversationListNavigation, useMessageInputNavigation } from '@/lib/hooks/useKeyboardNavigation'
import { useChatAccessibility, useFocusManagement, useAriaDescriptions } from '@/lib/hooks/useChatAccessibility'
import type { Message, Conversation } from '@/lib/types/chat'

interface EnhancedFloatingChatProps {
  userId: string
  userName: string
  userEmail: string
  className?: string
  onClose?: () => void
  initialConversationId?: string
  enableOfflineSupport?: boolean
  maxMessageLength?: number
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  error?: string
}

interface ErrorState {
  message: string
  actions: ErrorAction[]
  dismissible: boolean
  severity: 'info' | 'warning' | 'error'
}

export function EnhancedFloatingChat({
  userId,
  userName,
  userEmail,
  className,
  onClose,
  initialConversationId,
  enableOfflineSupport = true,
  maxMessageLength = 2000
}: EnhancedFloatingChatProps) {
  // Core UI state
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'conversations' | 'ai'>('conversations')
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || null)
  
  // Data state from state manager
  const [chatState, setChatState] = useState(chatStateManager.getState())
  const [loading, setLoading] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected'
  })
  
  // Input state
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  
  // Error and offline state
  const [error, setError] = useState<ErrorState | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [pendingMessageCount, setPendingMessageCount] = useState(0)
  
  // Navigation state for keyboard accessibility
  const [selectedConversationIndex, setSelectedConversationIndex] = useState(-1)
  const [conversations, setConversations] = useState<Conversation[]>([])
  
  // Refs for DOM manipulation and focus management
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  // Accessibility hooks
  const { storePreviousFocus, restorePreviousFocus, focusFirstInteractive, trapFocus } = useFocusManagement()
  const { announceNewMessage, announceConnectionChange, announceError, announceConversationChange } = useChatAccessibility({
    onNewMessage: (message, sender) => {
      // Additional custom handling if needed
    }
  })
  
  const { getConversationDescription, getMessageDescription, getInputDescription } = useAriaDescriptions({
    messageCount: activeConversationId ? chatState.conversations.get(activeConversationId)?.messages.length || 0 : 0,
    unreadCount: getUnreadCount(),
    connectionStatus: connectionState.status,
    typingUsers: [] // Would be populated from typing indicators
  })

  // Memoized filtered conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => 
      !searchQuery || 
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customer?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [conversations, searchQuery])

  // Get current conversation messages
  const activeMessages = useMemo(() => {
    if (!activeConversationId) return []
    return chatState.conversations.get(activeConversationId)?.messages || []
  }, [chatState, activeConversationId])

  // Get total unread count
  function getUnreadCount(): number {
    return Array.from(chatState.conversations.values()).reduce((sum, conv) => {
      return sum + conv.messages.filter(msg => !msg.is_read && msg.direction === 'inbound').length
    }, 0)
  }

  // Subscribe to state manager changes
  useEffect(() => {
    const unsubscribe = chatStateManager.subscribe(setChatState)
    return unsubscribe
  }, [])

  // Subscribe to offline manager changes
  useEffect(() => {
    if (!enableOfflineSupport) return

    const handleOnlineStatus = (online: boolean) => {
      setIsOffline(!online)
      announceConnectionChange(online ? 'connected' : 'disconnected')
    }

    const handleSync = () => {
      setPendingMessageCount(offlineManager.getPendingMessageCount())
    }

    const unsubscribeOnline = offlineManager.onOnlineStatusChange(handleOnlineStatus)
    const unsubscribeSync = offlineManager.onSync(handleSync)

    // Initial state
    setIsOffline(!offlineManager.getOnlineStatus())
    setPendingMessageCount(offlineManager.getPendingMessageCount())

    return () => {
      unsubscribeOnline()
      unsubscribeSync()
    }
  }, [enableOfflineSupport, announceConnectionChange])

  // Initialize realtime connection
  useEffect(() => {
    if (isOpen && userId) {
      initializeRealtime()
    }
    
    return () => {
      if (!isOpen) {
        chatRealtime.cleanup()
        chatStateManager.setConnectionState('disconnected')
      }
    }
  }, [isOpen, userId])

  // Load conversations when opened
  useEffect(() => {
    if (isOpen) {
      loadConversations()
    }
  }, [isOpen])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeMessages])

  // Focus management when chat opens/closes
  useEffect(() => {
    if (isOpen) {
      storePreviousFocus()
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (chatContainerRef.current) {
          focusFirstInteractive(chatContainerRef.current)
        }
      }, 100)
    } else {
      restorePreviousFocus()
    }
  }, [isOpen, storePreviousFocus, restorePreviousFocus, focusFirstInteractive])

  // Keyboard navigation for chat
  useKeyboardNavigation({
    onEscape: () => {
      if (isOpen) {
        if (activeConversationId) {
          setActiveConversationId(null)
        } else {
          setIsOpen(false)
        }
      }
    },
    enabled: isOpen
  })

  // Conversation list navigation
  useConversationListNavigation({
    conversations: filteredConversations,
    selectedIndex: selectedConversationIndex,
    onSelectionChange: setSelectedConversationIndex,
    onConversationSelect: (conversationId) => {
      selectConversation(conversationId)
      setSelectedConversationIndex(-1)
    },
    enabled: isOpen && !activeConversationId
  })

  // Message input navigation
  useMessageInputNavigation({
    onSend: () => sendMessage(),
    onEscape: () => setActiveConversationId(null),
    enabled: isOpen && !!activeConversationId
  })

  const initializeRealtime = async () => {
    try {
      setConnectionState({ status: 'connecting' })
      
      await chatRealtime.initialize(userId)
      
      setConnectionState({ status: 'connected' })
      chatStateManager.setConnectionState('connected')
      announceConnectionChange('connected')
    } catch (error) {
      const errorResult = chatErrorHandler.handleError(error, {
        forceReconnect: initializeRealtime,
        dismissError: () => setError(null)
      })
      
      setConnectionState({ 
        status: 'error', 
        error: errorResult.error.userMessage 
      })
      setError({
        message: errorResult.error.userMessage,
        actions: errorResult.actions,
        dismissible: true,
        severity: errorResult.error.severity as 'info' | 'warning' | 'error'
      })
      
      announceError(errorResult.error.userMessage)
      
      if (errorResult.autoRetry) {
        setTimeout(initializeRealtime, errorResult.retryDelay || 5000)
      }
    }
  }

  const loadConversations = async () => {
    const result = await withErrorHandling(async () => {
      setLoading(true)
      
      // Try to use cached data first if offline
      if (isOffline && enableOfflineSupport) {
        const cached = offlineManager.getCachedConversations()
        if (cached.data.length > 0) {
          return cached.data
        }
      }
      
      const response = await fetch('/api/conversations?status=open&status=assigned&limit=50', {
        headers: {
          'X-CSRF-Token': 'placeholder', // Would be real CSRF token
          'X-Session-CSRF': 'placeholder'
        }
      })
      
      if (!response.ok) {
        throw { status: response.status, message: await response.text() }
      }
      
      const data = await response.json()
      
      // Cache for offline use
      if (enableOfflineSupport) {
        offlineManager.cacheConversations(data.conversations || [])
      }
      
      return data.conversations || []
    }, {
      retryCallback: loadConversations,
      dismissError: () => setError(null)
    })

    setLoading(false)

    if (result.success) {
      setConversations(result.data)
    } else {
      setError({
        message: result.error.error.userMessage,
        actions: result.error.actions,
        dismissible: true,
        severity: result.error.error.severity as 'info' | 'warning' | 'error'
      })
      announceError(result.error.error.userMessage)
    }
  }

  const loadMessages = useCallback(async (conversationId: string) => {
    const result = await withErrorHandling(async () => {
      // Check if messages are already loaded
      const existingState = chatStateManager.getConversationState(conversationId)
      if (existingState?.messages.length) {
        return existingState.messages
      }

      // Try cached data first if offline
      if (isOffline && enableOfflineSupport) {
        const cached = offlineManager.getCachedMessages(conversationId)
        if (cached.data.length > 0) {
          return cached.data
        }
      }

      chatStateManager.setConversationLoading(conversationId, true)
      
      const response = await fetch(`/api/messages?conversation_id=${conversationId}&limit=50`, {
        headers: {
          'X-CSRF-Token': 'placeholder',
          'X-Session-CSRF': 'placeholder'
        }
      })
      
      if (!response.ok) {
        throw { status: response.status, message: await response.text() }
      }
      
      const data = await response.json()
      
      // Cache for offline use
      if (enableOfflineSupport) {
        offlineManager.cacheMessages(conversationId, data.messages || [])
      }
      
      return data.messages || []
    }, {
      retryCallback: () => loadMessages(conversationId),
      dismissError: () => setError(null)
    })

    chatStateManager.setConversationLoading(conversationId, false)

    if (result.success) {
      chatStateManager.addMessages(conversationId, result.data)
    } else {
      setError({
        message: result.error.error.userMessage,
        actions: result.error.actions,
        dismissible: true,
        severity: result.error.error.severity as 'info' | 'warning' | 'error'
      })
    }
  }, [isOffline, enableOfflineSupport])

  const selectConversation = useCallback(async (conversationId: string) => {
    // Unsubscribe from previous conversation
    if (activeConversationId) {
      await chatRealtime.unsubscribeFromConversation(activeConversationId)
    }
    
    setActiveConversationId(conversationId)
    chatStateManager.setActiveConversation(conversationId)
    
    // Load messages if not already loaded
    await loadMessages(conversationId)
    
    // Subscribe to real-time updates if connected
    if (connectionState.status === 'connected') {
      try {
        await chatRealtime.subscribeToConversation(conversationId, {
          onMessage: (message) => {
            chatStateManager.addMessages(conversationId, [message])
            announceNewMessage(message.content, message.sender_name || 'Unknown', message.sender_id === userId)
          },
          onMessageUpdate: (message) => {
            chatStateManager.updateMessage(conversationId, message.id, message)
          },
          onTyping: (typing) => {
            setIsTyping(typing.is_typing)
          },
          onConnectionStateChange: (state) => {
            setConnectionState({ 
              status: state.status === 'connected' ? 'connected' : 
                      state.status === 'error' ? 'error' : 'disconnected',
              error: state.error
            })
          }
        })
      } catch (error) {
        console.warn('Failed to subscribe to conversation:', error)
      }
    }

    // Announce conversation change
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation) {
      announceConversationChange(
        `${conversation.customer?.first_name} ${conversation.customer?.last_name}`.trim() || conversation.title
      )
    }
  }, [activeConversationId, connectionState.status, conversations, userId, announceNewMessage, announceConversationChange, loadMessages])

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeConversationId) return
    
    const messageContent = newMessage.trim()
    const tempId = crypto.randomUUID()
    
    // Clear input immediately for better UX
    setNewMessage('')
    
    // Add optimistic message
    const optimisticMessage: Omit<Message, 'id'> & { tempId: string } = {
      tempId,
      conversation_id: activeConversationId,
      sender_id: userId,
      sender_name: userName,
      sender_email: userEmail,
      content: messageContent,
      message_type: 'text',
      direction: 'outbound',
      status: 'sent',
      priority: 'normal',
      is_read: true,
      is_starred: false,
      is_archived: false,
      attachments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    chatStateManager.addOptimisticMessage(activeConversationId, optimisticMessage)
    
    // Handle offline mode
    if (isOffline && enableOfflineSupport) {
      offlineManager.queueMessage(activeConversationId, messageContent)
      return
    }

    // Send message
    const result = await withErrorHandling(async () => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'placeholder',
          'X-Session-CSRF': 'placeholder'
        },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          content: messageContent,
          message_type: 'text',
          priority: 'normal'
        })
      })
      
      if (!response.ok) {
        throw { status: response.status, message: await response.text() }
      }
      
      return response.json()
    }, {
      retryCallback: sendMessage,
      dismissError: () => setError(null)
    })

    if (result.success) {
      // Update optimistic message with real message data
      chatStateManager.updateMessage(activeConversationId, tempId, result.data.message)
      announceNewMessage(messageContent, userName, true)
    } else {
      // Mark optimistic message as failed
      chatStateManager.updateMessage(activeConversationId, tempId, { status: 'failed' })
      
      setError({
        message: result.error.error.userMessage,
        actions: result.error.actions,
        dismissible: true,
        severity: result.error.error.severity as 'info' | 'warning' | 'error'
      })
    }
  }, [newMessage, activeConversationId, userId, userName, userEmail, isOffline, enableOfflineSupport, announceNewMessage])

  const handleTyping = useCallback((content: string) => {
    setNewMessage(content)
    
    if (!activeConversationId || connectionState.status !== 'connected') return
    
    // Send typing indicator
    chatRealtime.sendTypingIndicator(activeConversationId, content.length > 0)
    
    // Clear typing indicator after delay
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (content.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        chatRealtime.sendTypingIndicator(activeConversationId, false)
      }, 3000)
    }
  }, [activeConversationId, connectionState.status])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (chatContainerRef.current && e.key === 'Tab') {
      trapFocus(chatContainerRef.current, e as any)
    }
  }, [trapFocus])

  // Connection status indicator
  const ConnectionIndicator = () => (
    <div className="flex items-center gap-1 text-xs">
      {connectionState.status === 'connected' ? (
        <>
          <Wifi className="h-3 w-3 text-green-500" />
          <span className="text-green-600">Connected</span>
        </>
      ) : connectionState.status === 'connecting' ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
          <span className="text-yellow-600">Connecting...</span>
        </>
      ) : connectionState.status === 'error' ? (
        <>
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span className="text-red-600">Error</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-gray-500" />
          <span className="text-gray-600">Disconnected</span>
        </>
      )}
      
      {isOffline && (
        <>
          <span className="mx-1">•</span>
          <span className="text-orange-600">Offline</span>
          {pendingMessageCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {pendingMessageCount} pending
            </Badge>
          )}
        </>
      )}
    </div>
  )

  if (!isOpen) {
    return (
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
            "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700",
            "text-white border-0 relative"
          )}
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
          {getUnreadCount() > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {getUnreadCount() > 9 ? '9+' : getUnreadCount()}
            </Badge>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div 
      className={cn("fixed bottom-6 right-6 z-50", className)}
      ref={chatContainerRef}
      onKeyDown={handleKeyDown}
    >
      <Card className={cn(
        "shadow-2xl border-0 transition-all duration-300 bg-white",
        isMinimized ? "w-80 h-12" : "w-96 h-[600px]"
      )}>
        {/* Header */}
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeConversationId && !isMinimized && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={() => setActiveConversationId(null)}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <MessageCircle className="h-5 w-5" />
              <CardTitle className="text-lg">
                {activeConversationId ? 
                  conversations.find(c => c.id === activeConversationId)?.customer?.first_name + 
                  ' ' + conversations.find(c => c.id === activeConversationId)?.customer?.last_name || 'Conversation' : 
                  'Messages'
                }
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
                aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onClick={() => {
                  setIsOpen(false)
                  onClose?.()
                }}
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {!isMinimized && (
            <div className="flex items-center justify-between mt-2">
              <ConnectionIndicator />
              
              {!activeConversationId && (
                <div className="flex gap-1">
                  <Button
                    variant={activeTab === 'conversations' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="text-xs h-7 text-white hover:bg-white/20"
                    onClick={() => setActiveTab('conversations')}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Chats ({getUnreadCount()})
                  </Button>
                  <Button
                    variant={activeTab === 'ai' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="text-xs h-7 text-white hover:bg-white/20"
                    onClick={() => setActiveTab('ai')}
                  >
                    <Bot className="h-3 w-3 mr-1" />
                    AI Assistant
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 h-[500px] flex flex-col">
            {/* Error Display */}
            {error && (
              <Alert className={cn(
                "m-3 border-l-4",
                error.severity === 'error' && "border-red-400 bg-red-50",
                error.severity === 'warning' && "border-yellow-400 bg-yellow-50",
                error.severity === 'info' && "border-blue-400 bg-blue-50"
              )}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error.message}</span>
                  <div className="flex items-center gap-2">
                    {error.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.primary ? "default" : "outline"}
                        size="sm"
                        onClick={action.action}
                        className="text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                    {error.dismissible && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setError(null)}
                        aria-label="Dismiss error"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {activeConversationId ? (
              // Individual Conversation View
              <>
                {/* Messages */}
                <ScrollArea 
                  className="flex-1 p-4"
                  aria-label={getConversationDescription()}
                >
                  <div className="space-y-4" role="log" aria-live="polite" aria-label="Messages">
                    {activeMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3 group",
                          message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                        )}
                        role="article"
                        aria-label={getMessageDescription(
                          message.content, 
                          message.sender_name || 'Unknown',
                          new Date(message.created_at),
                          message.is_read
                        )}
                      >
                        {message.direction === 'inbound' && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {message.sender_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={cn(
                          "max-w-[70%] rounded-lg p-3 text-sm relative",
                          message.direction === 'outbound'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100',
                          message.status === 'failed' && 'bg-red-100 border border-red-300'
                        )}>
                          {message.direction === 'inbound' && message.sender_name && (
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {message.sender_name}
                            </p>
                          )}
                          
                          <p>{message.content}</p>
                          
                          <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                            <span>
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </span>
                            
                            <div className="flex items-center gap-1">
                              {message.status === 'failed' && (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                              {message.status === 'sent' && message.direction === 'outbound' && (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              )}
                              {message.attachments.length > 0 && (
                                <Paperclip className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {message.direction === 'outbound' && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-blue-500 text-white">
                              {userName[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex gap-3 justify-start">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t p-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                      <Textarea
                        ref={messageInputRef}
                        value={newMessage}
                        onChange={(e) => handleTyping(e.target.value)}
                        placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                        disabled={loading}
                        rows={1}
                        className="resize-none min-h-[40px] max-h-[120px] pr-12"
                        maxLength={maxMessageLength}
                        aria-label={getInputDescription(newMessage.length, maxMessageLength)}
                        aria-describedby="message-help"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                        {newMessage.length}/{maxMessageLength}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        aria-label="Add emoji"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label="Attach file"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        onClick={sendMessage} 
                        disabled={!newMessage.trim() || loading}
                        aria-label="Send message"
                        className="h-8 w-8 p-0"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <p id="message-help" className="text-xs text-gray-500 mt-1">
                    Press Enter to send, Shift+Enter for new line, Escape to close
                  </p>
                </div>
              </>
            ) : (
              // Conversations List
              <>
                {activeTab === 'conversations' && (
                  <>
                    {/* Search */}
                    <div className="p-3 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search conversations..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                          aria-label="Search conversations"
                        />
                      </div>
                    </div>

                    {/* Conversations List */}
                    <ScrollArea className="flex-1">
                      <div 
                        className="p-2 space-y-1" 
                        role="list" 
                        aria-label="Conversations"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : filteredConversations.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No conversations found</p>
                            {searchQuery && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => setSearchQuery('')}
                              >
                                Clear search
                              </Button>
                            )}
                          </div>
                        ) : (
                          filteredConversations.map((conversation, index) => (
                            <div
                              key={conversation.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors",
                                selectedConversationIndex === index && "bg-blue-50 ring-1 ring-blue-200"
                              )}
                              onClick={() => selectConversation(conversation.id)}
                              role="listitem"
                              tabIndex={0}
                              aria-label={`Conversation with ${conversation.customer?.first_name} ${conversation.customer?.last_name}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  selectConversation(conversation.id)
                                }
                              }}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  <User className="h-5 w-5" />
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-sm truncate">
                                    {conversation.customer?.first_name} {conversation.customer?.last_name}
                                  </h4>
                                  <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                                  </span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-600 truncate">
                                    {conversation.last_message?.content || 'No messages yet'}
                                  </p>
                                  
                                  <div className="flex items-center gap-1">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        conversation.priority === 'urgent' && "border-red-500 text-red-700",
                                        conversation.priority === 'high' && "border-orange-500 text-orange-700"
                                      )}
                                    >
                                      {conversation.priority}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}

                {activeTab === 'ai' && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Bot className="h-12 w-12 mx-auto mb-3 text-purple-500" />
                      <h3 className="font-semibold mb-2">AI Assistant</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Get help with lead management, deal tracking, and automation
                      </p>
                      <Button
                        onClick={() => {
                          // Would integrate with AI conversation system
                          alert('AI Assistant coming soon!')
                        }}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        Start AI Chat
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
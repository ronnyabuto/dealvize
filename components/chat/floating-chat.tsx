'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MessageCircle, X, Send, Minimize2, Maximize2, 
  Bot, Users, User, ArrowLeft, Search, Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { chatRealtime } from '@/lib/chat/realtime'
import type { Message, Conversation, ChatContact } from '@/lib/types/chat'

interface FloatingChatProps {
  userId: string
  userName: string
  userEmail: string
  className?: string
}

export function FloatingChat({
  userId,
  userName,
  userEmail,
  className
}: FloatingChatProps) {
  // UI state
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'conversations' | 'ai'>('conversations')
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Data state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Initialize realtime when chat opens
  useEffect(() => {
    if (isOpen && userId) {
      chatRealtime.initialize(userId)
    }
    
    return () => {
      if (!isOpen) {
        chatRealtime.cleanup()
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeConversationId])

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/conversations?status=open&status=assigned&limit=50')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      } else {
        throw new Error('Failed to load conversations')
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages?conversation_id=${conversationId}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setMessages(prev => ({
          ...prev,
          [conversationId]: data.messages || []
        }))
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      setError('Failed to load messages')
    }
  }, [])

  const selectConversation = useCallback(async (conversationId: string) => {
    if (activeConversationId) {
      await chatRealtime.unsubscribeFromConversation(activeConversationId)
    }
    
    setActiveConversationId(conversationId)
    
    if (!messages[conversationId]) {
      await loadMessages(conversationId)
    }
    
    // Subscribe to real-time updates
    await chatRealtime.subscribeToConversation(conversationId, {
      onMessage: (message) => {
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), message]
        }))
        
        // Update conversation last message
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, last_message: message, updated_at: message.created_at }
            : conv
        ))
      },
      onMessageUpdate: (message) => {
        setMessages(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map(msg => 
            msg.id === message.id ? { ...msg, ...message } : msg
          )
        }))
      }
    })

    setTimeout(async () => {
      const unreadMessages = messages[conversationId]?.filter(msg => !msg.is_read) || []
      for (const message of unreadMessages) {
        await fetch(`/api/messages?id=${message.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_read: true })
        })
      }
    }, 1000)
  }, [activeConversationId, messages, loadMessages])

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeConversationId || loading) return
    
    const messageContent = newMessage.trim()
    setNewMessage('')
    
    try {
      setLoading(true)
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          content: messageContent,
          message_type: 'text',
          priority: 'normal'
        })
      })
      
      if (response.ok) {
        const { message } = await response.json()
        
        setMessages(prev => {
          const existing = prev[activeConversationId] || []
          const messageExists = existing.some(m => m.id === message.id)
          if (messageExists) return prev
          
          return {
            ...prev,
            [activeConversationId]: [...existing, message]
          }
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message')
    } finally {
      setLoading(false)
    }
  }, [newMessage, activeConversationId, loading])

  const handleTyping = useCallback(async (content: string) => {
    setNewMessage(content)
    
    if (!activeConversationId) return
    
    // Send typing indicator
    await chatRealtime.sendTypingIndicator(activeConversationId, content.length > 0)
    
    // Clear typing indicator after 3 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (content.length > 0) {
      typingTimeoutRef.current = setTimeout(async () => {
        await chatRealtime.sendTypingIndicator(activeConversationId, false)
      }, 3000)
    }
  }, [activeConversationId])

  // Generate AI response for AI assistant
  const generateAIResponse = useCallback(async (userMessage: string, conversationId: string) => {
    const message = userMessage.toLowerCase()
    let aiResponse = 'I can help with lead management, deal tracking, and task automation. What would you like to know?'
    
    if (message.includes('automation') || message.includes('automate')) {
      aiResponse = 'I can help set up automation for lead follow-ups, task creation, and deal stage transitions. Which would you like to configure first?'
    } else if (message.includes('client') || message.includes('lead')) {
      aiResponse = 'Based on your recent activity, you have several hot leads that need attention. Would you like me to help prioritize them?'
    } else if (message.includes('deal') || message.includes('pipeline')) {
      aiResponse = 'I can help analyze your deal pipeline and suggest next steps. Would you like to see your deal summary?'
    }

    // Send AI response
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: aiResponse,
          message_type: 'text',
          priority: 'normal'
        })
      })
    } catch (error) {
      console.error('Error sending AI response:', error)
    }
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && document.activeElement?.tagName === 'INPUT') {
        e.preventDefault()
        sendMessage()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sendMessage])

  const totalUnreadCount = conversations.reduce((sum, conv) => {
    const unreadMessages = messages[conv.id]?.filter(msg => !msg.is_read && msg.direction === 'inbound') || []
    return sum + unreadMessages.length
  }, 0)

  const filteredConversations = conversations.filter(conv => 
    !searchQuery || 
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.customer?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeConversation = conversations.find(conv => conv.id === activeConversationId)
  const activeMessages = activeConversationId ? (messages[activeConversationId] || []) : []

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
        >
          <MessageCircle className="h-6 w-6" />
          {totalUnreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
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
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <MessageCircle className="h-5 w-5" />
              <CardTitle className="text-lg">
                {activeConversation ? 
                  `${activeConversation.customer?.first_name} ${activeConversation.customer?.last_name}` : 
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
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {!isMinimized && !activeConversationId && (
            <div className="flex gap-1 mt-2">
              <Button
                variant={activeTab === 'conversations' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 text-white hover:bg-white/20"
                onClick={() => setActiveTab('conversations')}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Chats ({totalUnreadCount})
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
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 h-[500px] flex flex-col">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-3 m-3">
                <div className="flex">
                  <p className="text-sm text-red-700">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={() => setError(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            
            {activeConversationId ? (
              // Individual Conversation View
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {activeMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.direction === 'outbound' ? 'justify-end' : 'justify-start'
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
                          "max-w-[70%] rounded-lg p-3 text-sm",
                          message.direction === 'outbound'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100'
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
                            
                            {message.status && (
                              <span className="capitalize">{message.status}</span>
                            )}
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
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => handleTyping(e.target.value)}
                      placeholder="Type your message..."
                      disabled={loading}
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() || loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
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
                        />
                      </div>
                    </div>

                    {/* Conversations List */}
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-1">
                        {loading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : filteredConversations.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No conversations found</p>
                          </div>
                        ) : (
                          filteredConversations.map((conversation) => (
                            <div
                              key={conversation.id}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => selectConversation(conversation.id)}
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
                      <p className="text-sm text-gray-600">Start a conversation to get AI assistance</p>
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
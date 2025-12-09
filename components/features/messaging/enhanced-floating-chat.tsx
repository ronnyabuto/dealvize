"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MessageCircle, X, Send, Minimize2, Maximize2, 
  Bot, Users, DollarSign, CheckSquare, Calendar,
  Zap, ArrowRight, Lightbulb, Wand2, Bell, Settings,
  Phone, Video, User, Clock, Search, Plus, MoreVertical
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderType: 'user' | 'client' | 'agent' | 'broker' | 'ai'
  message: string
  timestamp: string
  read: boolean
  messageType: 'text' | 'automation' | 'suggestion' | 'system'
  metadata?: {
    dealId?: string
    clientId?: string
    automationType?: string
    action?: {
      label: string
      onClick?: () => void
      url?: string
    }
  }
}

interface ChatContact {
  id: string
  name: string
  type: 'client' | 'agent' | 'broker' | 'ai'
  avatar?: string
  status: 'online' | 'offline' | 'away'
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
}

interface SmartSuggestion {
  id: string
  title: string
  description: string
  type: 'automation' | 'insight' | 'action'
  category: 'clients' | 'deals' | 'tasks' | 'general'
  priority: 'low' | 'medium' | 'high'
  actionLabel: string
  onAction?: () => void
  icon: any
}

export function EnhancedFloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'chats' | 'ai' | 'notifications'>('chats')
  const [activeContactId, setActiveContactId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([])

  // Initialize mock data
  useEffect(() => {
    const mockContacts: ChatContact[] = [
      {
        id: 'ai-assistant',
        name: 'Dealvize AI',
        type: 'ai',
        status: 'online',
        lastMessage: 'I can help you manage leads and automate tasks!',
        lastMessageTime: '1m ago',
        unreadCount: 0
      },
      {
        id: 'client-1',
        name: 'Sarah Johnson',
        type: 'client',
        status: 'online',
        lastMessage: 'When can we schedule the showing?',
        lastMessageTime: '5m ago',
        unreadCount: 2
      },
      {
        id: 'agent-1',
        name: 'Mike Chen',
        type: 'agent',
        status: 'away',
        lastMessage: 'The contract is ready for review',
        lastMessageTime: '15m ago',
        unreadCount: 1
      },
      {
        id: 'broker-1',
        name: 'Lisa Rodriguez',
        type: 'broker',
        status: 'online',
        lastMessage: 'Great work on the Thompson deal!',
        lastMessageTime: '1h ago',
        unreadCount: 0
      }
    ]

    const mockMessages: Record<string, ChatMessage[]> = {
      'ai-assistant': [
        {
          id: 'ai-1',
          senderId: 'ai-assistant',
          senderName: 'Dealvize AI',
          senderType: 'ai',
          message: 'I can help you manage leads and automate tasks!',
          timestamp: '1m ago',
          read: true,
          messageType: 'text'
        }
      ],
      'client-1': [
        {
          id: 'c1-1',
          senderId: 'client-1',
          senderName: 'Sarah Johnson',
          senderType: 'client',
          message: 'Hi! I saw the listing for 123 Oak Street. Is it still available?',
          timestamp: '10m ago',
          read: true,
          messageType: 'text'
        },
        {
          id: 'c1-2',
          senderId: 'client-1',
          senderName: 'Sarah Johnson',
          senderType: 'client',
          message: 'When can we schedule the showing?',
          timestamp: '5m ago',
          read: false,
          messageType: 'text'
        }
      ],
      'agent-1': [
        {
          id: 'a1-1',
          senderId: 'agent-1',
          senderName: 'Mike Chen',
          senderType: 'agent',
          message: 'The contract is ready for review',
          timestamp: '15m ago',
          read: false,
          messageType: 'text'
        }
      ]
    }

    const mockSuggestions: SmartSuggestion[] = [
      {
        id: 'auto-1',
        title: 'Auto Follow-up',
        description: 'Set up automated follow-up for Sarah Johnson',
        type: 'automation',
        category: 'clients',
        priority: 'high',
        actionLabel: 'Setup Now',
        icon: Users,
        onAction: () => {
          const confirmed = confirm('Set up automated follow-up for Sarah Johnson?')
          if (confirmed) {
            alert('Follow-up automation enabled for Sarah!')
          }
        }
      },
      {
        id: 'task-1',
        title: 'Create Task',
        description: 'Schedule showing for 123 Oak Street',
        type: 'action',
        category: 'tasks',
        priority: 'medium',
        actionLabel: 'Create Task',
        icon: CheckSquare,
        onAction: () => alert('Task created: Schedule showing for Sarah Johnson')
      }
    ]

    setContacts(mockContacts)
    setMessages(mockMessages)
    setSmartSuggestions(mockSuggestions)
  }, [])

  const totalUnread = contacts.reduce((sum, contact) => sum + contact.unreadCount, 0)

  const sendMessage = () => {
    if (!newMessage.trim() || !activeContactId) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'current-user',
      senderName: 'You',
      senderType: 'user',
      message: newMessage,
      timestamp: 'just now',
      read: true,
      messageType: 'text'
    }

    setMessages(prev => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), userMessage]
    }))

    setNewMessage('')

    // AI responses for AI assistant
    if (activeContactId === 'ai-assistant') {
      setTimeout(() => {
        const aiResponse = generateAIResponse(newMessage)
        const response: ChatMessage = {
          id: `ai-${Date.now()}`,
          senderId: 'ai-assistant',
          senderName: 'Dealvize AI',
          senderType: 'ai',
          message: aiResponse.message,
          timestamp: 'just now',
          read: false,
          messageType: aiResponse.messageType,
          metadata: aiResponse.metadata
        }
        setMessages(prev => ({
          ...prev,
          [activeContactId]: [...(prev[activeContactId] || []), response]
        }))
      }, 1000)
    }
  }

  const generateAIResponse = (userMessage: string) => {
    const message = userMessage.toLowerCase()
    
    if (message.includes('automation') || message.includes('automate')) {
      return {
        message: 'I can help set up automation for lead follow-ups, task creation, and deal stage transitions. Which would you like to configure first?',
        messageType: 'automation' as const,
        metadata: {
          action: {
            label: 'Setup Automation',
            onClick: () => setActiveTab('ai')
          }
        }
      }
    }
    
    if (message.includes('client') || message.includes('lead')) {
      return {
        message: 'You have 3 hot leads this week! Sarah Johnson seems most engaged. Would you like me to create a follow-up task?',
        messageType: 'suggestion' as const,
        metadata: {
          clientId: 'client-1',
          action: {
            label: 'Create Task',
            onClick: () => alert('Task created for Sarah Johnson')
          }
        }
      }
    }
    
    return {
      message: 'I can help with lead management, deal tracking, task automation, and analytics. What would you like to know?',
      messageType: 'text' as const
    }
  }

  const getContactIcon = (type: ChatContact['type']) => {
    switch (type) {
      case 'ai': return Bot
      case 'client': return User
      case 'agent': return Users
      case 'broker': return Users
      default: return User
    }
  }

  const getStatusColor = (status: ChatContact['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
            "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700",
            "text-white border-0 relative group"
          )}
        >
          <MessageCircle className="h-6 w-6" />
          {totalUnread > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs animate-pulse"
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </Badge>
          )}
          
          <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Messages & AI Assistant
          </div>
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={cn(
        "shadow-2xl border-0 transition-all duration-300",
        isMinimized ? "w-80 h-12" : "w-96 h-[600px]"
      )}>
        {/* Header */}
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {isMinimized ? 'Messages' : activeContactId ? contacts.find(c => c.id === activeContactId)?.name : 'Messages'}
            </CardTitle>
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
          
          {!isMinimized && !activeContactId && (
            <div className="flex gap-1 mt-2">
              <Button
                variant={activeTab === 'chats' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 text-white hover:bg-white/20"
                onClick={() => setActiveTab('chats')}
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Chats ({totalUnread})
              </Button>
              <Button
                variant={activeTab === 'ai' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 text-white hover:bg-white/20"
                onClick={() => setActiveTab('ai')}
              >
                <Bot className="h-3 w-3 mr-1" />
                Smart AI
              </Button>
              <Button
                variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 text-white hover:bg-white/20"
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="h-3 w-3 mr-1" />
                Alerts
              </Button>
            </div>
          )}
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 h-[500px] flex flex-col">
            {activeContactId ? (
              // Individual Chat View
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setActiveContactId(null)}
                    >
                      <ArrowRight className="h-4 w-4 rotate-180" />
                    </Button>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const contact = contacts.find(c => c.id === activeContactId)
                        const Icon = getContactIcon(contact?.type || 'client')
                        return (
                          <>
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={contact?.avatar} />
                                <AvatarFallback>
                                  <Icon className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div className={cn(
                                "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                                getStatusColor(contact?.status || 'offline')
                              )} />
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{contact?.name}</h4>
                              <p className="text-xs text-gray-500 capitalize">{contact?.type}</p>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {(messages[activeContactId] || []).map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.senderType === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {message.senderType !== 'user' && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {message.senderName[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn(
                          "max-w-[70%] rounded-lg p-3 text-sm",
                          message.senderType === 'user'
                            ? 'bg-blue-500 text-white'
                            : message.messageType === 'automation'
                            ? 'bg-purple-50 border border-purple-200'
                            : 'bg-gray-100'
                        )}>
                          {message.senderType !== 'user' && (
                            <p className="text-xs font-medium mb-1">{message.senderName}</p>
                          )}
                          <p>{message.message}</p>
                          {message.metadata?.action && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              onClick={message.metadata.action.onClick}
                            >
                              {message.metadata.action.label}
                            </Button>
                          )}
                          <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                        </div>
                        {message.senderType === 'user' && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-blue-500 text-white">
                              U
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              // Tab Views
              <>
                {activeTab === 'chats' && (
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

                    {/* Contacts List */}
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-1">
                        {contacts
                          .filter(contact => 
                            contact.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((contact) => {
                            const Icon = getContactIcon(contact.type)
                            return (
                              <div
                                key={contact.id}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => setActiveContactId(contact.id)}
                              >
                                <div className="relative">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={contact.avatar} />
                                    <AvatarFallback>
                                      <Icon className="h-5 w-5" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className={cn(
                                    "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                                    getStatusColor(contact.status)
                                  )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm truncate">{contact.name}</h4>
                                    <span className="text-xs text-gray-500">{contact.lastMessageTime}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-600 truncate">{contact.lastMessage}</p>
                                    {contact.unreadCount > 0 && (
                                      <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-blue-500 text-white text-xs">
                                        {contact.unreadCount}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </ScrollArea>
                  </>
                )}

                {activeTab === 'ai' && (
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      <div className="text-center">
                        <Bot className="h-12 w-12 mx-auto mb-3 text-purple-500" />
                        <h3 className="font-semibold mb-2">Smart AI Suggestions</h3>
                        <p className="text-sm text-gray-600">AI-powered automation and insights</p>
                      </div>
                      
                      {smartSuggestions.map((suggestion) => {
                        const Icon = suggestion.icon
                        return (
                          <div
                            key={suggestion.id}
                            className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">
                                <Icon className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {suggestion.title}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {suggestion.description}
                                </p>
                                <Button
                                  size="sm"
                                  onClick={suggestion.onAction}
                                  className="mt-2 h-7 text-xs bg-gradient-to-r from-purple-600 to-blue-600"
                                >
                                  {suggestion.actionLabel}
                                  <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}

                {activeTab === 'notifications' && (
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      <div className="text-center py-8 text-gray-500">
                        <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>All caught up!</p>
                        <p className="text-xs">No new notifications</p>
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
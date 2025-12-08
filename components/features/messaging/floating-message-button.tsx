"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  MessageCircle, X, Send, Minimize2, Maximize2, 
  Info, AlertTriangle, CheckCircle, AlertCircle, 
  Megaphone, Gift, Zap, Bell, Settings, HelpCircle,
  User, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FloatingMessage {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement' | 'feature' | 'promotion' | 'system'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: string
  read: boolean
  action?: {
    label: string
    url?: string
    onClick?: () => void
  }
}

const messageIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertCircle,
  announcement: Megaphone,
  feature: Zap,
  promotion: Gift,
  system: Settings
}

const messageColors = {
  info: 'text-blue-600',
  warning: 'text-yellow-600',
  success: 'text-green-600',
  error: 'text-red-600',
  announcement: 'text-purple-600',
  feature: 'text-indigo-600',
  promotion: 'text-pink-600',
  system: 'text-gray-600'
}

export function FloatingMessageButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<FloatingMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications' | 'help'>('messages')

  // Mock messages - replace with real data
  useEffect(() => {
    const mockMessages: FloatingMessage[] = [
      {
        id: '1',
        title: 'Welcome to Dealvize! 🎉',
        message: 'Get started by exploring our AI-powered lead scoring and automation features.',
        type: 'announcement',
        priority: 'medium',
        timestamp: '2 minutes ago',
        read: false,
        action: { label: 'Take Tour', onClick: () => console.log('Starting tour...') }
      },
      {
        id: '2',
        title: 'New Feature: Smart Automation',
        message: 'Your pipeline automation is now 3x more intelligent with our latest AI update.',
        type: 'feature',
        priority: 'high',
        timestamp: '1 hour ago',
        read: false,
        action: { label: 'Learn More', url: '/automation' }
      },
      {
        id: '3',
        title: 'Deal Alert: High Priority',
        message: 'Sarah Johnson deal is 95% likely to close this week. Time to follow up!',
        type: 'success',
        priority: 'urgent',
        timestamp: '3 hours ago',
        read: true
      },
      {
        id: '4',
        title: 'Limited Offer: 50% Off Pro',
        message: 'Upgrade to Pro and unlock advanced analytics, automation, and integrations.',
        type: 'promotion',
        priority: 'high',
        timestamp: '1 day ago',
        read: false,
        action: { label: 'Upgrade Now', url: '/pricing' }
      }
    ]
    setMessages(mockMessages)
  }, [])

  const unreadCount = messages.filter(m => !m.read).length

  const handleAction = (message: FloatingMessage) => {
    if (message.action?.onClick) {
      message.action.onClick()
    } else if (message.action?.url) {
      window.open(message.action.url, '_blank', 'noopener,noreferrer')
    }
  }

  const markAsRead = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, read: true } : msg
    ))
  }

  const sendMessage = (messageText?: string) => {
    const textToSend = messageText || newMessage
    if (!textToSend.trim()) return
    
    const userMessage: FloatingMessage = {
      id: `user-${Date.now()}`,
      title: 'You',
      message: textToSend,
      type: 'info',
      priority: 'low',
      timestamp: 'just now',
      read: true
    }
    
    setMessages(prev => [userMessage, ...prev])
    if (!messageText) setNewMessage('')
    
    // AI-powered response based on message content
    setTimeout(() => {
      const aiResponse = generateAIResponse(textToSend)
      const response: FloatingMessage = {
        id: `ai-${Date.now()}`,
        title: 'Dealvize AI Assistant',
        message: aiResponse.message,
        type: aiResponse.type,
        priority: 'low',
        timestamp: 'just now',
        read: false,
        action: aiResponse.action
      }
      setMessages(prev => [response, ...prev])
    }, 1500)
  }

  const generateAIResponse = (userMessage: string): { message: string; type: FloatingMessage['type']; action?: FloatingMessage['action'] } => {
    const message = userMessage.toLowerCase()
    
    if (message.includes('lead') || message.includes('client')) {
      return {
        message: 'I can help you manage leads and clients! Would you like me to show you your latest leads or create a new client profile?',
        type: 'feature',
        action: { label: 'View Leads', url: '/leads' }
      }
    }
    
    if (message.includes('deal') || message.includes('pipeline')) {
      return {
        message: 'Great question about deals! Your pipeline shows 38 active deals worth $2.8M. Would you like to see detailed analytics?',
        type: 'success',
        action: { label: 'View Pipeline', url: '/deals' }
      }
    }
    
    if (message.includes('task') || message.includes('todo')) {
      return {
        message: 'You have 5 tasks due today. I can help you prioritize them or create new tasks. What would you like to do?',
        type: 'warning',
        action: { label: 'View Tasks', url: '/tasks' }
      }
    }
    
    if (message.includes('report') || message.includes('analytic')) {
      return {
        message: 'I can generate custom reports for you! Your conversion rate is up 15% this month. Which metrics interest you most?',
        type: 'feature',
        action: { label: 'View Analytics', url: '/analytics' }
      }
    }
    
    if (message.includes('help') || message.includes('how')) {
      return {
        message: 'I\'m here to help! I can assist with lead management, deal tracking, task automation, and analytics. What specific feature would you like to learn about?',
        type: 'info'
      }
    }
    
    if (message.includes('automation') || message.includes('workflow')) {
      return {
        message: 'Our AI automation can save you hours! I can set up lead nurturing sequences, task automation, and smart notifications. Interested?',
        type: 'feature',
        action: { label: 'Setup Automation', url: '/automation' }
      }
    }
    
    return {
      message: 'Thanks for your message! I\'m your AI assistant and can help with leads, deals, tasks, reports, and automation. How can I assist you today?',
      type: 'system'
    }
  }

  const quickReplies = [
    'Show my hot leads',
    'What deals are closing this week?',
    'Create a follow-up task',
    'Generate monthly report',
    'Help with automation',
    'Schedule a demo call'
  ]

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
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Messages & Notifications
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
              {isMinimized ? 'Messages' : 'Dealvize Assistant'}
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
          
          {!isMinimized && (
            <div className="flex gap-1 mt-2">
              <Button
                variant={activeTab === 'messages' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 text-white hover:bg-white/20"
                onClick={() => setActiveTab('messages')}
              >
                Messages
              </Button>
              <Button
                variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 text-white hover:bg-white/20"
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="h-3 w-3 mr-1" />
                Alerts ({unreadCount})
              </Button>
              <Button
                variant={activeTab === 'help' ? 'secondary' : 'ghost'}
                size="sm"
                className="text-xs h-7 text-white hover:bg-white/20"
                onClick={() => setActiveTab('help')}
              >
                <HelpCircle className="h-3 w-3 mr-1" />
                Help
              </Button>
            </div>
          )}
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 h-[500px] flex flex-col">
            {activeTab === 'messages' && (
              <>
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-xs">Start a conversation with our AI assistant</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const Icon = messageIcons[message.type]
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md",
                              message.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                            )}
                            onClick={() => markAsRead(message.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={cn("h-5 w-5 mt-0.5", messageColors[message.type])} />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <h4 className={cn(
                                    "font-semibold text-sm",
                                    !message.read && "text-blue-900"
                                  )}>
                                    {message.title}
                                  </h4>
                                  <span className="text-xs text-gray-500">
                                    {message.timestamp}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {message.message}
                                </p>
                                {message.action && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7 mt-2"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAction(message)
                                    }}
                                  >
                                    {message.action.label}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t p-3 space-y-3">
                  {/* Quick Reply Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {quickReplies.map((reply, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 justify-start text-left px-2"
                        onClick={() => sendMessage(reply)}
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Message Input */}
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                    />
                    <Button onClick={() => sendMessage()} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    💡 Click quick replies above or type your own message
                  </p>
                </div>
              </>
            )}

            {activeTab === 'notifications' && (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.filter(m => !m.read).map((message) => {
                    const Icon = messageIcons[message.type]
                    return (
                      <div
                        key={message.id}
                        className="p-3 rounded-lg border bg-blue-50 border-blue-200 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => markAsRead(message.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-4 w-4", messageColors[message.type])} />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-blue-900">{message.title}</h4>
                            <p className="text-xs text-blue-700 mt-1">{message.timestamp}</p>
                          </div>
                          {message.priority === 'urgent' && (
                            <Badge variant="destructive" className="animate-pulse">Urgent</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {messages.filter(m => !m.read).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>All caught up!</p>
                      <p className="text-xs">No new notifications</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {activeTab === 'help' && (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="text-center">
                    <HelpCircle className="h-12 w-12 mx-auto mb-3 text-blue-500" />
                    <h3 className="font-semibold mb-2">How can we help?</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {[
                      { label: 'Getting Started Guide', icon: '🚀' },
                      { label: 'AI Lead Scoring Help', icon: '🤖' },
                      { label: 'Pipeline Automation', icon: '⚡' },
                      { label: 'Contact Support', icon: '💬' },
                      { label: 'Video Tutorials', icon: '🎥' },
                      { label: 'Keyboard Shortcuts', icon: '⌨️' }
                    ].map((item, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full justify-start text-left h-auto p-3"
                      >
                        <span className="mr-3">{item.icon}</span>
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
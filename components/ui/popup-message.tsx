"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Info, AlertTriangle, CheckCircle, AlertCircle, Megaphone, Gift, Star, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface PopupMessage {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement' | 'feature' | 'promotion'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  action?: {
    label: string
    url?: string
    onClick?: () => void
  }
  dismissible?: boolean
  autoHide?: boolean
  autoHideDelay?: number
  showFrom?: string
  showUntil?: string
  targetUsers?: string[]
  targetRoles?: string[]
  showOnPages?: string[]
  maxViews?: number
  persistent?: boolean
}

interface PopupMessageProps {
  messages?: PopupMessage[]
  className?: string
}

const messageIcons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertCircle,
  announcement: Megaphone,
  feature: Zap,
  promotion: Gift
}

const messageColors = {
  info: 'bg-blue-50 border-blue-200 text-blue-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  announcement: 'bg-purple-50 border-purple-200 text-purple-900',
  feature: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  promotion: 'bg-pink-50 border-pink-200 text-pink-900'
}

const priorityIndicators = {
  low: '',
  medium: 'ring-2 ring-blue-200',
  high: 'ring-2 ring-orange-200',
  urgent: 'ring-2 ring-red-300 animate-pulse'
}

export function PopupMessage({ messages = [], className }: PopupMessageProps) {
  const [visibleMessages, setVisibleMessages] = useState<PopupMessage[]>([])
  const [dismissedMessages, setDismissedMessages] = useState<Set<string>>(new Set())
  const [messageViews, setMessageViews] = useState<Record<string, number>>({})

  // Load dismissed messages and view counts from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dealvize-dismissed-messages')
    const views = localStorage.getItem('dealvize-message-views')
    
    if (dismissed) {
      try {
        setDismissedMessages(new Set(JSON.parse(dismissed)))
      } catch (error) {
        console.error('Error loading dismissed messages:', error)
      }
    }

    if (views) {
      try {
        setMessageViews(JSON.parse(views))
      } catch (error) {
        console.error('Error loading message views:', error)
      }
    }
  }, [])

  // Filter and sort messages
  useEffect(() => {
    const now = new Date()
    const currentPage = window.location.pathname

    const validMessages = messages.filter(message => {
      // Check if message is dismissed
      if (dismissedMessages.has(message.id)) return false

      // Check date range
      if (message.showFrom && new Date(message.showFrom) > now) return false
      if (message.showUntil && new Date(message.showUntil) < now) return false

      // Check page targeting
      if (message.showOnPages && message.showOnPages.length > 0) {
        const isOnTargetPage = message.showOnPages.some(page => 
          currentPage.startsWith(page) || currentPage.includes(page)
        )
        if (!isOnTargetPage) return false
      }

      // Check max views
      if (message.maxViews && (messageViews[message.id] || 0) >= message.maxViews) {
        return false
      }

      return true
    })

    // Sort by priority and creation date
    const sortedMessages = validMessages.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.showFrom || '2024-01-01').getTime() - new Date(a.showFrom || '2024-01-01').getTime()
    })

    setVisibleMessages(sortedMessages.slice(0, 3)) // Show max 3 messages

    // Track message views
    if (sortedMessages.length > 0) {
      const newViews = { ...messageViews }
      sortedMessages.forEach(message => {
        newViews[message.id] = (newViews[message.id] || 0) + 1
      })
      setMessageViews(newViews)
      localStorage.setItem('dealvize-message-views', JSON.stringify(newViews))
    }
  }, [messages, dismissedMessages, messageViews])

  // Auto-hide messages
  useEffect(() => {
    const autoHideTimers = visibleMessages
      .filter(message => message.autoHide && message.autoHideDelay)
      .map(message => {
        return setTimeout(() => {
          dismissMessage(message.id)
        }, message.autoHideDelay)
      })

    return () => {
      autoHideTimers.forEach(timer => clearTimeout(timer))
    }
  }, [visibleMessages])

  const dismissMessage = (messageId: string) => {
    const newDismissed = new Set(dismissedMessages)
    newDismissed.add(messageId)
    setDismissedMessages(newDismissed)
    localStorage.setItem('dealvize-dismissed-messages', JSON.stringify([...newDismissed]))
  }

  const handleAction = (message: PopupMessage) => {
    if (message.action?.onClick) {
      message.action.onClick()
    } else if (message.action?.url) {
      window.open(message.action.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (visibleMessages.length === 0) return null

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full",
      className
    )}>
      <AnimatePresence mode="popLayout">
        {visibleMessages.map((message, index) => {
          const Icon = messageIcons[message.type]
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: index * 0.1
              }}
              layout
            >
              <Card className={cn(
                "shadow-lg border-l-4",
                messageColors[message.type],
                priorityIndicators[message.priority]
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm leading-tight">
                            {message.title}
                            {message.priority === 'urgent' && (
                              <Badge variant="destructive" className="ml-2 text-xs animate-pulse">
                                Urgent
                              </Badge>
                            )}
                            {message.priority === 'high' && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Important
                              </Badge>
                            )}
                          </h4>
                          <p className="text-sm opacity-90 leading-relaxed">
                            {message.message}
                          </p>
                        </div>
                        
                        {(message.dismissible !== false) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100 -mt-1 -mr-1"
                            onClick={() => dismissMessage(message.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {message.action && (
                        <div className="pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 bg-white/50 hover:bg-white/80"
                            onClick={() => handleAction(message)}
                          >
                            {message.action.label}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress indicator for auto-hide */}
                  {message.autoHide && message.autoHideDelay && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30"
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ 
                        duration: message.autoHideDelay / 1000,
                        ease: "linear"
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// Hook for managing popup messages
export function usePopupMessages() {
  const [messages, setMessages] = useState<PopupMessage[]>([])

  const addMessage = (message: Omit<PopupMessage, 'id'>) => {
    const newMessage: PopupMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dismissible: true,
      autoHide: false,
      priority: 'medium',
      ...message
    }
    setMessages(prev => [...prev, newMessage])
  }

  const removeMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
  }

  const clearAllMessages = () => {
    setMessages([])
  }

  // Predefined message creators
  const showInfo = (title: string, message: string, options?: Partial<PopupMessage>) =>
    addMessage({ ...options, type: 'info', title, message })
  
  const showWarning = (title: string, message: string, options?: Partial<PopupMessage>) =>
    addMessage({ ...options, type: 'warning', title, message })
  
  const showSuccess = (title: string, message: string, options?: Partial<PopupMessage>) =>
    addMessage({ ...options, type: 'success', title, message, autoHide: true, autoHideDelay: 5000 })
  
  const showError = (title: string, message: string, options?: Partial<PopupMessage>) =>
    addMessage({ ...options, type: 'error', title, message, priority: 'high' })
  
  const showAnnouncement = (title: string, message: string, options?: Partial<PopupMessage>) =>
    addMessage({ ...options, type: 'announcement', title, message, priority: 'high' })
  
  const showFeature = (title: string, message: string, options?: Partial<PopupMessage>) =>
    addMessage({ ...options, type: 'feature', title, message })
  
  const showPromotion = (title: string, message: string, options?: Partial<PopupMessage>) =>
    addMessage({ ...options, type: 'promotion', title, message, priority: 'high' })

  return {
    messages,
    addMessage,
    removeMessage,
    clearAllMessages,
    showInfo,
    showWarning,
    showSuccess,
    showError,
    showAnnouncement,
    showFeature,
    showPromotion
  }
}
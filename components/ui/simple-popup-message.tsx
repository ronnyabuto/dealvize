"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, Info, AlertTriangle, CheckCircle, AlertCircle, Megaphone, Gift, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface SimplePopupMessage {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement' | 'feature' | 'promotion'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  action?: {
    label: string
    url?: string
    onClick?: () => void
  }
  dismissible?: boolean
  autoHide?: boolean
  autoHideDelay?: number
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

interface SimplePopupMessageProps {
  messages?: SimplePopupMessage[]
  onDismiss?: (messageId: string) => void
}

export function SimplePopupMessage({ messages = [], onDismiss }: SimplePopupMessageProps) {
  const [visibleMessages, setVisibleMessages] = useState<SimplePopupMessage[]>([])

  useEffect(() => {
    setVisibleMessages(messages.slice(0, 3)) // Show max 3 messages
  }, [messages])

  // Auto-hide messages
  useEffect(() => {
    const autoHideTimers = visibleMessages
      .filter(message => message.autoHide && message.autoHideDelay)
      .map(message => {
        return setTimeout(() => {
          handleDismiss(message.id)
        }, message.autoHideDelay)
      })

    return () => {
      autoHideTimers.forEach(timer => clearTimeout(timer))
    }
  }, [visibleMessages])

  const handleDismiss = (messageId: string) => {
    setVisibleMessages(prev => prev.filter(msg => msg.id !== messageId))
    onDismiss?.(messageId)
  }

  const handleAction = (message: SimplePopupMessage) => {
    if (message.action?.onClick) {
      message.action.onClick()
    } else if (message.action?.url) {
      window.open(message.action.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (visibleMessages.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {visibleMessages.map((message) => {
        const Icon = messageIcons[message.type]
        return (
          <div
            key={message.id}
            className="transform transition-all duration-300 ease-in-out"
          >
            <Card className={cn(
              "shadow-lg border-l-4 animate-in slide-in-from-right duration-300",
              messageColors[message.type],
              message.priority === 'urgent' && 'animate-pulse'
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
                            <Badge variant="destructive" className="ml-2 text-xs">
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
                          onClick={() => handleDismiss(message.id)}
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
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
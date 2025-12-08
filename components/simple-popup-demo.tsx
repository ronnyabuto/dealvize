"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SimplePopupMessage } from "@/components/ui/simple-popup-message"
import { Bell, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react"

interface SimplePopupMessageType {
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

export function SimplePopupDemo() {
  const [messages, setMessages] = useState<SimplePopupMessageType[]>([])

  const addMessage = (message: Omit<SimplePopupMessageType, 'id'>) => {
    const newMessage: SimplePopupMessageType = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dismissible: true,
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Simple Popup Demo
          </CardTitle>
          <CardDescription>
            Test popup messages with a simplified implementation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                addMessage({
                  type: 'success',
                  title: 'Success!',
                  message: 'Your action was completed successfully.',
                  autoHide: true,
                  autoHideDelay: 3000
                })
              }}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4 text-green-500" />
              Success
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                addMessage({
                  type: 'error',
                  title: 'Error',
                  message: 'Something went wrong. Please try again.',
                  priority: 'high'
                })
              }}
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 text-red-500" />
              Error
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                addMessage({
                  type: 'warning',
                  title: 'Warning',
                  message: 'Please review your settings before continuing.',
                  action: {
                    label: 'Review Settings',
                    url: '/settings'
                  }
                })
              }}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Warning
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                addMessage({
                  type: 'info',
                  title: 'New Feature',
                  message: 'Check out our latest AI-powered lead scoring feature!',
                  action: {
                    label: 'Learn More',
                    url: '/ai-lead-scoring'
                  }
                })
              }}
              className="flex items-center gap-2"
            >
              <Info className="h-4 w-4 text-blue-500" />
              Info
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                addMessage({
                  type: 'promotion',
                  title: 'Special Offer! 🔥',
                  message: 'Get 50% off premium features this month only.',
                  priority: 'urgent',
                  action: {
                    label: 'Upgrade Now',
                    url: '/pricing'
                  }
                })
              }}
            >
              Urgent Promotion
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                addMessage({
                  type: 'announcement',
                  title: 'System Update',
                  message: 'New features have been added to your dashboard.',
                  priority: 'medium'
                })
              }}
            >
              Announcement
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllMessages}
            >
              Clear All
            </Button>
          </div>

          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">Simple Popup Features:</p>
            <ul className="space-y-1">
              <li>• Success messages auto-hide after 3 seconds</li>
              <li>• Urgent messages have pulsing animation</li>
              <li>• Click X button to dismiss messages</li>
              <li>• Action buttons can open URLs or trigger functions</li>
              <li>• Multiple message types with appropriate colors</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <SimplePopupMessage messages={messages} onDismiss={removeMessage} />
    </>
  )
}
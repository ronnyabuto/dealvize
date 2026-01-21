"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { PopupMessage as PopupMessageComponent, usePopupMessages } from '@/components/ui/popup-message'

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

interface PopupMessageContextType {
  messages: PopupMessage[]
  addMessage: (message: Omit<PopupMessage, 'id'>) => void
  removeMessage: (messageId: string) => void
  clearAllMessages: () => void
  showInfo: (title: string, message: string, options?: Partial<PopupMessage>) => void
  showWarning: (title: string, message: string, options?: Partial<PopupMessage>) => void
  showSuccess: (title: string, message: string, options?: Partial<PopupMessage>) => void
  showError: (title: string, message: string, options?: Partial<PopupMessage>) => void
  showAnnouncement: (title: string, message: string, options?: Partial<PopupMessage>) => void
  showFeature: (title: string, message: string, options?: Partial<PopupMessage>) => void
  showPromotion: (title: string, message: string, options?: Partial<PopupMessage>) => void
}

const PopupMessageContext = createContext<PopupMessageContextType | undefined>(undefined)

interface PopupMessageProviderProps {
  children: React.ReactNode
  initialMessages?: PopupMessage[]
}

export function PopupMessageProvider({ children, initialMessages = [] }: PopupMessageProviderProps) {
  const messageManager = usePopupMessages()
  const [isLoaded, setIsLoaded] = useState(false)

  // Load initial messages and any system messages
  useEffect(() => {
    if (isLoaded) return

    // Load system messages from API or config
    loadSystemMessages()
    
    // Add any initial messages
    if (initialMessages.length > 0) {
      initialMessages.forEach(msg => {
        messageManager.addMessage(msg)
      })
    }

    setIsLoaded(true)
  }, [isLoaded, initialMessages, messageManager])

  const loadSystemMessages = async () => {
    try {
      // This could be replaced with an API call to fetch system messages
      const systemMessages = getSystemMessages()
      systemMessages.forEach(msg => {
        messageManager.addMessage(msg)
      })
    } catch (error) {
      console.error('Error loading system messages:', error)
    }
  }

  return (
    <PopupMessageContext.Provider value={messageManager}>
      {children}
      <PopupMessageComponent messages={messageManager.messages} />
    </PopupMessageContext.Provider>
  )
}

export function usePopupMessageContext() {
  const context = useContext(PopupMessageContext)
  if (context === undefined) {
    throw new Error('usePopupMessageContext must be used within a PopupMessageProvider')
  }
  return context
}

// System messages configuration
function getSystemMessages(): Omit<PopupMessage, 'id'>[] {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  
  return [
    // Welcome message for new users
    {
      type: 'announcement',
      priority: 'medium',
      title: 'Welcome to Dealvize CRM! 🎉',
      message: 'Get started by adding your first client or exploring our AI-powered lead scoring features.',
      action: {
        label: 'Take Tour',
        onClick: () => {
          // Could integrate with a tour library like Intro.js or React Joyride
          console.log('Starting product tour...')
        }
      },
      showOnPages: ['/dashboard'],
      maxViews: 3,
      dismissible: true
    },

    // Feature announcement
    {
      type: 'feature',
      priority: 'medium',
      title: 'New: AI Lead Scoring 🤖',
      message: 'Our new AI-powered lead scoring helps you prioritize your hottest prospects automatically.',
      action: {
        label: 'Learn More',
        url: '/ai-lead-scoring'
      },
      showFrom: now.toISOString(),
      showUntil: tomorrow.toISOString(),
      showOnPages: ['/dashboard', '/clients', '/leads'],
      maxViews: 2
    },

    // Maintenance notification
    /*
    {
      type: 'warning',
      priority: 'high',
      title: 'Scheduled Maintenance',
      message: 'System maintenance scheduled for tonight at 2 AM EST. Expected downtime: 30 minutes.',
      dismissible: false,
      showFrom: now.toISOString(),
      showUntil: tomorrow.toISOString(),
      persistent: true
    },
    */

    // Promotion message
    {
      type: 'promotion',
      priority: 'high',
      title: 'Limited Time: 30% Off Pro Plan! 🔥',
      message: 'Upgrade to Pro and unlock advanced automation, reporting, and integrations.',
      action: {
        label: 'Upgrade Now',
        url: '/pricing'
      },
      showOnPages: ['/dashboard'],
      maxViews: 5,
      autoHide: false
    },

    // Success message for achievements
    /*
    {
      type: 'success',
      priority: 'low',
      title: 'Milestone Reached! 🎯',
      message: 'Congratulations! You\'ve closed 10 deals this month.',
      autoHide: true,
      autoHideDelay: 8000,
      showOnPages: ['/dashboard', '/deals']
    }
    */
  ]
}

// Utility hook for common popup patterns
export function usePopupNotifications() {
  const popup = usePopupMessageContext()

  const notifySuccess = (message: string, title = 'Success!') => {
    popup.showSuccess(title, message)
  }

  const notifyError = (message: string, title = 'Error') => {
    popup.showError(title, message)
  }

  const notifyInfo = (message: string, title = 'Info') => {
    popup.showInfo(title, message)
  }

  const notifyWarning = (message: string, title = 'Warning') => {
    popup.showWarning(title, message)
  }

  const announceFeature = (title: string, message: string, learnMoreUrl?: string) => {
    popup.showFeature(title, message, {
      action: learnMoreUrl ? {
        label: 'Learn More',
        url: learnMoreUrl
      } : undefined
    })
  }

  const showPromotion = (title: string, message: string, ctaLabel?: string, ctaUrl?: string) => {
    popup.showPromotion(title, message, {
      priority: 'high',
      action: ctaLabel && ctaUrl ? {
        label: ctaLabel,
        url: ctaUrl
      } : undefined
    })
  }

  return {
    ...popup,
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
    announceFeature,
    showPromotion
  }
}
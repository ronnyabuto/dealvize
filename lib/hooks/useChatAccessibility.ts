import { useEffect, useRef, useCallback } from 'react'

interface AccessibilityAnnouncement {
  message: string
  priority: 'polite' | 'assertive'
}

export function useLiveAnnouncements() {
  const politeRef = useRef<HTMLDivElement>(null)
  const assertiveRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const element = priority === 'assertive' ? assertiveRef.current : politeRef.current
    if (element) {
      element.textContent = message
      // Clear after announcement
      setTimeout(() => {
        element.textContent = ''
      }, 1000)
    }
  }, [])

  const createAriaLiveRegions = useCallback(() => {
    // Create polite announcements region
    if (!politeRef.current) {
      const politeRegion = document.createElement('div')
      politeRegion.setAttribute('aria-live', 'polite')
      politeRegion.setAttribute('aria-atomic', 'true')
      politeRegion.className = 'sr-only'
      document.body.appendChild(politeRegion)
      politeRef.current = politeRegion
    }

    // Create assertive announcements region
    if (!assertiveRef.current) {
      const assertiveRegion = document.createElement('div')
      assertiveRegion.setAttribute('aria-live', 'assertive')
      assertiveRegion.setAttribute('aria-atomic', 'true')
      assertiveRegion.className = 'sr-only'
      document.body.appendChild(assertiveRegion)
      assertiveRef.current = assertiveRegion
    }
  }, [])

  useEffect(() => {
    createAriaLiveRegions()

    return () => {
      // Cleanup on unmount
      politeRef.current?.remove()
      assertiveRef.current?.remove()
    }
  }, [createAriaLiveRegions])

  return { announce }
}

interface ChatAccessibilityOptions {
  onNewMessage?: (message: string, senderName: string) => void
  onConnectionChange?: (status: string) => void
  onTypingChange?: (isTyping: boolean, userName?: string) => void
}

export function useChatAccessibility({
  onNewMessage,
  onConnectionChange,
  onTypingChange
}: ChatAccessibilityOptions = {}) {
  const { announce } = useLiveAnnouncements()

  const announceNewMessage = useCallback((message: string, senderName: string, isOwn: boolean = false) => {
    if (!isOwn && onNewMessage) {
      onNewMessage(message, senderName)
    }
    
    const announcement = isOwn 
      ? `Message sent: ${message.slice(0, 100)}${message.length > 100 ? '...' : ''}`
      : `New message from ${senderName}: ${message.slice(0, 100)}${message.length > 100 ? '...' : ''}`
    
    announce(announcement, 'polite')
  }, [announce, onNewMessage])

  const announceConnectionChange = useCallback((status: 'connected' | 'disconnected' | 'reconnecting') => {
    const statusMessages = {
      connected: 'Chat connected',
      disconnected: 'Chat disconnected',
      reconnecting: 'Reconnecting to chat...'
    }
    
    const message = statusMessages[status]
    if (onConnectionChange) {
      onConnectionChange(message)
    }
    
    announce(message, 'assertive')
  }, [announce, onConnectionChange])

  const announceTyping = useCallback((isTyping: boolean, userName?: string) => {
    if (!userName) return
    
    const message = isTyping 
      ? `${userName} is typing...` 
      : `${userName} stopped typing`
    
    if (onTypingChange) {
      onTypingChange(isTyping, userName)
    }
    
    announce(message, 'polite')
  }, [announce, onTypingChange])

  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive')
  }, [announce])

  const announceConversationChange = useCallback((conversationTitle?: string, participantCount?: number) => {
    const message = conversationTitle 
      ? `Switched to conversation: ${conversationTitle}${participantCount ? ` with ${participantCount} participants` : ''}`
      : 'Conversation changed'
    
    announce(message, 'polite')
  }, [announce])

  return {
    announceNewMessage,
    announceConnectionChange,
    announceTyping,
    announceError,
    announceConversationChange,
    announce
  }
}

export function useFocusManagement() {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const storePreviousFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
  }, [])

  const restorePreviousFocus = useCallback(() => {
    if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
      previousFocusRef.current.focus()
    }
  }, [])

  const focusFirstInteractive = useCallback((container: HTMLElement | null) => {
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    if (firstElement) {
      firstElement.focus()
    }
  }, [])

  const trapFocus = useCallback((container: HTMLElement, e: KeyboardEvent) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }
  }, [])

  return {
    storePreviousFocus,
    restorePreviousFocus,
    focusFirstInteractive,
    trapFocus
  }
}

interface AriaDescriptionsOptions {
  messageCount?: number
  unreadCount?: number
  connectionStatus?: string
  typingUsers?: string[]
}

export function useAriaDescriptions({
  messageCount = 0,
  unreadCount = 0,
  connectionStatus,
  typingUsers = []
}: AriaDescriptionsOptions = {}) {
  const getConversationDescription = useCallback(() => {
    let description = `Chat conversation with ${messageCount} messages`
    
    if (unreadCount > 0) {
      description += `, ${unreadCount} unread`
    }
    
    if (connectionStatus) {
      description += `, status: ${connectionStatus}`
    }
    
    if (typingUsers.length > 0) {
      description += `, ${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing`
    }
    
    return description
  }, [messageCount, unreadCount, connectionStatus, typingUsers])

  const getMessageDescription = useCallback((
    message: string, 
    senderName: string, 
    timestamp: Date,
    isRead: boolean = true
  ) => {
    const timeString = timestamp.toLocaleTimeString()
    const readStatus = isRead ? 'read' : 'unread'
    
    return `${readStatus} message from ${senderName} at ${timeString}: ${message}`
  }, [])

  const getInputDescription = useCallback((characterCount: number, maxLength?: number) => {
    let description = `Message input, ${characterCount} characters`
    
    if (maxLength) {
      description += ` of ${maxLength} maximum`
    }
    
    description += '. Press Enter to send, Escape to close, or use arrow keys to navigate conversations'
    
    return description
  }, [])

  return {
    getConversationDescription,
    getMessageDescription,
    getInputDescription
  }
}
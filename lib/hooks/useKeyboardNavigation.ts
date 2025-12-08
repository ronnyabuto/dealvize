import { useEffect, useCallback, useRef } from 'react'

interface KeyboardNavigationOptions {
  onEscape?: () => void
  onEnter?: (e: KeyboardEvent) => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onTab?: (e: KeyboardEvent) => void
  enabled?: boolean
  preventDefaultOnHandled?: boolean
}

export function useKeyboardNavigation({
  onEscape,
  onEnter,
  onArrowUp,
  onArrowDown,
  onTab,
  enabled = true,
  preventDefaultOnHandled = true
}: KeyboardNavigationOptions) {
  const handlersRef = useRef({ onEscape, onEnter, onArrowUp, onArrowDown, onTab })

  // Update handlers ref when props change
  useEffect(() => {
    handlersRef.current = { onEscape, onEnter, onArrowUp, onArrowDown, onTab }
  }, [onEscape, onEnter, onArrowUp, onArrowDown, onTab])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return

    const handlers = handlersRef.current
    let handled = false

    switch (e.key) {
      case 'Escape':
        if (handlers.onEscape) {
          handlers.onEscape()
          handled = true
        }
        break
      
      case 'Enter':
        if (handlers.onEnter) {
          handlers.onEnter(e)
          handled = true
        }
        break
        
      case 'ArrowUp':
        if (handlers.onArrowUp) {
          handlers.onArrowUp()
          handled = true
        }
        break
        
      case 'ArrowDown':
        if (handlers.onArrowDown) {
          handlers.onArrowDown()
          handled = true
        }
        break
        
      case 'Tab':
        if (handlers.onTab) {
          handlers.onTab(e)
          handled = true
        }
        break
    }

    if (handled && preventDefaultOnHandled) {
      e.preventDefault()
      e.stopPropagation()
    }
  }, [enabled, preventDefaultOnHandled])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

interface ConversationListNavigationOptions {
  conversations: Array<{ id: string }>
  selectedIndex: number
  onSelectionChange: (index: number) => void
  onConversationSelect: (conversationId: string) => void
  enabled?: boolean
}

export function useConversationListNavigation({
  conversations,
  selectedIndex,
  onSelectionChange,
  onConversationSelect,
  enabled = true
}: ConversationListNavigationOptions) {
  useKeyboardNavigation({
    onArrowUp: () => {
      const newIndex = selectedIndex > 0 ? selectedIndex - 1 : conversations.length - 1
      onSelectionChange(newIndex)
    },
    onArrowDown: () => {
      const newIndex = selectedIndex < conversations.length - 1 ? selectedIndex + 1 : 0
      onSelectionChange(newIndex)
    },
    onEnter: () => {
      if (selectedIndex >= 0 && selectedIndex < conversations.length) {
        onConversationSelect(conversations[selectedIndex].id)
      }
    },
    enabled: enabled && conversations.length > 0
  })
}

interface MessageInputNavigationOptions {
  onSend: () => void
  onEscape?: () => void
  multiline?: boolean
  enabled?: boolean
}

export function useMessageInputNavigation({
  onSend,
  onEscape,
  multiline = false,
  enabled = true
}: MessageInputNavigationOptions) {
  useKeyboardNavigation({
    onEnter: (e) => {
      // In multiline mode, only send on Ctrl+Enter or Cmd+Enter
      if (multiline) {
        if (e.ctrlKey || e.metaKey) {
          onSend()
        }
      } else {
        // In single line mode, send on Enter (unless Shift is held for line break)
        if (!e.shiftKey) {
          onSend()
        }
      }
    },
    onEscape: onEscape,
    enabled,
    preventDefaultOnHandled: !multiline // Don't prevent default in multiline for normal typing
  })
}
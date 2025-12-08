'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface PreloadConfig {
  routes: string[]
  components: (() => Promise<any>)[]
  delay?: number
}

export function useSmartPreload({ routes, components, delay = 2000 }: PreloadConfig) {
  const router = useRouter()

  // Preload critical routes after user interaction
  const preloadRoutes = useCallback(() => {
    routes.forEach(route => {
      router.prefetch(route)
    })
  }, [router, routes])

  // Preload critical components after initial render
  const preloadComponents = useCallback(() => {
    // Use requestIdleCallback if available, fallback to setTimeout
    const schedulePreload = (callback: () => void) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(callback, { timeout: 5000 })
      } else {
        setTimeout(callback, delay)
      }
    }

    schedulePreload(() => {
      components.forEach(componentLoader => {
        componentLoader().catch(error => {
          console.warn('Failed to preload component:', error)
        })
      })
    })
  }, [components, delay])

  // Smart preloading based on user behavior
  useEffect(() => {
    let preloadTimeout: NodeJS.Timeout

    const handleUserInteraction = () => {
      // Clear any existing timeout
      if (preloadTimeout) clearTimeout(preloadTimeout)
      
      // Start preloading after short delay to avoid blocking
      preloadTimeout = setTimeout(() => {
        preloadRoutes()
        preloadComponents()
      }, 1000)
    }

    const events = ['mouseenter', 'focus', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true, passive: true })
    })

    // Fallback: preload after 3 seconds anyway
    const fallbackTimeout = setTimeout(() => {
      preloadRoutes()
      preloadComponents()
    }, 3000)

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction)
      })
      clearTimeout(preloadTimeout)
      clearTimeout(fallbackTimeout)
    }
  }, [preloadRoutes, preloadComponents])
}

// Hook for critical dashboard resources
export function useDashboardPreload() {
  return useSmartPreload({
    routes: ['/clients', '/deals', '/tasks', '/calendar', '/settings'],
    components: [
      () => import('@/components/features/clients/clients-list'),
      () => import('@/components/features/deals/deals-list'),
      () => import('@/components/shared/tasks-list'),
      () => import('@/components/shared/enhanced-chart'),
    ],
    delay: 1500
  })
}
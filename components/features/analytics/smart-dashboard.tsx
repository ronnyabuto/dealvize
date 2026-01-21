'use client'

import { useEffect } from 'react'
import { useDashboardPreload } from '@/hooks/use-smart-preload'

interface SmartDashboardProps {
  children: React.ReactNode
}

export function SmartDashboard({ children }: SmartDashboardProps) {
  // Initialize smart preloading
  useDashboardPreload()

  // Performance monitoring
  useEffect(() => {
    // Mark dashboard as interactive
    if (typeof window !== 'undefined' && 'performance' in window) {
      const mark = () => {
        performance.mark('dashboard-interactive')
        
        // Log performance metrics after everything loads
        requestIdleCallback(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as any
          if (navigation) {
            console.log('Dashboard Performance:', {
              loadComplete: `${navigation.loadEventEnd - navigation.navigationStart}ms`,
              domReady: `${navigation.domContentLoadedEventEnd - navigation.navigationStart}ms`,
              firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 'N/A',
              firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 'N/A',
            })
          }
        }, { timeout: 5000 })
      }

      // Wait for next tick to ensure components are mounted
      setTimeout(mark, 0)
    }
  }, [])

  return <>{children}</>
}
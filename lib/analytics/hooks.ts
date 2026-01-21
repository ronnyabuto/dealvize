/**
 * Analytics hooks for automatic tracking
 */

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from './index'

export function usePageTracking() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      analytics.page(pathname)
    }
  }, [pathname])
}

export function useEngagementTracking() {
  useEffect(() => {
    // Track click events
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        analytics.track('element_clicked', {
          element: target.tagName,
          text: target.textContent?.slice(0, 50)
        })
      }
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])
}

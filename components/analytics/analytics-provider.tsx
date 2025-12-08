'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { analytics } from '@/lib/analytics'
import { usePageTracking, useEngagementTracking } from '@/lib/analytics/hooks'

interface AnalyticsContextType {
  initialized: boolean
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  initialized: false
})

export const useAnalytics = () => useContext(AnalyticsContext)

interface AnalyticsProviderProps {
  children: React.ReactNode
  userId?: string
  userProperties?: Record<string, any>
}

export function AnalyticsProvider({ 
  children, 
  userId, 
  userProperties 
}: AnalyticsProviderProps) {
  // Set up automatic page tracking
  usePageTracking()
  
  // Set up engagement tracking
  useEngagementTracking()

  useEffect(() => {
    // Initialize analytics
    const initAnalytics = async () => {
      try {
        await analytics.initialize()
        
        // Set user properties if provided
        if (userId || userProperties) {
          analytics.identify(userId || '', userProperties)
        }
      } catch (error) {
        console.error('Failed to initialize analytics:', error)
      }
    }

    initAnalytics()

    // Cleanup on unmount
    return () => {
      analytics.destroy()
    }
  }, [userId, userProperties])

  return (
    <AnalyticsContext.Provider value={{ initialized: true }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

// Cookie consent banner component
export function CookieConsentBanner() {
  const handleAccept = () => {
    analytics.acceptCookieConsent()
    setShowBanner(false)
  }

  const handleReject = () => {
    analytics.rejectCookieConsent()
    setShowBanner(false)
  }

  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('analytics-consent')
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm">
            We use cookies and similar technologies to improve your experience, analyze site usage, 
            and assist with marketing. By continuing to browse or clicking "Accept", you consent to 
            the storing of cookies on your device.{' '}
            <a href="/privacy" className="underline hover:no-underline">
              Learn more in our Privacy Policy
            </a>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            className="px-4 py-2 text-sm bg-transparent border border-gray-600 rounded hover:bg-gray-800 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}

// Enhanced components with built-in analytics
interface AnalyticsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  analyticsEvent?: string
  analyticsData?: Record<string, any>
  children: React.ReactNode
}

export function AnalyticsButton({ 
  analyticsEvent, 
  analyticsData, 
  onClick, 
  children, 
  ...props 
}: AnalyticsButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Track analytics event
    if (analyticsEvent) {
      analytics.track(analyticsEvent, {
        button_text: typeof children === 'string' ? children : 'button',
        ...analyticsData,
      })
    }

    // Call original onClick handler
    onClick?.(e)
  }

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  )
}

interface AnalyticsLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  analyticsEvent?: string
  analyticsData?: Record<string, any>
  children: React.ReactNode
}

export function AnalyticsLink({ 
  analyticsEvent, 
  analyticsData, 
  onClick, 
  children, 
  href,
  ...props 
}: AnalyticsLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Track analytics event
    if (analyticsEvent) {
      analytics.track(analyticsEvent, {
        link_url: href,
        link_text: typeof children === 'string' ? children : 'link',
        is_external: href?.startsWith('http'),
        ...analyticsData,
      })
    }

    // Call original onClick handler
    onClick?.(e)
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useMobileDetection, usePWA, useNetworkStatus } from '@/hooks/use-mobile-detection'
import { MobileNavigation } from '@/components/mobile/mobile-navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Wifi, 
  WifiOff, 
  Download, 
  X, 
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileContextType {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  orientation: 'portrait' | 'landscape'
  isOnline: boolean
  connectionType: string
  isInstallable: boolean
  isInstalled: boolean
  installPWA: () => Promise<boolean>
  showMobileLayout: boolean
  toggleMobileLayout: () => void
}

const MobileContext = createContext<MobileContextType | undefined>(undefined)

export function useMobile() {
  const context = useContext(MobileContext)
  if (context === undefined) {
    throw new Error('useMobile must be used within a MobileProvider')
  }
  return context
}

interface MobileProviderProps {
  children: React.ReactNode
  user?: {
    name: string
    email: string
    avatar?: string
  }
  notifications?: number
}

export function MobileProvider({ children, user, notifications }: MobileProviderProps) {
  const mobileDetection = useMobileDetection()
  const { isInstallable, isInstalled, installPWA } = usePWA()
  const { isOnline, connectionType } = useNetworkStatus()
  const [showMobileLayout, setShowMobileLayout] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)

  useEffect(() => {
    setShowMobileLayout(mobileDetection.isMobile)
  }, [mobileDetection.isMobile])

  useEffect(() => {
    // Show install prompt for mobile users after 30 seconds if not already installed
    if (mobileDetection.isMobile && isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true)
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [mobileDetection.isMobile, isInstallable, isInstalled])

  useEffect(() => {
    // Show offline message when connection is lost
    if (!isOnline) {
      setShowOfflineMessage(true)
    } else {
      setShowOfflineMessage(false)
    }
  }, [isOnline])

  const handleInstallPWA = async () => {
    const success = await installPWA()
    if (success) {
      setShowInstallPrompt(false)
    }
  }

  const contextValue: MobileContextType = {
    ...mobileDetection,
    isOnline,
    connectionType,
    isInstallable,
    isInstalled,
    installPWA,
    showMobileLayout,
    toggleMobileLayout: () => setShowMobileLayout(!showMobileLayout)
  }

  return (
    <MobileContext.Provider value={contextValue}>
      <div className={cn(
        'min-h-screen bg-gray-50',
        showMobileLayout && 'lg:bg-white'
      )}>
        {/* Mobile Navigation - only show on mobile layout */}
        {showMobileLayout && (
          <MobileNavigation user={user} notifications={notifications} />
        )}

        {/* Offline Indicator */}
        {showOfflineMessage && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 text-sm">
            <div className="flex items-center justify-center space-x-2">
              <WifiOff className="h-4 w-4" />
              <span>You're offline. Some features may be limited.</span>
            </div>
          </div>
        )}

        {/* PWA Install Prompt */}
        {showInstallPrompt && (
          <div className="fixed bottom-4 left-4 right-4 z-50 lg:bottom-8 lg:left-8 lg:right-auto lg:w-96">
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Download className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">Install Dealvize</h4>
                    <p className="text-sm text-gray-500">
                      Get the full app experience with offline access and push notifications.
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <Button size="sm" onClick={handleInstallPWA}>
                        Install
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowInstallPrompt(false)}
                      >
                        Not now
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInstallPrompt(false)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Device Debug Info - only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 right-4 z-40 opacity-50 hover:opacity-100 transition-opacity">
            <Card className="p-2">
              <div className="flex items-center space-x-2 text-xs">
                {mobileDetection.isMobile && <Smartphone className="h-3 w-3" />}
                {mobileDetection.isTablet && <Tablet className="h-3 w-3" />}
                {mobileDetection.isDesktop && <Monitor className="h-3 w-3" />}
                <span>{mobileDetection.screenWidth}x{mobileDetection.screenHeight}</span>
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className={cn(
          showMobileLayout 
            ? 'lg:hidden' 
            : 'hidden lg:block'
        )}>
          {children}
        </div>
      </div>
    </MobileContext.Provider>
  )
}

// Helper component for responsive layouts
interface ResponsiveLayoutProps {
  mobileComponent: React.ReactNode
  desktopComponent: React.ReactNode
  children?: React.ReactNode
}

export function ResponsiveLayout({ mobileComponent, desktopComponent }: ResponsiveLayoutProps) {
  const { showMobileLayout } = useMobile()

  return (
    <>
      {showMobileLayout ? mobileComponent : desktopComponent}
    </>
  )
}

// Hook for responsive values
export function useResponsiveValue<T>(mobileValue: T, tabletValue: T, desktopValue: T): T {
  const { isMobile, isTablet } = useMobile()
  
  if (isMobile) return mobileValue
  if (isTablet) return tabletValue
  return desktopValue
}

// Component for conditional mobile rendering
interface MobileOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function MobileOnly({ children, fallback = null }: MobileOnlyProps) {
  const { isMobile } = useMobile()
  return isMobile ? <>{children}</> : <>{fallback}</>
}

// Component for conditional desktop rendering
interface DesktopOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function DesktopOnly({ children, fallback = null }: DesktopOnlyProps) {
  const { isDesktop } = useMobile()
  return isDesktop ? <>{children}</> : <>{fallback}</>
}
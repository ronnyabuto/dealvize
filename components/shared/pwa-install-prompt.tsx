"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Smartphone, 
  Download, 
  X, 
  Check,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  Shield,
  Bell
} from 'lucide-react'
import { usePWA } from '@/hooks/use-pwa'

interface PWAInstallPromptProps {
  className?: string
  autoShow?: boolean
  showFeatures?: boolean
}

export function PWAInstallPrompt({ 
  className = "", 
  autoShow = true,
  showFeatures = true 
}: PWAInstallPromptProps) {
  const { 
    isInstallable, 
    isInstalled, 
    isOnline,
    isServiceWorkerRegistered,
    installApp 
  } = usePWA()
  
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installResult, setInstallResult] = useState<{ 
    success?: boolean; 
    error?: string 
  }>({})
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const wasDismissed = localStorage.getItem('pwa-install-dismissed') === 'true'
    setDismissed(wasDismissed)

    // Auto-show prompt if installable and not dismissed
    if (isInstallable && !isInstalled && !wasDismissed && autoShow) {
      // Delay showing the prompt to avoid interrupting user
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Show after 3 seconds

      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled, autoShow])

  const handleInstall = async () => {
    setIsInstalling(true)
    setInstallResult({})
    
    try {
      const result = await installApp()
      setInstallResult(result)
      
      if (result.success) {
        setShowPrompt(false)
        // Track successful installation
        if (typeof window !== 'undefined' && typeof (window as any).gtag !== 'undefined') {
          (window as any).gtag('event', 'pwa_install', {
            'event_category': 'PWA',
            'event_label': 'User initiated install'
          })
        }
      }
    } catch (error) {
      setInstallResult({
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed'
      })
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
    
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 7)
    localStorage.setItem('pwa-install-dismissed-expiry', expiryDate.toISOString())
  }

  const resetDismissal = () => {
    localStorage.removeItem('pwa-install-dismissed')
    localStorage.removeItem('pwa-install-dismissed-expiry')
    setDismissed(false)
  }

  // Check if dismissal has expired
  useEffect(() => {
    const checkDismissalExpiry = () => {
      const expiry = localStorage.getItem('pwa-install-dismissed-expiry')
      if (expiry && new Date(expiry) < new Date()) {
        resetDismissal()
      }
    }

    checkDismissalExpiry()
    const interval = setInterval(checkDismissalExpiry, 1000 * 60 * 60) // Check every hour

    return () => clearInterval(interval)
  }, [])

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable || dismissed) {
    return null
  }

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant loading with offline caching'
    },
    {
      icon: Shield,
      title: 'Always Available',
      description: 'Works offline when connection is lost'
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Get notified about important updates'
    },
    {
      icon: Smartphone,
      title: 'Native Experience',
      description: 'App-like experience on your device'
    }
  ]

  return (
    <>
      {/* Compact notification banner */}
      {!showPrompt && (
        <Alert className={`bg-blue-50 border-blue-200 ${className}`}>
          <Smartphone className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className="font-medium">Install Dealvize CRM</span> for the best experience
            </div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={() => setShowPrompt(true)}
                className="h-7"
              >
                <Download className="h-3 w-3 mr-1" />
                Install
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="h-7"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Full install dialog */}
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <DialogTitle className="text-xl">Install Dealvize CRM</DialogTitle>
            <DialogDescription>
              Get the full app experience with offline access and push notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-center space-x-2 text-sm">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">Offline</span>
                </>
              )}
              {isServiceWorkerRegistered && (
                <Badge variant="outline" className="ml-2">
                  <Shield className="h-3 w-3 mr-1" />
                  Protected
                </Badge>
              )}
            </div>

            {/* Features */}
            {showFeatures && (
              <div className="grid grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <feature.icon className="h-5 w-5 text-blue-600 mb-2" />
                    <h4 className="font-medium text-sm">{feature.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Installation Result */}
            {installResult.success === true && (
              <Alert className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  App installed successfully! You can now access Dealvize from your home screen.
                </AlertDescription>
              </Alert>
            )}

            {installResult.success === false && (
              <Alert className="bg-red-50 border-red-200">
                <X className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {installResult.error || 'Installation failed. Please try again.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button 
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1"
              >
                {isInstalling ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Install App
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleDismiss}>
                Maybe Later
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 text-center">
              The app will be added to your home screen and can be used offline.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Status component for showing PWA status
export function PWAStatus({ className = "" }: { className?: string }) {
  const { 
    isInstalled, 
    isOnline, 
    isServiceWorkerRegistered,
    updateServiceWorker 
  } = usePWA()
  
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      await updateServiceWorker()
      window.location.reload()
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-1">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}
        <span className="text-xs text-gray-600">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* App Status */}
      {isInstalled && (
        <Badge variant="outline" className="text-xs">
          <Smartphone className="h-3 w-3 mr-1" />
          Installed
        </Badge>
      )}

      {/* Service Worker Status */}
      {isServiceWorkerRegistered && (
        <Badge variant="outline" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Cached
        </Badge>
      )}

      {/* Update Button */}
      {isServiceWorkerRegistered && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleUpdate}
          disabled={isUpdating}
          className="h-6 px-2 text-xs"
        >
          {isUpdating ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Update
            </>
          )}
        </Button>
      )}
    </div>
  )
}
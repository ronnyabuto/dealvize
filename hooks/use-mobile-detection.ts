'use client'

import { useState, useEffect } from 'react'

interface MobileDetectionHook {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  screenWidth: number
  screenHeight: number
  orientation: 'portrait' | 'landscape'
  userAgent: string
  touchSupported: boolean
  isIOS: boolean
  isAndroid: boolean
}

export function useMobileDetection(): MobileDetectionHook {
  const [state, setState] = useState<MobileDetectionHook>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 1920,
    screenHeight: 1080,
    orientation: 'landscape',
    userAgent: '',
    touchSupported: false,
    isIOS: false,
    isAndroid: false
  })

  useEffect(() => {
    const updateMobileDetection = () => {
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const userAgent = navigator.userAgent.toLowerCase()
      
      // Device detection based on screen size
      const isMobile = screenWidth < 768
      const isTablet = screenWidth >= 768 && screenWidth < 1024
      const isDesktop = screenWidth >= 1024
      
      // Orientation detection
      const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait'
      
      // Touch support detection
      const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // Platform detection
      const isIOS = /iphone|ipad|ipod/.test(userAgent)
      const isAndroid = /android/.test(userAgent)
      
      setState({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth,
        screenHeight,
        orientation,
        userAgent,
        touchSupported,
        isIOS,
        isAndroid
      })
    }

    // Initial detection
    updateMobileDetection()

    // Listen for resize events
    window.addEventListener('resize', updateMobileDetection)
    window.addEventListener('orientationchange', updateMobileDetection)

    return () => {
      window.removeEventListener('resize', updateMobileDetection)
      window.removeEventListener('orientationchange', updateMobileDetection)
    }
  }, [])

  return state
}

// Hook for PWA detection and installation
export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isInWebAppiOS = (window.navigator as any).standalone === true
    setIsInstalled(isStandalone || isInWebAppiOS)

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installPWA = async () => {
    if (!deferredPrompt) return false

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstallable(false)
      return true
    }
    
    return false
  }

  return {
    isInstallable,
    isInstalled,
    installPWA
  }
}

// Hook for network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('')

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    const updateConnectionType = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection
      
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown')
      }
    }

    // Initial check
    updateOnlineStatus()
    updateConnectionType()

    // Event listeners
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    
    if (connection) {
      connection.addEventListener('change', updateConnectionType)
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      
      if (connection) {
        connection.removeEventListener('change', updateConnectionType)
      }
    }
  }, [])

  return { isOnline, connectionType }
}

// Hook for device capabilities
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    hasCamera: false,
    hasMicrophone: false,
    hasGeolocation: false,
    hasNotifications: false,
    hasVibration: false,
    hasDeviceMotion: false,
    hasBattery: false
  })

  useEffect(() => {
    const checkCapabilities = async () => {
      const newCapabilities = {
        hasCamera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        hasMicrophone: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        hasGeolocation: !!navigator.geolocation,
        hasNotifications: 'Notification' in window,
        hasVibration: 'vibrate' in navigator,
        hasDeviceMotion: 'DeviceMotionEvent' in window,
        hasBattery: 'getBattery' in navigator
      }
      
      setCapabilities(newCapabilities)
    }

    checkCapabilities()
  }, [])

  return capabilities
}
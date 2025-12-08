"use client"

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  isServiceWorkerSupported: boolean
  isServiceWorkerRegistered: boolean
  prompt: BeforeInstallPromptEvent | null
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator?.onLine ?? true,
    isServiceWorkerSupported: false,
    isServiceWorkerRegistered: false,
    prompt: null
  })

  // Check if app is installed (display mode)
  const checkInstallStatus = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = (window.navigator as any).standalone === true
    return isStandalone || isIOSStandalone
  }

  // Check service worker support and registration status
  const checkServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      return { supported: false, registered: false }
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      return {
        supported: true,
        registered: !!registration
      }
    } catch (error) {
      return { supported: true, registered: false }
    }
  }

  useEffect(() => {
    const initializePWA = async () => {
      const { supported, registered } = await checkServiceWorker()
      
      setState(prev => ({
        ...prev,
        isInstalled: checkInstallStatus(),
        isServiceWorkerSupported: supported,
        isServiceWorkerRegistered: registered
      }))

      // Listen for install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault()
        const promptEvent = e as BeforeInstallPromptEvent
        
        setState(prev => ({
          ...prev,
          isInstallable: true,
          prompt: promptEvent
        }))
      }

      // Listen for app installation
      const handleAppInstalled = () => {
        setState(prev => ({
          ...prev,
          isInstalled: true,
          isInstallable: false,
          prompt: null
        }))
      }

      // Listen for online/offline changes
      const handleOnline = () => {
        setState(prev => ({ ...prev, isOnline: true }))
      }

      const handleOffline = () => {
        setState(prev => ({ ...prev, isOnline: false }))
      }

      // Listen for display mode changes
      const handleDisplayModeChange = () => {
        setState(prev => ({
          ...prev,
          isInstalled: checkInstallStatus()
        }))
      }

      // Attach event listeners
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.addEventListener('appinstalled', handleAppInstalled)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      
      // Listen for display mode changes
      const mediaQuery = window.matchMedia('(display-mode: standalone)')
      mediaQuery.addEventListener('change', handleDisplayModeChange)

      // Register service worker if supported and not already registered
      if (supported && !registered) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          })
          
          console.log('Service Worker registered:', registration)
          
          setState(prev => ({
            ...prev,
            isServiceWorkerRegistered: true
          }))
        } catch (error) {
          console.error('Service Worker registration failed:', error)
        }
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        mediaQuery.removeEventListener('change', handleDisplayModeChange)
      }
    }

    initializePWA()
  }, [])

  const installApp = async () => {
    if (!state.prompt) {
      return { success: false, error: 'Install prompt not available' }
    }

    try {
      await state.prompt.prompt()
      const userChoice = await state.prompt.userChoice
      
      setState(prev => ({
        ...prev,
        isInstallable: false,
        prompt: null
      }))

      return {
        success: userChoice.outcome === 'accepted',
        outcome: userChoice.outcome
      }
    } catch (error) {
      console.error('App installation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed'
      }
    }
  }

  const updateServiceWorker = async () => {
    if (!state.isServiceWorkerSupported) {
      return { success: false, error: 'Service Worker not supported' }
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        return { success: true }
      }
      return { success: false, error: 'No service worker registration found' }
    } catch (error) {
      console.error('Service Worker update failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      }
    }
  }

  const sendMessageToServiceWorker = (message: any) => {
    if (!state.isServiceWorkerRegistered || !navigator.serviceWorker.controller) {
      return false
    }

    try {
      navigator.serviceWorker.controller.postMessage(message)
      return true
    } catch (error) {
      console.error('Failed to send message to service worker:', error)
      return false
    }
  }

  return {
    ...state,
    installApp,
    updateServiceWorker,
    sendMessageToServiceWorker
  }
}

// Hook for managing offline data
export function useOfflineStorage() {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported('indexedDB' in window)
  }, [])

  const storeOfflineData = async (key: string, data: any) => {
    if (!isSupported) {
      return { success: false, error: 'IndexedDB not supported' }
    }

    try {
      const request = indexedDB.open('DealvizeOfflineDB', 1)
      
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        request.onerror = () => {
          resolve({ success: false, error: 'Failed to open database' })
        }

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const transaction = db.transaction(['offlineData'], 'readwrite')
          const store = transaction.objectStore('offlineData')
          
          const putRequest = store.put({ id: key, data, timestamp: Date.now() })
          
          putRequest.onsuccess = () => {
            resolve({ success: true })
          }
          
          putRequest.onerror = () => {
            resolve({ success: false, error: 'Failed to store data' })
          }
        }

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('offlineData')) {
            db.createObjectStore('offlineData', { keyPath: 'id' })
          }
        }
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage failed'
      }
    }
  }

  const getOfflineData = async (key: string) => {
    if (!isSupported) {
      return { success: false, error: 'IndexedDB not supported' }
    }

    try {
      const request = indexedDB.open('DealvizeOfflineDB', 1)
      
      return new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
        request.onerror = () => {
          resolve({ success: false, error: 'Failed to open database' })
        }

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const transaction = db.transaction(['offlineData'], 'readonly')
          const store = transaction.objectStore('offlineData')
          
          const getRequest = store.get(key)
          
          getRequest.onsuccess = () => {
            const result = getRequest.result
            if (result) {
              resolve({ success: true, data: result.data })
            } else {
              resolve({ success: false, error: 'Data not found' })
            }
          }
          
          getRequest.onerror = () => {
            resolve({ success: false, error: 'Failed to retrieve data' })
          }
        }

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('offlineData')) {
            db.createObjectStore('offlineData', { keyPath: 'id' })
          }
        }
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retrieval failed'
      }
    }
  }

  const clearOfflineData = async (key?: string) => {
    if (!isSupported) {
      return { success: false, error: 'IndexedDB not supported' }
    }

    try {
      const request = indexedDB.open('DealvizeOfflineDB', 1)
      
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const transaction = db.transaction(['offlineData'], 'readwrite')
          const store = transaction.objectStore('offlineData')
          
          const clearRequest = key ? store.delete(key) : store.clear()
          
          clearRequest.onsuccess = () => {
            resolve({ success: true })
          }
          
          clearRequest.onerror = () => {
            resolve({ success: false, error: 'Failed to clear data' })
          }
        }
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clear failed'
      }
    }
  }

  return {
    isSupported,
    storeOfflineData,
    getOfflineData,
    clearOfflineData
  }
}
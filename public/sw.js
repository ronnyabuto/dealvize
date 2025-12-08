// Service Worker for Dealvize CRM
// Optimized caching strategy for sub-100ms performance

const CACHE_NAME = 'dealvize-v1'
const STATIC_CACHE_NAME = 'dealvize-static-v1'
const API_CACHE_NAME = 'dealvize-api-v1'

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/clients',
  '/deals',
  '/tasks',
  '/messages',
  '/lead-scoring',
  '/reports',
  '/_next/static/css/',
  '/_next/static/js/',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html'
]

// API endpoints to cache with short TTL
const API_ENDPOINTS = [
  '/api/clients',
  '/api/deals', 
  '/api/tasks',
  '/api/messages',
  '/api/dashboard/metrics', // Critical dashboard data
  '/api/lead-scoring',
  '/api/notes',
  '/api/commission-settings',
  '/api/email-templates',
  '/api/scoring-rules'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('*')))
      }),
      caches.open(API_CACHE_NAME).then((cache) => {
        // Pre-warm API cache if needed
        return Promise.resolve()
      })
    ]).then(() => {
      console.log('Service Worker installed')
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('Service Worker activated')
      return self.clients.claim()
    })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network First with short cache fallback
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - Cache First (immutable)
    event.respondWith(handleStaticAsset(request))
  } else if (url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/)) {
    // Other static resources - Cache First
    event.respondWith(handleStaticAsset(request))
  } else {
    // HTML pages - Network First with cache fallback
    event.respondWith(handlePageRequest(request))
  }
})

// Network First strategy for API requests
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME)
  
  try {
    // Try network first
    const networkResponse = await fetch(request.clone())
    
    // Cache successful responses for 60 seconds
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone()
      const headers = new Headers(responseToCache.headers)
      headers.set('sw-cached-at', Date.now().toString())
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      })
      
      cache.put(request, cachedResponse)
    }
    
    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url)
    
    // Fallback to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      // Check if cache is still fresh (60 seconds)
      const cachedAt = cachedResponse.headers.get('sw-cached-at')
      const cacheAge = Date.now() - parseInt(cachedAt || '0')
      
      if (cacheAge < 60000) { // 60 seconds
        return cachedResponse
      }
    }
    
    // Return network error if no valid cache
    throw error
  }
}

// Cache First strategy for static assets
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE_NAME)
  
  // Try cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Fallback to network and cache
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url)
    throw error
  }
}

// Network First strategy for HTML pages
async function handlePageRequest(request) {
  const cache = await caches.open(CACHE_NAME)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url)
    
    // Fallback to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page if available
    const offlineResponse = await cache.match('/')
    if (offlineResponse) {
      return offlineResponse
    }
    
    throw error
  }
}

// Background sync for data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  // Implement background sync logic here
  console.log('Background sync triggered')
}

// Push notifications (if needed)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: data.tag || 'dealvize-notification',
      data: data.data || {}
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})
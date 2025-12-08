import { createMocks } from 'node-mocks-http'
import { POST, GET } from '@/app/api/analytics/route'
import { NextRequest } from 'next/server'

// Mock session validation
const mockSessionInfo = {
  sessionId: 'session-123',
  userId: 'user-456',
  isValid: true
}

jest.mock('@/lib/auth/session', () => ({
  validateSession: jest.fn(() => Promise.resolve({
    isValid: true,
    sessionInfo: mockSessionInfo
  }))
}))

// Mock analytics storage
const mockAnalyticsStorage = []

jest.mock('@/lib/analytics/storage', () => ({
  storeAnalyticsEvent: jest.fn((event) => {
    mockAnalyticsStorage.push(event)
    return Promise.resolve(true)
  }),
  storeAnalyticsSession: jest.fn((session) => {
    return Promise.resolve(true)
  }),
  getAnalytics: jest.fn(() => Promise.resolve({
    events: mockAnalyticsStorage,
    sessions: []
  }))
}))

describe('/api/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAnalyticsStorage.length = 0
  })

  describe('POST', () => {
    const validPayload = {
      events: [
        {
          eventName: 'page_view',
          properties: {
            page: '/dashboard',
            referrer: 'https://google.com'
          },
          userId: 'user-456',
          sessionId: 'session-123',
          timestamp: Date.now(),
          url: 'https://app.dealvize.com/dashboard',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          referrer: 'https://google.com'
        },
        {
          eventName: 'button_click',
          properties: {
            buttonText: 'Create Client',
            section: 'clients'
          },
          userId: 'user-456',
          sessionId: 'session-123',
          timestamp: Date.now(),
          url: 'https://app.dealvize.com/dashboard',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          referrer: ''
        }
      ],
      session: {
        sessionId: 'session-123',
        userId: 'user-456',
        startTime: Date.now() - 300000, // 5 minutes ago
        lastActivity: Date.now(),
        pageViews: 5,
        events: [],
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          screen: { width: 1920, height: 1080 },
          viewport: { width: 1600, height: 900 },
          timezone: 'America/New_York',
          language: 'en-US'
        }
      },
      timestamp: Date.now()
    }

    it('should accept and store analytics data successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.eventsProcessed).toBe(2)
      
      // Verify analytics storage was called
      const { storeAnalyticsEvent, storeAnalyticsSession } = require('@/lib/analytics/storage')
      expect(storeAnalyticsEvent).toHaveBeenCalledTimes(2)
      expect(storeAnalyticsSession).toHaveBeenCalledTimes(1)
    })

    it('should validate payload structure', async () => {
      const invalidPayload = {
        events: 'not an array',
        session: {},
        timestamp: Date.now()
      }

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid payload structure')
    })

    it('should validate individual event structure', async () => {
      const payloadWithInvalidEvent = {
        ...validPayload,
        events: [
          {
            // Missing required fields
            eventName: 'incomplete_event',
            timestamp: Date.now()
          }
        ]
      }

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadWithInvalidEvent)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid event structure')
    })

    it('should validate session structure', async () => {
      const payloadWithInvalidSession = {
        ...validPayload,
        session: {
          sessionId: 'session-123'
          // Missing required fields
        }
      }

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadWithInvalidSession)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid session structure')
    })

    it('should handle events without userId for anonymous tracking', async () => {
      const anonymousPayload = {
        ...validPayload,
        events: [
          {
            eventName: 'page_view',
            properties: { page: '/landing' },
            sessionId: 'anonymous-session',
            timestamp: Date.now(),
            url: 'https://dealvize.com/',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            referrer: 'https://google.com'
          }
        ],
        session: {
          ...validPayload.session,
          sessionId: 'anonymous-session',
          userId: undefined
        }
      }

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(anonymousPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.eventsProcessed).toBe(1)
    })

    it('should sanitize and validate event properties', async () => {
      const payloadWithMaliciousData = {
        ...validPayload,
        events: [
          {
            eventName: 'test_event',
            properties: {
              normalProperty: 'safe value',
              scriptTag: '<script>alert("xss")</script>',
              sqlInjection: "'; DROP TABLE users; --",
              largeProperty: 'x'.repeat(10000) // Very large property
            },
            sessionId: 'session-123',
            timestamp: Date.now(),
            url: 'https://app.dealvize.com/dashboard',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            referrer: ''
          }
        ]
      }

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadWithMaliciousData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify that dangerous content was sanitized
      const { storeAnalyticsEvent } = require('@/lib/analytics/storage')
      const storedEvent = storeAnalyticsEvent.mock.calls[0][0]
      expect(storedEvent.properties.scriptTag).not.toContain('<script>')
      expect(storedEvent.properties.sqlInjection).not.toContain('DROP TABLE')
    })

    it('should limit event batch size', async () => {
      const largePayload = {
        ...validPayload,
        events: Array(1001).fill(validPayload.events[0]) // Exceed batch limit
      }

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(largePayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Batch size too large')
    })

    it('should handle storage errors gracefully', async () => {
      const { storeAnalyticsEvent } = require('@/lib/analytics/storage')
      storeAnalyticsEvent.mockRejectedValueOnce(new Error('Storage failed'))

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to store analytics data')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
    })

    it('should handle session validation failure', async () => {
      const { validateSession } = require('@/lib/auth/session')
      validateSession.mockResolvedValueOnce({
        isValid: false,
        sessionInfo: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      // Should still accept analytics data for anonymous users
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should validate timestamp ranges', async () => {
      const futureTimestamp = Date.now() + 86400000 // 1 day in future
      const oldTimestamp = Date.now() - (86400000 * 30) // 30 days ago

      const payloadWithInvalidTimestamps = {
        ...validPayload,
        events: [
          {
            ...validPayload.events[0],
            timestamp: futureTimestamp
          },
          {
            ...validPayload.events[1],
            timestamp: oldTimestamp
          }
        ]
      }

      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadWithInvalidTimestamps)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid timestamp')
    })
  })

  describe('GET', () => {
    it('should return analytics dashboard when authorized', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.analytics).toBeDefined()
      expect(data.analytics.events).toBeDefined()
      expect(data.analytics.sessions).toBeDefined()
    })

    it('should handle query parameters for filtering', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics?startDate=2024-01-01&endDate=2024-01-31&eventType=page_view')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify filters were applied
      const { getAnalytics } = require('@/lib/analytics/storage')
      expect(getAnalytics).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        eventType: 'page_view'
      })
    })

    it('should handle analytics storage errors', async () => {
      const { getAnalytics } = require('@/lib/analytics/storage')
      getAnalytics.mockRejectedValueOnce(new Error('Storage read failed'))

      const request = new NextRequest('http://localhost:3000/api/analytics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to retrieve analytics data')
    })

    it('should require authentication for GET requests', async () => {
      const { validateSession } = require('@/lib/auth/session')
      validateSession.mockResolvedValueOnce({
        isValid: false,
        sessionInfo: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Unauthorized')
    })
  })

  describe('Rate limiting and security', () => {
    it('should implement rate limiting for high-frequency requests', async () => {
      // Mock rate limiting
      jest.doMock('@/lib/security/rate-limiting', () => ({
        checkRateLimit: jest.fn()
          .mockReturnValueOnce(true)  // First request allowed
          .mockReturnValueOnce(true)  // Second request allowed
          .mockReturnValueOnce(false) // Third request blocked
      }))

      const requests = Array(3).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(validPayload)
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      expect(responses[0].status).toBe(200)
      expect(responses[1].status).toBe(200)
      expect(responses[2].status).toBe(429) // Rate limited
    })

    it('should validate Content-Type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(validPayload)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Content-Type must be application/json')
    })

    it('should handle CORS preflight requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics', {
        method: 'OPTIONS'
      })

      const response = await POST(request) // Assuming OPTIONS is handled in POST
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined()
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined()
    })
  })
})
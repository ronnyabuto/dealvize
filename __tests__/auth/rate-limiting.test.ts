import { 
  checkRateLimit, 
  resetRateLimit, 
  getRateLimitStatus,
  configureRateLimit 
} from '@/lib/auth/rate-limiting'

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  multi: jest.fn(() => ({
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn(() => Promise.resolve([[null, 1], [null, 1]]))
  }))
}

jest.mock('redis', () => ({
  createClient: () => mockRedisClient
}))

describe('Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      mockRedisClient.get.mockResolvedValueOnce('3') // Current count
      mockRedisClient.incr.mockResolvedValueOnce(4) // After increment
      
      const result = await checkRateLimit('test-key', {
        windowMs: 60000, // 1 minute
        maxRequests: 10
      })
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(6) // 10 - 4 = 6
      expect(result.resetTime).toBeDefined()
    })

    it('should block requests exceeding rate limit', async () => {
      mockRedisClient.get.mockResolvedValueOnce('10') // At limit
      mockRedisClient.incr.mockResolvedValueOnce(11) // Would exceed
      
      const result = await checkRateLimit('test-key', {
        windowMs: 60000,
        maxRequests: 10
      })
      
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should handle first request correctly', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null) // No existing count
      mockRedisClient.incr.mockResolvedValueOnce(1) // First request
      
      const result = await checkRateLimit('test-key', {
        windowMs: 60000,
        maxRequests: 10
      })
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 60)
    })

    it('should reset rate limit when requested', async () => {
      await resetRateLimit('test-key')
      
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key')
    })
  })

  describe('Authentication Rate Limiting', () => {
    it('should limit login attempts per IP', async () => {
      const ipAddress = '192.168.1.1'
      mockRedisClient.get.mockResolvedValueOnce('4') // 4 failed attempts
      mockRedisClient.incr.mockResolvedValueOnce(5) // 5th attempt
      
      const result = await checkRateLimit(`auth:login:${ipAddress}`, {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5
      })
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it('should limit login attempts per user account', async () => {
      const userId = 'user-123'
      mockRedisClient.get.mockResolvedValueOnce('10') // 10 attempts
      mockRedisClient.incr.mockResolvedValueOnce(11) // Exceeds limit
      
      const result = await checkRateLimit(`auth:user:${userId}`, {
        windowMs: 30 * 60 * 1000, // 30 minutes
        maxRequests: 10
      })
      
      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should apply progressive delays for repeated failures', async () => {
      const testCases = [
        { attempt: 3, expectedMultiplier: 1 },
        { attempt: 6, expectedMultiplier: 2 },
        { attempt: 10, expectedMultiplier: 4 },
        { attempt: 15, expectedMultiplier: 8 }
      ]
      
      for (const { attempt, expectedMultiplier } of testCases) {
        mockRedisClient.get.mockResolvedValueOnce(attempt.toString())
        mockRedisClient.incr.mockResolvedValueOnce(attempt + 1)
        
        const result = await checkRateLimit('progressive-test', {
          windowMs: 60000,
          maxRequests: 5,
          progressive: true
        })
        
        if (!result.allowed) {
          expect(result.retryAfter).toBeGreaterThanOrEqual(60 * expectedMultiplier)
        }
      }
    })

    it('should handle different window sizes', async () => {
      const configs = [
        { windowMs: 1000, maxRequests: 1 }, // 1 per second
        { windowMs: 60000, maxRequests: 60 }, // 60 per minute
        { windowMs: 3600000, maxRequests: 1000 } // 1000 per hour
      ]
      
      for (const config of configs) {
        mockRedisClient.get.mockResolvedValueOnce('0')
        mockRedisClient.incr.mockResolvedValueOnce(1)
        
        const result = await checkRateLimit('window-test', config)
        expect(result.allowed).toBe(true)
        
        const expectedExpiry = Math.ceil(config.windowMs / 1000)
        expect(mockRedisClient.expire).toHaveBeenCalledWith('window-test', expectedExpiry)
      }
    })
  })

  describe('Advanced Rate Limiting Patterns', () => {
    it('should handle sliding window rate limiting', async () => {
      const now = Date.now()
      const requests = [
        { timestamp: now - 30000, count: 5 }, // 30 seconds ago
        { timestamp: now - 10000, count: 3 }, // 10 seconds ago
        { timestamp: now, count: 1 } // Now
      ]
      
      // Mock sliding window data
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(requests))
      
      const result = await checkRateLimit('sliding-window-test', {
        windowMs: 60000,
        maxRequests: 10,
        sliding: true
      })
      
      // Should count only requests within the window
      const validRequests = requests
        .filter(req => now - req.timestamp < 60000)
        .reduce((sum, req) => sum + req.count, 0)
      
      expect(result.remaining).toBe(10 - validRequests - 1) // -1 for current request
    })

    it('should implement distributed rate limiting across multiple nodes', async () => {
      const nodeId = 'node-1'
      const key = `distributed:${nodeId}:test-key`
      
      mockRedisClient.get.mockResolvedValueOnce('3')
      mockRedisClient.incr.mockResolvedValueOnce(4)
      
      const result = await checkRateLimit(key, {
        windowMs: 60000,
        maxRequests: 10,
        distributed: true
      })
      
      expect(result.allowed).toBe(true)
      expect(mockRedisClient.get).toHaveBeenCalledWith(key)
    })

    it('should handle burst capacity with sustained rate limits', async () => {
      // Allow burst of 20 requests, but sustain only 10 per minute
      mockRedisClient.get
        .mockResolvedValueOnce('15') // Burst count
        .mockResolvedValueOnce('8') // Sustained count
      
      mockRedisClient.incr
        .mockResolvedValueOnce(16) // After burst increment
        .mockResolvedValueOnce(9) // After sustained increment
      
      const result = await checkRateLimit('burst-test', {
        windowMs: 60000,
        maxRequests: 10,
        burstCapacity: 20,
        sustainedRate: 10
      })
      
      expect(result.allowed).toBe(true)
      expect(result.burstRemaining).toBe(4) // 20 - 16
      expect(result.sustainedRemaining).toBe(1) // 10 - 9
    })

    it('should implement token bucket algorithm', async () => {
      const bucketKey = 'token-bucket:test'
      const now = Math.floor(Date.now() / 1000)
      
      // Mock bucket state: { tokens: 5, lastRefill: now - 30 }
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({
        tokens: 5,
        lastRefill: now - 30
      }))
      
      const result = await checkRateLimit(bucketKey, {
        algorithm: 'token-bucket',
        capacity: 10,
        refillRate: 1, // 1 token per second
        tokensRequested: 3
      })
      
      expect(result.allowed).toBe(true)
      // Should have refilled 30 tokens (30 seconds * 1 token/sec), capped at capacity
      // Started with 5, refilled to 10 (capacity), used 3, left with 7
      expect(result.remaining).toBe(7)
    })
  })

  describe('Rate Limit Configuration', () => {
    it('should configure different rate limits for different endpoints', () => {
      const config = {
        'auth:login': { windowMs: 900000, maxRequests: 5 }, // 5 per 15 minutes
        'auth:signup': { windowMs: 3600000, maxRequests: 3 }, // 3 per hour
        'api:general': { windowMs: 60000, maxRequests: 100 }, // 100 per minute
        'api:search': { windowMs: 60000, maxRequests: 20 } // 20 per minute
      }
      
      configureRateLimit(config)
      
      // Verify configuration is stored
      expect(configureRateLimit).toHaveBeenCalledWith(config)
    })

    it('should handle rate limit exemptions', async () => {
      const exemptIPs = ['127.0.0.1', '::1', '192.168.1.100']
      const exemptUsers = ['admin-user-1', 'service-account-2']
      
      for (const ip of exemptIPs) {
        const result = await checkRateLimit(`test:${ip}`, {
          windowMs: 60000,
          maxRequests: 10,
          exemptIPs
        })
        
        expect(result.allowed).toBe(true)
        expect(result.exempt).toBe(true)
      }
      
      for (const userId of exemptUsers) {
        const result = await checkRateLimit(`user:${userId}`, {
          windowMs: 60000,
          maxRequests: 10,
          exemptUsers
        })
        
        expect(result.allowed).toBe(true)
        expect(result.exempt).toBe(true)
      }
    })

    it('should apply different limits based on user tier', async () => {
      const userTiers = {
        'free': { windowMs: 60000, maxRequests: 10 },
        'premium': { windowMs: 60000, maxRequests: 100 },
        'enterprise': { windowMs: 60000, maxRequests: 1000 }
      }
      
      for (const [tier, limits] of Object.entries(userTiers)) {
        mockRedisClient.get.mockResolvedValueOnce('5')
        mockRedisClient.incr.mockResolvedValueOnce(6)
        
        const result = await checkRateLimit(`user:${tier}:test`, limits)
        
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(limits.maxRequests - 6)
      }
    })
  })

  describe('Rate Limit Status and Monitoring', () => {
    it('should provide detailed rate limit status', async () => {
      const key = 'status-test'
      mockRedisClient.get.mockResolvedValueOnce('7')
      
      const status = await getRateLimitStatus(key, {
        windowMs: 60000,
        maxRequests: 10
      })
      
      expect(status).toEqual({
        key,
        current: 7,
        limit: 10,
        remaining: 3,
        resetTime: expect.any(Number),
        isExceeded: false
      })
    })

    it('should track rate limit violations', async () => {
      const violations = []
      mockRedisClient.get.mockResolvedValueOnce('11') // Exceeded
      
      const result = await checkRateLimit('violation-test', {
        windowMs: 60000,
        maxRequests: 10,
        onViolation: (violation) => violations.push(violation)
      })
      
      expect(result.allowed).toBe(false)
      expect(violations).toHaveLength(1)
      expect(violations[0]).toEqual({
        key: 'violation-test',
        limit: 10,
        current: 11,
        timestamp: expect.any(Number)
      })
    })

    it('should provide rate limit headers for HTTP responses', async () => {
      mockRedisClient.get.mockResolvedValueOnce('3')
      mockRedisClient.incr.mockResolvedValueOnce(4)
      
      const result = await checkRateLimit('headers-test', {
        windowMs: 60000,
        maxRequests: 10,
        includeHeaders: true
      })
      
      expect(result.headers).toEqual({
        'X-RateLimit-Limit': 10,
        'X-RateLimit-Remaining': 6,
        'X-RateLimit-Reset': expect.any(Number),
        'X-RateLimit-Window': 60000
      })
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle Redis connection failures gracefully', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('Redis connection failed'))
      
      const result = await checkRateLimit('error-test', {
        windowMs: 60000,
        maxRequests: 10,
        failOpen: true // Allow requests when rate limiting fails
      })
      
      expect(result.allowed).toBe(true)
      expect(result.error).toBe('Redis connection failed')
    })

    it('should block requests when failOpen is false and Redis fails', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('Redis down'))
      
      const result = await checkRateLimit('error-test-2', {
        windowMs: 60000,
        maxRequests: 10,
        failOpen: false // Block requests when rate limiting fails
      })
      
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('Redis down')
    })

    it('should handle malformed Redis data', async () => {
      mockRedisClient.get.mockResolvedValueOnce('invalid-json{')
      
      const result = await checkRateLimit('malformed-test', {
        windowMs: 60000,
        maxRequests: 10
      })
      
      // Should treat as new request when data is malformed
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
    })

    it('should implement circuit breaker for Redis operations', async () => {
      // Simulate multiple Redis failures
      for (let i = 0; i < 5; i++) {
        mockRedisClient.get.mockRejectedValueOnce(new Error('Redis timeout'))
        
        await checkRateLimit('circuit-test', {
          windowMs: 60000,
          maxRequests: 10,
          circuitBreaker: {
            failureThreshold: 5,
            resetTimeout: 30000
          }
        })
      }
      
      // Circuit should be open now, subsequent calls should fail fast
      const start = performance.now()
      const result = await checkRateLimit('circuit-test', {
        windowMs: 60000,
        maxRequests: 10,
        circuitBreaker: {
          failureThreshold: 5,
          resetTimeout: 30000
        }
      })
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(10) // Should fail fast
      expect(result.circuitOpen).toBe(true)
    })

    it('should handle concurrent requests to same key', async () => {
      const concurrentRequests = 10
      let currentCount = 0
      
      mockRedisClient.incr.mockImplementation(() => {
        currentCount++
        return Promise.resolve(currentCount)
      })
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        checkRateLimit('concurrent-test', {
          windowMs: 60000,
          maxRequests: 5
        })
      )
      
      const results = await Promise.all(promises)
      
      // Some should be allowed, some blocked
      const allowed = results.filter(r => r.allowed).length
      const blocked = results.filter(r => !r.allowed).length
      
      expect(allowed).toBeLessThanOrEqual(5)
      expect(blocked).toBeGreaterThanOrEqual(5)
    })

    it('should cleanup expired rate limit entries', async () => {
      const expiredKeys = ['expired-1', 'expired-2', 'expired-3']
      
      // Mock cleanup operation
      mockRedisClient.get
        .mockResolvedValueOnce('5') // Current active key
        .mockResolvedValueOnce(null) // Expired key 1
        .mockResolvedValueOnce(null) // Expired key 2
      
      const result = await checkRateLimit('active-key', {
        windowMs: 60000,
        maxRequests: 10,
        cleanup: true,
        expiredKeys
      })
      
      expect(result.allowed).toBe(true)
      expect(mockRedisClient.del).toHaveBeenCalledTimes(expiredKeys.length)
    })
  })
})
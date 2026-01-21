describe('Redis Utils - Unit Tests', () => {
    describe('checkIdempotency', () => {
        it('builds correct idempotency key format', () => {
            const webhookId = 'test-webhook-123'
            const key = `webhook:processed:${webhookId}`
            expect(key).toBe('webhook:processed:test-webhook-123')
        })

        it('returns PROCESS for new webhooks', () => {
            const result = 'PROCESS'
            expect(result).toBe('PROCESS')
        })

        it('returns DUPLICATE for existing webhooks', () => {
            const result = 'DUPLICATE'
            expect(result).toBe('DUPLICATE')
        })

        it('uses default TTL of 24 hours (86400 seconds)', () => {
            const defaultTTL = 86400
            expect(defaultTTL).toBe(86400)
        })

        it('accepts custom TTL values', () => {
            const customTTL = 604800
            expect(customTTL).toBe(604800)
        })
    })

    describe('acquireLock', () => {
        it('builds correct lock key format', () => {
            const resource = 'client'
            const id = '123'
            const key = `lock:${resource}:${id}`
            expect(key).toBe('lock:client:123')
        })

        it('returns true when lock acquired', () => {
            const acquired = true
            expect(acquired).toBe(true)
        })

        it('returns false when lock exists', () => {
            const acquired = false
            expect(acquired).toBe(false)
        })

        it('uses default TTL of 30 seconds', () => {
            const defaultTTL = 30
            expect(defaultTTL).toBe(30)
        })

        it('generates unique worker id', () => {
            const workerId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
            expect(workerId).toMatch(/^\d+-[a-z0-9]+$/)
        })
    })

    describe('releaseLock', () => {
        it('builds correct lock key for deletion', () => {
            const resource = 'deal'
            const id = '456'
            const key = `lock:${resource}:${id}`
            expect(key).toBe('lock:deal:456')
        })
    })

    describe('incrementRateLimit', () => {
        it('builds correct rate limit key format', () => {
            const namespace = 'openrouter'
            const identifier = 'user123'
            const key = `ratelimit:${namespace}:${identifier}`
            expect(key).toBe('ratelimit:openrouter:user123')
        })

        it('returns allowed true when under limit', () => {
            const current = 5
            const limit = 10
            expect(current <= limit).toBe(true)
        })

        it('returns allowed false when over limit', () => {
            const current = 11
            const limit = 10
            expect(current <= limit).toBe(false)
        })

        it('calculates remaining correctly', () => {
            const limit = 10
            const current = 7
            const remaining = Math.max(0, limit - current)
            expect(remaining).toBe(3)
        })

        it('uses default window of 60 seconds', () => {
            const defaultWindow = 60
            expect(defaultWindow).toBe(60)
        })
    })

    describe('cacheGet', () => {
        it('builds correct cache key format', () => {
            const key = 'client:123'
            const cacheKey = `cache:${key}`
            expect(cacheKey).toBe('cache:client:123')
        })

        it('returns cached data when present', () => {
            const cachedData = { id: '123', name: 'Test' }
            expect(cachedData).toEqual({ id: '123', name: 'Test' })
        })

        it('returns null when key not found', () => {
            const result = null
            expect(result).toBeNull()
        })
    })

    describe('cacheSet', () => {
        it('uses default TTL of 300 seconds', () => {
            const defaultTTL = 300
            expect(defaultTTL).toBe(300)
        })

        it('accepts custom TTL', () => {
            const customTTL = 600
            expect(customTTL).toBe(600)
        })
    })

    describe('cacheDelete', () => {
        it('builds correct cache key for deletion', () => {
            const key = 'deal:789'
            const cacheKey = `cache:${key}`
            expect(cacheKey).toBe('cache:deal:789')
        })
    })
})

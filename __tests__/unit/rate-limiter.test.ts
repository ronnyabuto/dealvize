import { EdgeRateLimiter, rateLimitConfigs } from '@/lib/security/edge-rate-limiter'
import { NextRequest } from 'next/server'

function createMockRequest(ip: string = '192.168.1.1'): NextRequest {
    return {
        headers: {
            get: (name: string) => {
                if (name === 'x-forwarded-for') return ip
                if (name === 'x-real-ip') return ip
                return null
            },
        },
        nextUrl: {
            pathname: '/api/test',
        },
    } as unknown as NextRequest
}

describe('Edge Rate Limiter', () => {
    let rateLimiter: EdgeRateLimiter

    beforeEach(() => {
        rateLimiter = new EdgeRateLimiter()
    })

    afterEach(() => {
        rateLimiter.destroy()
    })

    describe('EdgeRateLimiter', () => {
        it('allows requests under the limit', async () => {
            const request = createMockRequest()
            const config = { windowMs: 60000, maxRequests: 10 }

            const result = await rateLimiter.checkRateLimit(request, config)

            expect(result.success).toBe(true)
            expect(result.blocked).toBe(false)
            expect(result.remaining).toBe(9)
            expect(result.limit).toBe(10)
        })

        it('tracks remaining requests correctly', async () => {
            const request = createMockRequest()
            const config = { windowMs: 60000, maxRequests: 5 }

            for (let i = 4; i >= 0; i--) {
                const result = await rateLimiter.checkRateLimit(request, config)
                expect(result.remaining).toBe(i)
            }
        })

        it('blocks requests when limit is exceeded', async () => {
            const request = createMockRequest()
            const config = { windowMs: 60000, maxRequests: 3 }

            await rateLimiter.checkRateLimit(request, config)
            await rateLimiter.checkRateLimit(request, config)
            await rateLimiter.checkRateLimit(request, config)

            const result = await rateLimiter.checkRateLimit(request, config)

            expect(result.success).toBe(false)
            expect(result.blocked).toBe(true)
            expect(result.remaining).toBe(0)
        })

        it('uses different keys for different IPs', async () => {
            const request1 = createMockRequest('192.168.1.1')
            const request2 = createMockRequest('192.168.1.2')
            const config = { windowMs: 60000, maxRequests: 2 }

            await rateLimiter.checkRateLimit(request1, config)
            await rateLimiter.checkRateLimit(request1, config)

            const result1 = await rateLimiter.checkRateLimit(request1, config)
            const result2 = await rateLimiter.checkRateLimit(request2, config)

            expect(result1.blocked).toBe(true)
            expect(result2.blocked).toBe(false)
        })

        it('uses custom key generator when provided', async () => {
            const request = createMockRequest()
            const config = {
                windowMs: 60000,
                maxRequests: 1,
                keyGenerator: () => 'custom-key',
            }

            await rateLimiter.checkRateLimit(request, config)
            const result = await rateLimiter.checkRateLimit(request, config)

            expect(result.blocked).toBe(true)
        })

        it('includes reset time in result', async () => {
            const request = createMockRequest()
            const config = { windowMs: 60000, maxRequests: 10 }

            const result = await rateLimiter.checkRateLimit(request, config)

            expect(result.resetTime).toBeGreaterThan(Date.now())
        })

        it('clears store on destroy', async () => {
            const request = createMockRequest()
            const config = { windowMs: 60000, maxRequests: 10 }

            await rateLimiter.checkRateLimit(request, config)

            expect(rateLimiter.store.size).toBeGreaterThan(0)

            rateLimiter.destroy()

            expect(rateLimiter.store.size).toBe(0)
        })
    })

    describe('rateLimitConfigs', () => {
        it('has api config with correct values', () => {
            expect(rateLimitConfigs.api).toEqual({
                windowMs: 60 * 1000,
                maxRequests: 100,
            })
        })

        it('has general_api config with higher limits', () => {
            expect(rateLimitConfigs.general_api.maxRequests).toBe(200)
        })

        it('has auth config with stricter limits', () => {
            expect(rateLimitConfigs.auth).toEqual({
                windowMs: 15 * 60 * 1000,
                maxRequests: 5,
            })
        })

        it('has chat config', () => {
            expect(rateLimitConfigs.chat).toEqual({
                windowMs: 60 * 1000,
                maxRequests: 30,
            })
        })
    })
})

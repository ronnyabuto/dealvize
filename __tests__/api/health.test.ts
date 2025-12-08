import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/health/route'
import { NextRequest } from 'next/server'

// Mock the performance functions
const mockDatabaseHealth = {
  healthy: true,
  queryTime: 15.5,
  connectionTime: 8.2,
  errors: []
}

const mockSessionHealth = {
  healthy: true,
  activeSessions: 12,
  error: null
}

const mockSentryHealth = {
  configured: true,
  dsn: 'https://test@sentry.io/test'
}

// Mock dependencies
jest.mock('@/lib/performance/database-monitor', () => ({
  checkDatabaseHealth: jest.fn(() => Promise.resolve(mockDatabaseHealth))
}))

jest.mock('@/lib/auth/session', () => ({
  checkSessionHealth: jest.fn(() => Promise.resolve(mockSessionHealth))
}))

jest.mock('@/lib/monitoring/sentry', () => ({
  checkSentryHealth: jest.fn(() => mockSentryHealth)
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({
          data: null,
          error: null
        }))
      }))
    }))
  }))
}))

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    NODE_ENV: 'test'
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('/api/health', () => {
  describe('GET', () => {
    it('should return healthy status when all checks pass', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.checks).toBeDefined()
      expect(data.checks.length).toBeGreaterThan(0)
      expect(data.summary).toBeDefined()
      expect(data.summary.healthy).toBeGreaterThan(0)
      expect(data.timestamp).toBeDefined()
      expect(data.responseTime).toBeDefined()
    })

    it('should include all required health checks', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      const checkNames = data.checks.map((check: any) => check.name)
      expect(checkNames).toContain('database')
      expect(checkNames).toContain('authentication')
      expect(checkNames).toContain('supabase')
      expect(checkNames).toContain('error-tracking')
      expect(checkNames).toContain('environment')
      expect(checkNames).toContain('memory')
    })

    it('should return unhealthy status when database fails', async () => {
      const { checkDatabaseHealth } = require('@/lib/performance/database-monitor')
      checkDatabaseHealth.mockResolvedValueOnce({
        healthy: false,
        queryTime: 5000,
        connectionTime: 3000,
        errors: ['Connection timeout']
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.summary.unhealthy).toBeGreaterThan(0)
    })

    it('should return unhealthy status when environment variables are missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      
      const envCheck = data.checks.find((check: any) => check.name === 'environment')
      expect(envCheck.status).toBe('unhealthy')
      expect(envCheck.details.missingVariables).toContain('NEXT_PUBLIC_SUPABASE_URL')
    })

    it('should handle supabase connection errors gracefully', async () => {
      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Connection failed' }
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      
      const supabaseCheck = data.checks.find((check: any) => check.name === 'supabase')
      expect(supabaseCheck.status).toBe('unhealthy')
      expect(supabaseCheck.details.error).toBe('Connection failed')
    })

    it('should handle memory warnings when usage is high', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage
      process.memoryUsage = jest.fn(() => ({
        rss: 1024 * 1024 * 1024, // 1GB
        heapTotal: 600 * 1024 * 1024, // 600MB
        heapUsed: 550 * 1024 * 1024, // 550MB (above threshold)
        external: 50 * 1024 * 1024
      }))

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      const memoryCheck = data.checks.find((check: any) => check.name === 'memory')
      expect(memoryCheck.status).toBe('warning')
      expect(memoryCheck.details.usage.heapUsed).toBe(550)

      process.memoryUsage = originalMemoryUsage
    })

    it('should handle errors during health check execution', async () => {
      const { checkDatabaseHealth } = require('@/lib/performance/database-monitor')
      checkDatabaseHealth.mockRejectedValueOnce(new Error('Database check failed'))

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.error).toBeDefined()
    })
  })

  describe('POST', () => {
    it('should return detailed health check when includeDetails is true', async () => {
      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ includeDetails: true })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.checks).toBeDefined()
      expect(data.checks.length).toBeGreaterThan(0)
      
      // Should include detailed database checks for each table
      const databaseChecks = data.checks.filter((check: any) => 
        check.name.startsWith('database.')
      )
      expect(databaseChecks.length).toBeGreaterThan(0)
      
      // Should include API endpoint checks
      const apiChecks = data.checks.filter((check: any) => 
        check.name.startsWith('api.')
      )
      expect(apiChecks.length).toBeGreaterThan(0)
    })

    it('should fallback to basic health check when includeDetails is false', async () => {
      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ includeDetails: false })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      
      // Should not include detailed database table checks
      const databaseTableChecks = data.checks.filter((check: any) => 
        check.name.startsWith('database.') && check.name !== 'database'
      )
      expect(databaseTableChecks.length).toBe(0)
    })

    it('should handle database table check failures in detailed mode', async () => {
      const { createClient } = require('@/lib/supabase/server')
      createClient.mockResolvedValueOnce({
        from: jest.fn((table) => ({
          select: jest.fn(() => ({
            limit: jest.fn(() => {
              if (table === 'clients') {
                return Promise.resolve({
                  count: 10,
                  error: null
                })
              } else if (table === 'deals') {
                return Promise.resolve({
                  count: null,
                  error: { message: 'Table access denied' }
                })
              }
              return Promise.resolve({
                count: 5,
                error: null
              })
            })
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ includeDetails: true })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      
      const dealsCheck = data.checks.find((check: any) => check.name === 'database.deals')
      expect(dealsCheck.status).toBe('unhealthy')
      expect(dealsCheck.details.error).toBe('Table access denied')
    })

    it('should handle malformed request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      const response = await POST(request)
      expect(response.status).toBe(503)
    })
  })

  describe('Response format validation', () => {
    it('should return properly formatted response with all required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('environment')
      expect(data).toHaveProperty('responseTime')
      expect(data).toHaveProperty('checks')
      expect(data).toHaveProperty('summary')
      expect(data.summary).toHaveProperty('total')
      expect(data.summary).toHaveProperty('healthy')
      expect(data.summary).toHaveProperty('unhealthy')
      expect(data.summary).toHaveProperty('warnings')
    })

    it('should include proper cache control headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })
  })
})
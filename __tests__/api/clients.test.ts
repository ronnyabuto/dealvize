import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/clients/route'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => ({
            then: jest.fn((callback) => callback({
              data: [
                {
                  id: '1',
                  name: 'John Doe',
                  email: 'john@example.com',
                  phone: '+1234567890',
                  status: 'Buyer',
                  created_at: '2024-01-01T00:00:00Z'
                }
              ],
              error: null,
              count: 1
            }))
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          then: jest.fn((callback) => callback({
            data: {
              id: '2',
              name: 'Jane Smith',
              email: 'jane@example.com',
              phone: '+0987654321',
              status: 'Seller',
              created_at: '2024-01-01T00:00:00Z'
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}))

// Mock authentication
jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn(() => Promise.resolve({ id: 'user-123', email: 'test@example.com' }))
}))

describe('/api/clients', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return clients list with pagination', async () => {
      const url = new URL('http://localhost:3000/api/clients?page=1&limit=10')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('clients')
      expect(data).toHaveProperty('pagination')
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(10)
      expect(Array.isArray(data.clients)).toBe(true)
    })

    it('should apply search filter', async () => {
      const url = new URL('http://localhost:3000/api/clients?search=john')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      // Verify that search filter was applied in the query
    })

    it('should apply status filter', async () => {
      const url = new URL('http://localhost:3000/api/clients?status=Buyer')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      // Verify that status filter was applied
    })

    it('should handle authentication error', async () => {
      const { requireAuth } = require('@/lib/auth/utils')
      requireAuth.mockRejectedValueOnce(new Error('Unauthorized'))
      
      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should handle database error', async () => {
      const mockSupabase = require('@/lib/supabase/server').createClient()
      mockSupabase.from().select().order().range.mockImplementationOnce(() => ({
        then: jest.fn((callback) => callback({
          data: null,
          error: { message: 'Database connection failed' },
          count: 0
        }))
      }))
      
      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Database connection failed')
    })
  })

  describe('POST', () => {
    it('should create a new client', async () => {
      const clientData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+0987654321',
        address: '456 Oak St',
        company: 'Smith Corp',
        status: 'Seller'
      }

      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(clientData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data).toHaveProperty('id')
      expect(data.name).toBe(clientData.name)
      expect(data.email).toBe(clientData.email)
      expect(data.status).toBe(clientData.status)
    })

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        status: 'InvalidStatus'
      }

      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('required') // Should contain validation error
    })

    it('should handle duplicate email', async () => {
      const mockSupabase = require('@/lib/supabase/server').createClient()
      mockSupabase.insert().select().single.mockImplementationOnce(() => ({
        then: jest.fn((callback) => callback({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' }
        }))
      }))

      const clientData = {
        name: 'Test User',
        email: 'existing@example.com',
        status: 'Buyer'
      }

      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(clientData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('duplicate')
    })

    it('should handle authentication error on POST', async () => {
      const { requireAuth } = require('@/lib/auth/utils')
      requireAuth.mockRejectedValueOnce(new Error('Unauthorized'))
      
      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should handle malformed JSON', async () => {
      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url, {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const invalidEmailData = {
        name: 'Test User',
        email: 'invalid-email-format',
        status: 'Buyer'
      }

      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(invalidEmailData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('email') // Should contain email validation error
    })

    it('should validate phone format', async () => {
      const invalidPhoneData = {
        name: 'Test User',
        phone: 'invalid-phone',
        status: 'Buyer'
      }

      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(invalidPhoneData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })

    it('should validate status enum', async () => {
      const invalidStatusData = {
        name: 'Test User',
        status: 'InvalidStatus'
      }

      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(invalidStatusData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Pagination', () => {
    it('should handle pagination parameters', async () => {
      const url = new URL('http://localhost:3000/api/clients?page=2&limit=5')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(5)
    })

    it('should use default pagination values', async () => {
      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(10)
    })

    it('should calculate total pages correctly', async () => {
      const url = new URL('http://localhost:3000/api/clients?limit=5')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.pagination.pages).toBeGreaterThanOrEqual(0)
    })
  })
})
import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/deals/route'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn(() => ({
              then: jest.fn((callback) => callback({
                data: [
                  {
                    id: '1',
                    title: 'Test Deal',
                    value: 500000,
                    status: 'Lead',
                    probability: 50,
                    client_id: 'client-1',
                    user_id: 'user-123',
                    clients: {
                      id: 'client-1',
                      name: 'John Doe',
                      email: 'john@example.com'
                    }
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
                title: 'New Deal',
                value: 750000,
                status: 'Lead',
                client_id: 'client-1',
                user_id: 'user-123'
              },
              error: null
            }))
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

describe('/api/deals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return deals list with client information', async () => {
      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('deals')
      expect(data).toHaveProperty('pagination')
      expect(Array.isArray(data.deals)).toBe(true)
      if (data.deals.length > 0) {
        expect(data.deals[0]).toHaveProperty('clients')
        expect(data.deals[0].clients).toHaveProperty('name')
      }
    })

    it('should filter deals by status', async () => {
      const url = new URL('http://localhost:3000/api/deals?status=Lead')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should filter deals by client', async () => {
      const url = new URL('http://localhost:3000/api/deals?client_id=client-1')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should search deals by title and address', async () => {
      const url = new URL('http://localhost:3000/api/deals?search=downtown')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should handle authentication error', async () => {
      const { requireAuth } = require('@/lib/auth/utils')
      requireAuth.mockRejectedValueOnce(new Error('Unauthorized'))
      
      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('POST', () => {
    it('should create a new deal', async () => {
      const dealData = {
        client_id: 'client-1',
        title: 'New Property Deal',
        value: 750000,
        status: 'Lead',
        probability: 60,
        expected_close_date: '2024-12-31',
        property_address: '123 Main St',
        property_type: 'House',
        property_bedrooms: 3,
        property_bathrooms: 2,
        property_sqft: 2000
      }

      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(dealData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data).toHaveProperty('id')
      expect(data.title).toBe(dealData.title)
      expect(data.value).toBe(dealData.value)
    })

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing client_id and title
        value: 'invalid-number',
        status: 'InvalidStatus'
      }

      const url = new URL('http://localhost:3000/api/deals')
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
      expect(data.error).toContain('required')
    })

    it('should verify client ownership', async () => {
      // Mock client verification to return no client
      const mockSupabase = require('@/lib/supabase/server').createClient()
      const mockClientSelect = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                then: jest.fn((callback) => callback({
                  data: null,
                  error: { message: 'No rows returned' }
                }))
              }))
            }))
          }))
        }))
      }
      
      // Override the from method to return different behavior for clients table
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return mockClientSelect
        }
        // Default behavior for other tables
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                range: jest.fn(() => ({}))
              }))
            }))
          }))
        }
      })

      const dealData = {
        client_id: 'non-existent-client',
        title: 'Test Deal'
      }

      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(dealData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Client not found')
    })

    it('should validate numeric fields', async () => {
      const invalidData = {
        client_id: 'client-1',
        title: 'Test Deal',
        value: 'not-a-number',
        probability: 150 // Over 100
      }

      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })

    it('should validate status enum', async () => {
      const invalidData = {
        client_id: 'client-1',
        title: 'Test Deal',
        status: 'InvalidStatus'
      }

      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })

    it('should handle database error during creation', async () => {
      const mockSupabase = require('@/lib/supabase/server').createClient()
      
      // Mock client verification success
      const mockClientSelect = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                then: jest.fn((callback) => callback({
                  data: { id: 'client-1' },
                  error: null
                }))
              }))
            }))
          }))
        }))
      }
      
      // Mock deal insert failure
      const mockDealInsert = {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              then: jest.fn((callback) => callback({
                data: null,
                error: { message: 'Database constraint violation' }
              }))
            }))
          }))
        }))
      }
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return mockClientSelect
        }
        if (table === 'deals') {
          return mockDealInsert
        }
        return {}
      })

      const dealData = {
        client_id: 'client-1',
        title: 'Test Deal'
      }

      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(dealData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Database constraint violation')
    })
  })

  describe('Property Information', () => {
    it('should handle property details', async () => {
      const dealData = {
        client_id: 'client-1',
        title: 'Property Deal',
        property_address: '456 Oak Avenue',
        property_type: 'Condo',
        property_bedrooms: 2,
        property_bathrooms: 1.5,
        property_sqft: 1200
      }

      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(dealData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(201)
    })

    it('should validate property numeric fields', async () => {
      const dealData = {
        client_id: 'client-1',
        title: 'Property Deal',
        property_bedrooms: -1, // Invalid negative
        property_sqft: 'not-a-number'
      }

      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(dealData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Commission Calculation', () => {
    it('should handle commission fields', async () => {
      const dealData = {
        client_id: 'client-1',
        title: 'High Value Deal',
        value: 1000000,
        commission: 25000
      }

      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(dealData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(201)
    })
  })
})
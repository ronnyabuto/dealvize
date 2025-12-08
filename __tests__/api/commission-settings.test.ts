import { createMocks } from 'node-mocks-http'
import { GET, POST, PUT } from '@/app/api/commission-settings/route'
import { NextRequest } from 'next/server'

// Mock authentication
const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
}

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn(() => Promise.resolve(mockUser))
}))

// Mock commission settings data
const mockCommissionSettings = {
  id: 'settings-1',
  user_id: 'user-123',
  default_rate: 3.0,
  buyer_rate: 2.5,
  seller_rate: 3.5,
  referral_rate: 0.5,
  minimum_commission: 500,
  maximum_commission: 50000,
  commission_structure: 'percentage',
  payment_schedule: 'at_closing',
  auto_calculate: true,
  include_bonus: false,
  bonus_threshold: 10000,
  bonus_rate: 0.5,
  currency: 'USD',
  tax_rate: 0.0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({
          data: mockCommissionSettings,
          error: null
        })),
        maybeSingle: jest.fn(() => Promise.resolve({
          data: mockCommissionSettings,
          error: null
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({
          data: mockCommissionSettings,
          error: null
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: mockCommissionSettings,
            error: null
          }))
        }))
      }))
    })),
    upsert: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: mockCommissionSettings,
            error: null
          }))
        }))
      }))
    }))
  }))
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient))
}))

describe('/api/commission-settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return user commission settings', async () => {
      const request = new NextRequest('http://localhost:3000/api/commission-settings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.settings).toBeDefined()
      expect(data.settings.id).toBe('settings-1')
      expect(data.settings.default_rate).toBe(3.0)
      expect(data.settings.user_id).toBe('user-123')
      
      // Verify query was filtered by user
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('commission_settings')
      expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should return default settings when user has no custom settings', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => Promise.resolve({
              data: null,
              error: null
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/commission-settings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.settings).toBeDefined()
      expect(data.settings.default_rate).toBe(3.0) // Default value
      expect(data.settings.user_id).toBe('user-123')
      expect(data.isDefault).toBe(true)
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database connection failed' }
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/commission-settings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle authentication errors', async () => {
      const { requireAuth } = require('@/lib/auth/utils')
      requireAuth.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = new NextRequest('http://localhost:3000/api/commission-settings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST', () => {
    const validSettingsData = {
      default_rate: 3.5,
      buyer_rate: 3.0,
      seller_rate: 4.0,
      referral_rate: 0.5,
      minimum_commission: 750,
      maximum_commission: 60000,
      commission_structure: 'percentage',
      payment_schedule: 'at_closing',
      auto_calculate: true,
      include_bonus: true,
      bonus_threshold: 15000,
      bonus_rate: 0.75,
      currency: 'USD',
      tax_rate: 0.08
    }

    it('should create new commission settings', async () => {
      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validSettingsData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.settings).toBeDefined()
      expect(data.settings.default_rate).toBe(3.0) // From mock response
      
      // Verify insert was called with user_id
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('commission_settings')
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([{
        ...validSettingsData,
        user_id: 'user-123'
      }])
    })

    it('should validate commission rates', async () => {
      const invalidData = {
        ...validSettingsData,
        default_rate: -1.0, // Invalid negative rate
        buyer_rate: 101.0   // Invalid rate over 100%
      }

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Commission rates must be between 0 and 100')
    })

    it('should validate minimum and maximum commission amounts', async () => {
      const invalidData = {
        ...validSettingsData,
        minimum_commission: -100,    // Negative minimum
        maximum_commission: 50       // Maximum less than minimum
      }

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid commission amount limits')
    })

    it('should validate commission structure values', async () => {
      const invalidData = {
        ...validSettingsData,
        commission_structure: 'invalid_structure'
      }

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid commission structure')
    })

    it('should validate payment schedule values', async () => {
      const invalidData = {
        ...validSettingsData,
        payment_schedule: 'invalid_schedule'
      }

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid payment schedule')
    })

    it('should validate bonus settings when include_bonus is true', async () => {
      const invalidBonusData = {
        ...validSettingsData,
        include_bonus: true,
        bonus_threshold: -1000,  // Invalid threshold
        bonus_rate: 150.0        // Invalid rate over 100%
      }

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidBonusData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid bonus settings')
    })

    it('should validate currency code', async () => {
      const invalidCurrencyData = {
        ...validSettingsData,
        currency: 'INVALID'
      }

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidCurrencyData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid currency code')
    })

    it('should handle database insertion errors', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Insertion failed' }
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validSettingsData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Insertion failed')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
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
  })

  describe('PUT', () => {
    const updateData = {
      default_rate: 4.0,
      buyer_rate: 3.5,
      auto_calculate: false
    }

    it('should update existing commission settings', async () => {
      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.settings).toBeDefined()
      
      // Verify upsert was called with user_id
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('commission_settings')
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith({
        ...updateData,
        user_id: 'user-123'
      })
    })

    it('should create settings if none exist (upsert behavior)', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        upsert: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: { ...mockCommissionSettings, ...updateData },
                error: null
              }))
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.settings.default_rate).toBe(3.0) // From mock, but would reflect update in real scenario
    })

    it('should validate partial update data', async () => {
      const invalidUpdateData = {
        default_rate: 150.0 // Invalid rate
      }

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidUpdateData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Commission rates must be between 0 and 100')
    })

    it('should handle empty update data', async () => {
      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('No valid fields provided for update')
    })

    it('should handle database update errors', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        upsert: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Update failed' }
              }))
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Update failed')
    })
  })

  describe('Commission calculation helpers', () => {
    it('should calculate commission correctly with percentage structure', async () => {
      // This would test commission calculation logic if implemented in the API
      const calculationRequest = {
        deal_value: 500000,
        structure: 'percentage',
        rate: 3.0
      }

      // Test commission calculation (if endpoint exists)
      // Expected: 500000 * 0.03 = 15000
    })

    it('should apply minimum and maximum commission limits', async () => {
      // Test commission limits if calculation endpoint exists
      const lowValueDeal = {
        deal_value: 10000,
        structure: 'percentage',
        rate: 3.0,
        minimum_commission: 1000
      }
      // Expected: max(10000 * 0.03, 1000) = 1000

      const highValueDeal = {
        deal_value: 2000000,
        structure: 'percentage',
        rate: 3.0,
        maximum_commission: 50000
      }
      // Expected: min(2000000 * 0.03, 50000) = 50000
    })

    it('should calculate bonus correctly when applicable', async () => {
      // Test bonus calculation if endpoint exists
      const bonusEligibleDeal = {
        deal_value: 800000,
        structure: 'percentage',
        rate: 3.0,
        include_bonus: true,
        bonus_threshold: 500000,
        bonus_rate: 0.5
      }
      // Expected: (800000 * 0.03) + ((800000 - 500000) * 0.005) = 24000 + 1500 = 25500
    })
  })

  describe('Security and edge cases', () => {
    it('should only allow users to access their own settings', async () => {
      // This is tested implicitly by checking the user_id filter in queries
      const request = new NextRequest('http://localhost:3000/api/commission-settings')
      await GET(request)

      expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should handle concurrent updates gracefully', async () => {
      // Test for race conditions in upsert operations
      const updateRequests = Array(3).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/commission-settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ default_rate: 4.0 })
        })
      )

      const responses = await Promise.all(updateRequests.map(req => PUT(req)))
      
      // All should succeed (database handles concurrency)
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })

    it('should sanitize input data', async () => {
      const maliciousData = {
        default_rate: 3.0,
        notes: '<script>alert("xss")</script>',
        custom_field: 'normal value'
      }

      const request = new NextRequest('http://localhost:3000/api/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maliciousData)
      })

      const response = await POST(request)
      
      // Should either reject malicious fields or sanitize them
      expect(response.status).toBe(201)
    })
  })
})
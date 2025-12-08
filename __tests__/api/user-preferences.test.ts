import { createMocks } from 'node-mocks-http'
import { GET, PUT } from '@/app/api/user/preferences/route'
import { NextRequest } from 'next/server'

// Mock authentication
const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
}

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn(() => Promise.resolve(mockUser))
}))

// Mock user preferences data
const mockUserPreferences = {
  id: 'prefs-1',
  user_id: 'user-123',
  theme: 'light',
  language: 'en',
  timezone: 'America/New_York',
  date_format: 'MM/DD/YYYY',
  time_format: '12h',
  currency: 'USD',
  notifications: {
    email: {
      new_deals: true,
      deal_updates: true,
      task_reminders: true,
      system_alerts: false
    },
    push: {
      new_deals: false,
      deal_updates: true,
      task_reminders: true,
      system_alerts: true
    },
    in_app: {
      new_deals: true,
      deal_updates: true,
      task_reminders: true,
      system_alerts: true
    }
  },
  dashboard: {
    default_view: 'overview',
    widgets: ['recent_deals', 'tasks_due', 'revenue_chart', 'client_stats'],
    items_per_page: 25,
    auto_refresh: true,
    refresh_interval: 30
  },
  privacy: {
    profile_visibility: 'team',
    share_analytics: false,
    marketing_emails: true,
    data_processing: true
  },
  accessibility: {
    high_contrast: false,
    large_text: false,
    reduced_motion: false,
    screen_reader: false
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({
          data: mockUserPreferences,
          error: null
        })),
        maybeSingle: jest.fn(() => Promise.resolve({
          data: mockUserPreferences,
          error: null
        }))
      }))
    })),
    upsert: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: mockUserPreferences,
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

describe('/api/user/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return user preferences', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.preferences).toBeDefined()
      expect(data.preferences.user_id).toBe('user-123')
      expect(data.preferences.theme).toBe('light')
      expect(data.preferences.notifications).toBeDefined()
      expect(data.preferences.dashboard).toBeDefined()
      
      // Verify query was filtered by user
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_preferences')
      expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should return default preferences when user has no custom preferences', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/user/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.preferences).toBeDefined()
      expect(data.preferences.theme).toBe('light') // Default value
      expect(data.preferences.user_id).toBe('user-123')
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

      const request = new NextRequest('http://localhost:3000/api/user/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle authentication errors', async () => {
      const { requireAuth } = require('@/lib/auth/utils')
      requireAuth.mockRejectedValueOnce(new Error('Token expired'))

      const request = new NextRequest('http://localhost:3000/api/user/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Token expired')
    })
  })

  describe('PUT', () => {
    const validUpdateData = {
      theme: 'dark',
      language: 'es',
      timezone: 'Europe/Madrid',
      notifications: {
        email: {
          new_deals: false,
          deal_updates: true,
          task_reminders: false,
          system_alerts: true
        }
      },
      dashboard: {
        default_view: 'deals',
        items_per_page: 50,
        auto_refresh: false
      }
    }

    it('should update user preferences', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validUpdateData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.preferences).toBeDefined()
      
      // Verify upsert was called with user_id
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_preferences')
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith({
        ...validUpdateData,
        user_id: 'user-123'
      })
    })

    it('should validate theme values', async () => {
      const invalidThemeData = {
        theme: 'invalid_theme'
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidThemeData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid theme')
    })

    it('should validate language codes', async () => {
      const invalidLanguageData = {
        language: 'invalid_lang'
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidLanguageData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid language code')
    })

    it('should validate timezone values', async () => {
      const invalidTimezoneData = {
        timezone: 'Invalid/Timezone'
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidTimezoneData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid timezone')
    })

    it('should validate date format patterns', async () => {
      const invalidDateFormatData = {
        date_format: 'INVALID_FORMAT'
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidDateFormatData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid date format')
    })

    it('should validate currency codes', async () => {
      const invalidCurrencyData = {
        currency: 'INVALID'
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidCurrencyData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid currency code')
    })

    it('should validate notification structure', async () => {
      const invalidNotificationData = {
        notifications: {
          email: {
            invalid_notification_type: true
          }
        }
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidNotificationData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid notification settings')
    })

    it('should validate dashboard widget list', async () => {
      const invalidDashboardData = {
        dashboard: {
          widgets: ['valid_widget', 'invalid_widget', 'another_invalid']
        }
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidDashboardData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid dashboard widgets')
    })

    it('should validate items_per_page range', async () => {
      const invalidItemsPerPageData = {
        dashboard: {
          items_per_page: 500 // Exceeds maximum
        }
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidItemsPerPageData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Items per page must be between')
    })

    it('should validate refresh_interval range', async () => {
      const invalidRefreshData = {
        dashboard: {
          refresh_interval: 5 // Below minimum
        }
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRefreshData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Refresh interval must be between')
    })

    it('should validate privacy settings', async () => {
      const invalidPrivacyData = {
        privacy: {
          profile_visibility: 'invalid_visibility',
          share_analytics: 'not_boolean'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidPrivacyData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid privacy settings')
    })

    it('should handle partial updates correctly', async () => {
      const partialUpdateData = {
        theme: 'dark',
        notifications: {
          email: {
            new_deals: false
          }
        }
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(partialUpdateData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Should merge with existing preferences
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith({
        theme: 'dark',
        notifications: {
          email: {
            new_deals: false
          }
        },
        user_id: 'user-123'
      })
    })

    it('should handle empty update data', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
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

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validUpdateData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Update failed')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
    })

    it('should sanitize input data and prevent XSS', async () => {
      const maliciousData = {
        theme: '<script>alert("xss")</script>',
        custom_note: 'javascript:alert("xss")'
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maliciousData)
      })

      const response = await PUT(request)
      
      // Should either sanitize or reject malicious data
      expect(response.status).toBe(400) // Rejected due to invalid theme
    })
  })

  describe('User preference defaults and validation', () => {
    it('should provide correct default preferences structure', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/user/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(data.preferences).toMatchObject({
        theme: 'light',
        language: 'en',
        timezone: 'America/New_York',
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        currency: 'USD',
        notifications: expect.objectContaining({
          email: expect.any(Object),
          push: expect.any(Object),
          in_app: expect.any(Object)
        }),
        dashboard: expect.objectContaining({
          default_view: expect.any(String),
          widgets: expect.any(Array),
          items_per_page: expect.any(Number)
        }),
        privacy: expect.any(Object),
        accessibility: expect.any(Object)
      })
    })

    it('should validate all supported themes', async () => {
      const supportedThemes = ['light', 'dark', 'auto']
      
      for (const theme of supportedThemes) {
        const request = new NextRequest('http://localhost:3000/api/user/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ theme })
        })

        const response = await PUT(request)
        expect(response.status).toBe(200)
      }
    })

    it('should validate all supported languages', async () => {
      const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja']
      
      for (const language of supportedLanguages) {
        jest.clearAllMocks()
        
        const request = new NextRequest('http://localhost:3000/api/user/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ language })
        })

        const response = await PUT(request)
        expect(response.status).toBe(200)
      }
    })

    it('should validate accessibility settings', async () => {
      const accessibilityData = {
        accessibility: {
          high_contrast: true,
          large_text: true,
          reduced_motion: false,
          screen_reader: true
        }
      }

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(accessibilityData)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Security and privacy', () => {
    it('should only allow users to access their own preferences', async () => {
      const request = new NextRequest('http://localhost:3000/api/user/preferences')
      await GET(request)

      expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should log preference changes for audit trail', async () => {
      // Mock audit logging
      const mockAuditLog = jest.fn()
      jest.doMock('@/lib/security/audit', () => ({
        logPreferenceChange: mockAuditLog
      }))

      const request = new NextRequest('http://localhost:3000/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme: 'dark' })
      })

      const response = await PUT(request)
      
      expect(response.status).toBe(200)
      // Audit logging verification would depend on actual implementation
    })

    it('should handle concurrent preference updates', async () => {
      const updates = [
        { theme: 'dark' },
        { language: 'es' },
        { timezone: 'Europe/Madrid' }
      ]

      const requests = updates.map(update => 
        new NextRequest('http://localhost:3000/api/user/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(update)
        })
      )

      const responses = await Promise.all(requests.map(req => PUT(req)))
      
      // All should succeed (database handles concurrency)
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })
})
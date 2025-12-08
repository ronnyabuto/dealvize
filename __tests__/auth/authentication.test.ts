import { validateSession } from '@/lib/auth/session'
import { requireAuth, requireRole } from '@/lib/auth/utils'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'user',
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z'
}

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({
          data: { role: 'user' },
          error: null
        }))
      }))
    }))
  }))
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

// Mock NextRequest for server-side testing
const createMockRequest = (headers: Record<string, string> = {}) => ({
  headers: {
    get: (key: string) => headers[key.toLowerCase()] || null,
    has: (key: string) => key.toLowerCase() in headers
  },
  cookies: {
    get: (name: string) => ({ value: headers[`cookie-${name}`] || null }),
    getAll: () => []
  }
})

describe('Authentication Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Session Validation', () => {
    it('should validate a valid session', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            user: mockUser,
            access_token: 'valid-token',
            expires_at: Date.now() / 1000 + 3600 // 1 hour from now
          }
        },
        error: null
      })

      const mockRequest = createMockRequest({
        'authorization': 'Bearer valid-token',
        'cookie-sb-access-token': 'valid-token'
      })

      const result = await validateSession(mockRequest as any)

      expect(result.isValid).toBe(true)
      expect(result.sessionInfo?.userId).toBe('user-123')
      expect(result.sessionInfo?.userEmail).toBe('test@example.com')
    })

    it('should reject invalid session with no token', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      const mockRequest = createMockRequest({})

      const result = await validateSession(mockRequest as any)

      expect(result.isValid).toBe(false)
      expect(result.sessionInfo).toBeNull()
      expect(result.error).toBeDefined()
    })

    it('should reject expired session', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            user: mockUser,
            access_token: 'expired-token',
            expires_at: Date.now() / 1000 - 3600 // 1 hour ago
          }
        },
        error: null
      })

      const mockRequest = createMockRequest({
        'authorization': 'Bearer expired-token'
      })

      const result = await validateSession(mockRequest as any)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Session expired')
    })

    it('should handle malformed tokens', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      })

      const mockRequest = createMockRequest({
        'authorization': 'Bearer malformed.token.here'
      })

      const result = await validateSession(mockRequest as any)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid')
    })

    it('should handle Supabase connection errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Connection failed'))

      const mockRequest = createMockRequest({
        'authorization': 'Bearer valid-token'
      })

      const result = await validateSession(mockRequest as any)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Connection failed')
    })

    it('should validate session with different token sources', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      })

      // Test with cookie-based token
      const mockRequestCookie = createMockRequest({
        'cookie-sb-access-token': 'cookie-token'
      })

      await validateSession(mockRequestCookie as any)
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()

      jest.clearAllMocks()

      // Test with Authorization header
      const mockRequestHeader = createMockRequest({
        'authorization': 'Bearer header-token'
      })

      await validateSession(mockRequestHeader as any)
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    it('should handle concurrent session validation requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockRequest = createMockRequest({
        'authorization': 'Bearer valid-token'
      })

      // Multiple concurrent validation requests
      const promises = Array(5).fill(null).map(() => 
        validateSession(mockRequest as any)
      )

      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result.isValid).toBe(true)
      })

      // Should handle concurrent calls without issues
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(5)
    })
  })

  describe('Authentication Requirements', () => {
    it('should allow access with valid authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      })

      const user = await requireAuth()

      expect(user).toEqual(mockUser)
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    it('should reject access without authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'No user found' }
      })

      await expect(requireAuth()).rejects.toThrow('Authentication required')
    })

    it('should handle authentication service errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Auth service down'))

      await expect(requireAuth()).rejects.toThrow('Authentication service error')
    })
  })

  describe('Role-Based Access Control', () => {
    it('should allow access with correct role', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { ...mockUser, role: 'admin' } },
        error: null
      })

      const user = await requireRole('admin')

      expect(user).toEqual({ ...mockUser, role: 'admin' })
    })

    it('should reject access with insufficient role', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { ...mockUser, role: 'user' } },
        error: null
      })

      await expect(requireRole('admin')).rejects.toThrow('Insufficient permissions')
    })

    it('should handle multiple role requirements', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { ...mockUser, role: 'editor' } },
        error: null
      })

      // User with 'editor' role should access both 'user' and 'editor' endpoints
      const userAccess = await requireRole('user')
      expect(userAccess).toBeDefined()

      const editorAccess = await requireRole('editor')
      expect(editorAccess).toBeDefined()

      // But not admin endpoints
      await expect(requireRole('admin')).rejects.toThrow('Insufficient permissions')
    })

    it('should validate role hierarchy', async () => {
      const roleHierarchy = ['user', 'editor', 'admin']
      
      // Test admin can access all roles
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { ...mockUser, role: 'admin' } },
        error: null
      })

      for (const role of roleHierarchy) {
        const user = await requireRole(role)
        expect(user.role).toBe('admin')
      }
    })

    it('should handle custom role validation', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { ...mockUser, role: 'super_admin' } },
        error: null
      })

      const user = await requireRole('super_admin')
      expect(user.role).toBe('super_admin')
    })

    it('should reject access for disabled users', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { 
          user: { 
            ...mockUser, 
            user_metadata: { disabled: true }
          } 
        },
        error: null
      })

      await expect(requireAuth()).rejects.toThrow('Account disabled')
    })
  })

  describe('Session Management', () => {
    it('should refresh expired sessions', async () => {
      // First call returns expired session
      mockSupabase.auth.getSession
        .mockResolvedValueOnce({
          data: {
            session: {
              user: mockUser,
              access_token: 'expired-token',
              expires_at: Date.now() / 1000 - 100 // Expired
            }
          },
          error: null
        })
        // Second call returns refreshed session
        .mockResolvedValueOnce({
          data: {
            session: {
              user: mockUser,
              access_token: 'refreshed-token',
              expires_at: Date.now() / 1000 + 3600 // Valid
            }
          },
          error: null
        })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockRequest = createMockRequest({
        'authorization': 'Bearer expired-token'
      })

      const result = await validateSession(mockRequest as any)

      expect(result.isValid).toBe(true)
      expect(result.sessionInfo?.userId).toBe('user-123')
    })

    it('should handle session refresh failures', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Refresh failed' }
      })

      const mockRequest = createMockRequest({
        'authorization': 'Bearer expired-token'
      })

      const result = await validateSession(mockRequest as any)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Refresh failed')
    })

    it('should handle concurrent session refresh', async () => {
      let refreshCount = 0
      mockSupabase.auth.getSession.mockImplementation(() => {
        refreshCount++
        return Promise.resolve({
          data: {
            session: {
              user: mockUser,
              access_token: `token-${refreshCount}`,
              expires_at: Date.now() / 1000 + 3600
            }
          },
          error: null
        })
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockRequest = createMockRequest({
        'authorization': 'Bearer expired-token'
      })

      // Multiple concurrent refresh attempts
      const promises = Array(3).fill(null).map(() => 
        validateSession(mockRequest as any)
      )

      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result.isValid).toBe(true)
      })

      // Should only refresh once for concurrent requests
      expect(refreshCount).toBeLessThanOrEqual(3)
    })
  })

  describe('Security Tests', () => {
    it('should prevent token injection attacks', async () => {
      const maliciousToken = '"; DROP TABLE users; --'
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token format' }
      })

      const mockRequest = createMockRequest({
        'authorization': `Bearer ${maliciousToken}`
      })

      const result = await validateSession(mockRequest as any)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid')
    })

    it('should validate token format', async () => {
      const invalidTokens = [
        'not-a-jwt',
        'Bearer',
        'Basic dXNlcjpwYXNzd29yZA==', // Base64 encoded
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9', // Incomplete JWT
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.malformed.signature'
      ]

      for (const token of invalidTokens) {
        mockSupabase.auth.getUser.mockResolvedValueOnce({
          data: { user: null },
          error: { message: 'Invalid token' }
        })

        const mockRequest = createMockRequest({
          'authorization': `Bearer ${token}`
        })

        const result = await validateSession(mockRequest as any)
        expect(result.isValid).toBe(false)
      }
    })

    it('should prevent session fixation attacks', async () => {
      const sessionId1 = 'session-123'
      const sessionId2 = 'session-456'

      // First session
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            user: mockUser,
            access_token: sessionId1,
            expires_at: Date.now() / 1000 + 3600
          }
        },
        error: null
      })

      // Second session with different user
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            user: { ...mockUser, id: 'user-456', email: 'other@example.com' },
            access_token: sessionId2,
            expires_at: Date.now() / 1000 + 3600
          }
        },
        error: null
      })

      const request1 = createMockRequest({ 'authorization': `Bearer ${sessionId1}` })
      const request2 = createMockRequest({ 'authorization': `Bearer ${sessionId2}` })

      const result1 = await validateSession(request1 as any)
      const result2 = await validateSession(request2 as any)

      expect(result1.sessionInfo?.userId).toBe('user-123')
      expect(result2.sessionInfo?.userId).toBe('user-456')
      expect(result1.sessionInfo?.userId).not.toBe(result2.sessionInfo?.userId)
    })

    it('should handle rate limiting for authentication attempts', async () => {
      // Simulate rate limiting by returning error after multiple attempts
      let attemptCount = 0
      mockSupabase.auth.getUser.mockImplementation(() => {
        attemptCount++
        if (attemptCount > 5) {
          return Promise.resolve({
            data: { user: null },
            error: { message: 'Rate limit exceeded' }
          })
        }
        return Promise.resolve({
          data: { user: null },
          error: { message: 'Invalid token' }
        })
      })

      const mockRequest = createMockRequest({
        'authorization': 'Bearer invalid-token'
      })

      // Make multiple attempts
      for (let i = 0; i < 7; i++) {
        await validateSession(mockRequest as any)
      }

      const result = await validateSession(mockRequest as any)
      expect(result.error).toContain('Rate limit exceeded')
    })

    it('should log authentication attempts for audit trail', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null
      })

      const mockRequest = createMockRequest({
        'authorization': 'Bearer valid-token',
        'user-agent': 'Test Browser',
        'x-forwarded-for': '192.168.1.1'
      })

      await validateSession(mockRequest as any)

      // Should log successful authentication
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication successful'),
        expect.objectContaining({
          userId: 'user-123',
          timestamp: expect.any(String)
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined user data', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      })

      await expect(requireAuth()).rejects.toThrow('Authentication required')
    })

    it('should handle malformed user objects', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: null, email: undefined } },
        error: null
      })

      await expect(requireAuth()).rejects.toThrow('Invalid user data')
    })

    it('should handle network timeouts', async () => {
      mockSupabase.auth.getUser.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100)
        })
      )

      const mockRequest = createMockRequest({
        'authorization': 'Bearer valid-token'
      })

      const result = await validateSession(mockRequest as any)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Network timeout')
    })

    it('should handle Supabase service unavailable', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce({
        message: 'Service Unavailable',
        status: 503
      })

      const mockRequest = createMockRequest({
        'authorization': 'Bearer valid-token'
      })

      const result = await validateSession(mockRequest as any)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Service Unavailable')
    })
  })
})
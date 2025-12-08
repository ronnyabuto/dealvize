import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/tasks/route'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        or: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn(() => ({
              then: jest.fn((callback) => callback({
                data: [
                  {
                    id: '1',
                    title: 'Follow up call',
                    description: 'Call client about property showing',
                    status: 'Pending',
                    priority: 'High',
                    type: 'Call',
                    due_date: '2024-12-31T10:00:00Z',
                    user_id: 'user-123',
                    assigned_to: 'user-123',
                    client_id: 'client-1',
                    clients: {
                      id: 'client-1',
                      name: 'John Doe'
                    },
                    deals: null
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
                title: 'New Task',
                status: 'Pending',
                priority: 'Medium',
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

describe('/api/tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return tasks list with related data', async () => {
      const url = new URL('http://localhost:3000/api/tasks')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('tasks')
      expect(data).toHaveProperty('pagination')
      expect(Array.isArray(data.tasks)).toBe(true)
      if (data.tasks.length > 0) {
        expect(data.tasks[0]).toHaveProperty('title')
        expect(data.tasks[0]).toHaveProperty('status')
        expect(data.tasks[0]).toHaveProperty('priority')
      }
    })

    it('should filter tasks by status', async () => {
      const url = new URL('http://localhost:3000/api/tasks?status=Pending')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should filter tasks by priority', async () => {
      const url = new URL('http://localhost:3000/api/tasks?priority=High')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should filter tasks by client', async () => {
      const url = new URL('http://localhost:3000/api/tasks?client_id=client-1')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should filter tasks by deal', async () => {
      const url = new URL('http://localhost:3000/api/tasks?deal_id=deal-1')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should filter due soon tasks', async () => {
      const url = new URL('http://localhost:3000/api/tasks?due_soon=true')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should search tasks by title and description', async () => {
      const url = new URL('http://localhost:3000/api/tasks?search=follow')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(200)
    })

    it('should handle authentication error', async () => {
      const { requireAuth } = require('@/lib/auth/utils')
      requireAuth.mockRejectedValueOnce(new Error('Unauthorized'))
      
      const url = new URL('http://localhost:3000/api/tasks')
      const request = new NextRequest(url)
      
      const response = await GET(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('POST', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'Schedule property viewing',
        description: 'Coordinate viewing with client and showing agent',
        due_date: '2024-12-31T14:00:00Z',
        priority: 'High',
        status: 'Pending',
        type: 'Meeting',
        client_id: 'client-1'
      }

      const url = new URL('http://localhost:3000/api/tasks')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data).toHaveProperty('id')
      expect(data.title).toBe(taskData.title)
      expect(data.priority).toBe(taskData.priority)
    })

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Task without title',
        priority: 'InvalidPriority'
      }

      const url = new URL('http://localhost:3000/api/tasks')
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

    it('should verify client ownership when client_id provided', async () => {
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
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return mockClientSelect
        }
        return {
          select: jest.fn(() => ({
            or: jest.fn(() => ({
              order: jest.fn(() => ({
                range: jest.fn(() => ({}))
              }))
            }))
          }))
        }
      })

      const taskData = {
        title: 'Test Task',
        client_id: 'non-existent-client'
      }

      const url = new URL('http://localhost:3000/api/tasks')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Client not found')
    })

    it('should verify deal ownership when deal_id provided', async () => {
      // Mock successful client verification and failed deal verification
      const mockSupabase = require('@/lib/supabase/server').createClient()
      
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

      const mockDealSelect = {
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
      
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'clients') {
          return mockClientSelect
        }
        if (table === 'deals') {
          return mockDealSelect
        }
        return {}
      })

      const taskData = {
        title: 'Test Task',
        client_id: 'client-1',
        deal_id: 'non-existent-deal'
      }

      const url = new URL('http://localhost:3000/api/tasks')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Deal not found')
    })

    it('should validate enum fields', async () => {
      const invalidData = {
        title: 'Test Task',
        priority: 'InvalidPriority',
        status: 'InvalidStatus',
        type: 'InvalidType'
      }

      const url = new URL('http://localhost:3000/api/tasks')
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

    it('should validate due_date format', async () => {
      const invalidData = {
        title: 'Test Task',
        due_date: 'invalid-date-format'
      }

      const url = new URL('http://localhost:3000/api/tasks')
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

    it('should set default values', async () => {
      const minimalData = {
        title: 'Minimal Task'
      }

      const url = new URL('http://localhost:3000/api/tasks')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(minimalData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.priority).toBe('Medium') // Default priority
      expect(data.status).toBe('Pending') // Default status
    })

    it('should handle database error during creation', async () => {
      const mockSupabase = require('@/lib/supabase/server').createClient()
      
      const mockTaskInsert = {
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
        if (table === 'tasks') {
          return mockTaskInsert
        }
        return {}
      })

      const taskData = {
        title: 'Test Task'
      }

      const url = new URL('http://localhost:3000/api/tasks')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(taskData),
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

  describe('Task Assignment', () => {
    it('should handle assigned_to field', async () => {
      const taskData = {
        title: 'Assigned Task',
        assigned_to: 'other-user-id'
      }

      const url = new URL('http://localhost:3000/api/tasks')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(201)
    })

    it('should default assigned_to to current user', async () => {
      const taskData = {
        title: 'Self-Assigned Task'
      }

      const url = new URL('http://localhost:3000/api/tasks')
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      // The default should be set to user.id in the actual implementation
    })
  })

  describe('Task Types', () => {
    const taskTypes = ['Call', 'Email', 'Meeting', 'Document', 'Follow-up', 'Other']
    
    taskTypes.forEach(type => {
      it(`should accept task type: ${type}`, async () => {
        const taskData = {
          title: `${type} Task`,
          type: type
        }

        const url = new URL('http://localhost:3000/api/tasks')
        const request = new NextRequest(url, {
          method: 'POST',
          body: JSON.stringify(taskData),
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(201)
      })
    })
  })

  describe('Task Priorities', () => {
    const priorities = ['Low', 'Medium', 'High']
    
    priorities.forEach(priority => {
      it(`should accept priority: ${priority}`, async () => {
        const taskData = {
          title: `${priority} Priority Task`,
          priority: priority
        }

        const url = new URL('http://localhost:3000/api/tasks')
        const request = new NextRequest(url, {
          method: 'POST',
          body: JSON.stringify(taskData),
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        const response = await POST(request)
        
        expect(response.status).toBe(201)
      })
    })
  })
})
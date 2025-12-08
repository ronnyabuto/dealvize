import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/notes/route'
import { NextRequest } from 'next/server'

// Mock authentication
const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
}

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn(() => Promise.resolve(mockUser))
}))

// Mock Supabase client
const mockSupabaseResponse = {
  data: [
    {
      id: '1',
      content: 'Important client meeting notes',
      type: 'general',
      client_id: 'client-1',
      deal_id: null,
      task_id: null,
      user_id: 'user-123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      clients: {
        id: 'client-1',
        name: 'John Doe',
        initials: 'JD'
      },
      deals: null,
      tasks: null
    },
    {
      id: '2',
      content: 'Deal negotiation notes',
      type: 'deal',
      client_id: null,
      deal_id: 'deal-1',
      task_id: null,
      user_id: 'user-123',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      clients: null,
      deals: {
        id: 'deal-1',
        title: 'Downtown Property Sale'
      },
      tasks: null
    }
  ],
  error: null,
  count: 2
}

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => ({
            ilike: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
            eq: jest.fn(() => Promise.resolve(mockSupabaseResponse))
          })),
          ilike: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
          eq: jest.fn(() => Promise.resolve(mockSupabaseResponse))
        })),
        range: jest.fn(() => ({
          ilike: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
          eq: jest.fn(() => Promise.resolve(mockSupabaseResponse))
        })),
        ilike: jest.fn(() => Promise.resolve(mockSupabaseResponse)),
        eq: jest.fn(() => Promise.resolve(mockSupabaseResponse))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({
          data: {
            id: '3',
            content: 'New note content',
            type: 'general',
            client_id: 'client-1',
            deal_id: null,
            task_id: null,
            user_id: 'user-123',
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z'
          },
          error: null
        }))
      }))
    }))
  }))
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient))
}))

describe('/api/notes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return notes with default pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/notes')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.notes).toBeDefined()
      expect(Array.isArray(data.notes)).toBe(true)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(10)
      expect(data.pagination.total).toBe(2)
    })

    it('should handle pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/notes?page=2&limit=5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(5)
      
      // Verify the range calculation was called correctly
      expect(mockSupabaseClient.from().select().eq().order().range).toHaveBeenCalledWith(5, 9)
    })

    it('should filter by search query', async () => {
      const request = new NextRequest('http://localhost:3000/api/notes?search=meeting')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify search filter was applied
      expect(mockSupabaseClient.from().select().eq().order().range().ilike).toHaveBeenCalledWith('content', '%meeting%')
    })

    it('should filter by client_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/notes?client_id=client-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify client filter was applied
      expect(mockSupabaseClient.from().select().eq().order().range().eq).toHaveBeenCalledWith('client_id', 'client-1')
    })

    it('should filter by deal_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/notes?deal_id=deal-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify deal filter was applied
      expect(mockSupabaseClient.from().select().eq().order().range().eq).toHaveBeenCalledWith('deal_id', 'deal-1')
    })

    it('should filter by task_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/notes?task_id=task-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify task filter was applied
      expect(mockSupabaseClient.from().select().eq().order().range().eq).toHaveBeenCalledWith('task_id', 'task-1')
    })

    it('should handle multiple filters simultaneously', async () => {
      const request = new NextRequest('http://localhost:3000/api/notes?search=negotiation&client_id=client-1&page=1&limit=20')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(20)
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              range: jest.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database connection failed' },
                count: 0
              }))
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/notes')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle authentication errors', async () => {
      const { requireAuth } = require('@/lib/auth/utils')
      requireAuth.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = new NextRequest('http://localhost:3000/api/notes')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST', () => {
    const validNoteData = {
      content: 'New meeting notes',
      type: 'general',
      client_id: 'client-1'
    }

    it('should create a new note successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validNoteData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.note).toBeDefined()
      expect(data.note.id).toBe('3')
      expect(data.note.content).toBe('New note content')
      
      // Verify insert was called with correct data
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notes')
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([{
        content: validNoteData.content,
        type: validNoteData.type,
        client_id: validNoteData.client_id,
        deal_id: null,
        task_id: null,
        user_id: mockUser.id
      }])
    })

    it('should create note with deal_id', async () => {
      const noteWithDeal = {
        content: 'Deal-specific notes',
        type: 'deal',
        deal_id: 'deal-1'
      }

      const request = new NextRequest('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteWithDeal)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      
      // Verify correct data structure was used
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([{
        content: noteWithDeal.content,
        type: noteWithDeal.type,
        client_id: null,
        deal_id: noteWithDeal.deal_id,
        task_id: null,
        user_id: mockUser.id
      }])
    })

    it('should create note with task_id', async () => {
      const noteWithTask = {
        content: 'Task-specific notes',
        type: 'task',
        task_id: 'task-1'
      }

      const request = new NextRequest('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteWithTask)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      
      // Verify correct data structure was used
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([{
        content: noteWithTask.content,
        type: noteWithTask.type,
        client_id: null,
        deal_id: null,
        task_id: noteWithTask.task_id,
        user_id: mockUser.id
      }])
    })

    it('should validate required fields', async () => {
      const invalidData = {
        type: 'general'
        // missing content
      }

      const request = new NextRequest('http://localhost:3000/api/notes', {
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
      expect(data.error).toContain('Content is required')
    })

    it('should validate content length', async () => {
      const longContent = 'a'.repeat(10001) // Exceeds 10,000 character limit
      const invalidData = {
        content: longContent,
        type: 'general'
      }

      const request = new NextRequest('http://localhost:3000/api/notes', {
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
      expect(data.error).toContain('Content must be less than 10,000 characters')
    })

    it('should validate note type', async () => {
      const invalidData = {
        content: 'Valid content',
        type: 'invalid_type'
      }

      const request = new NextRequest('http://localhost:3000/api/notes', {
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
      expect(data.error).toContain('Invalid note type')
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

      const request = new NextRequest('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validNoteData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Insertion failed')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/notes', {
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

    it('should handle authentication errors', async () => {
      const { requireAuth } = require('@/lib/auth/utils')
      requireAuth.mockRejectedValueOnce(new Error('Token expired'))

      const request = new NextRequest('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validNoteData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Token expired')
    })
  })

  describe('Edge cases and security', () => {
    it('should only return notes for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/notes')
      await GET(request)

      // Verify that the query includes user_id filter
      expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('user_id', mockUser.id)
    })

    it('should sanitize and trim note content', async () => {
      const noteWithWhitespace = {
        content: '  \n\t  Important notes with extra whitespace  \n\t  ',
        type: 'general'
      }

      const request = new NextRequest('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteWithWhitespace)
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
      
      // Content should be trimmed
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith([
        expect.objectContaining({
          content: 'Important notes with extra whitespace'
        })
      ])
    })

    it('should handle empty content after trimming', async () => {
      const emptyContent = {
        content: '   \n\t   ',
        type: 'general'
      }

      const request = new NextRequest('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emptyContent)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Content is required')
    })
  })
})
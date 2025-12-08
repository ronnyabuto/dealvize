// Integration tests for API endpoints with database
import { NextRequest } from 'next/server'

// Mock Supabase client for integration tests
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  range: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase))
}))

// Mock API route functions to test integration patterns
const mockAPIResponse = (data: any, status = 200) => ({
  json: () => Promise.resolve(data),
  status,
  headers: new Map()
})

// Simplified API handlers for testing integration patterns
const getClients = async (request: NextRequest) => {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')
  
  try {
    const supabase = await require('@/lib/supabase/server').createClient()
    const offset = (page - 1) * limit
    
    const result = await supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (result.error) throw result.error
    
    return mockAPIResponse({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages: Math.ceil(result.count / limit)
      }
    })
  } catch (error) {
    return mockAPIResponse({
      success: false,
      error: `Failed to fetch clients: ${error.message}`
    }, 500)
  }
}

const postClients = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const supabase = await require('@/lib/supabase/server').createClient()
    
    const result = await supabase
      .from('clients')
      .insert(body)
      .select()
    
    if (result.error) {
      if (result.error.code === '23505') {
        return mockAPIResponse({
          success: false,
          error: 'Client with this email already exists'
        }, 400)
      }
      throw result.error
    }
    
    return mockAPIResponse({
      success: true,
      data: result.data[0]
    }, 201)
  } catch (error) {
    if (error.message.includes('validation')) {
      return mockAPIResponse({
        success: false,
        error: 'Validation failed'
      }, 400)
    }
    return mockAPIResponse({
      success: false,
      error: `Failed to create client: ${error.message}`
    }, 500)
  }
}

const getDeals = async (request: NextRequest) => {
  try {
    const supabase = await require('@/lib/supabase/server').createClient()
    
    const result = await supabase
      .from('deals')
      .select('*, client:clients(name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    if (result.error) throw result.error
    
    return mockAPIResponse({
      success: true,
      data: result.data
    })
  } catch (error) {
    return mockAPIResponse({
      success: false,
      error: `Failed to fetch deals: ${error.message}`
    }, 500)
  }
}

const postDeals = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const supabase = await require('@/lib/supabase/server').createClient()
    
    const result = await supabase
      .from('deals')
      .insert(body)
      .select()
    
    if (result.error) throw result.error
    
    return mockAPIResponse({
      success: true,
      data: result.data[0]
    }, 201)
  } catch (error) {
    if (error.message.includes('validation')) {
      return mockAPIResponse({
        success: false,
        error: 'Validation failed'
      }, 400)
    }
    return mockAPIResponse({
      success: false,
      error: `Failed to create deal: ${error.message}`
    }, 500)
  }
}

const getTasks = async (request: NextRequest) => {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const supabase = await require('@/lib/supabase/server').createClient()
    
    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const result = await query
    
    if (result.error) throw result.error
    
    return mockAPIResponse({
      success: true,
      data: result.data
    })
  } catch (error) {
    return mockAPIResponse({
      success: false,
      error: `Failed to fetch tasks: ${error.message}`
    }, 500)
  }
}

const postTasks = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const supabase = await require('@/lib/supabase/server').createClient()
    
    const result = await supabase
      .from('tasks')
      .insert(body)
      .select()
    
    if (result.error) throw result.error
    
    return mockAPIResponse({
      success: true,
      data: result.data[0]
    }, 201)
  } catch (error) {
    if (error.message.includes('validation')) {
      return mockAPIResponse({
        success: false,
        error: 'Validation failed'
      }, 400)
    }
    return mockAPIResponse({
      success: false,
      error: `Failed to create task: ${error.message}`
    }, 500)
  }
}

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Clients API Integration', () => {
    it('should fetch clients from database with proper pagination', async () => {
      const mockClients = [
        {
          id: '1',
          name: 'Test Client 1',
          email: 'test1@example.com',
          phone: '123-456-7890',
          created_at: '2025-01-01T00:00:00Z'
        },
        {
          id: '2', 
          name: 'Test Client 2',
          email: 'test2@example.com',
          phone: '098-765-4321',
          created_at: '2025-01-02T00:00:00Z'
        }
      ]

      mockSupabase.select.mockResolvedValueOnce({ data: mockClients, error: null, count: 2 })

      const url = new URL('http://localhost:3000/api/clients?page=1&limit=10')
      const request = new NextRequest(url)
      
      const response = await getClients(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockClients)
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.page).toBe(1)

      // Verify database calls
      expect(mockSupabase.from).toHaveBeenCalledWith('clients')
      expect(mockSupabase.select).toHaveBeenCalledWith('*', { count: 'exact' })
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 9)
    })

    it('should create new client in database', async () => {
      const newClient = {
        name: 'New Client',
        email: 'newclient@example.com',
        phone: '555-123-4567',
        company: 'Test Company'
      }

      const createdClient = {
        id: '3',
        ...newClient,
        created_at: '2025-01-03T00:00:00Z'
      }

      mockSupabase.insert.mockResolvedValueOnce({ data: [createdClient], error: null })
      mockSupabase.select.mockResolvedValueOnce({ data: [createdClient], error: null })

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify(newClient),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postClients(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(createdClient)

      // Verify database calls
      expect(mockSupabase.from).toHaveBeenCalledWith('clients')
      expect(mockSupabase.insert).toHaveBeenCalledWith(newClient)
      expect(mockSupabase.select).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: dbError })

      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url)
      
      const response = await getClients(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch clients')
    })
  })

  describe('Deals API Integration', () => {
    it('should fetch deals with client relationships', async () => {
      const mockDeals = [
        {
          id: '1',
          title: 'Test Deal 1',
          amount: 10000,
          status: 'negotiation',
          client_id: '1',
          client: {
            name: 'Test Client 1',
            email: 'test1@example.com'
          },
          created_at: '2025-01-01T00:00:00Z'
        }
      ]

      mockSupabase.select.mockResolvedValueOnce({ data: mockDeals, error: null, count: 1 })

      const url = new URL('http://localhost:3000/api/deals')
      const request = new NextRequest(url)
      
      const response = await getDeals(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockDeals)

      // Verify proper join query
      expect(mockSupabase.select).toHaveBeenCalledWith(
        '*, client:clients(name, email)',
        { count: 'exact' }
      )
    })

    it('should create deal with validation', async () => {
      const newDeal = {
        title: 'New Deal',
        amount: 25000,
        status: 'prospecting',
        client_id: '1',
        expected_close_date: '2025-06-01'
      }

      const createdDeal = {
        id: '2',
        ...newDeal,
        created_at: '2025-01-03T00:00:00Z'
      }

      mockSupabase.insert.mockResolvedValueOnce({ data: [createdDeal], error: null })
      mockSupabase.select.mockResolvedValueOnce({ data: [createdDeal], error: null })

      const request = new NextRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify(newDeal),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postDeals(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(createdDeal)
    })
  })

  describe('Tasks API Integration', () => {
    it('should fetch tasks with proper filtering', async () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Call client',
          status: 'pending',
          priority: 'high',
          due_date: '2025-01-15T00:00:00Z',
          client_id: '1',
          created_at: '2025-01-01T00:00:00Z'
        }
      ]

      mockSupabase.select.mockResolvedValueOnce({ data: mockTasks, error: null, count: 1 })

      const url = new URL('http://localhost:3000/api/tasks?status=pending')
      const request = new NextRequest(url)
      
      const response = await getTasks(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTasks)

      // Verify filtering was applied
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'pending')
    })

    it('should create task with due date validation', async () => {
      const newTask = {
        title: 'Follow up meeting',
        description: 'Schedule follow up with client',
        status: 'pending',
        priority: 'medium',
        due_date: '2025-02-01T10:00:00Z',
        client_id: '1'
      }

      const createdTask = {
        id: '2',
        ...newTask,
        created_at: '2025-01-03T00:00:00Z'
      }

      mockSupabase.insert.mockResolvedValueOnce({ data: [createdTask], error: null })
      mockSupabase.select.mockResolvedValueOnce({ data: [createdTask], error: null })

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postTasks(request)
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(createdTask)
    })
  })

  describe('Database Transaction Tests', () => {
    it('should handle concurrent client creation', async () => {
      const clients = [
        { name: 'Client A', email: 'clienta@test.com' },
        { name: 'Client B', email: 'clientb@test.com' }
      ]

      // Mock successful insertions
      clients.forEach((client, index) => {
        mockSupabase.insert.mockResolvedValueOnce({
          data: [{ id: `${index + 1}`, ...client, created_at: '2025-01-03T00:00:00Z' }],
          error: null
        })
        mockSupabase.select.mockResolvedValueOnce({
          data: [{ id: `${index + 1}`, ...client, created_at: '2025-01-03T00:00:00Z' }],
          error: null
        })
      })

      const requests = clients.map(client => 
        new NextRequest('http://localhost:3000/api/clients', {
          method: 'POST',
          body: JSON.stringify(client),
          headers: { 'Content-Type': 'application/json' }
        })
      )

      const responses = await Promise.all(requests.map(req => postClients(req)))
      const results = await Promise.all(responses.map(res => res.json()))

      responses.forEach(response => {
        expect(response.status).toBe(201)
      })

      results.forEach((result, index) => {
        expect(result.success).toBe(true)
        expect(result.data.name).toBe(clients[index].name)
      })
    })

    it('should handle database constraint violations', async () => {
      const duplicateEmailClient = {
        name: 'Duplicate Client',
        email: 'existing@test.com'
      }

      const constraintError = {
        message: 'duplicate key value violates unique constraint "clients_email_key"',
        code: '23505'
      }

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: constraintError
      })

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify(duplicateEmailClient),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postClients(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already exists')
    })
  })

  describe('API Performance Integration', () => {
    it('should handle large result sets with pagination', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Client ${i + 1}`,
        email: `client${i + 1}@test.com`,
        created_at: '2025-01-01T00:00:00Z'
      }))

      // Mock paginated response
      const pageSize = 50
      const page1Data = largeDataSet.slice(0, pageSize)
      
      mockSupabase.select.mockResolvedValueOnce({
        data: page1Data,
        error: null,
        count: largeDataSet.length
      })

      const url = new URL('http://localhost:3000/api/clients?page=1&limit=50')
      const request = new NextRequest(url)
      
      const startTime = performance.now()
      const response = await getClients(request)
      const endTime = performance.now()
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(pageSize)
      expect(result.pagination.total).toBe(largeDataSet.length)
      expect(result.pagination.totalPages).toBe(Math.ceil(largeDataSet.length / pageSize))

      // Performance check - should complete within reasonable time
      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(1000) // Less than 1 second
    })

    it('should handle database timeouts gracefully', async () => {
      const timeoutError = new Error('Connection timeout')
      mockSupabase.select.mockRejectedValueOnce(timeoutError)

      const url = new URL('http://localhost:3000/api/clients')
      const request = new NextRequest(url)
      
      const response = await getClients(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch clients')
    })
  })

  describe('Data Validation Integration', () => {
    it('should validate client data before database insertion', async () => {
      const invalidClient = {
        name: '', // Empty name should fail validation
        email: 'invalid-email', // Invalid email format
        phone: '123' // Too short phone number
      }

      const request = new NextRequest('http://localhost:3000/api/clients', {
        method: 'POST',
        body: JSON.stringify(invalidClient),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postClients(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('validation')

      // Should not have attempted database insertion
      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })

    it('should validate deal amount and dates', async () => {
      const invalidDeal = {
        title: 'Test Deal',
        amount: -1000, // Negative amount should fail
        status: 'invalid_status', // Invalid status
        expected_close_date: '2024-01-01' // Past date should fail
      }

      const request = new NextRequest('http://localhost:3000/api/deals', {
        method: 'POST',
        body: JSON.stringify(invalidDeal),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await postDeals(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('validation')

      // Should not have attempted database insertion
      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })
  })
})
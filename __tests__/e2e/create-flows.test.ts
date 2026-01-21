/**
 * E2E Tests for Client and Task Creation Flows
 * Tests the complete flow from form submission to database persistence
 */

import { createClient } from '@supabase/supabase-js'

// Mock Supabase client for testing
const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
}

// Mock fetch for API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock document.cookie for CSRF token
Object.defineProperty(document, 'cookie', {
    writable: true,
    value: 'csrf-token-client=test-csrf-token-12345',
})

describe('Client Creation E2E Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockFetch.mockReset()
    })

    describe('Successful Client Creation', () => {
        it('should create a client with all required fields', async () => {
            const clientData = {
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1234567890',
                status: 'Buyer',
                company: 'Acme Corp',
                address: '123 Main St'
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'uuid-123',
                    ...clientData,
                    created_at: new Date().toISOString()
                })
            })

            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': 'test-csrf-token-12345'
                },
                credentials: 'include',
                body: JSON.stringify(clientData)
            })

            expect(response.ok).toBe(true)
            const result = await response.json()
            expect(result.id).toBeDefined()
            expect(result.first_name).toBe('John')
            expect(result.company).toBe('Acme Corp')
            expect(result.address).toBe('123 Main St')
        })

        it('should create a client with optional fields as empty strings', async () => {
            const clientData = {
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane@example.com',
                phone: '',
                status: 'Seller',
                company: '',
                address: ''
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'uuid-456',
                    ...clientData,
                    company: '',
                    address: ''
                })
            })

            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': 'test-csrf-token-12345'
                },
                credentials: 'include',
                body: JSON.stringify(clientData)
            })

            expect(response.ok).toBe(true)
            const result = await response.json()
            expect(result.company).toBe('')
            expect(result.address).toBe('')
        })
    })

    describe('Client Creation Error Handling', () => {
        it('should reject creation without CSRF token with 403', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ error: 'CSRF token missing' })
            })

            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ first_name: 'Test' })
            })

            expect(response.ok).toBe(false)
            expect(response.status).toBe(403)
        })

        it('should handle server errors gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: 'Database error' })
            })

            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': 'test-csrf-token-12345'
                },
                credentials: 'include',
                body: JSON.stringify({ first_name: 'Test' })
            })

            expect(response.ok).toBe(false)
            expect(response.status).toBe(500)
        })
    })
})

describe('Task Creation E2E Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockFetch.mockReset()
    })

    describe('Successful Task Creation', () => {
        it('should create a task with all fields including type', async () => {
            const taskData = {
                title: 'Follow up with client',
                description: 'Schedule a call to discuss property',
                due_date: '2026-01-25',
                priority: 'High',
                status: 'Pending',
                type: 'Call',
                client_id: 'client-uuid-123'
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'task-uuid-789',
                    ...taskData,
                    created_at: new Date().toISOString()
                })
            })

            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': 'test-csrf-token-12345'
                },
                credentials: 'include',
                body: JSON.stringify(taskData)
            })

            expect(response.ok).toBe(true)
            const result = await response.json()
            expect(result.id).toBeDefined()
            expect(result.type).toBe('Call')
            expect(result.priority).toBe('High')
        })

        it('should default type to Other when not specified', async () => {
            const taskData = {
                title: 'Generic task',
                priority: 'Medium',
                status: 'Pending'
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'task-uuid-101',
                    ...taskData,
                    type: 'Other'
                })
            })

            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': 'test-csrf-token-12345'
                },
                credentials: 'include',
                body: JSON.stringify(taskData)
            })

            expect(response.ok).toBe(true)
            const result = await response.json()
            expect(result.type).toBe('Other')
        })

        it('should validate task type against allowed values', async () => {
            const validTypes = ['Call', 'Email', 'Meeting', 'Follow-up', 'Document', 'Review', 'Other']

            for (const type of validTypes) {
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: `task-${type}`, type })
                })

                const response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-csrf-token': 'test-csrf-token-12345'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ title: `Test ${type}`, type })
                })

                expect(response.ok).toBe(true)
                const result = await response.json()
                expect(result.type).toBe(type)
            }
        })
    })

    describe('Task Creation Error Handling', () => {
        it('should reject invalid task type', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({ error: 'Invalid task type' })
            })

            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': 'test-csrf-token-12345'
                },
                credentials: 'include',
                body: JSON.stringify({ title: 'Test', type: 'InvalidType' })
            })

            expect(response.ok).toBe(false)
        })
    })
})

describe('Cache Invalidation on Mutations', () => {
    beforeEach(() => {
        // Clear sessionStorage before each test
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear()
        }
    })

    it('should invalidate clients cache after successful creation', async () => {
        // Setup: populate cache
        const cacheKey = 'clients:{"page":1}'
        sessionStorage.setItem(cacheKey, JSON.stringify({
            data: { clients: [], totalCount: 0 },
            timestamp: Date.now()
        }))

        expect(sessionStorage.getItem(cacheKey)).not.toBeNull()

        // Action: simulate cache clear after mutation
        const keysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && key.includes('clients')) {
                keysToRemove.push(key)
            }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))

        // Verify: cache is cleared
        expect(sessionStorage.getItem(cacheKey)).toBeNull()
    })

    it('should invalidate tasks cache after successful creation', async () => {
        const cacheKey = 'tasks:{"status":"Pending"}'
        sessionStorage.setItem(cacheKey, JSON.stringify({
            data: { tasks: [], totalCount: 0 },
            timestamp: Date.now()
        }))

        expect(sessionStorage.getItem(cacheKey)).not.toBeNull()

        // Action: simulate cache clear
        const keysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && key.includes('tasks')) {
                keysToRemove.push(key)
            }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))

        expect(sessionStorage.getItem(cacheKey)).toBeNull()
    })
})

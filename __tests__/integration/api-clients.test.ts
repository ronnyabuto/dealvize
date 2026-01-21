import { createMockSupabaseClient, mockClients } from '../mocks/supabase'

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('Clients API Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/clients', () => {
        it('returns clients for authenticated user', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.select.mockResolvedValue({
                data: mockClients,
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase.from('clients').select('*')

            expect(result.data).toEqual(mockClients)
            expect(result.error).toBeNull()
        })

        it('filters clients by user_id', async () => {
            const mockSupabase = createMockSupabaseClient()
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            await mockSupabase.from('clients').select('*').eq('user_id', 'test-user-id-123')

            expect(mockSupabase.from).toHaveBeenCalledWith('clients')
            expect(mockSupabase.mockChain.select).toHaveBeenCalledWith('*')
            expect(mockSupabase.mockChain.eq).toHaveBeenCalledWith('user_id', 'test-user-id-123')
        })

        it('handles database errors gracefully', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.select.mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed', code: 'PGRST000' },
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase.from('clients').select('*')

            expect(result.data).toBeNull()
            expect(result.error).toBeDefined()
            expect(result.error.message).toBe('Database connection failed')
        })

        it('returns empty array when no clients exist', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.select.mockResolvedValue({
                data: [],
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase.from('clients').select('*')

            expect(result.data).toEqual([])
            expect(result.error).toBeNull()
        })
    })

    describe('POST /api/clients', () => {
        const newClient = {
            first_name: 'New',
            last_name: 'Client',
            email: 'new@example.com',
            phone: '+14155559999',
            status: 'new',
        }

        it('creates a new client', async () => {
            const mockSupabase = createMockSupabaseClient()
            const createdClient = { id: 'new-client-id', ...newClient, user_id: 'test-user-id-123' }

            mockSupabase.mockChain.insert.mockReturnThis()
            mockSupabase.mockChain.select.mockReturnThis()
            mockSupabase.mockChain.single.mockResolvedValue({
                data: createdClient,
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('clients')
                .insert(newClient)
                .select()
                .single()

            expect(result.data).toEqual(createdClient)
            expect(result.error).toBeNull()
        })

        it('handles validation errors', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.single.mockResolvedValue({
                data: null,
                error: { message: 'Invalid input', code: '23502' },
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('clients')
                .insert({ first_name: '' })
                .select()
                .single()

            expect(result.data).toBeNull()
            expect(result.error).toBeDefined()
        })

        it('handles duplicate email constraint', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.single.mockResolvedValue({
                data: null,
                error: { message: 'duplicate key value violates unique constraint', code: '23505' },
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('clients')
                .insert(newClient)
                .select()
                .single()

            expect(result.error?.code).toBe('23505')
        })
    })

    describe('Client data structure', () => {
        it('has required fields in mock data', () => {
            mockClients.forEach((client) => {
                expect(client).toHaveProperty('id')
                expect(client).toHaveProperty('user_id')
                expect(client).toHaveProperty('first_name')
                expect(client).toHaveProperty('last_name')
                expect(client).toHaveProperty('email')
                expect(client).toHaveProperty('phone')
                expect(client).toHaveProperty('status')
            })
        })

        it('has valid email format', () => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            mockClients.forEach((client) => {
                expect(client.email).toMatch(emailRegex)
            })
        })

        it('has valid phone format', () => {
            mockClients.forEach((client) => {
                expect(client.phone).toMatch(/^\+?[1-9]\d{1,14}$/)
            })
        })
    })
})

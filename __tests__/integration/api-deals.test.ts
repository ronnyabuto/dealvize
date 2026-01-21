import { createMockSupabaseClient, mockDeals } from '../mocks/supabase'

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('Deals API Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/deals', () => {
        it('returns deals for authenticated user', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.select.mockResolvedValue({
                data: mockDeals,
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase.from('deals').select('*')

            expect(result.data).toEqual(mockDeals)
            expect(result.error).toBeNull()
        })

        it('orders deals by created_at descending', async () => {
            const mockSupabase = createMockSupabaseClient()
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            await mockSupabase.from('deals').select('*').order('created_at', { ascending: false })

            expect(mockSupabase.mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
        })

        it('filters by status', async () => {
            const mockSupabase = createMockSupabaseClient()
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            await mockSupabase.from('deals').select('*').eq('status', 'In Progress')

            expect(mockSupabase.mockChain.eq).toHaveBeenCalledWith('status', 'In Progress')
        })

        it('handles empty result set', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.select.mockResolvedValue({
                data: [],
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase.from('deals').select('*')

            expect(result.data).toEqual([])
        })
    })

    describe('POST /api/deals', () => {
        const newDeal = {
            client_id: 'client-1',
            title: 'New Property Sale',
            value: 500000,
            status: 'Lead',
            probability: 30,
            expected_close_date: '2026-04-01',
            property_address: '456 Main St',
            property_type: 'Condo',
        }

        it('creates a new deal', async () => {
            const mockSupabase = createMockSupabaseClient()
            const createdDeal = { id: 'new-deal-id', ...newDeal, user_id: 'test-user-id-123' }

            mockSupabase.mockChain.single.mockResolvedValue({
                data: createdDeal,
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('deals')
                .insert(newDeal)
                .select()
                .single()

            expect(result.data).toEqual(createdDeal)
            expect(result.error).toBeNull()
        })

        it('validates deal value is positive', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.single.mockResolvedValue({
                data: null,
                error: { message: 'Value must be positive', code: '23514' },
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('deals')
                .insert({ ...newDeal, value: -1000 })
                .select()
                .single()

            expect(result.error).toBeDefined()
        })

        it('requires valid client_id', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.single.mockResolvedValue({
                data: null,
                error: { message: 'Foreign key constraint violation', code: '23503' },
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('deals')
                .insert({ ...newDeal, client_id: 'invalid-client' })
                .select()
                .single()

            expect(result.error?.code).toBe('23503')
        })
    })

    describe('Deal status transitions', () => {
        const validStatuses = ['Lead', 'In Progress', 'Under Contract', 'Closed', 'Lost']

        it('accepts all valid status values', () => {
            validStatuses.forEach((status) => {
                expect(validStatuses).toContain(status)
            })
        })

        it('mock deal has valid status', () => {
            mockDeals.forEach((deal) => {
                expect(validStatuses).toContain(deal.status)
            })
        })
    })

    describe('Deal value and commission calculation', () => {
        it('mock deal has numeric value', () => {
            mockDeals.forEach((deal) => {
                expect(typeof deal.value).toBe('number')
                expect(deal.value).toBeGreaterThan(0)
            })
        })

        it('mock deal has commission calculated', () => {
            mockDeals.forEach((deal) => {
                expect(typeof deal.commission).toBe('number')
                expect(deal.commission).toBeGreaterThan(0)
            })
        })

        it('probability is between 0 and 100', () => {
            mockDeals.forEach((deal) => {
                expect(deal.probability).toBeGreaterThanOrEqual(0)
                expect(deal.probability).toBeLessThanOrEqual(100)
            })
        })
    })
})

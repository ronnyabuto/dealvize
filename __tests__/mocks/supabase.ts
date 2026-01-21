export const mockUser = {
    id: 'test-user-id-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'Agent',
}

export const mockClients = [
    {
        id: 'client-1',
        user_id: 'test-user-id-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+14155551234',
        status: 'new',
        lead_score: 75,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
    {
        id: 'client-2',
        user_id: 'test-user-id-123',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '+14155555678',
        status: 'active',
        lead_score: 85,
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
    },
]

export const mockDeals = [
    {
        id: 'deal-1',
        user_id: 'test-user-id-123',
        client_id: 'client-1',
        title: 'Oceanview Property Sale',
        value: 750000,
        status: 'In Progress',
        probability: 60,
        expected_close_date: '2026-03-15',
        commission: 18750,
        property_address: '123 Ocean Dr, Miami, FL',
        property_type: 'Single Family',
        created_at: '2026-01-05T00:00:00Z',
        updated_at: '2026-01-10T00:00:00Z',
    },
]

export const mockTasks = [
    {
        id: 'task-1',
        user_id: 'test-user-id-123',
        client_id: 'client-1',
        deal_id: 'deal-1',
        title: 'Follow up call',
        description: 'Discuss property options',
        due_date: '2026-02-01T10:00:00Z',
        is_complete: false,
        priority: 'High',
        status: 'Pending',
        type: 'Call',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z',
    },
]

export function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
    const mockChain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        ...overrides,
    }

    return {
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: mockUser },
                error: null,
            }),
        },
        from: jest.fn(() => mockChain),
        mockChain,
    }
}

export function createUnauthenticatedSupabaseClient() {
    return createMockSupabaseClient({
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: null },
                error: { message: 'Not authenticated' },
            }),
        },
    })
}

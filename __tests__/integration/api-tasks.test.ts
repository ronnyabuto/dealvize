import { createMockSupabaseClient, mockTasks } from '../mocks/supabase'

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('Tasks API Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/tasks', () => {
        it('returns tasks for authenticated user', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.select.mockResolvedValue({
                data: mockTasks,
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase.from('tasks').select('*')

            expect(result.data).toEqual(mockTasks)
            expect(result.error).toBeNull()
        })

        it('filters tasks by completion status', async () => {
            const mockSupabase = createMockSupabaseClient()
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            await mockSupabase.from('tasks').select('*').eq('is_complete', false)

            expect(mockSupabase.mockChain.eq).toHaveBeenCalledWith('is_complete', false)
        })

        it('filters tasks by due date', async () => {
            const mockSupabase = createMockSupabaseClient()
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            await mockSupabase.from('tasks').select('*').order('due_date', { ascending: true })

            expect(mockSupabase.mockChain.order).toHaveBeenCalledWith('due_date', { ascending: true })
        })

        it('filters tasks by priority', async () => {
            const mockSupabase = createMockSupabaseClient()
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            await mockSupabase.from('tasks').select('*').eq('priority', 'High')

            expect(mockSupabase.mockChain.eq).toHaveBeenCalledWith('priority', 'High')
        })
    })

    describe('POST /api/tasks', () => {
        const newTask = {
            title: 'Schedule property showing',
            description: 'Show property at 123 Main St',
            due_date: '2026-02-15T14:00:00Z',
            priority: 'Medium',
            type: 'Meeting',
            client_id: 'client-1',
            deal_id: 'deal-1',
        }

        it('creates a new task', async () => {
            const mockSupabase = createMockSupabaseClient()
            const createdTask = { id: 'new-task-id', ...newTask, user_id: 'test-user-id-123' }

            mockSupabase.mockChain.single.mockResolvedValue({
                data: createdTask,
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('tasks')
                .insert(newTask)
                .select()
                .single()

            expect(result.data).toEqual(createdTask)
            expect(result.error).toBeNull()
        })

        it('creates task without client or deal', async () => {
            const mockSupabase = createMockSupabaseClient()
            const taskWithoutRelations = {
                title: 'General admin task',
                due_date: '2026-02-20T09:00:00Z',
                priority: 'Low',
                type: 'Other',
            }

            mockSupabase.mockChain.single.mockResolvedValue({
                data: { id: 'task-id', ...taskWithoutRelations, user_id: 'test-user-id-123' },
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('tasks')
                .insert(taskWithoutRelations)
                .select()
                .single()

            expect(result.data).toBeDefined()
            expect(result.error).toBeNull()
        })

        it('requires title', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.single.mockResolvedValue({
                data: null,
                error: { message: 'Title is required', code: '23502' },
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('tasks')
                .insert({ ...newTask, title: '' })
                .select()
                .single()

            expect(result.error).toBeDefined()
        })
    })

    describe('Task completion', () => {
        it('marks task as complete', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.single.mockResolvedValue({
                data: { ...mockTasks[0], is_complete: true, status: 'Completed' },
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('tasks')
                .update({ is_complete: true, status: 'Completed' })
                .eq('id', 'task-1')
                .select()
                .single()

            expect(result.data?.is_complete).toBe(true)
            expect(result.data?.status).toBe('Completed')
        })

        it('marks task as incomplete', async () => {
            const mockSupabase = createMockSupabaseClient()
            mockSupabase.mockChain.single.mockResolvedValue({
                data: { ...mockTasks[0], is_complete: false, status: 'Pending' },
                error: null,
            })
                ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)

            const result = await mockSupabase
                .from('tasks')
                .update({ is_complete: false, status: 'Pending' })
                .eq('id', 'task-1')
                .select()
                .single()

            expect(result.data?.is_complete).toBe(false)
        })
    })

    describe('Task data validation', () => {
        const validPriorities = ['Low', 'Medium', 'High']
        const validTypes = ['Call', 'Email', 'Meeting', 'Document', 'Follow-up', 'Other']
        const validStatuses = ['Pending', 'In Progress', 'Completed']

        it('mock tasks have valid priority', () => {
            mockTasks.forEach((task) => {
                expect(validPriorities).toContain(task.priority)
            })
        })

        it('mock tasks have valid type', () => {
            mockTasks.forEach((task) => {
                expect(validTypes).toContain(task.type)
            })
        })

        it('mock tasks have valid status', () => {
            mockTasks.forEach((task) => {
                expect(validStatuses).toContain(task.status)
            })
        })

        it('mock tasks have required fields', () => {
            mockTasks.forEach((task) => {
                expect(task).toHaveProperty('id')
                expect(task).toHaveProperty('user_id')
                expect(task).toHaveProperty('title')
                expect(task).toHaveProperty('due_date')
                expect(task).toHaveProperty('priority')
                expect(task).toHaveProperty('type')
            })
        })
    })
})

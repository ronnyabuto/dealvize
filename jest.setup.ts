import '@testing-library/jest-dom'

Object.defineProperty(globalThis, 'crypto', {
    value: {
        getRandomValues: (arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256)
            }
            return arr
        },
        randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
    },
})

global.fetch = jest.fn()

class MockRequest {
    url: string
    method: string
    headers: Map<string, string>
    cookies: Map<string, string>
    nextUrl: { pathname: string }

    constructor(url: string, options: { method?: string; headers?: Record<string, string> } = {}) {
        this.url = url
        this.method = options.method || 'GET'
        this.headers = new Map(Object.entries(options.headers || {}))
        this.cookies = new Map()
        this.nextUrl = { pathname: new URL(url, 'http://localhost').pathname }
    }
}

class MockResponse {
    body: string
    status: number
    headers: Map<string, string>

    constructor(body: string, options: { status?: number; headers?: Record<string, string> } = {}) {
        this.body = body
        this.status = options.status || 200
        this.headers = new Map(Object.entries(options.headers || {}))
    }

    json() {
        return Promise.resolve(JSON.parse(this.body))
    }
}

global.Request = MockRequest as unknown as typeof Request
global.Response = MockResponse as unknown as typeof Response

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => ({
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
    })),
}))

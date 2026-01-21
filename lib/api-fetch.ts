'use client'

/**
 * API Fetch Utility
 * Wraps fetch with CSRF token for authenticated API calls
 */

// Helper to get CSRF token from client-readable cookie
function getCSRFToken(): string | null {
    if (typeof document === 'undefined') return null

    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'csrf-token-client') {
            return decodeURIComponent(value)
        }
    }
    return null
}

interface FetchOptions extends RequestInit {
    skipCSRF?: boolean
}

/**
 * Fetch wrapper that automatically includes CSRF token
 * Use this for all authenticated API calls
 */
export async function apiFetch(url: string, options: FetchOptions = {}): Promise<Response> {
    const { skipCSRF = false, headers: customHeaders, ...restOptions } = options

    const headers: HeadersInit = {
        ...customHeaders,
    }

    // Add CSRF token for mutating methods
    const method = (options.method || 'GET').toUpperCase()
    if (!skipCSRF && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = getCSRFToken()
        if (csrfToken) {
            (headers as Record<string, string>)['x-csrf-token'] = csrfToken
        }
    }

    // Add content-type if body is present and headers don't specify
    if (options.body && typeof options.body === 'string') {
        if (!(headers as Record<string, string>)['Content-Type']) {
            (headers as Record<string, string>)['Content-Type'] = 'application/json'
        }
    }

    return fetch(url, {
        ...restOptions,
        headers,
        credentials: 'include',
    })
}

/**
 * Helper for JSON API calls
 */
export async function apiPost<T = unknown>(url: string, data: unknown): Promise<{ data: T | null; error: string | null; status: number }> {
    try {
        const response = await apiFetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            return {
                data: null,
                error: errorData.error || `Request failed with status ${response.status}`,
                status: response.status,
            }
        }

        const responseData = await response.json()
        return { data: responseData, error: null, status: response.status }
    } catch (error) {
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Network error',
            status: 0,
        }
    }
}

export async function apiPut<T = unknown>(url: string, data: unknown): Promise<{ data: T | null; error: string | null; status: number }> {
    try {
        const response = await apiFetch(url, {
            method: 'PUT',
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            return {
                data: null,
                error: errorData.error || `Request failed with status ${response.status}`,
                status: response.status,
            }
        }

        const responseData = await response.json()
        return { data: responseData, error: null, status: response.status }
    } catch (error) {
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Network error',
            status: 0,
        }
    }
}

export async function apiDelete(url: string): Promise<{ success: boolean; error: string | null; status: number }> {
    try {
        const response = await apiFetch(url, {
            method: 'DELETE',
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            return {
                success: false,
                error: errorData.error || `Request failed with status ${response.status}`,
                status: response.status,
            }
        }

        return { success: true, error: null, status: response.status }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
            status: 0,
        }
    }
}

export async function apiGet<T = unknown>(url: string): Promise<{ data: T | null; error: string | null; status: number }> {
    try {
        const response = await apiFetch(url, {
            method: 'GET',
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            return {
                data: null,
                error: errorData.error || `Request failed with status ${response.status}`,
                status: response.status,
            }
        }

        const responseData = await response.json()
        return { data: responseData, error: null, status: response.status }
    } catch (error) {
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Network error',
            status: 0,
        }
    }
}

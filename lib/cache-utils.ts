export const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export interface CacheEntry<T> {
    data: T
    timestamp: number
}

export const getCache = <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null
    try {
        const item = sessionStorage.getItem(key)
        if (!item) return null

        const { data, timestamp } = JSON.parse(item) as CacheEntry<T>
        if (Date.now() - timestamp > CACHE_TTL) {
            sessionStorage.removeItem(key)
            return null
        }

        return data
    } catch {
        return null
    }
}

export const setCache = <T>(key: string, data: T): void => {
    if (typeof window === 'undefined') return
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now()
        }
        sessionStorage.setItem(key, JSON.stringify(entry))
    } catch {
        // Ignore storage errors (quota exceeded, etc)
    }
}

export const clearCache = (pattern?: string): void => {
    if (typeof window === 'undefined') return
    try {
        if (!pattern) {
            sessionStorage.clear()
            return
        }

        const keysToRemove: string[] = []
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && key.includes(pattern)) {
                keysToRemove.push(key)
            }
        }

        keysToRemove.forEach(key => sessionStorage.removeItem(key))
    } catch {
        // Ignore errors
    }
}

export const generateCacheKey = (prefix: string, params: Record<string, any>): string => {
    const sortedParams = JSON.stringify(params, Object.keys(params).sort())
    return `${prefix}:${sortedParams}`
}

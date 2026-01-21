import redis from './redis'

export async function checkIdempotency(
    webhookId: string,
    ttlSeconds: number = 86400
): Promise<'PROCESS' | 'DUPLICATE'> {
    const key = `webhook:processed:${webhookId}`
    const result = await redis.set(key, '1', { nx: true, ex: ttlSeconds })
    return result ? 'PROCESS' : 'DUPLICATE'
}

export async function acquireLock(
    resource: string,
    id: string,
    ttlSeconds: number = 30
): Promise<boolean> {
    const key = `lock:${resource}:${id}`
    const workerId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const result = await redis.set(key, workerId, { nx: true, ex: ttlSeconds })
    return !!result
}

export async function releaseLock(
    resource: string,
    id: string
): Promise<void> {
    const key = `lock:${resource}:${id}`
    await redis.del(key)
}

export async function incrementRateLimit(
    namespace: string,
    identifier: string,
    limit: number,
    windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `ratelimit:${namespace}:${identifier}`
    const current = await redis.incr(key)

    if (current === 1) {
        await redis.expire(key, windowSeconds)
    }

    const ttl = await redis.ttl(key)

    return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetIn: ttl > 0 ? ttl : windowSeconds
    }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
    return redis.get<T>(`cache:${key}`)
}

export async function cacheSet<T>(
    key: string,
    value: T,
    ttlSeconds: number = 300
): Promise<void> {
    await redis.set(`cache:${key}`, value, { ex: ttlSeconds })
}

export async function cacheDelete(key: string): Promise<void> {
    await redis.del(`cache:${key}`)
}

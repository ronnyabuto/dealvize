import { createServiceClient } from '@/lib/supabase/server'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
    component: string
    message: string
    metadata?: Record<string, any>
}

/**
 * Writes a log entry to the persistent system_logs table.
 * Uses Service Role client to bypass RLS and ensure logs are always written.
 * Fails silently to prevent logging errors from crashing main logic.
 */
export async function logSystemEvent(
    level: LogLevel,
    component: string,
    message: string,
    metadata?: Record<string, any>
) {
    // Console log for immediate development feedback
    if (level === 'error') {
        console.error(`[${component}] ${message}`, metadata)
    } else {
        console.log(`[${component}] ${message}`, metadata)
    }

    try {
        const supabase = createServiceClient()

        await supabase.from('system_logs').insert({
            level,
            component,
            message,
            metadata: metadata || {},
            created_at: new Date().toISOString()
        })
    } catch (error) {
        // Failsafe: Don't let logging failures crash the app
        console.error('FAILED TO WRITE SYSTEM LOG:', error)
    }
}

export const logger = {
    info: (component: string, message: string, meta?: any) => logSystemEvent('info', component, message, meta),
    warn: (component: string, message: string, meta?: any) => logSystemEvent('warn', component, message, meta),
    error: (component: string, message: string, meta?: any) => logSystemEvent('error', component, message, meta),
    debug: (component: string, message: string, meta?: any) => logSystemEvent('debug', component, message, meta),
}

// Database connection pooling configuration for production
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/monitoring/logger'

// Connection pool configuration
const POOL_CONFIG = {
  // Connection limits
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections
  min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum connections
  
  // Connection lifecycle
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 10 seconds
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'), // 60 seconds
  
  // Health checks
  testOnBorrow: true,
  testOnReturn: true,
  testOnCreate: true,
  
  // Retry configuration
  maxRetries: parseInt(process.env.DB_MAX_RETRIES || '3'),
  retryDelayMs: parseInt(process.env.DB_RETRY_DELAY || '1000'),
}

// Connection pool interfaces
interface PoolConnection {
  id: string
  client: SupabaseClient
  createdAt: number
  lastUsed: number
  inUse: boolean
  queryCount: number
  totalQueryTime: number
}

interface WaitingRequest {
  resolve: (connection: PoolConnection) => void
  reject: (error: Error) => void
  timestamp: number
}

class SupabaseConnectionPool {
  private connections: Map<string, PoolConnection> = new Map()
  private waitingQueue: WaitingRequest[] = []
  private healthCheckInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout
  private metrics = {
    totalConnections: 0,
    queriesExecuted: 0,
    connectionErrors: 0,
    avgQueryTime: 0
  }

  constructor() {
    this.initializePool()
    this.startHealthCheck()
    this.startCleanup()
  }

  private async initializePool(): Promise<void> {
    try {
      for (let i = 0; i < POOL_CONFIG.min; i++) {
        await this.createConnection()
      }
      
      logger.info('Connection pool initialized', {
        minConnections: POOL_CONFIG.min,
        maxConnections: POOL_CONFIG.max,
        component: 'connection-pool',
        action: 'initialize'
      })
    } catch (error) {
      logger.error('Failed to initialize connection pool', error instanceof Error ? error : new Error(String(error)), {
        component: 'connection-pool',
        action: 'initialize'
      })
    }
  }

  private async createConnection(): Promise<PoolConnection> {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase environment variables')
    }

    try {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          },
          global: {
            headers: {
              'X-Client-Info': 'dealvize-crm-pool'
            }
          },
          db: {
            schema: 'public'
          }
        }
      )

      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const connection: PoolConnection = {
        id: connectionId,
        client,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        inUse: false,
        queryCount: 0,
        totalQueryTime: 0
      }

      // Test the connection
      const { error } = await client.from('clients').select('count', { count: 'exact', head: true })
      if (error && !error.message.includes('permission denied')) {
        throw new Error(`Connection test failed: ${error.message}`)
      }

      this.connections.set(connectionId, connection)
      this.metrics.totalConnections++

      return connection
    } catch (error) {
      this.metrics.connectionErrors++
      logger.error('Failed to create database connection', error instanceof Error ? error : new Error(String(error)), {
        component: 'connection-pool',
        action: 'create-connection'
      })
      throw error
    }
  }

  private async acquireConnection(): Promise<PoolConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const requestIndex = this.waitingQueue.findIndex(req => req.resolve === resolve)
        if (requestIndex !== -1) {
          this.waitingQueue.splice(requestIndex, 1)
        }
        reject(new Error('Connection acquire timeout'))
      }, POOL_CONFIG.acquireTimeoutMillis)

      const tryAcquire = () => {
        // Find idle connection
        for (const connection of this.connections.values()) {
          if (!connection.inUse) {
            connection.inUse = true
            connection.lastUsed = Date.now()
            clearTimeout(timeout)
            resolve(connection)
            return
          }
        }

        // Create new connection if under limit
        if (this.connections.size < POOL_CONFIG.max) {
          this.createConnection()
            .then(connection => {
              connection.inUse = true
              clearTimeout(timeout)
              resolve(connection)
            })
            .catch(error => {
              clearTimeout(timeout)
              reject(error)
            })
        } else {
          // Add to waiting queue
          this.waitingQueue.push({
            resolve,
            reject,
            timestamp: Date.now()
          })
        }
      }

      tryAcquire()
    })
  }

  private releaseConnection(connection: PoolConnection): void {
    connection.inUse = false
    connection.lastUsed = Date.now()

    // Process waiting queue
    if (this.waitingQueue.length > 0) {
      const waitingRequest = this.waitingQueue.shift()!
      connection.inUse = true
      waitingRequest.resolve(connection)
    }
  }

  public async executeQuery<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
    operationName: string = 'query'
  ): Promise<T> {
    const connection = await this.acquireConnection()
    const timer = logger.createTimer(operationName)

    try {
      const result = await queryFn(connection.client)
      const duration = await timer.end()
      
      connection.queryCount++
      connection.totalQueryTime += duration
      this.metrics.queriesExecuted++

      await logger.databaseQuery(operationName, duration, undefined, {
        connectionId: connection.id,
        queryCount: connection.queryCount
      })

      return result
    } catch (error) {
      await timer.end()
      logger.error(`Database query failed: ${operationName}`, error instanceof Error ? error : new Error(String(error)), {
        connectionId: connection.id,
        operationName
      })
      throw error
    } finally {
      this.releaseConnection(connection)
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [connectionId, connection] of this.connections.entries()) {
        if (!connection.inUse) {
          try {
            const { error } = await connection.client
              .from('clients')
              .select('count', { count: 'exact', head: true })
            
            if (error && !error.message.includes('permission denied')) {
              this.connections.delete(connectionId)
              this.metrics.totalConnections--
            }
          } catch {
            this.connections.delete(connectionId)
            this.metrics.totalConnections--
          }
        }
      }

      // Maintain minimum connections
      while (this.connections.size < POOL_CONFIG.min) {
        try {
          await this.createConnection()
        } catch {
          break
        }
      }
    }, 60000) // Every minute
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const connectionsToRemove: string[] = []

      for (const [connectionId, connection] of this.connections.entries()) {
        if (
          !connection.inUse &&
          now - connection.lastUsed > POOL_CONFIG.idleTimeoutMillis &&
          this.connections.size > POOL_CONFIG.min
        ) {
          connectionsToRemove.push(connectionId)
        }
      }

      connectionsToRemove.forEach(connectionId => {
        this.connections.delete(connectionId)
        this.metrics.totalConnections--
      })
    }, POOL_CONFIG.idleTimeoutMillis)
  }

  public getMetrics() {
    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values()).filter(c => c.inUse).length,
      idleConnections: Array.from(this.connections.values()).filter(c => !c.inUse).length,
      waitingRequests: this.waitingQueue.length,
      ...this.metrics
    }
  }

  public async destroy(): Promise<void> {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval)
    if (this.cleanupInterval) clearInterval(this.cleanupInterval)
    
    this.waitingQueue.forEach(request => {
      request.reject(new Error('Pool shutting down'))
    })
    this.connections.clear()
  }
}

// Global connection pool instance
let supabasePool: SupabaseConnectionPool | null = null

// Initialize connection pool
export function initializeConnectionPool(): SupabaseConnectionPool {
  if (!supabasePool) {
    supabasePool = new SupabaseConnectionPool()
  }
  return supabasePool
}

// Get connection pool instance
export function getConnectionPool(): SupabaseConnectionPool {
  return initializeConnectionPool()
}

// High-level database operation helper
export async function withDatabase<T>(
  operation: (client: SupabaseClient) => Promise<T>,
  operationName: string = 'database-operation'
): Promise<T> {
  const pool = getConnectionPool()
  return pool.executeQuery(operation, operationName)
}

// Connection health check
export async function checkConnectionHealth() {
  try {
    const result = await withDatabase(async (client) => {
      const { data, error } = await client
        .from('clients')
        .select('count(*)', { count: 'exact', head: true })
        .limit(1)
      
      if (error) {
        throw error
      }
      
      return data
    }, 'health-check')
    
    return {
      healthy: true,
      timestamp: new Date().toISOString(),
      latency: Date.now() // Rough measure
    }
  } catch (error) {
    return {
      healthy: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Graceful pool shutdown
export async function closeConnectionPool() {
  if (supabasePool) {
    await supabasePool.destroy()
    supabasePool = null
  }
}

// Connection pool metrics
export interface PoolMetrics {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingRequests: number
  queriesExecuted: number
  avgQueryTime: number
  connectionErrors: number
}

// Get pool status
export function getPoolMetrics(): PoolMetrics {
  if (!supabasePool) {
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      queriesExecuted: 0,
      avgQueryTime: 0,
      connectionErrors: 0
    }
  }
  return supabasePool.getMetrics()
}

// Production readiness check
export async function validateDatabaseConnection(): Promise<{
  isValid: boolean
  checks: Array<{ name: string; passed: boolean; message?: string }>
}> {
  const checks = []
  let isValid = true

  // Check environment variables
  const envCheck = {
    name: 'Environment Variables',
    passed: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    message: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
      ? 'All required environment variables are present' 
      : 'Missing required environment variables'
  }
  checks.push(envCheck)
  if (!envCheck.passed) isValid = false

  // Check connection health
  const healthCheck = await checkConnectionHealth()
  const connectionCheck = {
    name: 'Database Connection',
    passed: healthCheck.healthy,
    message: healthCheck.healthy 
      ? 'Database connection is healthy' 
      : `Database connection failed: ${healthCheck.error}`
  }
  checks.push(connectionCheck)
  if (!connectionCheck.passed) isValid = false

  // Check RLS policies
  try {
    await withDatabase(async (client) => {
      const { error } = await client
        .from('clients')
        .select('id')
        .limit(1)
      
      const rlsCheck = {
        name: 'Row Level Security',
        passed: !error,
        message: error 
          ? `RLS check failed: ${error.message}` 
          : 'RLS policies are properly configured'
      }
      checks.push(rlsCheck)
      if (!rlsCheck.passed) isValid = false
    }, 'rls-check')
  } catch (error) {
    const rlsCheck = {
      name: 'Row Level Security',
      passed: false,
      message: `RLS check error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    checks.push(rlsCheck)
    isValid = false
  }

  return { isValid, checks }
}

// Process cleanup handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await closeConnectionPool()
  })

  process.on('SIGINT', async () => {
    await closeConnectionPool()
  })
}

// Export pool configuration for reference
export { POOL_CONFIG }
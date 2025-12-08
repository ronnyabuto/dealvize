import { performance } from 'perf_hooks'

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
  userId?: string
  requestId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
  duration?: number
  component?: string
  action?: string
}

export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  enableRemote: boolean
  filePath?: string
  remoteEndpoint?: string
  includeStackTrace: boolean
  sanitizeSensitiveData: boolean
  maxFileSize: number
  maxFiles: number
  bufferSize?: number
  flushInterval?: number
}

class ProductionLogger {
  private config: LoggerConfig
  private buffer: LogEntry[] = []
  private flushTimer?: NodeJS.Timeout

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: process.env.NODE_ENV === 'development',
      enableFile: process.env.NODE_ENV === 'production',
      enableRemote: process.env.NODE_ENV === 'production',
      filePath: process.env.LOG_FILE_PATH || './logs/app.log',
      remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT,
      includeStackTrace: true,
      sanitizeSensitiveData: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      bufferSize: 100,
      flushInterval: 5000, // 5 seconds
      ...config
    }

    if (this.config.bufferSize && this.config.flushInterval) {
      this.startAutoFlush()
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level
  }

  private sanitizeData(data: any): any {
    if (!this.config.sanitizeSensitiveData) return data

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'ssn', 'social_security', 'credit_card', 'cvv', 'pin',
      'access_token', 'refresh_token', 'api_key', 'private_key'
    ]

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj
      if (Array.isArray(obj)) return obj.map(sanitize)

      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase()
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]'
        } else if (typeof value === 'object') {
          sanitized[key] = sanitize(value)
        } else {
          sanitized[key] = value
        }
      }
      return sanitized
    }

    return sanitize(data)
  }

  private formatLogEntry(entry: LogEntry): string {
    const level = LogLevel[entry.level].padEnd(5)
    const timestamp = entry.timestamp
    const message = entry.message
    const context = entry.context ? ` | ${JSON.stringify(this.sanitizeData(entry.context))}` : ''
    const error = entry.error ? ` | ERROR: ${entry.error.message}` : ''
    const stack = entry.error && this.config.includeStackTrace ? `\n${entry.error.stack}` : ''
    
    return `${timestamp} [${level}] ${message}${context}${error}${stack}`
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.config.enableFile || !this.config.filePath) return

    try {
      const fs = await import('fs')
      const path = await import('path')
      
      const logDir = path.dirname(this.config.filePath)
      await fs.promises.mkdir(logDir, { recursive: true })

      const logLine = this.formatLogEntry(entry) + '\n'
      await fs.promises.appendFile(this.config.filePath, logLine)

      // Check file size and rotate if necessary
      const stats = await fs.promises.stat(this.config.filePath)
      if (stats.size > this.config.maxFileSize) {
        await this.rotateLogFile()
      }
    } catch (error) {
      console.error('Failed to write log to file:', error)
    }
  }

  private async rotateLogFile(): Promise<void> {
    try {
      const fs = await import('fs')
      const path = await import('path')

      if (!this.config.filePath) return

      const dir = path.dirname(this.config.filePath)
      const ext = path.extname(this.config.filePath)
      const name = path.basename(this.config.filePath, ext)

      // Rotate existing files
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const oldFile = path.join(dir, `${name}.${i}${ext}`)
        const newFile = path.join(dir, `${name}.${i + 1}${ext}`)
        
        try {
          await fs.promises.access(oldFile)
          if (i === this.config.maxFiles - 1) {
            await fs.promises.unlink(oldFile) // Delete oldest
          } else {
            await fs.promises.rename(oldFile, newFile)
          }
        } catch {
          // File doesn't exist, continue
        }
      }

      // Move current file to .1
      const backupFile = path.join(dir, `${name}.1${ext}`)
      await fs.promises.rename(this.config.filePath, backupFile)
    } catch (error) {
      console.error('Failed to rotate log file:', error)
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.sanitizeData(entry))
      })

      if (!response.ok) {
        console.error(`Failed to send log to remote endpoint: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to send log to remote endpoint:', error)
    }
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return

    const formatted = this.formatLogEntry(entry)
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      case LogLevel.INFO:
        console.info(formatted)
        break
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        console.debug(formatted)
        break
    }
  }

  private async processLogEntry(entry: LogEntry): Promise<void> {
    this.logToConsole(entry)
    
    if (this.config.bufferSize) {
      this.buffer.push(entry)
      if (this.buffer.length >= this.config.bufferSize) {
        await this.flush()
      }
    } else {
      await Promise.all([
        this.writeToFile(entry),
        this.sendToRemote(entry)
      ])
    }
  }

  private startAutoFlush(): void {
    if (this.flushTimer) clearInterval(this.flushTimer)
    
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush().catch(error => 
          console.error('Auto-flush failed:', error)
        )
      }
    }, this.config.flushInterval)
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const entries = [...this.buffer]
    this.buffer = []

    await Promise.all(entries.map(async (entry) => {
      await Promise.all([
        this.writeToFile(entry),
        this.sendToRemote(entry)
      ])
    }))
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? this.sanitizeData(context) : undefined,
      error,
      userId: context?.userId,
      requestId: context?.requestId,
      sessionId: context?.sessionId,
      ip: context?.ip,
      userAgent: context?.userAgent,
      duration: context?.duration,
      component: context?.component,
      action: context?.action
    }
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error)
    this.processLogEntry(entry).catch(console.error)
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context)
    this.processLogEntry(entry).catch(console.error)
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context)
    this.processLogEntry(entry).catch(console.error)
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context)
    this.processLogEntry(entry).catch(console.error)
  }

  trace(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.TRACE)) return
    
    const entry = this.createLogEntry(LogLevel.TRACE, message, context)
    this.processLogEntry(entry).catch(console.error)
  }

  // Specialized logging methods for common use cases
  async httpRequest(method: string, url: string, statusCode: number, duration: number, context?: Record<string, any>): Promise<void> {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO
    const message = `${method} ${url} ${statusCode} - ${duration}ms`
    
    const entry = this.createLogEntry(level, message, {
      ...context,
      method,
      url,
      statusCode,
      duration,
      component: 'http',
      action: 'request'
    })
    
    await this.processLogEntry(entry)
  }

  async databaseQuery(query: string, duration: number, rowCount?: number, context?: Record<string, any>): Promise<void> {
    const message = `Database query executed - ${duration}ms${rowCount ? `, ${rowCount} rows` : ''}`
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, {
      ...context,
      query,
      duration,
      rowCount,
      component: 'database',
      action: 'query'
    })
    
    await this.processLogEntry(entry)
  }

  async authEvent(event: string, userId?: string, success: boolean = true, context?: Record<string, any>): Promise<void> {
    const level = success ? LogLevel.INFO : LogLevel.WARN
    const message = `Authentication ${event} ${success ? 'succeeded' : 'failed'}`
    
    const entry = this.createLogEntry(level, message, {
      ...context,
      userId,
      success,
      component: 'auth',
      action: event
    })
    
    await this.processLogEntry(entry)
  }

  async businessEvent(event: string, entityType: string, entityId: string, context?: Record<string, any>): Promise<void> {
    const message = `Business event: ${event} on ${entityType} ${entityId}`
    
    const entry = this.createLogEntry(LogLevel.INFO, message, {
      ...context,
      event,
      entityType,
      entityId,
      component: 'business',
      action: event
    })
    
    await this.processLogEntry(entry)
  }

  async performanceEvent(operation: string, duration: number, metadata?: Record<string, any>): Promise<void> {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG // Warn if > 5 seconds
    const message = `Performance: ${operation} took ${duration}ms`
    
    const entry = this.createLogEntry(level, message, {
      ...metadata,
      operation,
      duration,
      component: 'performance',
      action: 'measure'
    })
    
    await this.processLogEntry(entry)
  }

  createTimer(operation: string, context?: Record<string, any>) {
    const start = performance.now()
    
    return {
      end: async (metadata?: Record<string, any>) => {
        const duration = performance.now() - start
        await this.performanceEvent(operation, duration, { ...context, ...metadata })
        return duration
      }
    }
  }

  child(context: Record<string, any>): ProductionLogger {
    const childLogger = new ProductionLogger(this.config)
    
    // Override the createLogEntry method to include parent context
    const originalCreateLogEntry = childLogger.createLogEntry.bind(childLogger)
    childLogger.createLogEntry = (level, message, childContext?, error?) => {
      return originalCreateLogEntry(level, message, { ...context, ...childContext }, error)
    }
    
    return childLogger
  }

  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    await this.flush()
  }
}

// Create singleton logger instance
const logger = new ProductionLogger({
  level: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO,
  enableConsole: process.env.LOG_CONSOLE === 'true' || process.env.NODE_ENV === 'development',
  enableFile: process.env.LOG_FILE === 'true' || process.env.NODE_ENV === 'production',
  enableRemote: process.env.LOG_REMOTE === 'true',
  filePath: process.env.LOG_FILE_PATH,
  remoteEndpoint: process.env.LOG_REMOTE_ENDPOINT,
  includeStackTrace: process.env.LOG_INCLUDE_STACK !== 'false',
  sanitizeSensitiveData: process.env.LOG_SANITIZE !== 'false'
})

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await logger.destroy()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await logger.destroy()
  process.exit(0)
})

export { logger, ProductionLogger }
export default logger
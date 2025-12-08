/**
 * MLS Sync and Caching Service
 * Columbus MLS Integration - Data Synchronization
 */

import { MLSClient } from './client'
import { 
  MLSProperty, 
  MLSSearchCriteria, 
  StandardStatus,
  MLSIntegrationStatus 
} from './types'
import { validateMLSProperty } from './validators'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

interface SyncJob {
  id: string
  type: 'full' | 'incremental' | 'property' | 'search'
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  lastModified?: Date
  criteria?: MLSSearchCriteria
  propertyIds?: string[]
  error?: string
  recordsProcessed: number
  recordsUpdated: number
  recordsAdded: number
}

export class MLSSyncService {
  private client: MLSClient
  private cache: Map<string, CacheEntry<any>> = new Map()
  private syncQueue: SyncJob[] = []
  private isRunning = false
  private syncInterval?: NodeJS.Timeout

  constructor(client: MLSClient) {
    this.client = client
    this.startBackgroundSync()
  }

  /**
   * Start background synchronization
   */
  private startBackgroundSync() {
    // Run sync every 15 minutes
    this.syncInterval = setInterval(async () => {
      await this.processIncrementalSync()
    }, 15 * 60 * 1000)
  }

  /**
   * Stop background synchronization
   */
  stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
    }
  }

  /**
   * Get cached data or fetch from MLS
   */
  async getCachedData<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = 300000 // 5 minutes default
  ): Promise<T> {
    const cached = this.cache.get(key)
    
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data as T
    }

    try {
      const data = await fetchFunction()
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
        key
      })
      return data
    } catch (error) {
      // Return cached data even if expired if fresh fetch fails
      if (cached) {
        console.warn(`Fresh fetch failed for ${key}, returning stale cache`)
        return cached.data as T
      }
      throw error
    }
  }

  /**
   * Cache property data with intelligent TTL
   */
  async cacheProperty(property: MLSProperty): Promise<void> {
    const key = `property:${property.listingId}`
    let ttl = 300000 // 5 minutes default

    // Adjust TTL based on property status
    switch (property.standardStatus) {
      case StandardStatus.ACTIVE:
        ttl = 300000 // 5 minutes - active properties change frequently
        break
      case StandardStatus.PENDING:
        ttl = 900000 // 15 minutes - pending properties change less
        break
      case StandardStatus.CLOSED:
      case StandardStatus.EXPIRED:
      case StandardStatus.WITHDRAWN:
        ttl = 86400000 // 24 hours - inactive properties rarely change
        break
      default:
        ttl = 600000 // 10 minutes default
    }

    this.cache.set(key, {
      data: property,
      timestamp: Date.now(),
      ttl,
      key
    })
  }

  /**
   * Get cached property
   */
  getCachedProperty(listingId: string): MLSProperty | null {
    return this.getCachedData(
      `property:${listingId}`,
      () => this.client.getPropertyDetails(listingId),
      300000
    ).catch(() => null)
  }

  /**
   * Schedule full MLS sync
   */
  async scheduleFullSync(criteria?: MLSSearchCriteria): Promise<string> {
    const job: SyncJob = {
      id: `full_${Date.now()}`,
      type: 'full',
      status: 'pending',
      criteria,
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsAdded: 0
    }

    this.syncQueue.push(job)
    
    if (!this.isRunning) {
      this.processQueue()
    }

    return job.id
  }

  /**
   * Schedule incremental sync (changes only)
   */
  async scheduleIncrementalSync(since?: Date): Promise<string> {
    const job: SyncJob = {
      id: `incremental_${Date.now()}`,
      type: 'incremental',
      status: 'pending',
      lastModified: since || new Date(Date.now() - 3600000), // Last hour
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsAdded: 0
    }

    this.syncQueue.push(job)
    
    if (!this.isRunning) {
      this.processQueue()
    }

    return job.id
  }

  /**
   * Schedule specific property sync
   */
  async schedulePropertySync(propertyIds: string[]): Promise<string> {
    const job: SyncJob = {
      id: `property_${Date.now()}`,
      type: 'property',
      status: 'pending',
      propertyIds,
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsAdded: 0
    }

    this.syncQueue.push(job)
    
    if (!this.isRunning) {
      this.processQueue()
    }

    return job.id
  }

  /**
   * Process sync queue
   */
  private async processQueue() {
    if (this.isRunning || this.syncQueue.length === 0) {
      return
    }

    this.isRunning = true

    try {
      while (this.syncQueue.length > 0) {
        const job = this.syncQueue.shift()!
        await this.processJob(job)
      }
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Process individual sync job
   */
  private async processJob(job: SyncJob) {
    job.status = 'running'
    job.startTime = new Date()

    try {
      switch (job.type) {
        case 'full':
          await this.processFullSync(job)
          break
        case 'incremental':
          await this.processIncrementalSync(job)
          break
        case 'property':
          await this.processPropertySync(job)
          break
        case 'search':
          await this.processSearchSync(job)
          break
      }

      job.status = 'completed'
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Sync job ${job.id} failed:`, error)
    } finally {
      job.endTime = new Date()
    }
  }

  /**
   * Process full MLS sync
   */
  private async processFullSync(job: SyncJob) {
    const batchSize = 100
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const criteria: MLSSearchCriteria = {
        ...job.criteria,
        limit: batchSize,
        offset,
        sortBy: 'ModificationTimestamp' as any,
        sortOrder: 'desc'
      }

      const result = await this.client.searchProperties(criteria)
      
      for (const property of result.properties) {
        await this.processPropertyUpdate(property, job)
      }

      hasMore = result.hasMore
      offset = result.nextOffset || (offset + batchSize)
      job.recordsProcessed += result.properties.length

      // Rate limiting pause
      await this.sleep(1000)
    }
  }

  /**
   * Process incremental sync (recent changes only)
   */
  private async processIncrementalSync(job?: SyncJob) {
    const defaultJob: SyncJob = {
      id: `auto_incremental_${Date.now()}`,
      type: 'incremental',
      status: 'running',
      lastModified: new Date(Date.now() - 900000), // Last 15 minutes
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsAdded: 0
    }

    const syncJob = job || defaultJob

    try {
      const criteria: MLSSearchCriteria = {
        modifiedSince: syncJob.lastModified,
        limit: 500,
        sortBy: 'ModificationTimestamp' as any,
        sortOrder: 'desc'
      }

      const result = await this.client.searchProperties(criteria)
      
      for (const property of result.properties) {
        await this.processPropertyUpdate(property, syncJob)
      }

      syncJob.recordsProcessed = result.properties.length
      
      if (!job) {
        console.log(`Incremental sync completed: ${syncJob.recordsProcessed} properties processed`)
      }

    } catch (error) {
      console.error('Incremental sync failed:', error)
      if (!job) {
        throw error
      }
    }
  }

  /**
   * Process specific property sync
   */
  private async processPropertySync(job: SyncJob) {
    if (!job.propertyIds) return

    for (const propertyId of job.propertyIds) {
      try {
        const property = await this.client.getPropertyDetails(propertyId)
        if (property) {
          await this.processPropertyUpdate(property, job)
        }
      } catch (error) {
        console.error(`Failed to sync property ${propertyId}:`, error)
      }
    }
  }

  /**
   * Process search result sync
   */
  private async processSearchSync(job: SyncJob) {
    if (!job.criteria) return

    const result = await this.client.searchProperties(job.criteria)
    
    for (const property of result.properties) {
      await this.processPropertyUpdate(property, job)
    }

    job.recordsProcessed = result.properties.length
  }

  /**
   * Process individual property update
   */
  private async processPropertyUpdate(property: MLSProperty, job: SyncJob) {
    try {
      // Validate property data
      const validatedProperty = validateMLSProperty(property)
      
      // Check if property exists in cache
      const existingProperty = this.cache.get(`property:${property.listingId}`)
      const isNewProperty = !existingProperty

      // Cache the property
      await this.cacheProperty(validatedProperty)

      // Update counters
      if (isNewProperty) {
        job.recordsAdded++
      } else {
        job.recordsUpdated++
      }

      // Store in local database if needed
      await this.storePropertyInDatabase(validatedProperty, isNewProperty)

    } catch (error) {
      console.error(`Failed to process property ${property.listingId}:`, error)
    }
  }

  /**
   * Store property in local database
   */
  private async storePropertyInDatabase(property: MLSProperty, isNew: boolean) {
    // In production, this would save to your database
    // For now, just log the operation
    const operation = isNew ? 'INSERT' : 'UPDATE'
    console.log(`${operation} property ${property.listingId} in local database`)
  }

  /**
   * Get sync status
   */
  getSyncStatus(): MLSIntegrationStatus {
    const runningJobs = this.syncQueue.filter(j => j.status === 'running')
    const recentJobs = this.syncQueue.filter(j => 
      j.endTime && (Date.now() - j.endTime.getTime()) < 3600000 // Last hour
    )

    const hasErrors = recentJobs.some(j => j.status === 'failed')
    const isHealthy = !hasErrors && runningJobs.length < 3

    return {
      isConnected: true,
      lastSync: recentJobs.length > 0 ? recentJobs[0].endTime : undefined,
      apiStatus: isHealthy ? 'healthy' : hasErrors ? 'degraded' : 'healthy',
      authStatus: 'valid', // Would check actual auth status
      rateLimitStatus: {
        remainingRequests: 1000, // Would get from client
        resetTime: new Date(Date.now() + 3600000) // 1 hour from now
      },
      errors: recentJobs
        .filter(j => j.status === 'failed')
        .map(j => j.error || 'Unknown error')
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now()
    const entries = Array.from(this.cache.values())
    
    return {
      totalEntries: entries.length,
      freshEntries: entries.filter(e => (now - e.timestamp) < e.ttl).length,
      staleEntries: entries.filter(e => (now - e.timestamp) >= e.ttl).length,
      cacheHitRate: this.calculateCacheHitRate(),
      memoryUsage: this.estimateMemoryUsage(entries)
    }
  }

  /**
   * Clear cache entries
   */
  clearCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear()
      return
    }

    const regex = new RegExp(pattern)
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupCache() {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.cache) {
      if ((now - entry.timestamp) >= entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    console.log(`Cleaned up ${removedCount} expired cache entries`)
    return removedCount
  }

  private calculateCacheHitRate(): number {
    // This would track actual hit/miss ratios in production
    return 0.85 // 85% hit rate example
  }

  private estimateMemoryUsage(entries: CacheEntry<any>[]): string {
    const bytesPerEntry = 1024 // Rough estimate
    const totalBytes = entries.length * bytesPerEntry
    
    if (totalBytes < 1024 * 1024) {
      return `${Math.round(totalBytes / 1024)} KB`
    }
    return `${Math.round(totalBytes / (1024 * 1024))} MB`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get sync job status
   */
  getJobStatus(jobId: string): SyncJob | undefined {
    return this.syncQueue.find(j => j.id === jobId)
  }

  /**
   * Get recent sync jobs
   */
  getRecentJobs(limit: number = 10): SyncJob[] {
    return [...this.syncQueue]
      .sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0))
      .slice(0, limit)
  }

  /**
   * Force immediate cache refresh for property
   */
  async refreshProperty(listingId: string): Promise<MLSProperty | null> {
    try {
      const property = await this.client.getPropertyDetails(listingId)
      if (property) {
        await this.cacheProperty(property)
        return property
      }
      return null
    } catch (error) {
      console.error(`Failed to refresh property ${listingId}:`, error)
      return null
    }
  }
}
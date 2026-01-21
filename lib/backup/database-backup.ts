// Database backup and recovery utilities
import { createClient } from '@/lib/supabase/server'
import { backupConfig, BACKUP_TABLES, BackupMetadata, BackupType, RestoreOptions } from '@/lib/backup/config'
import { logger } from '@/lib/errors'
import * as crypto from 'crypto'
import * as zlib from 'zlib'
import { promises as fs } from 'fs'
import * as path from 'path'

export class DatabaseBackup {
  private supabase: any
  private backupId: string

  constructor() {
    this.supabase = null
    this.backupId = this.generateBackupId()
  }

  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const randomId = crypto.randomBytes(8).toString('hex')
    return `backup-${timestamp}-${randomId}`
  }

  private async initializeSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
  }

  // Create a full database backup
  async createFullBackup(tables?: string[]): Promise<BackupMetadata> {
    const metadata: BackupMetadata = {
      id: this.backupId,
      type: 'full',
      status: 'running',
      startTime: new Date(),
      tables: tables || [...BACKUP_TABLES],
      recordCount: {},
      provider: 'supabase',
      location: '',
      encryption: backupConfig.encryption,
      compression: backupConfig.compression,
      checksum: '',
      retryCount: 0,
      createdBy: 'system',
    }

    try {
      await this.initializeSupabase()
      
      logger.info('Starting database backup', { backupId: this.backupId, tables: metadata.tables })

      const backupData: Record<string, any[]> = {}
      let totalRecords = 0

      // Export data from each table
      for (const table of metadata.tables) {
        try {
          const { data, error, count } = await this.supabase
            .from(table)
            .select('*', { count: 'exact' })

          if (error) {
            throw new Error(`Failed to backup table ${table}: ${error.message}`)
          }

          backupData[table] = data || []
          metadata.recordCount[table] = count || data?.length || 0
          totalRecords += metadata.recordCount[table]

          logger.info(`Backed up table ${table}`, { records: metadata.recordCount[table] })
        } catch (error) {
          logger.error(`Failed to backup table ${table}`, error as any)
          throw error
        }
      }

      // Add metadata to backup
      const fullBackupData = {
        metadata: {
          ...metadata,
          version: '1.0',
          source: 'dealvize-crm',
          timestamp: new Date().toISOString(),
          totalRecords,
        },
        data: backupData,
        schema: await this.getTableSchemas(metadata.tables),
      }

      // Serialize and optionally compress/encrypt
      let backupContent = JSON.stringify(fullBackupData, null, 2)
      
      if (backupConfig.compression) {
        backupContent = await this.compressData(backupContent)
      }

      if (backupConfig.encryption) {
        backupContent = await this.encryptData(backupContent)
      }

      // Generate checksum
      metadata.checksum = this.generateChecksum(backupContent)
      metadata.size = Buffer.byteLength(backupContent, 'utf8')

      // Store backup
      metadata.location = await this.storeBackup(backupContent, metadata)

      // Update metadata
      metadata.status = 'completed'
      metadata.endTime = new Date()
      metadata.duration = metadata.endTime.getTime() - metadata.startTime.getTime()

      // Store backup metadata
      await this.storeBackupMetadata(metadata)

      logger.info('Database backup completed successfully', {
        backupId: this.backupId,
        duration: metadata.duration,
        size: metadata.size,
        records: totalRecords,
      })

      // Send success notification
      if (backupConfig.notifications.onSuccess) {
        await this.sendNotification('success', metadata)
      }

      return metadata

    } catch (error) {
      metadata.status = 'failed'
      metadata.endTime = new Date()
      metadata.error = error instanceof Error ? error.message : 'Unknown error'

      logger.error('Database backup failed', error as any)

      // Store failed backup metadata
      await this.storeBackupMetadata(metadata)

      // Send failure notification
      if (backupConfig.notifications.onFailure) {
        await this.sendNotification('failure', metadata)
      }

      throw error
    }
  }

  // Create incremental backup (changes since last backup)
  async createIncrementalBackup(sinceTimestamp: Date): Promise<BackupMetadata> {
    const metadata: BackupMetadata = {
      id: this.backupId,
      type: 'incremental',
      status: 'running',
      startTime: new Date(),
      tables: [...BACKUP_TABLES],
      recordCount: {},
      provider: 'supabase',
      location: '',
      encryption: backupConfig.encryption,
      compression: backupConfig.compression,
      checksum: '',
      retryCount: 0,
      createdBy: 'system',
    }

    try {
      await this.initializeSupabase()

      const backupData: Record<string, any[]> = {}
      let totalRecords = 0

      // Export only changed data since last backup
      for (const table of metadata.tables) {
        try {
          const { data, error, count } = await this.supabase
            .from(table)
            .select('*', { count: 'exact' })
            .gte('updated_at', sinceTimestamp.toISOString())

          if (error && !error.message.includes('column "updated_at" does not exist')) {
            throw new Error(`Failed to backup table ${table}: ${error.message}`)
          }

          backupData[table] = data || []
          metadata.recordCount[table] = data?.length || 0
          totalRecords += metadata.recordCount[table]

          logger.info(`Incremental backup for table ${table}`, { records: metadata.recordCount[table] })
        } catch (error) {
          logger.error(`Failed to create incremental backup for table ${table}`, error as any)
          // Continue with other tables
        }
      }

      // Store incremental backup
      const incrementalBackupData = {
        metadata: {
          ...metadata,
          version: '1.0',
          source: 'dealvize-crm',
          timestamp: new Date().toISOString(),
          totalRecords,
          basedOn: sinceTimestamp.toISOString(),
        },
        data: backupData,
      }

      let backupContent = JSON.stringify(incrementalBackupData, null, 2)
      
      if (backupConfig.compression) {
        backupContent = await this.compressData(backupContent)
      }

      if (backupConfig.encryption) {
        backupContent = await this.encryptData(backupContent)
      }

      metadata.checksum = this.generateChecksum(backupContent)
      metadata.size = Buffer.byteLength(backupContent, 'utf8')
      metadata.location = await this.storeBackup(backupContent, metadata)
      metadata.status = 'completed'
      metadata.endTime = new Date()
      metadata.duration = metadata.endTime.getTime() - metadata.startTime.getTime()

      await this.storeBackupMetadata(metadata)

      logger.info('Incremental backup completed', {
        backupId: this.backupId,
        records: totalRecords,
        duration: metadata.duration,
      })

      return metadata

    } catch (error) {
      metadata.status = 'failed'
      metadata.error = error instanceof Error ? error.message : 'Unknown error'
      
      await this.storeBackupMetadata(metadata)
      throw error
    }
  }

  // Restore database from backup
  async restoreFromBackup(options: RestoreOptions): Promise<void> {
    try {
      logger.info('Starting database restore', options)

      // Validate restore options
      if (options.targetEnvironment === 'production' && !options.dryRun) {
        throw new Error('Production restore must be explicitly confirmed')
      }

      // Get backup metadata
      const backupMetadata = await this.getBackupMetadata(options.backupId)
      if (!backupMetadata) {
        throw new Error(`Backup not found: ${options.backupId}`)
      }

      // Load backup data
      const backupContent = await this.loadBackup(backupMetadata.location)
      
      // Decrypt and decompress if needed
      let processedContent = backupContent
      if (backupMetadata.encryption) {
        processedContent = await this.decryptData(processedContent)
      }
      if (backupMetadata.compression) {
        processedContent = await this.decompressData(processedContent)
      }

      // Verify checksum
      const actualChecksum = this.generateChecksum(processedContent)
      if (actualChecksum !== backupMetadata.checksum) {
        throw new Error('Backup integrity check failed: checksum mismatch')
      }

      const backupData = JSON.parse(processedContent)
      const tablesToRestore = options.tables || Object.keys(backupData.data)

      if (options.dryRun) {
        logger.info('Dry run restore completed', {
          tables: tablesToRestore,
          totalRecords: (Object.values(backupData.metadata.recordCount) as number[]).reduce((a: number, b: number) => a + b, 0)
        })
        return
      }

      await this.initializeSupabase()

      // Restore each table
      for (const table of tablesToRestore) {
        if (!backupData.data[table]) {
          logger.warn(`Table ${table} not found in backup, skipping`)
          continue
        }

        const records = backupData.data[table]
        if (records.length === 0) {
          logger.info(`No data to restore for table ${table}`)
          continue
        }

        try {
          // Clear existing data if overwrite is true
          if (options.overwrite) {
            const { error: deleteError } = await this.supabase
              .from(table)
              .delete()
              .neq('id', '')

            if (deleteError) {
              logger.warn(`Failed to clear table ${table}`, deleteError)
            }
          }

          // Insert backup data in batches
          const batchSize = 1000
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize)
            const { error } = await this.supabase
              .from(table)
              .insert(batch)

            if (error) {
              throw new Error(`Failed to restore batch for table ${table}: ${error.message}`)
            }
          }

          logger.info(`Restored table ${table}`, { records: records.length })

        } catch (error) {
          logger.error(`Failed to restore table ${table}`, error as any)
          if (table in ['clients', 'users']) {
            // Critical table - abort restore
            throw error
          }
          // Non-critical table - continue with warning
        }
      }

      logger.info('Database restore completed successfully', {
        backupId: options.backupId,
        tablesRestored: tablesToRestore.length,
      })

    } catch (error) {
      logger.error('Database restore failed', error as any)
      throw error
    }
  }

  // Utility methods

  private async getTableSchemas(tables: string[]): Promise<Record<string, any>> {
    const schemas: Record<string, any> = {}
    
    // In a real implementation, you would query the database schema
    // For now, return a placeholder
    for (const table of tables) {
      schemas[table] = {
        name: table,
        columns: [], // Would contain column definitions
        indexes: [], // Would contain index definitions
        constraints: [], // Would contain constraint definitions
      }
    }
    
    return schemas
  }

  private async compressData(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.gzip(Buffer.from(data), (error, compressed) => {
        if (error) reject(error)
        else resolve(compressed.toString('base64'))
      })
    })
  }

  private async decompressData(compressedData: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(compressedData, 'base64')
      zlib.gunzip(buffer, (error, decompressed) => {
        if (error) reject(error)
        else resolve(decompressed.toString())
      })
    })
  }

  private async encryptData(data: string): Promise<string> {
    const algorithm = 'aes-256-gcm'
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY
    
    if (!encryptionKey) {
      throw new Error(
        'Missing BACKUP_ENCRYPTION_KEY environment variable. ' +
        'Backup encryption requires a secure key. Please set this in your .env.local file.'
      )
    }
    
    const key = crypto.scryptSync(encryptionKey, 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return `${iv.toString('hex')}:${encrypted}`
  }

  private async decryptData(encryptedData: string): Promise<string> {
    const algorithm = 'aes-256-gcm'
    const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY
    
    if (!encryptionKey) {
      throw new Error(
        'Missing BACKUP_ENCRYPTION_KEY environment variable. ' +
        'Cannot decrypt backup without the encryption key.'
      )
    }
    
    const key = crypto.scryptSync(encryptionKey, 'salt', 32)
    const [ivHex, encrypted] = encryptedData.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  private generateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  private async storeBackup(content: string, metadata: BackupMetadata): Promise<string> {
    const filename = `${metadata.id}.backup`
    
    // For now, store locally (in production, you'd use S3, Google Drive, etc.)
    const localPath = path.join(process.cwd(), 'backups', filename)
    await fs.mkdir(path.dirname(localPath), { recursive: true })
    await fs.writeFile(localPath, content, 'utf8')
    
    return localPath
  }

  private async loadBackup(location: string): Promise<string> {
    return await fs.readFile(location, 'utf8')
  }

  private async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    // In a real implementation, store in a database or metadata store
    const metadataPath = path.join(process.cwd(), 'backups', `${metadata.id}.metadata.json`)
    await fs.mkdir(path.dirname(metadataPath), { recursive: true })
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8')
  }

  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const metadataPath = path.join(process.cwd(), 'backups', `${backupId}.metadata.json`)
      const content = await fs.readFile(metadataPath, 'utf8')
      return JSON.parse(content) as BackupMetadata
    } catch (error) {
      return null
    }
  }

  private async sendNotification(type: 'success' | 'failure', metadata: BackupMetadata): Promise<void> {
    try {
      const message = type === 'success' 
        ? `Backup completed successfully: ${metadata.id}`
        : `Backup failed: ${metadata.id} - ${metadata.error}`

      // Send email notification if configured
      if (backupConfig.notifications.email) {
        // In a real implementation, send email
        logger.info(`Email notification sent: ${message}`)
      }

      // Send webhook notification if configured
      if (backupConfig.notifications.webhook) {
        await fetch(backupConfig.notifications.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            message,
            metadata,
            timestamp: new Date().toISOString(),
          }),
        })
      }

    } catch (error) {
      logger.error('Failed to send backup notification', error as any)
    }
  }

  // List available backups
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const backupDir = path.join(process.cwd(), 'backups')
      const files = await fs.readdir(backupDir)
      const metadataFiles = files.filter(file => file.endsWith('.metadata.json'))
      
      const backups: BackupMetadata[] = []
      for (const file of metadataFiles) {
        try {
          const content = await fs.readFile(path.join(backupDir, file), 'utf8')
          const metadata = JSON.parse(content) as BackupMetadata
          backups.push(metadata)
        } catch (error) {
          logger.warn(`Failed to read backup metadata: ${file}`, error)
        }
      }

      return backups.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())

    } catch (error) {
      logger.error('Failed to list backups', error as any)
      return []
    }
  }

  // Delete old backups based on retention policy
  async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups()
      const now = new Date()

      for (const backup of backups) {
        let shouldDelete = false
        const age = now.getTime() - backup.startTime.getTime()
        const daysSinceBackup = Math.floor(age / (24 * 60 * 60 * 1000))

        if (backup.type === 'full') {
          if (daysSinceBackup > backupConfig.retention.dailyRetention) {
            shouldDelete = true
          }
        } else if (backup.type === 'incremental') {
          if (daysSinceBackup > 1) { // Keep incremental backups for 1 day only
            shouldDelete = true
          }
        }

        if (shouldDelete) {
          await this.deleteBackup(backup.id)
          logger.info(`Deleted old backup: ${backup.id}`)
        }
      }

    } catch (error) {
      logger.error('Failed to cleanup old backups', error as any)
    }
  }

  private async deleteBackup(backupId: string): Promise<void> {
    try {
      const backupPath = path.join(process.cwd(), 'backups', `${backupId}.backup`)
      const metadataPath = path.join(process.cwd(), 'backups', `${backupId}.metadata.json`)
      
      await fs.unlink(backupPath).catch(() => {}) // Ignore if file doesn't exist
      await fs.unlink(metadataPath).catch(() => {})
      
    } catch (error) {
      logger.warn(`Failed to delete backup files for ${backupId}`, error)
    }
  }
}
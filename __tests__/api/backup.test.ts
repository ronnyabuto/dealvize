import { createMocks } from 'node-mocks-http'
import { POST } from '@/app/api/backup/route'
import { NextRequest } from 'next/server'

// Mock authentication
const mockUser = {
  id: 'user-123',
  email: 'admin@example.com',
  role: 'admin'
}

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn(() => Promise.resolve(mockUser)),
  requireRole: jest.fn(() => Promise.resolve(mockUser))
}))

// Mock backup service
const mockBackupResult = {
  success: true,
  backupId: 'backup-123',
  filename: 'dealvize_backup_2024-01-01_12-00-00.sql',
  size: 1024576,
  checksum: 'abc123def456',
  timestamp: '2024-01-01T12:00:00Z',
  tables: ['clients', 'deals', 'tasks', 'notes', 'commission_settings'],
  recordCounts: {
    clients: 150,
    deals: 89,
    tasks: 247,
    notes: 412,
    commission_settings: 25
  }
}

jest.mock('@/lib/backup/database-backup', () => ({
  createDatabaseBackup: jest.fn(() => Promise.resolve(mockBackupResult)),
  validateBackupIntegrity: jest.fn(() => Promise.resolve(true)),
  getBackupMetadata: jest.fn(() => Promise.resolve({
    totalSize: 1024576,
    compressionRatio: 0.65,
    estimatedRestoreTime: 120
  }))
}))

// Mock storage service
jest.mock('@/lib/backup/storage', () => ({
  uploadBackupFile: jest.fn(() => Promise.resolve({
    success: true,
    url: 'https://storage.example.com/backups/backup-123.sql',
    expiresAt: '2024-02-01T12:00:00Z'
  })),
  generateSecureDownloadUrl: jest.fn(() => Promise.resolve(
    'https://storage.example.com/backups/backup-123.sql?token=secure-token'
  ))
}))

// Mock email notifications
jest.mock('@/lib/notifications/email', () => ({
  sendBackupNotification: jest.fn(() => Promise.resolve(true))
}))

describe('/api/backup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    const validBackupRequest = {
      includeUserData: true,
      compression: true,
      encrypt: true,
      notifyOnComplete: true,
      retentionDays: 30
    }

    it('should create a database backup successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validBackupRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.backup).toBeDefined()
      expect(data.backup.backupId).toBe('backup-123')
      expect(data.backup.filename).toContain('dealvize_backup_')
      expect(data.backup.size).toBe(1024576)
      expect(data.backup.tables).toHaveLength(5)
      
      // Verify backup service was called
      const { createDatabaseBackup } = require('@/lib/backup/database-backup')
      expect(createDatabaseBackup).toHaveBeenCalledWith({
        includeUserData: true,
        compression: true,
        encrypt: true,
        userId: 'user-123'
      })
    })

    it('should handle backup without user data', async () => {
      const systemBackupRequest = {
        includeUserData: false,
        compression: true,
        encrypt: false,
        notifyOnComplete: false
      }

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(systemBackupRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      const { createDatabaseBackup } = require('@/lib/backup/database-backup')
      expect(createDatabaseBackup).toHaveBeenCalledWith({
        includeUserData: false,
        compression: true,
        encrypt: false,
        userId: 'user-123'
      })
    })

    it('should upload backup to storage when configured', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...validBackupRequest,
          uploadToStorage: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.backup.storageUrl).toBeDefined()
      expect(data.backup.downloadUrl).toBeDefined()
      
      // Verify storage upload was called
      const { uploadBackupFile, generateSecureDownloadUrl } = require('@/lib/backup/storage')
      expect(uploadBackupFile).toHaveBeenCalled()
      expect(generateSecureDownloadUrl).toHaveBeenCalled()
    })

    it('should send notification when requested', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...validBackupRequest,
          notifyOnComplete: true,
          notificationEmail: 'admin@example.com'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify notification was sent
      const { sendBackupNotification } = require('@/lib/notifications/email')
      expect(sendBackupNotification).toHaveBeenCalledWith({
        email: 'admin@example.com',
        backupInfo: expect.objectContaining({
          backupId: 'backup-123',
          filename: expect.stringContaining('dealvize_backup_')
        }),
        success: true
      })
    })

    it('should validate backup integrity', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...validBackupRequest,
          validateIntegrity: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.backup.integrityChecked).toBe(true)
      
      // Verify integrity validation was called
      const { validateBackupIntegrity } = require('@/lib/backup/database-backup')
      expect(validateBackupIntegrity).toHaveBeenCalledWith('backup-123')
    })

    it('should handle backup failures gracefully', async () => {
      const { createDatabaseBackup } = require('@/lib/backup/database-backup')
      createDatabaseBackup.mockRejectedValueOnce(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validBackupRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database connection failed')
      
      // Should still send failure notification if requested
      const { sendBackupNotification } = require('@/lib/notifications/email')
      expect(sendBackupNotification).toHaveBeenCalledWith({
        email: 'admin@example.com',
        backupInfo: expect.any(Object),
        success: false,
        error: 'Database connection failed'
      })
    })

    it('should handle storage upload failures', async () => {
      const { uploadBackupFile } = require('@/lib/backup/storage')
      uploadBackupFile.mockRejectedValueOnce(new Error('Storage service unavailable'))

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...validBackupRequest,
          uploadToStorage: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // Backup succeeded even if upload failed
      expect(data.success).toBe(true)
      expect(data.backup.storageError).toBeDefined()
      expect(data.backup.storageError).toBe('Storage service unavailable')
    })

    it('should validate retention period limits', async () => {
      const invalidRequest = {
        ...validBackupRequest,
        retentionDays: 400 // Exceeds maximum allowed
      }

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Retention period cannot exceed')
    })

    it('should require admin role for backup creation', async () => {
      const { requireRole } = require('@/lib/auth/utils')
      requireRole.mockRejectedValueOnce(new Error('Insufficient permissions'))

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validBackupRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Insufficient permissions')
    })

    it('should handle concurrent backup requests', async () => {
      // Mock backup service to simulate ongoing backup
      const { createDatabaseBackup } = require('@/lib/backup/database-backup')
      createDatabaseBackup
        .mockResolvedValueOnce(mockBackupResult)
        .mockRejectedValueOnce(new Error('Backup already in progress'))

      const requests = Array(2).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(validBackupRequest)
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      expect(responses[0].status).toBe(200)
      expect(responses[1].status).toBe(409) // Conflict - backup in progress
      
      const data1 = await responses[0].json()
      const data2 = await responses[1].json()
      
      expect(data1.success).toBe(true)
      expect(data2.success).toBe(false)
      expect(data2.error).toContain('Backup already in progress')
    })

    it('should provide backup progress updates', async () => {
      // Mock backup with progress tracking
      const { createDatabaseBackup } = require('@/lib/backup/database-backup')
      createDatabaseBackup.mockImplementationOnce(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            ...mockBackupResult,
            progress: {
              currentTable: 'deals',
              tablesCompleted: 2,
              totalTables: 5,
              percentage: 40
            }
          }), 100)
        })
      )

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...validBackupRequest,
          includeProgress: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.backup.progress).toBeDefined()
      expect(data.backup.progress.percentage).toBe(40)
    })

    it('should handle malformed request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
    })

    it('should validate email format for notifications', async () => {
      const invalidEmailRequest = {
        ...validBackupRequest,
        notifyOnComplete: true,
        notificationEmail: 'invalid-email'
      }

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidEmailRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid email address')
    })

    it('should track backup metrics and timing', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validBackupRequest)
      })

      const startTime = Date.now()
      const response = await POST(request)
      const endTime = Date.now()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.backup.timing).toBeDefined()
      expect(data.backup.timing.duration).toBeGreaterThan(0)
      expect(data.backup.metrics).toBeDefined()
      expect(data.backup.metrics.recordCounts).toBeDefined()
    })
  })

  describe('Backup scheduling and automation', () => {
    it('should support scheduled backup configuration', async () => {
      const scheduledBackupRequest = {
        ...validBackupRequest,
        schedule: {
          frequency: 'daily',
          time: '02:00',
          timezone: 'UTC',
          enabled: true
        }
      }

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduledBackupRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.backup.scheduled).toBe(true)
      expect(data.backup.nextScheduledRun).toBeDefined()
    })

    it('should validate schedule configuration', async () => {
      const invalidScheduleRequest = {
        ...validBackupRequest,
        schedule: {
          frequency: 'invalid',
          time: '25:00', // Invalid time
          timezone: 'Invalid/Timezone'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidScheduleRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid schedule configuration')
    })
  })

  describe('Security and compliance', () => {
    it('should log backup creation for audit trail', async () => {
      // Mock audit logging
      const mockAuditLog = jest.fn()
      jest.doMock('@/lib/security/audit', () => ({
        logBackupCreation: mockAuditLog
      }))

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validBackupRequest)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockAuditLog).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'backup_created',
        backupId: 'backup-123',
        timestamp: expect.any(String)
      })
    })

    it('should encrypt sensitive data in backup', async () => {
      const encryptedBackupRequest = {
        ...validBackupRequest,
        encrypt: true,
        encryptionKey: 'custom-key-id'
      }

      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(encryptedBackupRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.backup.encrypted).toBe(true)
      expect(data.backup.encryptionKeyId).toBeDefined()
    })

    it('should validate backup file checksums', async () => {
      const request = new NextRequest('http://localhost:3000/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...validBackupRequest,
          validateChecksum: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.backup.checksum).toBe('abc123def456')
      expect(data.backup.checksumValidated).toBe(true)
    })
  })
})
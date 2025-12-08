// Backup and recovery configuration
export interface BackupConfig {
  enabled: boolean
  providers: {
    supabase: boolean
    s3: boolean
    googleDrive: boolean
    local: boolean
  }
  schedule: {
    daily: boolean
    weekly: boolean
    monthly: boolean
    customCron?: string
  }
  retention: {
    dailyRetention: number // days
    weeklyRetention: number // weeks
    monthlyRetention: number // months
  }
  compression: boolean
  encryption: boolean
  notifications: {
    onSuccess: boolean
    onFailure: boolean
    email?: string
    webhook?: string
  }
}

export const backupConfig: BackupConfig = {
  enabled: process.env.BACKUP_ENABLED === 'true',
  providers: {
    supabase: process.env.SUPABASE_BACKUP_ENABLED === 'true',
    s3: process.env.S3_BACKUP_ENABLED === 'true',
    googleDrive: process.env.GOOGLE_DRIVE_BACKUP_ENABLED === 'true',
    local: process.env.LOCAL_BACKUP_ENABLED === 'true',
  },
  schedule: {
    daily: process.env.DAILY_BACKUP === 'true',
    weekly: process.env.WEEKLY_BACKUP === 'true',
    monthly: process.env.MONTHLY_BACKUP === 'true',
    customCron: process.env.BACKUP_CRON_SCHEDULE,
  },
  retention: {
    dailyRetention: parseInt(process.env.DAILY_BACKUP_RETENTION || '7'),
    weeklyRetention: parseInt(process.env.WEEKLY_BACKUP_RETENTION || '4'),
    monthlyRetention: parseInt(process.env.MONTHLY_BACKUP_RETENTION || '12'),
  },
  compression: process.env.BACKUP_COMPRESSION !== 'false',
  encryption: process.env.BACKUP_ENCRYPTION !== 'false',
  notifications: {
    onSuccess: process.env.BACKUP_NOTIFY_SUCCESS === 'true',
    onFailure: process.env.BACKUP_NOTIFY_FAILURE !== 'false',
    email: process.env.BACKUP_NOTIFICATION_EMAIL,
    webhook: process.env.BACKUP_NOTIFICATION_WEBHOOK,
  },
}

// Tables to include in backups
export const BACKUP_TABLES = [
  'clients',
  'deals',
  'tasks',
  'notes',
  'commission_settings',
  'users',
  'user_profiles',
  'activities',
  'attachments',
] as const

// Critical tables that must be backed up
export const CRITICAL_TABLES = [
  'clients',
  'deals',
  'users',
  'user_profiles',
] as const

// Backup types
export type BackupType = 'full' | 'incremental' | 'differential'
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface BackupMetadata {
  id: string
  type: BackupType
  status: BackupStatus
  startTime: Date
  endTime?: Date
  duration?: number // milliseconds
  size?: number // bytes
  tables: string[]
  recordCount: Record<string, number>
  provider: string
  location: string
  encryption: boolean
  compression: boolean
  checksum: string
  error?: string
  retryCount: number
  createdBy: string
}

export interface RestoreOptions {
  backupId: string
  tables?: string[] // If not provided, restore all tables from backup
  targetEnvironment?: 'production' | 'staging' | 'development'
  overwrite: boolean
  validate: boolean
  dryRun: boolean
}

export const BACKUP_STORAGE_PATHS = {
  local: process.env.LOCAL_BACKUP_PATH || './backups',
  s3: {
    bucket: process.env.S3_BACKUP_BUCKET || 'dealvize-backups',
    prefix: process.env.S3_BACKUP_PREFIX || 'database-backups',
    region: process.env.S3_BACKUP_REGION || 'us-east-1',
  },
  googleDrive: {
    folderId: process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID,
    folderName: process.env.GOOGLE_DRIVE_BACKUP_FOLDER_NAME || 'Dealvize Backups',
  },
}
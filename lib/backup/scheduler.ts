import { backupConfig } from './config'
import { DatabaseBackup } from './database-backup'
import { logger } from '@/lib/errors'
import cron from 'node-cron'

export class BackupScheduler {
  private scheduledJobs: Map<string, any> = new Map()

  constructor() {
    this.initializeSchedules()
  }

  private initializeSchedules() {
    if (!backupConfig.enabled) {
      logger.info('Backup system is disabled, skipping scheduler initialization')
      return
    }

    // Daily backup schedule
    if (backupConfig.schedule.daily) {
      this.scheduleDaily()
    }

    // Weekly backup schedule
    if (backupConfig.schedule.weekly) {
      this.scheduleWeekly()
    }

    // Monthly backup schedule
    if (backupConfig.schedule.monthly) {
      this.scheduleMonthly()
    }

    // Custom cron schedule
    if (backupConfig.schedule.customCron) {
      this.scheduleCustom(backupConfig.schedule.customCron)
    }

    // Cleanup schedule (runs daily)
    this.scheduleCleanup()

    logger.info('Backup scheduler initialized', {
      daily: backupConfig.schedule.daily,
      weekly: backupConfig.schedule.weekly,
      monthly: backupConfig.schedule.monthly,
      custom: !!backupConfig.schedule.customCron,
    })
  }

  private scheduleDaily() {
    // Run daily backup at 2:00 AM
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting scheduled daily backup')
        const backup = new DatabaseBackup()
        await backup.createFullBackup()
        logger.info('Scheduled daily backup completed')
      } catch (error) {
        logger.error('Scheduled daily backup failed', error)
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    })

    this.scheduledJobs.set('daily', job)
    job.start()
    logger.info('Daily backup scheduled for 2:00 AM UTC')
  }

  private scheduleWeekly() {
    // Run weekly backup every Sunday at 3:00 AM
    const job = cron.schedule('0 3 * * 0', async () => {
      try {
        logger.info('Starting scheduled weekly backup')
        const backup = new DatabaseBackup()
        await backup.createFullBackup()
        logger.info('Scheduled weekly backup completed')
      } catch (error) {
        logger.error('Scheduled weekly backup failed', error)
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    })

    this.scheduledJobs.set('weekly', job)
    job.start()
    logger.info('Weekly backup scheduled for Sundays at 3:00 AM UTC')
  }

  private scheduleMonthly() {
    // Run monthly backup on the 1st day of each month at 4:00 AM
    const job = cron.schedule('0 4 1 * *', async () => {
      try {
        logger.info('Starting scheduled monthly backup')
        const backup = new DatabaseBackup()
        await backup.createFullBackup()
        logger.info('Scheduled monthly backup completed')
      } catch (error) {
        logger.error('Scheduled monthly backup failed', error)
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    })

    this.scheduledJobs.set('monthly', job)
    job.start()
    logger.info('Monthly backup scheduled for 1st day of month at 4:00 AM UTC')
  }

  private scheduleCustom(cronExpression: string) {
    try {
      const job = cron.schedule(cronExpression, async () => {
        try {
          logger.info('Starting scheduled custom backup')
          const backup = new DatabaseBackup()
          await backup.createFullBackup()
          logger.info('Scheduled custom backup completed')
        } catch (error) {
          logger.error('Scheduled custom backup failed', error)
        }
      }, {
        scheduled: false,
        timezone: 'UTC'
      })

      this.scheduledJobs.set('custom', job)
      job.start()
      logger.info(`Custom backup scheduled with cron: ${cronExpression}`)
    } catch (error) {
      logger.error(`Invalid cron expression: ${cronExpression}`, error)
    }
  }

  private scheduleCleanup() {
    // Run cleanup every day at 5:00 AM
    const job = cron.schedule('0 5 * * *', async () => {
      try {
        logger.info('Starting scheduled backup cleanup')
        const backup = new DatabaseBackup()
        await backup.cleanupOldBackups()
        logger.info('Scheduled backup cleanup completed')
      } catch (error) {
        logger.error('Scheduled backup cleanup failed', error)
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    })

    this.scheduledJobs.set('cleanup', job)
    job.start()
    logger.info('Backup cleanup scheduled for daily at 5:00 AM UTC')
  }

  // Manually trigger a backup
  async triggerBackup(type: 'full' | 'incremental' = 'full'): Promise<void> {
    try {
      logger.info(`Manually triggering ${type} backup`)
      const backup = new DatabaseBackup()
      
      if (type === 'full') {
        await backup.createFullBackup()
      } else {
        // Get last backup time for incremental backup
        const backups = await backup.listBackups()
        const lastBackup = backups.find(b => b.status === 'completed')
        const sinceTimestamp = lastBackup ? lastBackup.endTime : new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        await backup.createIncrementalBackup(sinceTimestamp || new Date())
      }
      
      logger.info(`Manual ${type} backup completed`)
    } catch (error) {
      logger.error(`Manual ${type} backup failed`, error)
      throw error
    }
  }

  // Stop all scheduled jobs
  stopAll(): void {
    for (const [name, job] of this.scheduledJobs) {
      if (job && typeof job.stop === 'function') {
        job.stop()
        logger.info(`Stopped scheduled job: ${name}`)
      }
    }
    this.scheduledJobs.clear()
  }

  // Get status of all scheduled jobs
  getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {}
    
    for (const [name, job] of this.scheduledJobs) {
      status[name] = job && job.running === true
    }
    
    return status
  }

  // Update schedule configuration
  updateSchedule(newConfig: typeof backupConfig.schedule): void {
    // Stop existing jobs
    this.stopAll()
    
    // Update configuration (in a real app, you'd persist this)
    Object.assign(backupConfig.schedule, newConfig)
    
    // Reinitialize with new configuration
    this.initializeSchedules()
  }
}

// Singleton instance
export const backupScheduler = new BackupScheduler()

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, stopping backup scheduler')
  backupScheduler.stopAll()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('Received SIGINT, stopping backup scheduler')
  backupScheduler.stopAll()
  process.exit(0)
})
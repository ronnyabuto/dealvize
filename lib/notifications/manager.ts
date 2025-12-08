// Notification management system
import { 
  BaseNotification, 
  NotificationType, 
  NotificationPriority, 
  NotificationChannel,
  InAppNotification,
  EmailNotification,
  PushNotification,
  NotificationFilter,
  NotificationStats,
  NotificationPreferences,
  defaultNotificationPreferences,
  NotificationData
} from '@/lib/notifications/types'
import { logger } from '@/lib/errors'

export class NotificationManager {
  private static instance: NotificationManager
  private notifications: Map<string, BaseNotification> = new Map()
  private subscribers: Map<string, (notification: BaseNotification) => void> = new Map()

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  // Create and send notification
  async send(params: {
    type: NotificationType
    priority: NotificationPriority
    title: string
    message: string
    userId: string
    channels?: NotificationChannel[]
    data?: NotificationData
    entityType?: string
    entityId?: string
    expiresAt?: Date
    actions?: any[]
  }): Promise<BaseNotification> {
    const notification: BaseNotification = {
      id: this.generateId(),
      type: params.type,
      priority: params.priority,
      title: params.title,
      message: params.message,
      data: params.data,
      createdAt: new Date(),
      expiresAt: params.expiresAt,
      source: 'dealvize-crm',
      channels: params.channels || ['in_app'],
      deliveryStatus: {},
      attempts: {},
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      actions: params.actions,
    }

    // Initialize delivery status
    notification.channels.forEach(channel => {
      notification.deliveryStatus[channel] = 'pending'
      notification.attempts[channel] = 0
    })

    // Store notification
    this.notifications.set(notification.id, notification)

    // Get user preferences
    const preferences = await this.getUserPreferences(params.userId)
    
    // Send through each channel
    for (const channel of notification.channels) {
      if (this.shouldSendOnChannel(notification, channel, preferences)) {
        await this.sendOnChannel(notification, channel, preferences)
      }
    }

    // Notify subscribers
    this.notifySubscribers(notification)

    logger.info('Notification sent', {
      id: notification.id,
      type: notification.type,
      userId: params.userId,
      channels: notification.channels,
    })

    return notification
  }

  // Send notification on specific channel
  private async sendOnChannel(
    notification: BaseNotification, 
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      notification.attempts[channel]++

      switch (channel) {
        case 'in_app':
          await this.sendInAppNotification(notification as InAppNotification, preferences)
          break
        case 'email':
          await this.sendEmailNotification(notification as EmailNotification, preferences)
          break
        case 'push':
          await this.sendPushNotification(notification as PushNotification, preferences)
          break
        case 'sms':
          await this.sendSMSNotification(notification, preferences)
          break
        case 'webhook':
          await this.sendWebhookNotification(notification, preferences)
          break
        default:
          throw new Error(`Unsupported channel: ${channel}`)
      }

      notification.deliveryStatus[channel] = 'sent'
    } catch (error) {
      notification.deliveryStatus[channel] = 'failed'
      logger.error(`Failed to send notification on ${channel}`, error, {
        notificationId: notification.id,
        attempt: notification.attempts[channel],
      })

      // Retry logic
      if (notification.attempts[channel] < 3) {
        setTimeout(() => {
          this.sendOnChannel(notification, channel, preferences)
        }, 1000 * notification.attempts[channel]) // Exponential backoff
      }
    }
  }

  private async sendInAppNotification(
    notification: InAppNotification, 
    preferences: NotificationPreferences
  ): Promise<void> {
    // In-app notifications are handled by the frontend
    // This would typically store the notification for retrieval
    await this.storeNotification(notification)
  }

  private async sendEmailNotification(
    notification: EmailNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    // Check quiet hours
    if (this.isInQuietHours(preferences.channels.email.quietHours)) {
      logger.info('Email notification delayed due to quiet hours', {
        notificationId: notification.id
      })
      // Schedule for later
      return
    }

    // In a real implementation, this would integrate with an email service
    // like SendGrid, Amazon SES, or SMTP
    
    const emailData = {
      to: await this.getUserEmail(notification.userId!),
      subject: notification.title,
      html: this.generateEmailHTML(notification),
      text: notification.message,
    }

    // Mock email sending
    logger.info('Email notification sent', {
      notificationId: notification.id,
      to: emailData.to,
      subject: emailData.subject,
    })

    // await emailService.send(emailData)
  }

  private async sendPushNotification(
    notification: PushNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    // Check quiet hours
    if (this.isInQuietHours(preferences.channels.push.quietHours)) {
      logger.info('Push notification delayed due to quiet hours', {
        notificationId: notification.id
      })
      return
    }

    // In a real implementation, this would integrate with push services
    // like Firebase Cloud Messaging, Apple Push Notification service
    
    const pushData = {
      userId: notification.userId,
      title: notification.title,
      body: notification.message,
      icon: notification.icon || '/icon-192.png',
      badge: notification.badge,
      sound: preferences.channels.push.sound ? 'default' : undefined,
      vibrate: preferences.channels.push.vibrate ? [200, 100, 200] : undefined,
      data: notification.data,
      actions: notification.actions,
    }

    logger.info('Push notification sent', {
      notificationId: notification.id,
      userId: notification.userId,
    })

    // await pushService.send(pushData)
  }

  private async sendSMSNotification(
    notification: BaseNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    // SMS implementation would go here
    logger.info('SMS notification sent', {
      notificationId: notification.id,
      userId: notification.userId,
    })
  }

  private async sendWebhookNotification(
    notification: BaseNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    // Webhook implementation would go here
    logger.info('Webhook notification sent', {
      notificationId: notification.id,
      userId: notification.userId,
    })
  }

  // Quick notification methods
  async info(title: string, message: string, userId: string, data?: NotificationData): Promise<BaseNotification> {
    return this.send({
      type: 'info',
      priority: 'low',
      title,
      message,
      userId,
      channels: ['in_app'],
      data,
    })
  }

  async success(title: string, message: string, userId: string, data?: NotificationData): Promise<BaseNotification> {
    return this.send({
      type: 'success',
      priority: 'medium',
      title,
      message,
      userId,
      channels: ['in_app'],
      data,
    })
  }

  async warning(title: string, message: string, userId: string, data?: NotificationData): Promise<BaseNotification> {
    return this.send({
      type: 'warning',
      priority: 'high',
      title,
      message,
      userId,
      channels: ['in_app', 'email'],
      data,
    })
  }

  async error(title: string, message: string, userId: string, data?: NotificationData): Promise<BaseNotification> {
    return this.send({
      type: 'error',
      priority: 'urgent',
      title,
      message,
      userId,
      channels: ['in_app', 'email', 'push'],
      data,
    })
  }

  // Business-specific notifications
  async dealUpdate(dealId: string, title: string, message: string, userId: string): Promise<BaseNotification> {
    return this.send({
      type: 'deal_update',
      priority: 'medium',
      title,
      message,
      userId,
      channels: ['in_app', 'email'],
      entityType: 'deal',
      entityId: dealId,
    })
  }

  async taskReminder(taskId: string, title: string, message: string, userId: string): Promise<BaseNotification> {
    return this.send({
      type: 'task_reminder',
      priority: 'high',
      title,
      message,
      userId,
      channels: ['in_app', 'email', 'push'],
      entityType: 'task',
      entityId: taskId,
    })
  }

  // Get notifications for user
  async getUserNotifications(userId: string, filter?: NotificationFilter): Promise<BaseNotification[]> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .filter(notification => this.matchesFilter(notification, filter))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    if (filter?.limit) {
      const offset = filter.offset || 0
      return userNotifications.slice(offset, offset + filter.limit)
    }

    return userNotifications
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = this.notifications.get(notificationId)
    if (notification && notification.userId === userId) {
      notification.readAt = new Date()
      await this.updateNotification(notification)
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = await this.getUserNotifications(userId, { read: false })
    
    for (const notification of userNotifications) {
      notification.readAt = new Date()
      await this.updateNotification(notification)
    }
  }

  // Dismiss notification
  async dismiss(notificationId: string, userId: string): Promise<void> {
    const notification = this.notifications.get(notificationId)
    if (notification && notification.userId === userId) {
      notification.dismissedAt = new Date()
      await this.updateNotification(notification)
    }
  }

  // Get notification statistics
  async getStats(userId: string): Promise<NotificationStats> {
    const userNotifications = await this.getUserNotifications(userId)
    
    const stats: NotificationStats = {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.readAt).length,
      byType: {} as Record<NotificationType, number>,
      byPriority: {} as Record<NotificationPriority, number>,
      byChannel: {} as Record<NotificationChannel, { sent: number; delivered: number; failed: number }>,
      recentActivity: [],
    }

    // Calculate stats
    userNotifications.forEach(notification => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1
      
      notification.channels.forEach(channel => {
        if (!stats.byChannel[channel]) {
          stats.byChannel[channel] = { sent: 0, delivered: 0, failed: 0 }
        }
        
        const status = notification.deliveryStatus[channel]
        if (status === 'sent' || status === 'delivered') {
          stats.byChannel[channel].sent++
        }
        if (status === 'delivered') {
          stats.byChannel[channel].delivered++
        }
        if (status === 'failed') {
          stats.byChannel[channel].failed++
        }
      })
    })

    return stats
  }

  // Subscribe to notifications
  subscribe(userId: string, callback: (notification: BaseNotification) => void): string {
    const subscriptionId = this.generateId()
    this.subscribers.set(subscriptionId, callback)
    return subscriptionId
  }

  // Unsubscribe from notifications
  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId)
  }

  // Helper methods
  private shouldSendOnChannel(
    notification: BaseNotification, 
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): boolean {
    if (!preferences.enabled) return false
    
    const channelPrefs = preferences.channels[channel as keyof typeof preferences.channels]
    if (!channelPrefs?.enabled) return false
    
    if (!channelPrefs.types.includes(notification.type)) return false
    
    if (!preferences.priority[notification.priority]) return false
    
    return true
  }

  private isInQuietHours(quietHours?: { enabled: boolean; start: string; end: string }): boolean {
    if (!quietHours?.enabled) return false
    
    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    const start = parseInt(quietHours.start.replace(':', ''))
    const end = parseInt(quietHours.end.replace(':', ''))
    
    if (start > end) {
      return currentTime >= start || currentTime <= end
    } else {
      return currentTime >= start && currentTime <= end
    }
  }

  private matchesFilter(notification: BaseNotification, filter?: NotificationFilter): boolean {
    if (!filter) return true
    
    if (filter.type && !filter.type.includes(notification.type)) return false
    if (filter.priority && !filter.priority.includes(notification.priority)) return false
    if (filter.read === true && !notification.readAt) return false
    if (filter.read === false && notification.readAt) return false
    if (filter.dismissed === true && !notification.dismissedAt) return false
    if (filter.dismissed === false && notification.dismissedAt) return false
    if (filter.entityType && notification.entityType !== filter.entityType) return false
    if (filter.entityId && notification.entityId !== filter.entityId) return false
    
    if (filter.dateFrom && notification.createdAt < filter.dateFrom) return false
    if (filter.dateTo && notification.createdAt > filter.dateTo) return false
    
    return true
  }

  private notifySubscribers(notification: BaseNotification): void {
    this.subscribers.forEach(callback => {
      try {
        callback(notification)
      } catch (error) {
        logger.error('Notification subscriber error', error)
      }
    })
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateEmailHTML(notification: EmailNotification): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">${notification.title}</h2>
            <p>${notification.message}</p>
            
            ${notification.actions ? `
              <div style="margin: 20px 0;">
                ${notification.actions.map(action => `
                  <a href="${action.url}" 
                     style="display: inline-block; padding: 10px 20px; margin: 5px; 
                            background-color: #2563eb; color: white; text-decoration: none; 
                            border-radius: 5px;">
                    ${action.label}
                  </a>
                `).join('')}
              </div>
            ` : ''}
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280;">
              This notification was sent by Dealvize CRM. 
              <a href="/settings/notifications" style="color: #2563eb;">Manage your notification preferences</a>
            </p>
          </div>
        </body>
      </html>
    `
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // In a real implementation, fetch from database
      return defaultNotificationPreferences
    } catch (error) {
      logger.error('Failed to get user notification preferences', error)
      return defaultNotificationPreferences
    }
  }

  private async getUserEmail(userId: string): Promise<string> {
    // In a real implementation, fetch from user database
    return `user${userId}@example.com`
  }

  private async storeNotification(notification: BaseNotification): Promise<void> {
    // In a real implementation, store in database
    logger.debug('Storing notification', { id: notification.id })
  }

  private async updateNotification(notification: BaseNotification): Promise<void> {
    // In a real implementation, update in database
    logger.debug('Updating notification', { id: notification.id })
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance()
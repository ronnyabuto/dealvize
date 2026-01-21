// Notification system types and interfaces
export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'deal_update' 
  | 'task_reminder' 
  | 'system_alert'
  | 'new_message'
  | 'milestone'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'webhook'

export interface NotificationRecipient {
  userId: string
  email?: string
  phone?: string
  preferences: {
    channels: NotificationChannel[]
    quietHours?: {
      enabled: boolean
      start: string
      end: string
    }
  }
}

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  subject: string
  message: string
  htmlMessage?: string
  variables: string[]
}

export interface NotificationData {
  [key: string]: any
}

export interface BaseNotification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  data?: NotificationData
  createdAt: Date
  expiresAt?: Date
  
  // Metadata
  source: string
  category?: string
  tags?: string[]
  
  // Delivery tracking
  channels: NotificationChannel[]
  deliveryStatus: Record<NotificationChannel, 'pending' | 'sent' | 'delivered' | 'failed'>
  attempts: Record<NotificationChannel, number>
  
  // User interaction
  readAt?: Date
  dismissedAt?: Date
  clickedAt?: Date
  
  // Related entities
  entityType?: string
  entityId?: string
  userId?: string
  
  // Actions
  actions?: NotificationAction[]
}

export interface NotificationAction {
  id: string
  label: string
  type: 'button' | 'link' | 'api_call'
  url?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  payload?: any
  style?: 'primary' | 'secondary' | 'destructive'
}

export interface InAppNotification extends BaseNotification {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  autoClose?: boolean
  autoCloseDelay?: number
  showProgress?: boolean
}

export interface EmailNotification extends BaseNotification {
  subject: string
  htmlContent?: string
  textContent?: string
  attachments?: EmailAttachment[]
  replyTo?: string
  cc?: string[]
  bcc?: string[]
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType: string
}

export interface PushNotification extends BaseNotification {
  icon?: string
  image?: string
  badge?: string
  sound?: string
  vibrate?: number[]
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
}

export interface NotificationQueue {
  id: string
  notifications: BaseNotification[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  processedAt?: Date
  priority: NotificationPriority
}

export interface NotificationFilter {
  userId?: string
  type?: NotificationType[]
  priority?: NotificationPriority[]
  channel?: NotificationChannel[]
  read?: boolean
  dismissed?: boolean
  dateFrom?: Date
  dateTo?: Date
  entityType?: string
  entityId?: string
  tags?: string[]
  limit?: number
  offset?: number
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
  byPriority: Record<NotificationPriority, number>
  byChannel: Record<NotificationChannel, {
    sent: number
    delivered: number
    failed: number
  }>
  recentActivity: {
    date: string
    count: number
  }[]
}

export interface NotificationPreferences {
  enabled: boolean
  channels: {
    inApp: {
      enabled: boolean
      types: NotificationType[]
      position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
      autoClose: boolean
      autoCloseDelay: number
    }
    email: {
      enabled: boolean
      types: NotificationType[]
      digest: boolean
      digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
      quietHours: {
        enabled: boolean
        start: string
        end: string
      }
    }
    push: {
      enabled: boolean
      types: NotificationType[]
      requireInteraction: boolean
      sound: boolean
      vibrate: boolean
      quietHours: {
        enabled: boolean
        start: string
        end: string
      }
    }
  }
  priority: {
    low: boolean
    medium: boolean
    high: boolean
    urgent: boolean
  }
  categories: Record<string, boolean>
}

export const defaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  channels: {
    inApp: {
      enabled: true,
      types: ['info', 'success', 'warning', 'error', 'deal_update', 'task_reminder', 'system_alert', 'new_message', 'milestone'],
      position: 'top-right',
      autoClose: true,
      autoCloseDelay: 5000,
    },
    email: {
      enabled: true,
      types: ['deal_update', 'task_reminder', 'system_alert', 'milestone'],
      digest: false,
      digestFrequency: 'immediate',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    },
    push: {
      enabled: false,
      types: ['system_alert', 'error'],
      requireInteraction: false,
      sound: true,
      vibrate: true,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
    },
  },
  priority: {
    low: true,
    medium: true,
    high: true,
    urgent: true,
  },
  categories: {
    deals: true,
    tasks: true,
    clients: true,
    system: true,
    marketing: false,
  },
}
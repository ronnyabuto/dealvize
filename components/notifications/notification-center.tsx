'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, BellOff, Check, CheckCheck, X, Trash2, 
  AlertTriangle, Info, CheckCircle, XCircle, 
  Clock, DollarSign, Calendar, Mail, Settings 
} from 'lucide-react'
import { BaseNotification, NotificationStats, NotificationType, NotificationPriority } from '@/lib/notifications/types'

interface NotificationCenterProps {
  userId: string
  onClose?: () => void
}

export function NotificationCenter({ userId, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<BaseNotification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchNotifications()
  }, [userId])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notifications?limit=50`)
      
      if (response.ok) {
        const result = await response.json()
        setNotifications(result.notifications || [])
        setStats(result.stats)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, readAt: new Date() }
              : n
          )
        )
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.readAt)
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_all_read',
          notificationIds: unreadNotifications.map(n => n.id)
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, readAt: n.readAt || new Date() }))
        )
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const dismiss = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' })
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error)
    }
  }

  const getNotificationIcon = (type: NotificationType, priority: NotificationPriority) => {
    const iconClass = priority === 'urgent' ? 'text-red-500' : 
                     priority === 'high' ? 'text-orange-500' : 
                     priority === 'medium' ? 'text-blue-500' : 'text-gray-500'
    
    switch (type) {
      case 'success':
        return <CheckCircle className={`h-4 w-4 ${iconClass}`} />
      case 'error':
        return <XCircle className={`h-4 w-4 ${iconClass}`} />
      case 'warning':
        return <AlertTriangle className={`h-4 w-4 ${iconClass}`} />
      case 'deal_update':
        return <DollarSign className={`h-4 w-4 ${iconClass}`} />
      case 'task_reminder':
        return <Calendar className={`h-4 w-4 ${iconClass}`} />
      case 'new_message':
        return <Mail className={`h-4 w-4 ${iconClass}`} />
      case 'system_alert':
        return <Settings className={`h-4 w-4 ${iconClass}`} />
      default:
        return <Info className={`h-4 w-4 ${iconClass}`} />
    }
  }

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (activeTab) {
      case 'unread':
        return !notification.readAt
      case 'deals':
        return notification.type === 'deal_update'
      case 'tasks':
        return notification.type === 'task_reminder'
      case 'system':
        return notification.type === 'system_alert'
      default:
        return true
    }
  })

  if (loading) {
    return (
      <Card className="w-96">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>Loading notifications...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-96">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
            {stats && stats.unread > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.unread}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={markAllAsRead}
              size="sm"
              variant="ghost"
              disabled={!stats || stats.unread === 0}
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button onClick={onClose} size="sm" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mx-4 mb-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread
              {stats && stats.unread > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 text-xs">
                  {stats.unread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="deals" className="text-xs">Deals</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-96">
              {filteredNotifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <BellOff className="h-8 w-8 mx-auto mb-2" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-l-2 hover:bg-gray-50 cursor-pointer ${
                        !notification.readAt 
                          ? 'border-blue-500 bg-blue-50/50' 
                          : 'border-transparent'
                      }`}
                      onClick={() => !notification.readAt && markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {getNotificationIcon(notification.type, notification.priority)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className={`text-sm font-medium truncate ${
                                !notification.readAt ? 'text-gray-900' : 'text-gray-600'
                              }`}>
                                {notification.title}
                              </h4>
                              <Badge 
                                variant={getPriorityColor(notification.priority)}
                                className="text-xs"
                              >
                                {notification.priority}
                              </Badge>
                            </div>
                            <p className={`text-sm text-gray-600 line-clamp-2 ${
                              !notification.readAt ? 'font-medium' : ''
                            }`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                              {notification.actions && notification.actions.length > 0 && (
                                <div className="flex space-x-1">
                                  {notification.actions.slice(0, 2).map((action, index) => (
                                    <Button
                                      key={index}
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-6 px-2"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Handle action
                                      }}
                                    >
                                      {action.label}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.readAt && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              dismiss(notification.id)
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
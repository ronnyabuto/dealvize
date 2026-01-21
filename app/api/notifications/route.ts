import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/session'
import { notificationManager } from '@/lib/notifications/manager'
import { NotificationFilter } from '@/lib/notifications/types'

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const userId = sessionValidation.sessionInfo?.userId!
    const url = new URL(request.url)
    
    // Parse query parameters
    const filter: NotificationFilter = {
      userId,
      limit: parseInt(url.searchParams.get('limit') || '20'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
    }

    // Add optional filters
    const type = url.searchParams.get('type')
    if (type) filter.type = type.split(',') as any

    const priority = url.searchParams.get('priority')
    if (priority) filter.priority = priority.split(',') as any

    const read = url.searchParams.get('read')
    if (read !== null) filter.read = read === 'true'

    const dismissed = url.searchParams.get('dismissed')
    if (dismissed !== null) filter.dismissed = dismissed === 'true'

    const entityType = url.searchParams.get('entityType')
    if (entityType) filter.entityType = entityType

    const entityId = url.searchParams.get('entityId')
    if (entityId) filter.entityId = entityId

    // Get notifications
    const notifications = await notificationManager.getUserNotifications(userId, filter)
    const stats = await notificationManager.getStats(userId)

    return NextResponse.json({
      success: true,
      notifications,
      stats,
      filter,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Get notifications error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get notifications',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

// POST /api/notifications - Create new notification
export async function POST(request: NextRequest) {
  try {
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const currentUserId = sessionValidation.sessionInfo?.userId!
    const {
      type,
      priority,
      title,
      message,
      userId,
      channels,
      data,
      entityType,
      entityId,
      expiresAt,
      actions
    } = await request.json()

    // Validate required fields
    if (!type || !priority || !title || !message || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: type, priority, title, message, userId'
      }, { status: 400 })
    }

    // Check permissions - users can only send notifications to themselves unless they're admin
    if (userId !== currentUserId && (sessionValidation.sessionInfo as any)?.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized to send notifications to other users'
      }, { status: 403 })
    }

    // Create and send notification
    const notification = await notificationManager.send({
      type,
      priority,
      title,
      message,
      userId,
      channels,
      data,
      entityType,
      entityId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      actions
    })

    return NextResponse.json({
      success: true,
      notification,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Create notification error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create notification',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

// PUT /api/notifications - Bulk update notifications
export async function PUT(request: NextRequest) {
  try {
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const userId = sessionValidation.sessionInfo?.userId!
    const { action, notificationIds } = await request.json()

    if (!action || !Array.isArray(notificationIds)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request: action and notificationIds array required'
      }, { status: 400 })
    }

    let updatedCount = 0

    switch (action) {
      case 'mark_read':
        for (const id of notificationIds) {
          await notificationManager.markAsRead(id, userId)
          updatedCount++
        }
        break

      case 'mark_all_read':
        await notificationManager.markAllAsRead(userId)
        updatedCount = notificationIds.length
        break

      case 'dismiss':
        for (const id of notificationIds) {
          await notificationManager.dismiss(id, userId)
          updatedCount++
        }
        break

      default:
        return NextResponse.json({
          success: false,
          error: `Unsupported action: ${action}`
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `${updatedCount} notifications updated`,
      action,
      updatedCount,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Update notifications error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update notifications',
      timestamp: Date.now()
    }, { status: 500 })
  }
}
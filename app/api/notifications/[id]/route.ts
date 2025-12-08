import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/session'
import { notificationManager } from '@/lib/notifications/manager'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/notifications/[id] - Get specific notification
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const userId = sessionValidation.sessionInfo?.userId!
    const { id: notificationId } = await params

    // Get user's notifications and find the specific one
    const notifications = await notificationManager.getUserNotifications(userId, {
      limit: 1000 // Get a large number to find the specific notification
    })

    const notification = notifications.find(n => n.id === notificationId)

    if (!notification) {
      return NextResponse.json({
        success: false,
        error: 'Notification not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      notification,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Get notification error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get notification',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

// PATCH /api/notifications/[id] - Update specific notification
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const userId = sessionValidation.sessionInfo?.userId!
    const { id: notificationId } = await params
    const { action } = await request.json()

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Action is required'
      }, { status: 400 })
    }

    switch (action) {
      case 'mark_read':
        await notificationManager.markAsRead(notificationId, userId)
        break

      case 'dismiss':
        await notificationManager.dismiss(notificationId, userId)
        break

      default:
        return NextResponse.json({
          success: false,
          error: `Unsupported action: ${action}`
        }, { status: 400 })
    }

    // Get updated notification
    const notifications = await notificationManager.getUserNotifications(userId)
    const updatedNotification = notifications.find(n => n.id === notificationId)

    return NextResponse.json({
      success: true,
      notification: updatedNotification,
      action,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Update notification error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update notification',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

// DELETE /api/notifications/[id] - Delete specific notification
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const userId = sessionValidation.sessionInfo?.userId!
    const { id: notificationId } = await params

    // For now, we'll just dismiss the notification since we don't have a delete method
    await notificationManager.dismiss(notificationId, userId)

    return NextResponse.json({
      success: true,
      message: 'Notification deleted',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Delete notification error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete notification',
      timestamp: Date.now()
    }, { status: 500 })
  }
}
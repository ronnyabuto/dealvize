import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/session'
import { DatabaseBackup } from '@/lib/backup/database-backup'
import { backupConfig } from '@/lib/backup/config'

export async function POST(request: NextRequest) {
  try {
    // Validate session and check admin permissions
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const userRole = sessionValidation.sessionInfo?.role
    if (userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Admin permissions required'
      }, { status: 403 })
    }

    if (!backupConfig.enabled) {
      return NextResponse.json({
        success: false,
        error: 'Backup system is disabled'
      }, { status: 400 })
    }

    const { type, tables, sinceTimestamp } = await request.json()

    const backup = new DatabaseBackup()
    let result

    if (type === 'full') {
      result = await backup.createFullBackup(tables)
    } else if (type === 'incremental') {
      if (!sinceTimestamp) {
        return NextResponse.json({
          success: false,
          error: 'sinceTimestamp is required for incremental backup'
        }, { status: 400 })
      }
      result = await backup.createIncrementalBackup(new Date(sinceTimestamp))
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid backup type. Must be "full" or "incremental"'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      backup: result,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Backup API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create backup',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate session and check admin permissions
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const userRole = sessionValidation.sessionInfo?.role
    if (userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Admin permissions required'
      }, { status: 403 })
    }

    const backup = new DatabaseBackup()
    const backups = await backup.listBackups()

    return NextResponse.json({
      success: true,
      backups,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Backup list API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to list backups',
      timestamp: Date.now()
    }, { status: 500 })
  }
}
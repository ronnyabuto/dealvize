import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/session'
import { DatabaseBackup } from '@/lib/backup/database-backup'

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

    const backup = new DatabaseBackup()
    await backup.cleanupOldBackups()

    return NextResponse.json({
      success: true,
      message: 'Old backups cleaned up successfully',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Backup cleanup API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup old backups',
      timestamp: Date.now()
    }, { status: 500 })
  }
}
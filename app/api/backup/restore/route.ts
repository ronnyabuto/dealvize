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

    const userRole = (sessionValidation.sessionInfo as any)?.role
    if (userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Admin permissions required'
      }, { status: 403 })
    }

    const restoreOptions = await request.json()

    // Validate required fields
    if (!restoreOptions.backupId) {
      return NextResponse.json({
        success: false,
        error: 'backupId is required'
      }, { status: 400 })
    }

    // Safety check for production environment
    const environment = process.env.NODE_ENV
    if (environment === 'production' && !restoreOptions.dryRun && !restoreOptions.confirmed) {
      return NextResponse.json({
        success: false,
        error: 'Production restore requires explicit confirmation'
      }, { status: 400 })
    }

    const backup = new DatabaseBackup()
    
    // Set default values
    const options = {
      targetEnvironment: environment,
      overwrite: false,
      validate: true,
      dryRun: false,
      ...restoreOptions
    }

    await backup.restoreFromBackup(options)

    return NextResponse.json({
      success: true,
      message: options.dryRun 
        ? 'Dry run restore completed successfully'
        : 'Database restore completed successfully',
      backupId: options.backupId,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Restore API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore backup',
      timestamp: Date.now()
    }, { status: 500 })
  }
}
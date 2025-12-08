import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { complianceManager } from '@/lib/security/compliance'
import { chatSecurity } from '@/lib/security/chat-security'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Rate limiting - max 1 deletion request per day per user
    const rateLimit = await chatSecurity.checkRateLimit(user.id, 'conversations')
    if (!rateLimit.success) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Data deletion requests are limited.',
        resetTime: rateLimit.resetTime
      }, { status: 429 })
    }

    const body = await request.json()
    const { reason = 'User requested data deletion' } = body

    // Process deletion request
    const result = await complianceManager.deleteUserData({
      userId: user.id,
      email: user.email,
      reason
    })

    if (!result.success) {
      return NextResponse.json({
        error: result.error || 'Deletion failed'
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Data deletion completed successfully',
      deletedRecords: result.deletedRecords || 0
    })

  } catch (error) {
    console.error('Error processing data deletion:', error)
    return NextResponse.json({
      error: 'Internal server error during data deletion'
    }, { status: 500 })
  }
}

// Get compliance status
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const status = await complianceManager.getComplianceStatus(user.id)
    
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error fetching compliance status:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
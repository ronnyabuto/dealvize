import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
  try {
    await requireAuth() // Ensure user is authenticated
    
    // Call the sequence executor
    const executorResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sequence-executor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!executorResponse.ok) {
      throw new Error('Failed to execute sequences')
    }

    const result = await executorResponse.json()
    
    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Error executing sequences:', error)
    return NextResponse.json({
      error: (error as any).message || 'Failed to execute sequences'
    }, { status: 500 })
  }
}
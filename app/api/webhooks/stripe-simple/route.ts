/**
 * Simplified Stripe Webhook Handler
 * Essential webhook processing without over-engineering
 */

import { NextRequest, NextResponse } from 'next/server'
import { WebhookProcessor, PaymentError } from '@/lib/stripe/core'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Process webhook event with signature verification
    const result = await WebhookProcessor.processWebhookEvent(body, signature)

    return NextResponse.json({ 
      received: true,
      message: result.message
    })

  } catch (error) {
    console.error('Webhook error:', error)

    if (error instanceof PaymentError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
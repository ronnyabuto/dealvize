/**
 * Simplified Stripe Checkout API
 * Streamlined checkout session creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { PaymentService, PaymentError, isStripeConfigured } from '@/lib/stripe/core'

const CheckoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})

async function getUser() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new PaymentError('Authentication required', 'UNAUTHORIZED', 401)
  }

  return user
}

export async function POST(request: NextRequest) {
  try {
    // Early configuration check to prevent runtime errors
    if (!isStripeConfigured()) {
      return NextResponse.json({ 
        error: 'Payment system is not configured. Please contact support.',
        code: 'PAYMENT_UNAVAILABLE'
      }, { status: 503 })
    }

    const user = await getUser()
    const body = await request.json()
    const { priceId, successUrl, cancelUrl } = CheckoutSchema.parse(body)

    // Ensure customer exists
    await PaymentService.createCustomer(
      user.id,
      user.email!,
      user.user_metadata?.full_name
    )

    // Create checkout session
    const session = await PaymentService.createCheckoutSession({
      userId: user.id,
      priceId,
      successUrl,
      cancelUrl,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })

  } catch (error) {
    console.error('Checkout error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    if (error instanceof PaymentError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
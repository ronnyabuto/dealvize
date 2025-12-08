/**
 * Simplified Subscription Management API
 * Basic subscription operations without excessive features
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DB, PaymentService, PaymentError, getStatusLabel, isStripeConfigured } from '@/lib/stripe/core'

async function getUser() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new PaymentError('Authentication required', 'UNAUTHORIZED', 401)
  }

  return user
}

// GET - Get user's subscription
export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json({ 
        error: 'Payment system is not configured' 
      }, { status: 503 })
    }

    const user = await getUser()
    const subscription = await DB.getActiveSubscription(user.id)

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      statusLabel: getStatusLabel(subscription.status),
      priceId: subscription.price_id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.current_period_end,
      trialEnd: subscription.trial_end,
    })

  } catch (error) {
    console.error('Get subscription error:', error)

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

// DELETE - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser()
    const url = new URL(request.url)
    const cancelAtPeriodEnd = url.searchParams.get('cancelAtPeriodEnd') !== 'false'

    const subscription = await PaymentService.cancelSubscription(user.id, cancelAtPeriodEnd)

    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      message: cancelAtPeriodEnd 
        ? 'Subscription will cancel at period end' 
        : 'Subscription canceled immediately',
    })

  } catch (error) {
    console.error('Cancel subscription error:', error)

    if (error instanceof PaymentError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
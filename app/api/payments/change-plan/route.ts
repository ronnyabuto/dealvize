import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

// Initialize Stripe only if the key is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-08-27.basil'
}) : null

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ 
        error: 'Payment system not configured' 
      }, { status: 503 })
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { newPriceId } = await request.json()

    if (!newPriceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }

    // Get user's current subscription from database
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (subscriptionError || !subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Get the current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)

    if (!stripeSubscription || stripeSubscription.status !== 'active') {
      return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 })
    }

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations',
      }
    )

    // Update subscription in our database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        stripe_price_id: newPriceId,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id)

    if (updateError) {
      console.error('Failed to update subscription in database:', updateError)
    }

    return NextResponse.json({
      success: true,
      message: 'Plan changed successfully',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        priceId: newPriceId
      }
    })

  } catch (error) {
    console.error('Plan change error:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to change plan' },
      { status: 500 }
    )
  }
}
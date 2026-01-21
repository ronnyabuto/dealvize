import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getStripe, isStripeConfigured, DB, PaymentService } from '@/lib/stripe/core'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Stripe Webhook] Webhook secret not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  if (!isStripeConfigured()) {
    console.error('[Stripe Webhook] Stripe not configured')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const error = err as Error
    console.error('[Stripe Webhook] Signature verification failed:', error.message)
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 })
  }

  try {
    // Check for idempotency - has this event been processed?
    const alreadyProcessed = await DB.hasWebhookBeenProcessed(event.id)
    if (alreadyProcessed) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`)
      return NextResponse.json({ received: true, skipped: true })
    }

    // Record the event before processing
    await DB.recordWebhookEvent({
      stripe_event_id: event.id,
      event_type: event.type,
      processed: false,
    })

    const supabase = await createClient()

    // Process the event
    await handleWebhookEvent(event, supabase)

    // Mark as successfully processed
    await DB.markWebhookProcessed(event.id)

    console.log(`[Stripe Webhook] Successfully processed event: ${event.type} (${event.id})`)
    return NextResponse.json({ received: true })

  } catch (error) {
    const err = error as Error
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err.message)

    // Record the error
    try {
      await DB.markWebhookProcessed(event.id, err.message)
    } catch (dbError) {
      console.error('[Stripe Webhook] Failed to record error:', dbError)
    }

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function handleWebhookEvent(event: Stripe.Event, supabase: Awaited<ReturnType<typeof createClient>>) {
  switch (event.type) {
    // Subscription lifecycle events
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      await syncSubscriptionToDatabase(subscription, supabase)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)
      break
    }

    // Checkout events
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.subscription) {
        const stripe = getStripe()
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )
        await syncSubscriptionToDatabase(subscription, supabase)
      }
      break
    }

    // Invoice events
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = getSubscriptionId(invoice)

      if (subscriptionId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = getSubscriptionId(invoice)

      if (subscriptionId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionId)
      }
      break
    }

    case 'invoice.created': {
      const invoice = event.data.object as Stripe.Invoice
      // Log invoice creation for audit trail
      console.log(`[Stripe Webhook] Invoice created: ${invoice.id} for ${invoice.customer}`)
      break
    }

    // Customer events
    case 'customer.created': {
      const customer = event.data.object as Stripe.Customer
      console.log(`[Stripe Webhook] Customer created: ${customer.id} (${customer.email})`)

      // If customer has metadata with userId, upsert to customers table
      if (customer.metadata?.userId) {
        await supabase
          .from('customers')
          .upsert({
            stripe_customer_id: customer.id,
            user_id: customer.metadata.userId,
            email: customer.email || '',
            full_name: customer.name || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
      }
      break
    }

    case 'customer.deleted': {
      const customer = event.data.object as Stripe.Customer
      console.log(`[Stripe Webhook] Customer deleted: ${customer.id}`)

      // Mark customer as deleted (soft delete)
      await supabase
        .from('customers')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_customer_id', customer.id)
      break
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
  }
}

async function syncSubscriptionToDatabase(
  subscription: Stripe.Subscription,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const { data: customer } = await supabase
    .from('customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!customer) {
    console.warn(`[Stripe Webhook] Customer not found for Stripe ID: ${customerId}`)
    return
  }

  const sub = subscription as Stripe.Subscription & {
    items: { data: Array<{ price: { id: string } }> }
  }

  await supabase
    .from('subscriptions')
    .upsert({
      id: subscription.id,
      user_id: customer.user_id,
      status: subscription.status,
      price_id: sub.items.data[0]?.price.id,
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
}

function getSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = (invoice as unknown as { subscription?: string | { id: string } }).subscription
  if (typeof sub === 'string') return sub
  if (sub && typeof sub === 'object' && 'id' in sub) return sub.id
  return null
}

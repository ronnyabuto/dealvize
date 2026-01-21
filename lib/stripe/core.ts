/**
 * Stripe Core Service
 * Enterprise-grade billing infrastructure with multi-tenant support
 */

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

// Configuration and Environment Validation
const stripeConfig = (() => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // Build-time safety - return mock config if keys missing during build or CI
  const isBuildTime = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === undefined && !secretKey
  const isTestEnv = process.env.NODE_ENV !== 'production'
  
  if (isBuildTime || (isTestEnv && !secretKey)) {
    return {
      secretKey: 'sk_test_mock',
      publishableKey: 'pk_test_mock',
      webhookSecret: 'whsec_mock',
      isConfigured: false
    }
  }

  // Only throw if we're in runtime and missing required config
  if (!secretKey || !publishableKey) {
    return {
      secretKey: 'sk_test_mock',
      publishableKey: 'pk_test_mock',
      webhookSecret: 'whsec_mock',
      isConfigured: false
    }
  }

  return {
    secretKey,
    publishableKey,
    webhookSecret,
    isConfigured: true,
    currency: 'usd',
    trialPeriodDays: 7,
    priceIds: {
      starter: process.env.STRIPE_STARTER_PRICE_ID || '',
      professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID || '',
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || ''
    }
  }
})()

// Lazy Stripe initialization with runtime validation
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe && stripeConfig.isConfigured) {
    try {
      _stripe = new Stripe(stripeConfig.secretKey, {
        apiVersion: '2025-08-27.basil',
        typescript: true,
      })
    } catch (error) {
      throw new PaymentError(
        'Failed to initialize Stripe client. Please check your configuration.',
        'STRIPE_INIT_ERROR',
        500
      )
    }
  }
  
  if (!_stripe) {
    throw new PaymentError(
      'Stripe is not configured. Please add your Stripe keys to environment variables.',
      'STRIPE_NOT_CONFIGURED',
      503
    )
  }
  
  return _stripe
}

export function isStripeConfigured(): boolean {
  return stripeConfig.isConfigured
}

// Custom Error Classes
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string = 'PAYMENT_ERROR',
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'PaymentError'
  }
}

// Type Definitions
export interface Customer {
  id: string
  stripe_customer_id: string
  user_id: string
  email: string
  full_name?: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  customer_id: string
  stripe_subscription_id: string
  price_id: string
  status: string
  cancel_at_period_end: boolean
  current_period_start: string
  current_period_end: string
  trial_start?: string | null
  trial_end?: string | null
  canceled_at?: string | null
  created_at: string
  updated_at: string
}

export interface CheckoutSessionRequest {
  userId: string
  priceId: string
  successUrl?: string
  cancelUrl?: string
  trialPeriodDays?: number
}

export interface WebhookEvent {
  id: string
  stripe_event_id: string
  event_type: string
  processed: boolean
  error?: string | null
  created_at: string
}

// Database Operations Class
export class DB {
  private static async getSupabase() {
    return await createClient()
  }

  // Customer Management
  static async getCustomerByUserId(userId: string): Promise<Customer | null> {
    const supabase = await this.getSupabase()
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new PaymentError(`Failed to fetch customer: ${error.message}`, 'DATABASE_ERROR', 500)
    }

    return data
  }

  static async upsertCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    const supabase = await this.getSupabase()
    
    const { data, error } = await supabase
      .from('customers')
      .upsert(customer, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      throw new PaymentError(`Failed to upsert customer: ${error.message}`, 'DATABASE_ERROR', 500)
    }

    return data
  }

  // Subscription Management
  static async getActiveSubscription(userId: string): Promise<Subscription | null> {
    const supabase = await this.getSupabase()
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new PaymentError(`Failed to fetch subscription: ${error.message}`, 'DATABASE_ERROR', 500)
    }

    return data
  }

  static async upsertSubscription(subscription: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>): Promise<Subscription> {
    const supabase = await this.getSupabase()
    
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(subscription, { onConflict: 'stripe_subscription_id' })
      .select()
      .single()

    if (error) {
      throw new PaymentError(`Failed to upsert subscription: ${error.message}`, 'DATABASE_ERROR', 500)
    }

    return data
  }

  static async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const supabase = await this.getSupabase()
    
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'canceled',
        canceled_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId)
      .select()
      .single()

    if (error) {
      throw new PaymentError(`Failed to cancel subscription: ${error.message}`, 'DATABASE_ERROR', 500)
    }

    return data
  }

  // Webhook Event Tracking
  static async hasWebhookBeenProcessed(eventId: string): Promise<boolean> {
    const supabase = await this.getSupabase()
    
    const { data, error } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', eventId)
      .single()

    return !!data && !error
  }

  static async recordWebhookEvent(event: Omit<WebhookEvent, 'id' | 'created_at'>): Promise<WebhookEvent> {
    const supabase = await this.getSupabase()
    
    const { data, error } = await supabase
      .from('webhook_events')
      .insert(event)
      .select()
      .single()

    if (error) {
      throw new PaymentError(`Failed to record webhook event: ${error.message}`, 'DATABASE_ERROR', 500)
    }

    return data
  }

  static async markWebhookProcessed(eventId: string, error?: string): Promise<void> {
    const supabase = await this.getSupabase()
    
    const { error: updateError } = await supabase
      .from('webhook_events')
      .update({ 
        processed: !error,
        error: error || null
      })
      .eq('stripe_event_id', eventId)

    if (updateError) {
      throw new PaymentError(`Failed to update webhook status: ${updateError.message}`, 'DATABASE_ERROR', 500)
    }
  }
}

// Payment Service Class
export class PaymentService {
  private static _stripe: Stripe | null = null
  
  private static getStripeClient(): Stripe {
    if (!this._stripe) {
      this._stripe = getStripe()
    }
    return this._stripe
  }

  // Customer Operations
  static async createCustomer(userId: string, email: string, name?: string): Promise<Customer> {
    if (!isStripeConfigured()) {
      throw new PaymentError('Payment system is not configured', 'SERVICE_UNAVAILABLE', 503)
    }

    // Check if customer already exists
    const existingCustomer = await DB.getCustomerByUserId(userId)
    if (existingCustomer) {
      return existingCustomer
    }

    try {
      // Create Stripe customer
      const stripeCustomer = await this.getStripeClient().customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      })

      // Save to database
      return await DB.upsertCustomer({
        stripe_customer_id: stripeCustomer.id,
        user_id: userId,
        email,
        full_name: name,
      })

    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new PaymentError(`Stripe error: ${error.message}`, 'STRIPE_ERROR', 400)
      }
      throw error
    }
  }

  // Checkout Session Creation
  static async createCheckoutSession(request: CheckoutSessionRequest): Promise<Stripe.Checkout.Session> {
    if (!isStripeConfigured()) {
      throw new PaymentError('Payment system is not configured', 'SERVICE_UNAVAILABLE', 503)
    }

    const customer = await DB.getCustomerByUserId(request.userId)
    if (!customer) {
      throw new PaymentError('Customer not found', 'CUSTOMER_NOT_FOUND', 404)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    try {
      const session = await this.getStripeClient().checkout.sessions.create({
        customer: customer.stripe_customer_id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: request.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: request.successUrl || `${baseUrl}/billing?success=true`,
        cancel_url: request.cancelUrl || `${baseUrl}/billing?canceled=true`,
        subscription_data: request.trialPeriodDays ? {
          trial_period_days: request.trialPeriodDays,
        } : undefined,
        metadata: {
          userId: request.userId,
        },
      })

      return session

    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new PaymentError(`Failed to create checkout session: ${error.message}`, 'STRIPE_ERROR', 400)
      }
      throw error
    }
  }

  // Subscription Management
  static async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<Subscription> {
    if (!isStripeConfigured()) {
      throw new PaymentError('Payment system is not configured', 'SERVICE_UNAVAILABLE', 503)
    }

    const subscription = await DB.getActiveSubscription(userId)
    if (!subscription) {
      throw new PaymentError('No active subscription found', 'SUBSCRIPTION_NOT_FOUND', 404)
    }

    try {
      const updatedStripeSubscription = await this.getStripeClient().subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: cancelAtPeriodEnd,
        }
      )

      return await this.syncSubscriptionToDatabase(updatedStripeSubscription)

    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new PaymentError(`Failed to cancel subscription: ${error.message}`, 'STRIPE_ERROR', 400)
      }
      throw error
    }
  }

  // Subscription Synchronization
  static async syncSubscriptionToDatabase(stripeSubscription: Stripe.Subscription): Promise<Subscription> {
    const customerId = stripeSubscription.customer as string
    const customer = await this.getCustomerByStripeId(customerId)
    
    if (!customer) {
      throw new PaymentError('Customer not found for subscription sync', 'CUSTOMER_NOT_FOUND', 404)
    }

    const subscription = stripeSubscription as any
    const subscriptionData = {
      user_id: customer.user_id,
      customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      price_id: subscription.items.data[0]?.price.id || '',
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start ?
        new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ?
        new Date(subscription.trial_end * 1000).toISOString() : null,
      canceled_at: subscription.canceled_at ?
        new Date(subscription.canceled_at * 1000).toISOString() : null,
    }

    return await DB.upsertSubscription(subscriptionData)
  }

  private static async getCustomerByStripeId(stripeCustomerId: string): Promise<Customer | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new PaymentError(`Failed to fetch customer by Stripe ID: ${error.message}`, 'DATABASE_ERROR', 500)
    }

    return data
  }
}

// Webhook Processing
export class WebhookProcessor {
  private static _stripe: Stripe | null = null
  
  private static getStripeClient(): Stripe {
    if (!this._stripe) {
      this._stripe = getStripe()
    }
    return this._stripe
  }

  static async processWebhookEvent(body: string, signature: string): Promise<{ success: boolean; message: string }> {
    if (!isStripeConfigured() || !stripeConfig.webhookSecret) {
      throw new PaymentError('Webhook processing is not configured', 'SERVICE_UNAVAILABLE', 503)
    }

    let event: Stripe.Event

    try {
      event = this.getStripeClient().webhooks.constructEvent(body, signature, stripeConfig.webhookSecret)
    } catch (error) {
      throw new PaymentError(`Webhook signature verification failed: ${error}`, 'WEBHOOK_ERROR', 400)
    }

    // Check if event has already been processed
    if (await DB.hasWebhookBeenProcessed(event.id)) {
      return { success: true, message: 'Event already processed' }
    }

    // Record the event
    await DB.recordWebhookEvent({
      stripe_event_id: event.id,
      event_type: event.type,
      processed: false,
    })

    try {
      await this.handleWebhookEvent(event)
      await DB.markWebhookProcessed(event.id)
      
      return { success: true, message: 'Event processed successfully' }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await DB.markWebhookProcessed(event.id, errorMessage)
      
      throw error
    }
  }

  private static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription
        await PaymentService.syncSubscriptionToDatabase(subscription)
        break

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription
        await DB.cancelSubscription(deletedSubscription.id)
        break

      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const stripeSubscription = await this.getStripeClient().subscriptions.retrieve(
            session.subscription as string
          )
          await PaymentService.syncSubscriptionToDatabase(stripeSubscription)
        }
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  }
}

// Status Label Helper
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    trialing: 'Trial Period',
    past_due: 'Past Due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
    incomplete: 'Incomplete',
    incomplete_expired: 'Incomplete Expired',
    paused: 'Paused',
  }
  
  return labels[status] || status
}

// Configuration Export
export const config = {
  publishableKey: stripeConfig.publishableKey,
  currency: stripeConfig.currency,
  trialPeriodDays: stripeConfig.trialPeriodDays,
  priceIds: stripeConfig.priceIds,
}
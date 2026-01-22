/**
 * Simplified Billing Component
 * Clean, functional billing UI without unnecessary complexity
 */

"use client"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Loader2, CreditCard, TestTube, CheckCircle } from "lucide-react"
import { featureFlags } from "@/lib/config/feature-flags"
import { Alert, AlertDescription } from "@/components/ui/alert"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || "price_starter_monthly",
    features: ["1 User", "100 Contacts", "50 Deals", "Basic CRM", "Email Support"]
  },
  {
    id: "professional",
    name: "Professional",
    price: 79,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || "price_professional_monthly",
    popular: true,
    features: ["2-4 Users", "500 Contacts", "Unlimited Deals", "Email Integration", "Priority Support"]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 149,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise_monthly",
    features: ["5-10 Users", "Unlimited Everything", "Custom Branding", "API Access", "24/7 Support"]
  }
]

interface SubscriptionStatus {
  id: string
  status: string
  statusLabel: string
  priceId: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string
}

export function SimpleBilling() {
  // Testing Mode Override - Senior Engineer Approach
  if (featureFlags.enableFreeTesting) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Welcome to Dealvize!</h1>
          <p className="text-lg text-muted-foreground">
            You're in testing mode - enjoy full access to all features
          </p>
        </div>

        <Alert className="border-green-200 bg-green-50">
          <TestTube className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="flex items-center justify-between">
              <div>
                <Badge className="bg-green-100 text-green-800 mb-2">Testing Mode Active</Badge>
                <p>All premium features are unlocked for testing. No payment required.</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </AlertDescription>
        </Alert>

        <Card className="border-green-200">
          <CardHeader className="text-center">
            <CardTitle className="text-green-700">Enterprise Access Granted</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Unlimited Users</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>All Features</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Full Access</span>
              </div>
            </div>
            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full md:w-auto"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showPlanChange, setShowPlanChange] = useState(false)
  const { toast } = useToast()

  const supabase = createClient()

  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return

      const response = await fetch('/api/payments/subscription-simple', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
    } catch (error) {
      console.error('Failed to load subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (priceId: string) => {
    try {
      setProcessing(true)

      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        toast({ title: "Error", description: "Please sign in first", variant: "destructive" })
        return
      }

      const response = await fetch('/api/payments/checkout-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ priceId })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url

    } catch (error) {
      console.error('Subscription error:', error)
      toast({
        title: "Error",
        description: "Failed to start subscription process",
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return

    try {
      setProcessing(true)

      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return

      const response = await fetch('/api/payments/subscription-simple', {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      await loadSubscription()
      toast({ title: "Success", description: "Subscription canceled successfully" })

    } catch (error) {
      console.error('Cancel error:', error)
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  const handlePlanChange = async (newPriceId: string) => {
    try {
      setProcessing(true)

      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        toast({ title: "Error", description: "Please sign in first", variant: "destructive" })
        return
      }

      const response = await fetch('/api/payments/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ newPriceId })
      })

      if (!response.ok) {
        throw new Error('Failed to change plan')
      }

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe portal or checkout
        window.location.href = data.url
      } else {
        toast({ title: "Success", description: "Plan changed successfully" })
        loadSubscription() // Refresh subscription status
        setShowPlanChange(false)
      }
    } catch (error) {
      console.error('Plan change error:', error)
      toast({ title: "Error", description: "Failed to change plan", variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  // Show current subscription if exists
  if (subscription) {
    const currentPlan = plans.find(p => p.priceId === subscription.priceId)

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{currentPlan?.name || 'Unknown Plan'}</h3>
              <p className="text-sm text-muted-foreground">
                ${currentPlan?.price || 0}/month
              </p>
            </div>
            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
              {subscription.statusLabel}
            </Badge>
          </div>

          {subscription.cancelAtPeriodEnd && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                Your subscription will cancel on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {!subscription.cancelAtPeriodEnd && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowPlanChange(!showPlanChange)}
                  disabled={processing}
                >
                  Change Plan
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={processing}
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Cancel Subscription
                </Button>
              </>
            )}
          </div>

          {showPlanChange && (
            <div className="mt-4 space-y-4">
              <h3 className="font-semibold">Choose New Plan</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.filter(plan => plan.priceId !== subscription.priceId).map((plan) => (
                  <Card key={plan.id} className="relative">
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="text-2xl font-bold">
                        ${plan.price}<span className="text-sm font-normal">/mo</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ul className="space-y-1">
                        {plan.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="text-xs">• {feature}</li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => handlePlanChange(plan.priceId)}
                        disabled={processing}
                      >
                        {processing && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Switch to {plan.name}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Show plan selection if no subscription
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground">Start your 7-day free trial today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.popular ? "border-primary" : ""}>
            {plan.popular && (
              <div className="text-center -mt-3 mb-4">
                <Badge className="bg-primary">Most Popular</Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle>{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                ${plan.price}<span className="text-sm font-normal">/mo</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="text-sm">• {feature}</li>
                ))}
              </ul>

              <Button
                className="w-full"
                onClick={() => handleSubscribe(plan.priceId)}
                disabled={processing}
                variant={plan.popular ? "default" : "outline"}
              >
                {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Start Free Trial
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Gift, 
  Users, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  Star,
  ArrowRight,
  Loader2,
  AlertCircle
} from "lucide-react"

export default function ReferralPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [referralValid, setReferralValid] = useState(false)
  const [referralCode, setReferralCode] = useState('')

  useEffect(() => {
    const code = params.code as string
    if (!code) {
      setError('Invalid referral link')
      setLoading(false)
      return
    }

    validateReferral(code)
  }, [params.code])

  const validateReferral = async (code: string) => {
    try {
      // Track the referral click
      await fetch('/api/referral/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: code })
      })

      // Validate the referral code
      const response = await fetch(`/api/referral/track?code=${code}`)
      if (response.ok) {
        const data = await response.json()
        setReferralValid(data.valid)
        setReferralCode(data.referralCode)
        
        // Store referral code in localStorage for attribution after signup
        if (data.valid) {
          localStorage.setItem('dealvize_referral_code', data.referralCode)
        }
      } else {
        setError('Invalid or inactive referral link')
      }
    } catch (err) {
      setError('Failed to validate referral link')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = () => {
    // Redirect to signup with referral code preserved
    router.push('/auth/signup')
  }

  const handleSignIn = () => {
    router.push('/auth/signin')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dealvize-teal to-blue-600 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Validating referral link...</span>
        </div>
      </div>
    )
  }

  if (error || !referralValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dealvize-teal to-blue-600 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Referral Link</h2>
            <p className="text-gray-600 mb-6">
              {error || 'This referral link is invalid or has expired.'}
            </p>
            <Button 
              onClick={() => router.push('/auth/signup')}
              className="w-full bg-dealvize-teal hover:bg-dealvize-teal-dark"
            >
              Sign Up Anyway
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dealvize-teal to-blue-600">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white rounded-full p-4">
              <Gift className="h-12 w-12 text-dealvize-teal" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            You've Been Invited!
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Join thousands of real estate professionals using Dealvize CRM to manage their deals, 
            clients, and commissions more effectively.
          </p>
          <div className="mt-4">
            <Badge className="bg-white text-dealvize-teal text-sm px-4 py-2">
              Referral Code: {referralCode}
            </Badge>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-8 text-center">
              <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Commission Tracking</h3>
              <p className="text-gray-600">
                Track all your deals and automatically calculate commissions with our advanced pipeline management.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-xl">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Client Management</h3>
              <p className="text-gray-600">
                Keep all your clients organized with detailed profiles, communication history, and follow-up reminders.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-xl">
            <CardContent className="p-8 text-center">
              <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Performance Analytics</h3>
              <p className="text-gray-600">
                Get insights into your business performance with detailed analytics and reporting tools.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Special Offer */}
        <Card className="border-0 shadow-xl bg-white max-w-2xl mx-auto mb-8">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Special Referral Offer</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-bold text-green-800 mb-2">✨ Free Trial Extended</h4>
                <p className="text-sm text-green-700">Get 30 days free instead of 14 days</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">Target Priority Support</h4>
                <p className="text-sm text-blue-700">Fast-track onboarding and setup</p>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>No credit card required</span>
            </div>
          </CardContent>
        </Card>

        {/* CTA Buttons */}
        <div className="text-center space-y-4">
          <Button 
            onClick={handleSignUp}
            size="lg"
            className="bg-white text-dealvize-teal hover:bg-gray-50 text-lg px-8 py-4 shadow-xl"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          
          <div className="text-center">
            <button 
              onClick={handleSignIn}
              className="text-blue-100 hover:text-white underline text-sm"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center mt-16 text-blue-100">
          <div className="flex items-center justify-center space-x-8 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
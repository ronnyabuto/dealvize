'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authConfig } from '@/lib/auth/config'
import { featureFlags } from '@/lib/config/feature-flags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Chrome, UserPlus, Eye, EyeOff, Check, X } from 'lucide-react'

// Make this page dynamic to avoid SSR issues
export const dynamic = 'force-dynamic'

function SignUpForm() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') || 'Professional'
  const refCode = searchParams.get('ref')
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'Agent',
    phone: '',
    licenseNumber: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  })

  useEffect(() => {
    if (refCode) {
      localStorage.setItem('dealvize_referral_code', refCode.toUpperCase())
      // Use secure flag in production
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `dealvize_ref=${refCode.toUpperCase()}; max-age=2592000; path=/; SameSite=Lax${secure}`
    }
  }, [refCode])

  const checkPasswordStrength = (password: string) => {
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'password') checkPasswordStrength(value)
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // 1. Sign up (Trigger handles profile creation automatically)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: formData.name,
            role: formData.role,
            phone: formData.phone,
            license_number: formData.licenseNumber,
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('An account with this email already exists.')
        } else {
          setError(authError.message)
        }
        return
      }

      // 2. Handle Referral (Fire and Forget)
      const storedRef = localStorage.getItem('dealvize_referral_code')
      if (storedRef && authData.user) {
        fetch('/api/affiliate/attribution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode: storedRef })
        }).catch(console.error)
      }

      // 3. Redirect Logic
      if (authData.session) {
        // Immediate session available (Email confirmation disabled)
        if (featureFlags.enableFreeTesting) {
          window.location.href = '/dashboard'
        } else {
          window.location.href = `/billing?plan=${plan}`
        }
      } else {
        // Email confirmation required
        setSuccess(true)
      }

    } catch (err) {
      setError('An unexpected system error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a confirmation link to {formData.email}. Please verify your account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/auth/signin'} className="w-full">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join Dealvize today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <Button onClick={handleGoogleSignUp} disabled={loading} variant="outline" className="w-full">
            <Chrome className="mr-2 h-4 w-4" /> Sign up with Google
          </Button>

          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or sign up with email</span>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => handleInputChange('name', e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                value={formData.email} 
                onChange={(e) => handleInputChange('email', e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  minLength={8}
                />
                <Button
                  type="button" variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => handleInputChange('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agent">Real Estate Agent</SelectItem>
                  <SelectItem value="Broker">Broker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <UserPlus className="mr-2 h-4 w-4" />
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
          
          <div className="text-center text-sm">
            Already have an account? <a href="/auth/signin" className="text-primary hover:underline">Sign in</a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignUpForm />
    </Suspense>
  )
}
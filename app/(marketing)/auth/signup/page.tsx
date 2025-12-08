'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Chrome, UserPlus, Eye, EyeOff } from 'lucide-react'

// Force dynamic rendering to prevent build static generation errors
export const dynamic = 'force-dynamic'

function SignUpForm() {
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')
  
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', role: 'Agent', phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Referral Tracking
  useEffect(() => {
    if (refCode) {
      localStorage.setItem('dealvize_referral_code', refCode)
      document.cookie = `dealvize_ref=${refCode}; max-age=2592000; path=/; SameSite=Lax`
    }
  }, [refCode])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // 1. Create Auth User
      // The Database Trigger 'on_auth_user_created' will automatically 
      // create the public profile and commission settings.
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: formData.name,
            role: formData.role,
            phone: formData.phone, // Passed to trigger via raw_user_meta_data
          }
        }
      })

      if (authError) throw authError

      // 2. Handle Referral (Async - don't block flow)
      if (data.user?.id && localStorage.getItem('dealvize_referral_code')) {
        fetch('/api/affiliate/attribution', {
          method: 'POST',
          body: JSON.stringify({ referralCode: localStorage.getItem('dealvize_referral_code') })
        }).catch(console.error)
      }

      // 3. Redirect
      if (data.session) {
        // User is logged in immediately
        window.location.href = '/dashboard'
      } else {
        // Email confirmation required
        setError('Account created! Please check your email to confirm.')
      }

    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Get Started</CardTitle>
          <CardDescription>Create your Dealvize account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant={error.includes('created') ? "default" : "destructive"} className={error.includes('created') ? "bg-green-50 text-green-800 border-green-200" : ""}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button variant="outline" className="w-full" onClick={handleGoogleSignUp}>
            <Chrome className="mr-2 h-4 w-4" /> Sign up with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><Separator /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">Or email</span></div>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required 
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agent">Real Estate Agent</SelectItem>
                  <SelectItem value="Broker">Broker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <span className="animate-pulse">Creating...</span> : <><UserPlus className="mr-2 h-4 w-4" /> Create Account</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
      <SignUpForm />
    </Suspense>
  )
}
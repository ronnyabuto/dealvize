'use client'

/**
 * Invitation Acceptance Page
 * Secure token-based invitation processing and account creation
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Mail, 
  Users, 
  Building,
  Calendar,
  Shield
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface InvitationData {
  id: string
  email: string
  role: string
  status: string
  expires_at: string
  tenant: {
    id: string
    name: string
    industry?: string
  }
  invited_by: {
    name: string
    email: string
  }
  custom_message?: string
}

const AcceptInvitationSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type AcceptInvitationForm = z.infer<typeof AcceptInvitationSchema>

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm<AcceptInvitationForm>({
    resolver: zodResolver(AcceptInvitationSchema)
  })

  const supabase = createClient()

  // Load invitation data
  useEffect(() => {
    if (token) {
      loadInvitation()
    }
  }, [token])

  const loadInvitation = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/invitations/verify/${token}`)
      
      if (response.ok) {
        const data = await response.json()
        setInvitation(data.invitation)
        
        // Pre-fill email if available
        if (data.invitation.email) {
          // Email is read-only, just display it
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Invalid or expired invitation')
      }
    } catch (error) {
      console.error('Error loading invitation:', error)
      setError('Failed to load invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: AcceptInvitationForm) => {
    if (!invitation) return

    try {
      setAccepting(true)
      
      // Create user account and accept invitation
      const response = await fetch(`/api/invitations/accept/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password
        })
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(true)
        toast.success('Account created successfully! Redirecting to dashboard...')
        
        // Wait a moment then redirect to sign in
        setTimeout(() => {
          router.push(`/auth/signin?email=${encodeURIComponent(invitation.email)}&message=account_created`)
        }, 2000)
      } else {
        const errorData = await response.json()
        if (errorData.details) {
          errorData.details.forEach((detail: any) => {
            form.setError(detail.field as any, { message: detail.message })
          })
        } else {
          setError(errorData.error || 'Failed to accept invitation')
        }
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setError('Failed to accept invitation. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { name: string; color: string; icon: string }> = {
      admin: { name: 'Administrator', color: '#3b82f6', icon: '⚡' },
      manager: { name: 'Manager', color: '#8b5cf6', icon: '👥' },
      agent: { name: 'Agent', color: '#f59e0b', icon: '🏠' },
      viewer: { name: 'Viewer', color: '#6b7280', icon: '👁️' }
    }
    
    return roleConfig[role] || { name: role, color: '#6b7280', icon: '👤' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-900">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {error || 'This invitation link is invalid or has expired.'}
              </AlertDescription>
            </Alert>
            <div className="mt-6 text-center">
              <Button 
                variant="outline" 
                onClick={() => router.push('/auth/signin')}
              >
                Go to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-900">Welcome to Dealvize!</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                Your account has been created successfully. You'll be redirected to sign in shortly.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = new Date(invitation.expires_at) < new Date()
  const roleBadge = getRoleBadge(invitation.role)

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <CardTitle className="text-orange-900">Invitation Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                This invitation expired on {new Date(invitation.expires_at).toLocaleDateString()}.
                Please contact your team administrator for a new invitation.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Join {invitation.tenant.name}</CardTitle>
          <p className="text-gray-600 mt-2">
            You've been invited to join the team on Dealvize
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">You're joining as:</span>
              <Badge 
                variant="outline" 
                style={{ borderColor: roleBadge.color, color: roleBadge.color }}
              >
                {roleBadge.icon} {roleBadge.name}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Organization:</span>
              <span className="font-medium">{invitation.tenant.name}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Invited by:</span>
              <span className="font-medium">{invitation.invited_by.name}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Expires:</span>
              <span className="font-medium">{new Date(invitation.expires_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Custom Message */}
          {invitation.custom_message && (
            <Alert>
              <AlertDescription>
                <strong>Message from {invitation.invited_by.name}:</strong>
                <br />
                "{invitation.custom_message}"
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Account Creation Form */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Create Your Account
            </h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Display */}
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input 
                    value={invitation.email} 
                    disabled 
                    className="bg-gray-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Create a secure password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={accepting}>
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Accept Invitation & Create Account'
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
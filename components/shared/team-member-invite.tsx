"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserPlus, Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['member', 'admin']),
  message: z.string().optional()
})

type InviteFormData = z.infer<typeof inviteSchema>

interface TeamMemberInviteProps {
  remainingSlots: number
}

export function TeamMemberInvite({ remainingSlots }: TeamMemberInviteProps) {
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'member',
      message: ''
    }
  })

  const onSubmit = async (data: InviteFormData) => {
    if (remainingSlots <= 0) {
      form.setError('root', {
        type: 'manual',
        message: 'No available slots in your current plan. Please upgrade to invite more members.'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }

      const result = await response.json()
      setSuccess(`Invitation sent successfully to ${data.email}`)
      form.reset()
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (error) {
      form.setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Failed to send invitation'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite Team Member
        </CardTitle>
        <p className="text-sm text-gray-600">
          {remainingSlots > 0 
            ? `${remainingSlots} slots remaining in your plan`
            : 'No available slots - upgrade your plan to add more members'
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {success && (
          <Alert className="bg-green-50 text-green-900 border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                {...form.register('email')}
                className={form.formState.errors.email ? 'border-red-500' : ''}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={form.watch('role')} 
                onValueChange={(value) => form.setValue('role', value as 'member' | 'admin')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex flex-col">
                      <span className="font-medium">Member</span>
                      <span className="text-xs text-gray-500">Can manage own data and assigned leads</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col">
                      <span className="font-medium">Admin</span>
                      <span className="text-xs text-gray-500">Full access including team management</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Input
              id="message"
              placeholder="Welcome to our team! Looking forward to working with you."
              {...form.register('message')}
            />
          </div>

          <div className="flex items-center gap-4">
            <Button 
              type="submit" 
              disabled={loading || remainingSlots <= 0}
              className="bg-dealvize-teal hover:bg-dealvize-teal-dark"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
            
            {remainingSlots <= 0 && (
              <p className="text-sm text-red-600 font-medium">
                Upgrade your plan to invite more members
              </p>
            )}
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• The invitee will receive an email with setup instructions</li>
            <li>• They'll create their account and join your team workspace</li>
            <li>• You can assign leads and monitor their activity from this dashboard</li>
            <li>• Team members can collaborate on deals and share client information</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
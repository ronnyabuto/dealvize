"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Share2 } from "lucide-react"
import { SimpleBilling } from "./billing-simple"
import { userProfileSchema, userPreferencesSchema, type UserProfileFormData, type UserPreferencesFormData } from "@/lib/validations"
import { CommissionForm } from "@/components/settings/commission-form"

export function SettingsContent() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    taskReminders: true,
    dealUpdates: true,
    clientActivity: false
  })
  
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const profileForm = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      licenseNumber: ""
    }
  })


  const preferencesForm = useForm<UserPreferencesFormData>({
    resolver: zodResolver(userPreferencesSchema),
    defaultValues: {
      timezone: "America/New_York",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      language: "English",
      currency: "USD",
      theme: "system"
    }
  })

  // Load profile data on component mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const profile = await response.json()
          profileForm.reset(profile)
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      }
    }
    
    loadProfile()
  }, [profileForm])


  const onProfileSubmit = async (data: UserProfileFormData) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save profile')
      }

      const updatedProfile = await response.json()
      profileForm.reset(updatedProfile)
      
      // Show success message
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      profileForm.setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Failed to save profile. Please try again.'
      })
    }
  }

  const onPreferencesSubmit = async (data: UserPreferencesFormData) => {
    try {
      // Format data for the existing preferences API
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: {
            timezone: data.timezone,
            dateFormat: data.dateFormat,
            timeFormat: data.timeFormat,
            language: data.language,
            defaultCurrency: data.currency,
            theme: data.theme
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      preferencesForm.reset(data)
      setSuccess('Preferences saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      preferencesForm.setError('root', {
        type: 'manual',
        message: 'Failed to save preferences. Please try again.'
      })
    }
  }

  const handleCommissionSuccess = () => {
    setSuccess('Commission settings saved successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }


  // Notification settings handler
  const handleSaveNotifications = async () => {
    setNotificationLoading(true)
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      })

      if (!response.ok) {
        throw new Error('Failed to save notification settings')
      }

      setSuccess('Notification settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error saving notifications:', error)
      // You could add error state here if needed
    } finally {
      setNotificationLoading(false)
    }
  }

  // Integration handlers
  const handleConnectIntegration = async (providerName: string) => {
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_name: providerName, action: 'connect' })
      })

      const data = await response.json()
      
      if (response.ok && data.auth_url) {
        // Redirect to OAuth URL
        window.location.href = data.auth_url
      } else {
        alert(data.error || `Failed to connect to ${providerName}`)
      }
    } catch (error) {
      alert(`Failed to connect to ${providerName}`)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {profileForm.formState.errors.root && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{profileForm.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}
          
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter license number" {...field} />
                      </FormControl>
                      <FormDescription>
                        Optional real estate license number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Application Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Application Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          {preferencesForm.formState.errors.root && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{preferencesForm.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}
          
          <Form {...preferencesForm}>
            <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={preferencesForm.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={preferencesForm.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={preferencesForm.control}
                  name="dateFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Format</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={preferencesForm.control}
                  name="timeFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Format</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="12h">12 Hour</SelectItem>
                          <SelectItem value="24h">24 Hour</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={preferencesForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                          <SelectItem value="CAD">CAD (C$)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={preferencesForm.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={preferencesForm.formState.isSubmitting}>
                {preferencesForm.formState.isSubmitting ? "Saving..." : "Save Preferences"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <div className="text-sm text-muted-foreground">
                  Receive notifications via email
                </div>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <div className="text-sm text-muted-foreground">
                  Receive push notifications in browser
                </div>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications({...notifications, push: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Task Reminders</Label>
                <div className="text-sm text-muted-foreground">
                  Get reminded about upcoming tasks
                </div>
              </div>
              <Switch
                checked={notifications.taskReminders}
                onCheckedChange={(checked) => setNotifications({...notifications, taskReminders: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Deal Updates</Label>
                <div className="text-sm text-muted-foreground">
                  Notifications when deal status changes
                </div>
              </div>
              <Switch
                checked={notifications.dealUpdates}
                onCheckedChange={(checked) => setNotifications({...notifications, dealUpdates: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Client Activity</Label>
                <div className="text-sm text-muted-foreground">
                  Notifications for client interactions
                </div>
              </div>
              <Switch
                checked={notifications.clientActivity}
                onCheckedChange={(checked) => setNotifications({...notifications, clientActivity: checked})}
              />
            </div>
          </div>
          <Button onClick={handleSaveNotifications} disabled={notificationLoading}>
            {notificationLoading ? 'Saving...' : 'Save Notification Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Commission Settings */}
      <CommissionForm onSuccess={handleCommissionSuccess} />

      {/* Subscription & Billing */}
      <SimpleBilling />

      {/* Partner Program Promotion */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <Share2 className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-green-900">Join Our Partner Program</h4>
              <p className="text-sm text-green-700 mt-1">
                Earn up to 30% commission by referring new users to Dealvize
              </p>
            </div>
            <Link href="/affiliate">
              <Button className="bg-green-600 hover:bg-green-700">
                Get Started
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-sm">
                  S
                </div>
                <div>
                  <h4 className="font-medium">Stripe</h4>
                  <p className="text-sm text-gray-600">Payment processing</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
                  M
                </div>
                <div>
                  <h4 className="font-medium">Mailchimp</h4>
                  <p className="text-sm text-gray-600">Email marketing</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleConnectIntegration('mailchimp')}>
                Connect
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white font-bold text-sm">
                  Z
                </div>
                <div>
                  <h4 className="font-medium">Zapier</h4>
                  <p className="text-sm text-gray-600">Workflow automation</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleConnectIntegration('zapier')}>
                Connect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

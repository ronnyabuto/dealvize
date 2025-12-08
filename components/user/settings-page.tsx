'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  User, Bell, Shield, Palette, Clock, Globe, 
  DollarSign, Save, RotateCcw, Download, Upload,
  CheckCircle, AlertTriangle, Settings, Monitor
} from 'lucide-react'
import { UserPreferences, UserPreferencesManager } from '@/lib/user/preferences'

interface SettingsPageProps {
  userId: string
}

export function SettingsPage({ userId }: SettingsPageProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [preferencesManager, setPreferencesManager] = useState<UserPreferencesManager | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [userId])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const manager = await UserPreferencesManager.loadPreferences(userId)
      setPreferencesManager(manager)
      setPreferences(manager.getPreferences())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!preferencesManager) return

    try {
      setSaving(true)
      await preferencesManager.updatePreference(key, value)
      setPreferences(preferencesManager.getPreferences())
      showSuccessMessage('Preference updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference')
    } finally {
      setSaving(false)
    }
  }

  const updateNestedPreference = async (
    section: keyof UserPreferences,
    key: string,
    value: any
  ) => {
    if (!preferencesManager || !preferences) return

    try {
      setSaving(true)
      const currentSection = preferences[section] as any
      const updatedSection = { ...currentSection, [key]: value }
      await preferencesManager.updatePreference(section, updatedSection)
      setPreferences(preferencesManager.getPreferences())
      showSuccessMessage('Preference updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference')
    } finally {
      setSaving(false)
    }
  }

  const resetPreferences = async (section?: keyof UserPreferences) => {
    if (!preferencesManager) return

    try {
      setSaving(true)
      if (section) {
        await preferencesManager.resetPreferenceSection(section)
        showSuccessMessage(`${section} preferences reset to defaults`)
      } else {
        await preferencesManager.resetPreferences()
        showSuccessMessage('All preferences reset to defaults')
      }
      setPreferences(preferencesManager.getPreferences())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset preferences')
    } finally {
      setSaving(false)
    }
  }

  const exportPreferences = () => {
    if (!preferencesManager) return

    const data = preferencesManager.exportPreferences()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dealvize-preferences-${userId}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importPreferences = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !preferencesManager) return

    try {
      setSaving(true)
      const text = await file.text()
      await preferencesManager.importPreferences(text)
      setPreferences(preferencesManager.getPreferences())
      showSuccessMessage('Preferences imported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import preferences')
    } finally {
      setSaving(false)
    }
  }

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>Loading preferences...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load user preferences</p>
          <Button onClick={loadPreferences} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-gray-600">Manage your account preferences and settings</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportPreferences} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label>
            <input
              type="file"
              accept=".json"
              onChange={importPreferences}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
          </label>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">
            <User className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="business">
            <DollarSign className="h-4 w-4 mr-2" />
            Business
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Settings className="h-4 w-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>Configure your language, timezone, and date/time formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) => updatePreference('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Timezone</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) => updatePreference('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Format</Label>
                  <Select
                    value={preferences.dateFormat}
                    onValueChange={(value: any) => updatePreference('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Time Format</Label>
                  <Select
                    value={preferences.timeFormat}
                    onValueChange={(value: any) => updatePreference('timeFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dashboard Preferences</CardTitle>
              <CardDescription>Customize your dashboard layout and default view</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Layout Style</Label>
                  <Select
                    value={preferences.dashboardLayout}
                    onValueChange={(value: any) => updatePreference('dashboardLayout', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid View</SelectItem>
                      <SelectItem value="list">List View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Default View</Label>
                  <Select
                    value={preferences.defaultDashboardView}
                    onValueChange={(value: any) => updatePreference('defaultDashboardView', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deals">Deals</SelectItem>
                      <SelectItem value="clients">Clients</SelectItem>
                      <SelectItem value="tasks">Tasks</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Welcome Message</Label>
                  <p className="text-sm text-gray-600">Display welcome message on dashboard</p>
                </div>
                <Switch
                  checked={preferences.showWelcomeMessage}
                  onCheckedChange={(checked) => updatePreference('showWelcomeMessage', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-gray-600">Use compact layout to fit more information</p>
                </div>
                <Switch
                  checked={preferences.compactMode}
                  onCheckedChange={(checked) => updatePreference('compactMode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>Customize the appearance of your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value: any) => updatePreference('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-white border mr-2"></div>
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-gray-800 mr-2"></div>
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center">
                        <Monitor className="w-4 h-4 mr-2" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure which email notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>New Deals</Label>
                  <p className="text-sm text-gray-600">Get notified when new deals are created</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications.newDeals}
                  onCheckedChange={(checked) => updateNestedPreference('emailNotifications', 'newDeals', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Task Reminders</Label>
                  <p className="text-sm text-gray-600">Receive reminders for upcoming tasks</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications.taskReminders}
                  onCheckedChange={(checked) => updateNestedPreference('emailNotifications', 'taskReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>System Updates</Label>
                  <p className="text-sm text-gray-600">Important system updates and maintenance notices</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications.systemUpdates}
                  onCheckedChange={(checked) => updateNestedPreference('emailNotifications', 'systemUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing Emails</Label>
                  <p className="text-sm text-gray-600">Product updates, tips, and promotional content</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications.marketingEmails}
                  onCheckedChange={(checked) => updateNestedPreference('emailNotifications', 'marketingEmails', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekly Digest</Label>
                  <p className="text-sm text-gray-600">Weekly summary of your activity and performance</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications.weeklyDigest}
                  onCheckedChange={(checked) => updateNestedPreference('emailNotifications', 'weeklyDigest', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In-App Notifications</CardTitle>
              <CardDescription>Configure notifications within the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>New Messages</Label>
                  <p className="text-sm text-gray-600">Show notifications for new messages</p>
                </div>
                <Switch
                  checked={preferences.inAppNotifications.newMessages}
                  onCheckedChange={(checked) => updateNestedPreference('inAppNotifications', 'newMessages', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Task Deadlines</Label>
                  <p className="text-sm text-gray-600">Alert when tasks are approaching deadlines</p>
                </div>
                <Switch
                  checked={preferences.inAppNotifications.taskDeadlines}
                  onCheckedChange={(checked) => updateNestedPreference('inAppNotifications', 'taskDeadlines', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Deal Updates</Label>
                  <p className="text-sm text-gray-600">Notify when deals are updated or change status</p>
                </div>
                <Switch
                  checked={preferences.inAppNotifications.dealUpdates}
                  onCheckedChange={(checked) => updateNestedPreference('inAppNotifications', 'dealUpdates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>System Alerts</Label>
                  <p className="text-sm text-gray-600">Important system alerts and warnings</p>
                </div>
                <Switch
                  checked={preferences.inAppNotifications.systemAlerts}
                  onCheckedChange={(checked) => updateNestedPreference('inAppNotifications', 'systemAlerts', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Currency & Commission</CardTitle>
              <CardDescription>Configure your business financial settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Default Currency</Label>
                  <Select
                    value={preferences.defaultCurrency}
                    onValueChange={(value) => updatePreference('defaultCurrency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                      <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Commission Structure</Label>
                  <Select
                    value={preferences.commissionStructure}
                    onValueChange={(value: any) => updatePreference('commissionStructure', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                      <SelectItem value="tiered">Tiered</SelectItem>
                      <SelectItem value="progressive">Progressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Default Commission Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={preferences.defaultCommissionRate}
                  onChange={(e) => updatePreference('defaultCommissionRate', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your data privacy and sharing preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Analytics Tracking</Label>
                  <p className="text-sm text-gray-600">Allow anonymous usage analytics to help improve the product</p>
                </div>
                <Switch
                  checked={preferences.analyticsEnabled}
                  onCheckedChange={(checked) => updatePreference('analyticsEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Sharing</Label>
                  <p className="text-sm text-gray-600">Share anonymized data for research and development</p>
                </div>
                <Switch
                  checked={preferences.dataSharingEnabled}
                  onCheckedChange={(checked) => updatePreference('dataSharingEnabled', checked)}
                />
              </div>

              <div>
                <Label>Profile Visibility</Label>
                <Select
                  value={preferences.profileVisibility}
                  onValueChange={(value: any) => updatePreference('profileVisibility', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="team">Team Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Advanced features and experimental options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Save</Label>
                  <p className="text-sm text-gray-600">Automatically save your work as you type</p>
                </div>
                <Switch
                  checked={preferences.autoSave}
                  onCheckedChange={(checked) => updatePreference('autoSave', checked)}
                />
              </div>

              <div>
                <Label>Auto-Save Interval (minutes)</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={preferences.autoSaveInterval}
                  onChange={(e) => updatePreference('autoSaveInterval', parseInt(e.target.value) || 5)}
                  disabled={!preferences.autoSave}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Confirm Deletions</Label>
                  <p className="text-sm text-gray-600">Show confirmation dialogs before deleting items</p>
                </div>
                <Switch
                  checked={preferences.confirmDeletions}
                  onCheckedChange={(checked) => updatePreference('confirmDeletions', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Advanced Features</Label>
                  <p className="text-sm text-gray-600">Show advanced features and options</p>
                </div>
                <Switch
                  checked={preferences.showAdvancedFeatures}
                  onCheckedChange={(checked) => updatePreference('showAdvancedFeatures', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Beta Features</Label>
                  <p className="text-sm text-gray-600">Enable experimental features (may be unstable)</p>
                </div>
                <div className="flex items-center space-x-2">
                  {preferences.betaFeatures && <Badge variant="secondary">Beta</Badge>}
                  <Switch
                    checked={preferences.betaFeatures}
                    onCheckedChange={(checked) => updatePreference('betaFeatures', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reset Settings</CardTitle>
              <CardDescription>Reset your preferences to default values</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Reset All Preferences</p>
                  <p className="text-sm text-gray-600">This will reset all your preferences to default values</p>
                </div>
                <Button
                  onClick={() => resetPreferences()}
                  disabled={saving}
                  variant="destructive"
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
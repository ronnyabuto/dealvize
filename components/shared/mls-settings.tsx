'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Loader2, 
  Save, 
  RefreshCw, 
  Database, 
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface MLSStatus {
  isConnected: boolean
  lastSync?: string
  apiStatus: 'healthy' | 'degraded' | 'down'
  authStatus: 'valid' | 'expired' | 'invalid'
  rateLimitStatus: {
    remainingRequests: number
    resetTime: string
  }
  errors?: string[]
}

interface SyncStats {
  totalEntries: number
  freshEntries: number
  staleEntries: number
  cacheHitRate: number
  memoryUsage: string
}

export function MLSSettings() {
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [status, setStatus] = useState<MLSStatus | null>(null)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [settings, setSettings] = useState({
    // API Configuration
    provider: 'RapidAPI',
    environment: 'production',
    clientId: '',
    clientSecret: '',
    apiUrl: 'https://us-real-estate.p.rapidapi.com',
    
    // Rate Limiting
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    
    // Caching
    propertyCacheTTL: 300, // 5 minutes
    searchCacheTTL: 180,   // 3 minutes
    photosCacheTTL: 1800,  // 30 minutes
    
    // Sync Settings
    enableAutoSync: true,
    syncInterval: 15, // minutes
    batchSize: 100,
    
    // Features
    enableAutoPopulate: true,
    enableMarketAnalysis: true,
    enablePriceHistory: true,
    enableComparables: true,
    
    // Columbus Specific
    defaultSearchRadius: 1.0, // miles
    includeSchoolData: true,
    includeNeighborhoodData: true,
    includeTaxData: true
  })

  useEffect(() => {
    loadSettings()
    loadStatus()
    loadSyncStats()
  }, [])

  const loadSettings = async () => {
    // In production, load from user settings
    // For now, use environment variables or defaults
    const savedSettings = localStorage.getItem('mls-settings')
    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) })
    }
  }

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/mls/status')
      if (response.ok) {
        const statusData = await response.json()
        setStatus(statusData)
      }
    } catch (error) {
      console.error('Failed to load MLS status:', error)
    }
  }

  const loadSyncStats = async () => {
    try {
      const response = await fetch('/api/mls/sync/stats')
      if (response.ok) {
        const stats = await response.json()
        setSyncStats(stats)
      }
    } catch (error) {
      console.error('Failed to load sync stats:', error)
    }
  }

  const handleSettingChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Save to localStorage for demo
      localStorage.setItem('mls-settings', JSON.stringify(settings))
      
      // In production, save to database/API
      const response = await fetch('/api/mls/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('MLS settings saved successfully')
        await loadStatus() // Refresh status
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Save settings error:', error)
      setError('Failed to save settings. Please try again.')
      toast.error('Failed to save MLS settings')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    
    try {
      const response = await fetch('/api/mls/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settings.provider,
          clientId: settings.clientId,
          clientSecret: settings.clientSecret,
          apiUrl: settings.apiUrl
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('MLS connection test successful')
        await loadStatus()
      } else {
        toast.error(result.error || 'Connection test failed')
      }
    } catch (error) {
      console.error('Connection test error:', error)
      toast.error('Connection test failed')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleForceSync = async () => {
    try {
      const response = await fetch('/api/mls/sync/force', {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Full MLS sync initiated')
        await loadStatus()
        await loadSyncStats()
      } else {
        toast.error('Failed to initiate sync')
      }
    } catch (error) {
      console.error('Force sync error:', error)
      toast.error('Failed to initiate sync')
    }
  }

  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/mls/cache/clear', {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('MLS cache cleared')
        await loadSyncStats()
      } else {
        toast.error('Failed to clear cache')
      }
    } catch (error) {
      console.error('Clear cache error:', error)
      toast.error('Failed to clear cache')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'degraded':
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'down':
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'valid':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded':
      case 'expired':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'down':
      case 'invalid':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MLS Integration Settings</h1>
          <p className="text-gray-600">Configure Columbus MLS integration and sync preferences</p>
        </div>
        <Button 
          onClick={handleSaveSettings}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              MLS Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Connection</Label>
                <Badge className={getStatusColor(status.apiStatus)}>
                  {getStatusIcon(status.apiStatus)}
                  <span className="ml-1 capitalize">{status.apiStatus}</span>
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Authentication</Label>
                <Badge className={getStatusColor(status.authStatus)}>
                  {getStatusIcon(status.authStatus)}
                  <span className="ml-1 capitalize">{status.authStatus}</span>
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Rate Limit</Label>
                <div className="text-sm">
                  {status.rateLimitStatus.remainingRequests} remaining
                  <br />
                  <span className="text-gray-500">
                    Resets: {new Date(status.rateLimitStatus.resetTime).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Last Sync</Label>
                <div className="text-sm">
                  {status.lastSync 
                    ? new Date(status.lastSync).toLocaleString()
                    : 'Never'
                  }
                </div>
              </div>
            </div>

            {status.errors && status.errors.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {status.errors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleTestConnection}
                disabled={testingConnection}
                variant="outline"
                size="sm"
              >
                {testingConnection ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
              <Button
                onClick={handleForceSync}
                variant="outline"
                size="sm"
              >
                <Database className="h-4 w-4 mr-2" />
                Force Sync
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Statistics */}
      {syncStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Cache Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{syncStats.totalEntries}</div>
                <div className="text-sm text-gray-500">Total Entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{syncStats.freshEntries}</div>
                <div className="text-sm text-gray-500">Fresh</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{syncStats.staleEntries}</div>
                <div className="text-sm text-gray-500">Stale</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{(syncStats.cacheHitRate * 100).toFixed(1)}%</div>
                <div className="text-sm text-gray-500">Hit Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{syncStats.memoryUsage}</div>
                <div className="text-sm text-gray-500">Memory</div>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleClearCache}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="sync">Sync Settings</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="columbus">Columbus Specific</TabsTrigger>
        </TabsList>

        {/* Connection Settings */}
        <TabsContent value="connection">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure Columbus MLS API connection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">MLS Provider</Label>
                  <Select value={settings.provider} onValueChange={(value) => handleSettingChange('provider', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CMLS">Columbus MLS (CMLS)</SelectItem>
                      <SelectItem value="RESO">RESO Web API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select value={settings.environment} onValueChange={(value) => handleSettingChange('environment', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                  id="apiUrl"
                  value={settings.apiUrl}
                  onChange={(e) => handleSettingChange('apiUrl', e.target.value)}
                  placeholder="https://api.columbusrealtors.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    value={settings.clientId}
                    onChange={(e) => handleSettingChange('clientId', e.target.value)}
                    placeholder="Enter your MLS client ID"
                    type="password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    value={settings.clientSecret}
                    onChange={(e) => handleSettingChange('clientSecret', e.target.value)}
                    placeholder="Enter your MLS client secret"
                    type="password"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Rate Limiting</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requestsPerMinute">Requests per Minute</Label>
                    <Input
                      id="requestsPerMinute"
                      type="number"
                      value={settings.requestsPerMinute}
                      onChange={(e) => handleSettingChange('requestsPerMinute', parseInt(e.target.value))}
                      min="1"
                      max="300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requestsPerHour">Requests per Hour</Label>
                    <Input
                      id="requestsPerHour"
                      type="number"
                      value={settings.requestsPerHour}
                      onChange={(e) => handleSettingChange('requestsPerHour', parseInt(e.target.value))}
                      min="1"
                      max="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requestsPerDay">Requests per Day</Label>
                    <Input
                      id="requestsPerDay"
                      type="number"
                      value={settings.requestsPerDay}
                      onChange={(e) => handleSettingChange('requestsPerDay', parseInt(e.target.value))}
                      min="1"
                      max="100000"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Settings */}
        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Settings</CardTitle>
              <CardDescription>
                Configure how data is synchronized with the MLS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto Sync</Label>
                  <p className="text-sm text-gray-500">Automatically sync MLS data in the background</p>
                </div>
                <Switch
                  checked={settings.enableAutoSync}
                  onCheckedChange={(checked) => handleSettingChange('enableAutoSync', checked)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                  <Input
                    id="syncInterval"
                    type="number"
                    value={settings.syncInterval}
                    onChange={(e) => handleSettingChange('syncInterval', parseInt(e.target.value))}
                    min="5"
                    max="1440"
                    disabled={!settings.enableAutoSync}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchSize">Batch Size</Label>
                  <Input
                    id="batchSize"
                    type="number"
                    value={settings.batchSize}
                    onChange={(e) => handleSettingChange('batchSize', parseInt(e.target.value))}
                    min="10"
                    max="1000"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Cache Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="propertyCacheTTL">Property Cache (seconds)</Label>
                    <Input
                      id="propertyCacheTTL"
                      type="number"
                      value={settings.propertyCacheTTL}
                      onChange={(e) => handleSettingChange('propertyCacheTTL', parseInt(e.target.value))}
                      min="60"
                      max="86400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="searchCacheTTL">Search Cache (seconds)</Label>
                    <Input
                      id="searchCacheTTL"
                      type="number"
                      value={settings.searchCacheTTL}
                      onChange={(e) => handleSettingChange('searchCacheTTL', parseInt(e.target.value))}
                      min="30"
                      max="3600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photosCacheTTL">Photos Cache (seconds)</Label>
                    <Input
                      id="photosCacheTTL"
                      type="number"
                      value={settings.photosCacheTTL}
                      onChange={(e) => handleSettingChange('photosCacheTTL', parseInt(e.target.value))}
                      min="300"
                      max="86400"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Settings */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Configuration</CardTitle>
              <CardDescription>
                Enable or disable MLS integration features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-Populate Properties</Label>
                    <p className="text-sm text-gray-500">Automatically fill property details when creating deals</p>
                  </div>
                  <Switch
                    checked={settings.enableAutoPopulate}
                    onCheckedChange={(checked) => handleSettingChange('enableAutoPopulate', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Market Analysis</Label>
                    <p className="text-sm text-gray-500">Generate comparable sales and market analysis reports</p>
                  </div>
                  <Switch
                    checked={settings.enableMarketAnalysis}
                    onCheckedChange={(checked) => handleSettingChange('enableMarketAnalysis', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Price History</Label>
                    <p className="text-sm text-gray-500">Track property price changes and market timing</p>
                  </div>
                  <Switch
                    checked={settings.enablePriceHistory}
                    onCheckedChange={(checked) => handleSettingChange('enablePriceHistory', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Comparable Sales</Label>
                    <p className="text-sm text-gray-500">Find and analyze comparable property sales</p>
                  </div>
                  <Switch
                    checked={settings.enableComparables}
                    onCheckedChange={(checked) => handleSettingChange('enableComparables', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Columbus Specific Settings */}
        <TabsContent value="columbus">
          <Card>
            <CardHeader>
              <CardTitle>Columbus Market Settings</CardTitle>
              <CardDescription>
                Columbus, Ohio specific market data and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="defaultSearchRadius">Default Search Radius (miles)</Label>
                <Input
                  id="defaultSearchRadius"
                  type="number"
                  step="0.1"
                  value={settings.defaultSearchRadius}
                  onChange={(e) => handleSettingChange('defaultSearchRadius', parseFloat(e.target.value))}
                  min="0.1"
                  max="10"
                />
                <p className="text-sm text-gray-500">Default radius for comparable sales searches</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Additional Data Sources</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">School District Data</Label>
                    <p className="text-sm text-gray-500">Include Columbus school district information</p>
                  </div>
                  <Switch
                    checked={settings.includeSchoolData}
                    onCheckedChange={(checked) => handleSettingChange('includeSchoolData', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Neighborhood Data</Label>
                    <p className="text-sm text-gray-500">Include neighborhood demographics and trends</p>
                  </div>
                  <Switch
                    checked={settings.includeNeighborhoodData}
                    onCheckedChange={(checked) => handleSettingChange('includeNeighborhoodData', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Tax Assessment Data</Label>
                    <p className="text-sm text-gray-500">Include Franklin County tax assessment information</p>
                  </div>
                  <Switch
                    checked={settings.includeTaxData}
                    onCheckedChange={(checked) => handleSettingChange('includeTaxData', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
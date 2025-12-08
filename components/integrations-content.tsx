"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Settings, ExternalLink, Loader2, CheckCircle, AlertCircle } from "lucide-react"

const availableIntegrations = [
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Email marketing and newsletter management",
    category: "Marketing",
    icon: "M",
    iconColor: "bg-yellow-600",
    popular: true,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "CRM and marketing automation platform",
    category: "CRM",
    icon: "H",
    iconColor: "bg-orange-500",
    popular: true,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team communication and notifications",
    category: "Communication",
    icon: "S",
    iconColor: "bg-purple-500",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Schedule management and appointment booking",
    category: "Productivity",
    icon: "G",
    iconColor: "bg-blue-600",
  },
  {
    id: "docusign",
    name: "DocuSign",
    description: "Digital document signing and contracts",
    category: "Documents",
    icon: "D",
    iconColor: "bg-yellow-500",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Accounting and financial management",
    category: "Finance",
    icon: "Q",
    iconColor: "bg-green-600",
  },
]

const affiliateIntegrations = [
  {
    id: "idevaffiliate",
    name: "iDevAffiliate",
    description: "Complete affiliate tracking and management system",
    category: "Affiliate",
    icon: "I",
    iconColor: "bg-blue-700",
    features: ["Real-time tracking", "Commission management", "Affiliate dashboard", "Payment processing"],
    pricing: "Starting at $99/month",
  },
  {
    id: "post-affiliate-pro",
    name: "Post Affiliate Pro",
    description: "Advanced affiliate marketing software",
    category: "Affiliate",
    icon: "P",
    iconColor: "bg-red-600",
    features: ["Multi-tier commissions", "Fraud detection", "Custom landing pages", "API integration"],
    pricing: "Starting at $97/month",
  },
]

interface Integration {
  id: string
  name: string
  display_name: string
  description: string
  category: string
  auth_type: string
  connected: boolean
  status: string
  last_sync_at?: string
  error_message?: string
  config: any
}

export function IntegrationsContent() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations')
      if (response.ok) {
        const data = await response.json()
        setIntegrations(data.integrations || [])
      } else {
        // Fallback to static integrations if API fails
        console.warn('API failed, showing static integrations')
        const staticIntegrations = availableIntegrations.map(integration => ({
          id: integration.id,
          name: integration.id,
          display_name: integration.name,
          description: integration.description,
          category: integration.category,
          auth_type: 'oauth2',
          connected: false,
          status: 'disconnected',
          config: {}
        }))
        setIntegrations(staticIntegrations)
        setMessage({ type: 'error', text: 'Using demo integrations. Database tables need to be configured.' })
      }
    } catch (error) {
      // Fallback to static integrations
      console.warn('API failed, showing static integrations')
      const staticIntegrations = availableIntegrations.map(integration => ({
        id: integration.id,
        name: integration.id,
        display_name: integration.name,
        description: integration.description,
        category: integration.category,
        auth_type: 'oauth2',
        connected: false,
        status: 'disconnected',
        config: {}
      }))
      setIntegrations(staticIntegrations)
      setMessage({ type: 'error', text: 'Using demo integrations. Please check your database configuration.' })
    } finally {
      setLoading(false)
    }
  }

  const handleIntegrationAction = async (providerName: string, action: string, config?: any) => {
    setActionLoading(providerName)
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_name: providerName, action, config })
      })

      const data = await response.json()
      
      if (response.ok) {
        if (data.auth_url) {
          // Redirect to OAuth URL
          window.location.href = data.auth_url
          return
        }
        
        setMessage({ type: 'success', text: `Successfully ${action}ed ${providerName}` })
        fetchIntegrations() // Refresh the list
      } else {
        if (response.status === 500 && data.error.includes('tables not configured')) {
          setMessage({ type: 'error', text: 'This is a demo. Database tables need to be configured for live integrations.' })
        } else {
          setMessage({ type: 'error', text: data.error || `Failed to ${action} integration` })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'This is a demo. Integration functionality requires database configuration.' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSetupIntegrations = async () => {
    setSetupLoading(true)
    try {
      const response = await fetch('/api/integrations/setup', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Integration providers setup completed!' })
        fetchIntegrations() // Refresh the list
      } else {
        setMessage({ type: 'error', text: data.error || 'Setup failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to setup integrations' })
    } finally {
      setSetupLoading(false)
    }
  }

  const connectedIntegrations = integrations.filter(i => i.connected)
  const availableIntegrationsFromAPI = integrations.filter(i => !i.connected)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading integrations...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'bg-green-50 text-green-900 border-green-200' : ''}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Setup Button if no integrations loaded */}
      {integrations.length === 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Integrations</CardTitle>
            <p className="text-sm text-gray-600">
              Initialize the integration providers to get started with connecting your favorite tools.
            </p>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleSetupIntegrations}
              disabled={setupLoading}
              className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white"
            >
              {setupLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Setup Integration Providers'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connected Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Connected Integrations
            <Badge className="bg-green-100 text-green-800">{connectedIntegrations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectedIntegrations.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No integrations connected yet</p>
          ) : (
            <div className="space-y-4">
              {connectedIntegrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      {integration.display_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-slate-900">{integration.display_name}</h3>
                        <Badge className={integration.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {integration.status}
                        </Badge>
                        <Badge variant="outline">{integration.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{integration.description}</p>
                      {integration.last_sync_at && (
                        <p className="text-xs text-gray-500">
                          Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                        </p>
                      )}
                      {integration.error_message && (
                        <p className="text-xs text-red-500">Error: {integration.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleIntegrationAction(integration.name, 'sync')}
                      disabled={actionLoading === integration.name}
                    >
                      {actionLoading === integration.name ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Sync'
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleIntegrationAction(integration.name, 'disconnect')}
                      disabled={actionLoading === integration.name}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Affiliate System Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliate System Integrations</CardTitle>
          <p className="text-sm text-gray-600">
            Integrate with professional affiliate tracking systems to manage your referral program
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {affiliateIntegrations.map((integration) => (
              <div key={integration.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`w-12 h-12 ${integration.iconColor} rounded-lg flex items-center justify-center text-white font-bold text-lg`}
                  >
                    {integration.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">{integration.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{integration.description}</p>
                    <Badge variant="outline">{integration.category}</Badge>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <h4 className="font-medium text-sm">Key Features:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {integration.features.map((feature, index) => (
                      <div key={index} className="text-xs text-gray-600 flex items-center gap-1">
                        <div className="w-1 h-1 bg-dealvize-teal rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-dealvize-teal">{integration.pricing}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Learn More
                    </Button>
                    <Button size="sm" className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white">
                      Connect
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          {availableIntegrationsFromAPI.length === 0 ? (
            <p className="text-center text-gray-500 py-8">All available integrations are connected</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableIntegrationsFromAPI.map((integration) => (
                <div key={integration.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                      {integration.display_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{integration.display_name}</h3>
                        {integration.category === 'Marketing' && <Badge className="bg-dealvize-teal text-white text-xs">Popular</Badge>}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {integration.category}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{integration.description}</p>
                  <Button 
                    size="sm" 
                    className="w-full bg-dealvize-teal hover:bg-dealvize-teal-dark text-white"
                    onClick={() => handleIntegrationAction(integration.name, 'connect')}
                    disabled={actionLoading === integration.name}
                  >
                    {actionLoading === integration.name ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

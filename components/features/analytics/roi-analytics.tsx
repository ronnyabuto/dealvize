"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target, 
  Plus, Settings, AlertTriangle, CheckCircle, Info,
  Calendar, BarChart3, Loader2, ArrowUpRight, ArrowDownRight
} from "lucide-react"

interface MarketingChannel {
  id: string
  name: string
  description?: string
  channel_type: 'digital' | 'traditional' | 'referral' | 'direct'
  cost_per_lead: number
  monthly_budget: number
  tracking_url?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  is_active: boolean
  current_period: ROIMetrics
  previous_period?: ROIMetrics
  period_comparison?: {
    leads_change: number
    revenue_change: number
    roi_change: number
    cost_change: number
  }
}

interface ROIMetrics {
  leads_generated: number
  deals_closed: number
  total_revenue: number
  total_cost: number
  conversion_rate: number
  roi_percentage: number
  cost_per_conversion: number
  revenue_per_lead: number
  cost_per_lead: number
  profit: number
}

interface ROISummary {
  total_leads: number
  total_revenue: number
  total_cost: number
  total_deals: number
  overall_roi: number
  best_performing_channel: MarketingChannel | null
  avg_conversion_rate: number
  total_profit: number
}

interface ROIInsight {
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  action: string
}

export function ROIAnalytics() {
  const [channels, setChannels] = useState<MarketingChannel[]>([])
  const [summary, setSummary] = useState<ROISummary | null>(null)
  const [insights, setInsights] = useState<ROIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [createChannelOpen, setCreateChannelOpen] = useState(false)
  const [dateRange, setDateRange] = useState('30')
  const [comparePeriods, setComparePeriods] = useState(false)
  
  // Forms
  const [newChannel, setNewChannel] = useState({
    name: '',
    description: '',
    channel_type: 'digital' as const,
    cost_per_lead: 0,
    monthly_budget: 0,
    tracking_url: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: ''
  })
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchROIAnalytics()
  }, [dateRange, comparePeriods])

  const fetchROIAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        date_range: dateRange,
        compare_periods: comparePeriods.toString()
      })

      const response = await fetch(`/api/roi-analytics?${params}`)
      if (response.ok) {
        const data = await response.json()
        setChannels(data.channels || [])
        setSummary(data.summary)
        setInsights(data.insights || [])
      } else {
        setMessage({ type: 'error', text: 'Failed to load ROI analytics' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load ROI analytics' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newChannel.name.trim()) {
      setMessage({ type: 'error', text: 'Channel name is required' })
      return
    }

    setActionLoading('create')
    try {
      const response = await fetch('/api/marketing-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Marketing channel created successfully' })
        setCreateChannelOpen(false)
        setNewChannel({
          name: '',
          description: '',
          channel_type: 'digital',
          cost_per_lead: 0,
          monthly_budget: 0,
          tracking_url: '',
          utm_source: '',
          utm_medium: '',
          utm_campaign: ''
        })
        fetchROIAnalytics()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to create channel' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create channel' })
    } finally {
      setActionLoading(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getChannelTypeColor = (type: string) => {
    const colors = {
      digital: 'bg-blue-100 text-blue-800',
      traditional: 'bg-purple-100 text-purple-800',
      referral: 'bg-green-100 text-green-800',
      direct: 'bg-gray-100 text-gray-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getInsightColor = (type: string) => {
    const colors = {
      success: 'bg-green-50 border-green-200',
      warning: 'bg-yellow-50 border-yellow-200',
      error: 'bg-red-50 border-red-200',
      info: 'bg-blue-50 border-blue-200'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-50 border-gray-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading ROI analytics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'bg-green-50 text-green-900 border-green-200' : ''}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Marketing ROI Analytics</h2>
          <p className="text-muted-foreground">Track performance and return on investment for your marketing channels</p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Marketing Channel</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateChannel} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Channel Name</Label>
                    <Input
                      id="name"
                      value={newChannel.name}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Google Ads, Facebook, Referrals"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="channel_type">Channel Type</Label>
                    <Select value={newChannel.channel_type} onValueChange={(value) => setNewChannel(prev => ({ ...prev, channel_type: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digital">Digital Marketing</SelectItem>
                        <SelectItem value="traditional">Traditional Media</SelectItem>
                        <SelectItem value="referral">Referrals</SelectItem>
                        <SelectItem value="direct">Direct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newChannel.description}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this marketing channel..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost_per_lead">Cost Per Lead ($)</Label>
                    <Input
                      id="cost_per_lead"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newChannel.cost_per_lead}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, cost_per_lead: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthly_budget">Monthly Budget ($)</Label>
                    <Input
                      id="monthly_budget"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newChannel.monthly_budget}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, monthly_budget: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="utm_source">UTM Source</Label>
                    <Input
                      id="utm_source"
                      value={newChannel.utm_source}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, utm_source: e.target.value }))}
                      placeholder="google"
                    />
                  </div>
                  <div>
                    <Label htmlFor="utm_medium">UTM Medium</Label>
                    <Input
                      id="utm_medium"
                      value={newChannel.utm_medium}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, utm_medium: e.target.value }))}
                      placeholder="cpc"
                    />
                  </div>
                  <div>
                    <Label htmlFor="utm_campaign">UTM Campaign</Label>
                    <Input
                      id="utm_campaign"
                      value={newChannel.utm_campaign}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, utm_campaign: e.target.value }))}
                      placeholder="spring-2024"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setCreateChannelOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading === 'create'}>
                    {actionLoading === 'create' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Channel'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_leads}</div>
              <p className="text-xs text-muted-foreground">
                {summary.total_deals} converted ({summary.avg_conversion_rate.toFixed(1)}% avg)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary.total_profit)} profit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_cost)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.total_leads > 0 ? formatCurrency(summary.total_cost / summary.total_leads) : '$0'} per lead
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall ROI</CardTitle>
              <TrendingUp className={`h-4 w-4 ${summary.overall_roi >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.overall_roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(summary.overall_roi)}
              </div>
              <p className="text-xs text-muted-foreground">
                Return on investment
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <Card key={index} className={`border ${getInsightColor(insight.type)}`}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                    <p className="text-xs text-gray-500 mt-2 font-medium">{insight.action}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Channel Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Channel Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No marketing channels</h3>
              <p className="text-gray-500 mb-4">Add marketing channels to track their ROI performance.</p>
              <Button onClick={() => setCreateChannelOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Channel
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {channels.map((channel) => (
                <Card key={channel.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{channel.name}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge className={getChannelTypeColor(channel.channel_type)}>
                            {channel.channel_type}
                          </Badge>
                          <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                            {channel.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                      </div>
                      <div className={`text-right ${channel.current_period.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <div className="flex items-center">
                          {channel.current_period.roi_percentage >= 0 ? 
                            <ArrowUpRight className="h-4 w-4 mr-1" /> : 
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                          }
                          <span className="text-2xl font-bold">
                            {formatPercentage(channel.current_period.roi_percentage)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">ROI</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-2xl font-bold">{channel.current_period.leads_generated}</div>
                        <div className="text-xs text-gray-500">Leads Generated</div>
                        {channel.period_comparison && (
                          <div className={`text-xs flex items-center ${channel.period_comparison.leads_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {channel.period_comparison.leads_change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(channel.period_comparison.leads_change)}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-2xl font-bold">{channel.current_period.deals_closed}</div>
                        <div className="text-xs text-gray-500">Deals Closed</div>
                        <div className="text-xs text-gray-600">
                          {channel.current_period.conversion_rate.toFixed(1)}% conversion
                        </div>
                      </div>

                      <div>
                        <div className="text-2xl font-bold">{formatCurrency(channel.current_period.total_revenue)}</div>
                        <div className="text-xs text-gray-500">Revenue</div>
                        {channel.period_comparison && (
                          <div className={`text-xs flex items-center ${channel.period_comparison.revenue_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {channel.period_comparison.revenue_change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {formatCurrency(Math.abs(channel.period_comparison.revenue_change))}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-2xl font-bold">{formatCurrency(channel.current_period.total_cost)}</div>
                        <div className="text-xs text-gray-500">Investment</div>
                        <div className="text-xs text-gray-600">
                          {formatCurrency(channel.current_period.cost_per_lead)} per lead
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
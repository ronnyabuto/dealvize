"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Search, Plus, TrendingUp, TrendingDown, AlertTriangle, Target, Users, DollarSign, BarChart3, Eye, RefreshCw, Globe, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"

interface Competitor {
  id: string
  competitor_name: string
  website_url: string
  market_segment: string
  target_markets: string[]
  business_model?: string
  estimated_revenue?: number
  employee_count?: number
  key_features: string[]
  pricing_tiers: any[]
  strengths: string[]
  weaknesses: string[]
  market_positioning?: string
  last_analyzed?: string
  competitive_analysis_snapshots?: any[]
}

interface MarketAnalysis {
  competitors: Competitor[]
  market_insights: any
  competitive_landscape: any
  recommendations: any[]
}

export function CompetitiveAnalysis() {
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
  const [newCompetitor, setNewCompetitor] = useState({
    competitor_name: '',
    website_url: '',
    market_segment: 'real_estate',
    business_model: '',
    estimated_revenue: '',
    employee_count: '',
    key_features: '',
    strengths: '',
    weaknesses: '',
    market_positioning: '',
    notes: ''
  })

  useEffect(() => {
    fetchMarketAnalysis()
  }, [])

  const fetchMarketAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/competitive-analysis')
      if (!response.ok) throw new Error('Failed to fetch market analysis')
      
      const data = await response.json()
      setMarketAnalysis(data.market_analysis)
      setCompetitors(data.market_analysis.competitors || [])
    } catch (error) {
      console.error('Error fetching market analysis:', error)
      toast.error('Failed to load competitive analysis')
    } finally {
      setLoading(false)
    }
  }

  const addCompetitor = async () => {
    try {
      const response = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCompetitor,
          estimated_revenue: newCompetitor.estimated_revenue ? parseInt(newCompetitor.estimated_revenue) : null,
          employee_count: newCompetitor.employee_count ? parseInt(newCompetitor.employee_count) : null,
          key_features: newCompetitor.key_features ? newCompetitor.key_features.split(',').map(f => f.trim()) : [],
          strengths: newCompetitor.strengths ? newCompetitor.strengths.split(',').map(s => s.trim()) : [],
          weaknesses: newCompetitor.weaknesses ? newCompetitor.weaknesses.split(',').map(w => w.trim()) : []
        })
      })

      if (!response.ok) throw new Error('Failed to add competitor')

      const data = await response.json()
      toast.success('Competitor added successfully')
      
      setShowAddDialog(false)
      setNewCompetitor({
        competitor_name: '',
        website_url: '',
        market_segment: 'real_estate',
        business_model: '',
        estimated_revenue: '',
        employee_count: '',
        key_features: '',
        strengths: '',
        weaknesses: '',
        market_positioning: '',
        notes: ''
      })
      
      await fetchMarketAnalysis()
    } catch (error) {
      console.error('Error adding competitor:', error)
      toast.error('Failed to add competitor')
    }
  }

  const analyzeCompetitor = async (competitorId: string) => {
    setAnalyzing(competitorId)
    try {
      const response = await fetch(`/api/competitive-analysis?id=${competitorId}&action=analyze`, {
        method: 'PUT'
      })

      if (!response.ok) throw new Error('Failed to analyze competitor')

      toast.success('Competitor analysis updated')
      await fetchMarketAnalysis()
    } catch (error) {
      console.error('Error analyzing competitor:', error)
      toast.error('Failed to analyze competitor')
    } finally {
      setAnalyzing(null)
    }
  }

  const deleteCompetitor = async (competitorId: string) => {
    try {
      const response = await fetch(`/api/competitive-analysis?id=${competitorId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete competitor')

      toast.success('Competitor removed')
      await fetchMarketAnalysis()
    } catch (error) {
      console.error('Error deleting competitor:', error)
      toast.error('Failed to remove competitor')
    }
  }

  const getThreatColor = (threatLevel: string) => {
    switch (threatLevel) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`
    }
    return `$${amount}`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Search className="h-12 w-12 mx-auto animate-pulse text-primary" />
          <div>
            <p className="text-lg font-medium">Analyzing Market</p>
            <p className="text-sm text-muted-foreground">Gathering competitive intelligence...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Competitive Analysis
              </CardTitle>
              <CardDescription>
                Automated competitive intelligence and market analysis
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Competitor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Competitor</DialogTitle>
                    <DialogDescription>
                      Add a competitor to track and analyze their market position
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Competitor Name *</Label>
                      <Input
                        id="name"
                        value={newCompetitor.competitor_name}
                        onChange={(e) => setNewCompetitor({...newCompetitor, competitor_name: e.target.value})}
                        placeholder="e.g., RealtyPro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website URL *</Label>
                      <Input
                        id="website"
                        value={newCompetitor.website_url}
                        onChange={(e) => setNewCompetitor({...newCompetitor, website_url: e.target.value})}
                        placeholder="https://competitor.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="segment">Market Segment</Label>
                      <Select value={newCompetitor.market_segment} onValueChange={(value) => setNewCompetitor({...newCompetitor, market_segment: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="real_estate">Real Estate</SelectItem>
                          <SelectItem value="property_management">Property Management</SelectItem>
                          <SelectItem value="crm_software">CRM Software</SelectItem>
                          <SelectItem value="marketing_automation">Marketing Automation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business_model">Business Model</Label>
                      <Input
                        id="business_model"
                        value={newCompetitor.business_model}
                        onChange={(e) => setNewCompetitor({...newCompetitor, business_model: e.target.value})}
                        placeholder="e.g., SaaS, Marketplace"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="revenue">Estimated Revenue</Label>
                      <Input
                        id="revenue"
                        value={newCompetitor.estimated_revenue}
                        onChange={(e) => setNewCompetitor({...newCompetitor, estimated_revenue: e.target.value})}
                        placeholder="Annual revenue in USD"
                        type="number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employees">Employee Count</Label>
                      <Input
                        id="employees"
                        value={newCompetitor.employee_count}
                        onChange={(e) => setNewCompetitor({...newCompetitor, employee_count: e.target.value})}
                        placeholder="Number of employees"
                        type="number"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="features">Key Features</Label>
                      <Input
                        id="features"
                        value={newCompetitor.key_features}
                        onChange={(e) => setNewCompetitor({...newCompetitor, key_features: e.target.value})}
                        placeholder="Comma-separated list of features"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="strengths">Strengths</Label>
                      <Input
                        id="strengths"
                        value={newCompetitor.strengths}
                        onChange={(e) => setNewCompetitor({...newCompetitor, strengths: e.target.value})}
                        placeholder="Comma-separated strengths"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weaknesses">Weaknesses</Label>
                      <Input
                        id="weaknesses"
                        value={newCompetitor.weaknesses}
                        onChange={(e) => setNewCompetitor({...newCompetitor, weaknesses: e.target.value})}
                        placeholder="Comma-separated weaknesses"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="positioning">Market Positioning</Label>
                      <Textarea
                        id="positioning"
                        value={newCompetitor.market_positioning}
                        onChange={(e) => setNewCompetitor({...newCompetitor, market_positioning: e.target.value})}
                        placeholder="How they position themselves in the market"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addCompetitor} disabled={!newCompetitor.competitor_name || !newCompetitor.website_url}>
                      Add Competitor
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={fetchMarketAnalysis}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="market">Market Insights</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {marketAnalysis && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Tracked Competitors</p>
                            <p className="text-2xl font-bold">{competitors.length}</p>
                            <p className="text-xs text-muted-foreground">Active tracking</p>
                          </div>
                          <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Market Share</p>
                            <p className="text-2xl font-bold">{marketAnalysis.market_insights?.avg_market_share || 0}%</p>
                            <p className="text-xs text-muted-foreground">Average competitor</p>
                          </div>
                          <BarChart3 className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Pricing Strategy</p>
                            <p className="text-lg font-bold capitalize">{marketAnalysis.market_insights?.dominant_pricing_strategy?.replace('_', ' ') || 'Mixed'}</p>
                            <p className="text-xs text-muted-foreground">Most common</p>
                          </div>
                          <DollarSign className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">High Threats</p>
                            <p className="text-2xl font-bold text-red-600">
                              {marketAnalysis.competitive_landscape?.threat_assessment?.filter((t: any) => t.threat_level === 'high').length || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Competitors</p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Top Market Features</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {marketAnalysis.market_insights?.most_common_features?.slice(0, 5).map((feature: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm capitalize">{feature.feature.replace('_', ' ')}</span>
                              <div className="flex items-center gap-2">
                                <Progress value={(feature.count / competitors.length) * 100} className="w-20 h-2" />
                                <Badge variant="outline">{feature.count}/{competitors.length}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Threat Assessment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {marketAnalysis.competitive_landscape?.threat_assessment?.slice(0, 5).map((threat: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{threat.competitor_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {threat.key_threats?.slice(0, 2).join(', ') || 'Multiple threats'}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant={threat.threat_level === 'high' ? 'destructive' : threat.threat_level === 'medium' ? 'secondary' : 'outline'}>
                                  {threat.threat_level}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">{threat.threat_score}/100</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="competitors" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {competitors.map((competitor) => (
                  <Card key={competitor.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            {competitor.competitor_name}
                          </CardTitle>
                          <CardDescription className="text-xs">{competitor.website_url}</CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => analyzeCompetitor(competitor.id)}
                            disabled={analyzing === competitor.id}
                          >
                            {analyzing === competitor.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCompetitor(competitor.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {competitor.market_segment?.replace('_', ' ')}
                        </Badge>
                        {competitor.last_analyzed && (
                          <span className="text-xs text-muted-foreground">
                            Analyzed {new Date(competitor.last_analyzed).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {competitor.competitive_analysis_snapshots?.[0]?.analysis_data && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Traffic</p>
                              <p className="font-medium">
                                {(competitor.competitive_analysis_snapshots[0].analysis_data.website_metrics?.monthly_traffic || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">DA Score</p>
                              <p className="font-medium">
                                {competitor.competitive_analysis_snapshots[0].analysis_data.website_metrics?.domain_authority || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Market Share</p>
                              <p className="font-medium">
                                {competitor.competitive_analysis_snapshots[0].analysis_data.market_position?.market_share_estimate || 0}%
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Growth</p>
                              <div className="flex items-center gap-1">
                                {competitor.competitive_analysis_snapshots[0].analysis_data.market_position?.growth_rate > 0 ? (
                                  <TrendingUp className="h-3 w-3 text-green-500" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-red-500" />
                                )}
                                <p className="font-medium text-xs">
                                  {Math.abs(competitor.competitive_analysis_snapshots[0].analysis_data.market_position?.growth_rate || 0)}%
                                </p>
                              </div>
                            </div>
                          </div>

                          {competitor.competitive_analysis_snapshots[0].analysis_data.pricing_analysis && (
                            <div className="p-2 bg-muted rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Pricing</p>
                              <p className="text-sm font-medium">
                                ${competitor.competitive_analysis_snapshots[0].analysis_data.pricing_analysis.price_range?.min}-
                                ${competitor.competitive_analysis_snapshots[0].analysis_data.pricing_analysis.price_range?.max}
                              </p>
                              <p className="text-xs capitalize">
                                {competitor.competitive_analysis_snapshots[0].analysis_data.pricing_analysis.pricing_strategy?.replace('_', ' ')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {competitor.strengths && competitor.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-600 mb-1">Strengths</p>
                          <div className="flex flex-wrap gap-1">
                            {competitor.strengths.slice(0, 3).map((strength, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-green-600">
                                {strength}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {competitor.weaknesses && competitor.weaknesses.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-1">Weaknesses</p>
                          <div className="flex flex-wrap gap-1">
                            {competitor.weaknesses.slice(0, 3).map((weakness, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-red-600">
                                {weakness}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="market" className="space-y-6">
              {marketAnalysis && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Market Segments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {marketAnalysis.competitive_landscape?.segments?.map((segment: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium capitalize">{segment.segment.replace('_', ' ')}</p>
                                <p className="text-sm text-muted-foreground">{segment.competitor_count} competitors</p>
                              </div>
                              <Badge variant="outline">
                                {Math.round(segment.avg_market_share)}% avg share
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Innovation Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-2">Trending Features</p>
                            <div className="space-y-2">
                              {marketAnalysis.market_insights?.innovation_trends?.trending_features?.slice(0, 5).map((feature: any, index: number) => (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-sm capitalize">{feature.feature.replace('_', ' ')}</span>
                                  <Badge variant="outline">{Math.round(feature.adoption_rate)}% adoption</Badge>
                                </div>
                              ))}
                            </div>
                          </div>

                          {marketAnalysis.market_insights?.innovation_trends?.innovation_leaders && (
                            <div>
                              <p className="text-sm font-medium mb-2">Innovation Leaders</p>
                              <div className="flex flex-wrap gap-1">
                                {marketAnalysis.market_insights.innovation_trends.innovation_leaders.map((leader: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {leader}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {marketAnalysis.market_insights?.pricing_trends && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Pricing Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 border rounded-lg">
                            <p className="text-2xl font-bold">{formatCurrency(marketAnalysis.market_insights.pricing_trends.avg_min_price)}</p>
                            <p className="text-sm text-muted-foreground">Average Min Price</p>
                          </div>
                          <div className="text-center p-4 border rounded-lg">
                            <p className="text-2xl font-bold">{formatCurrency(marketAnalysis.market_insights.pricing_trends.avg_max_price)}</p>
                            <p className="text-sm text-muted-foreground">Average Max Price</p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Budget</span>
                              <Badge variant="outline">{marketAnalysis.market_insights.pricing_trends.price_distribution.budget}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Mid-range</span>
                              <Badge variant="outline">{marketAnalysis.market_insights.pricing_trends.price_distribution.mid_range}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Premium</span>
                              <Badge variant="outline">{marketAnalysis.market_insights.pricing_trends.price_distribution.premium}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-6">
              {marketAnalysis?.competitive_landscape && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Market Opportunities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {marketAnalysis.competitive_landscape.market_opportunities?.map((opportunity: any, index: number) => (
                            <Alert key={index}>
                              <Target className="h-4 w-4" />
                              <AlertDescription>
                                <div className="flex items-center justify-between mb-1">
                                  <strong className="capitalize">{opportunity.type.replace('_', ' ')}</strong>
                                  <Badge variant={opportunity.potential === 'high' ? 'destructive' : 'secondary'}>
                                    {opportunity.potential}
                                  </Badge>
                                </div>
                                <p className="text-sm">{opportunity.description}</p>
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Competitive Gaps</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {marketAnalysis.competitive_landscape.competitive_gaps?.map((gap: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium capitalize">{gap.type}</span>
                                <Badge variant="outline">{gap.opportunity_size}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{gap.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-6">
              <div className="space-y-4">
                {marketAnalysis?.recommendations?.map((rec: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getPriorityColor(rec.priority) as any}>
                              {rec.priority} priority
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {rec.category}
                            </Badge>
                          </div>
                          <h4 className="font-semibold">{rec.title}</h4>
                        </div>
                        <Target className="h-5 w-5 text-muted-foreground" />
                      </div>
                      
                      <p className="text-muted-foreground mb-3">{rec.description}</p>
                      
                      <Alert>
                        <AlertDescription>
                          <strong>Expected Impact:</strong> {rec.impact}
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
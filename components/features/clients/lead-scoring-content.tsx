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
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, TrendingDown, Users, Star, Target, 
  Activity, Plus, Settings, Filter, Search,
  CheckCircle, AlertCircle, Loader2, BarChart3,
  Flame, Snowflake, ThermometerSun, Award,
  Calendar, Mail, Phone, MousePointer
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface LeadScore {
  id: string
  client_id: string
  current_score: number
  max_score: number
  score_category: 'cold' | 'warm' | 'hot' | 'qualified'
  last_activity_date: string
  last_score_change: string
  client: {
    first_name: string
    last_name: string
    email: string
    phone?: string
    created_at: string
  }
  recent_activities?: LeadActivity[]
}

interface LeadActivity {
  id: string
  activity_type: string
  activity_data: any
  score_awarded: number
  source: string
  created_at: string
}

interface ScoringRule {
  id: string
  rule_name: string
  rule_type: 'demographic' | 'behavioral' | 'engagement' | 'property_interest'
  trigger_event: string
  score_impact: number
  conditions: any
  is_active: boolean
  priority: number
}

interface LeadSegment {
  id: string
  segment_name: string
  description: string
  criteria: any
  color: string
  auto_assign: boolean
  client_count: number
}

interface ScoringSummary {
  total_leads: number
  qualified: number
  hot: number
  warm: number
  cold: number
  average_score: number
}

const categoryIcons = {
  qualified: Award,
  hot: Flame,
  warm: ThermometerSun,
  cold: Snowflake
}

const categoryColors = {
  qualified: 'bg-green-100 text-green-800 border-green-200',
  hot: 'bg-red-100 text-red-800 border-red-200',
  warm: 'bg-orange-100 text-orange-800 border-orange-200',
  cold: 'bg-blue-100 text-blue-800 border-blue-200'
}

const activityIcons: Record<string, any> = {
  email_opened: Mail,
  email_link_clicked: MousePointer,
  property_viewed: Target,
  form_submitted: CheckCircle,
  phone_call_made: Phone,
  meeting_scheduled: Calendar,
  website_visit: Activity,
  social_interaction: Users
}

export function LeadScoringContent() {
  const [leadScores, setLeadScores] = useState<LeadScore[]>([])
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([])
  const [leadSegments, setLeadSegments] = useState<LeadSegment[]>([])
  const [summary, setSummary] = useState<ScoringSummary>({
    total_leads: 0,
    qualified: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    average_score: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<LeadScore | null>(null)
  const [addActivityOpen, setAddActivityOpen] = useState(false)
  const [manageRulesOpen, setManageRulesOpen] = useState(false)
  
  // Filters
  const [activeTab, setActiveTab] = useState("overview")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("score")
  
  // Forms
  const [newActivity, setNewActivity] = useState({
    client_id: '',
    activity_type: '',
    activity_data: {},
    source: 'manual'
  })
  
  const [newRule, setNewRule] = useState({
    rule_name: '',
    rule_type: 'engagement' as const,
    trigger_event: '',
    score_impact: 0,
    conditions: {},
    priority: 1
  })
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchLeadScores()
    fetchScoringRules()
    fetchLeadSegments()
  }, [categoryFilter, sortBy, searchTerm])

  const fetchLeadScores = async () => {
    try {
      const params = new URLSearchParams()
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter)
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/lead-scoring?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLeadScores(data.lead_scores || [])
        setSummary(data.summary || summary)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load lead scores' })
    } finally {
      setLoading(false)
    }
  }

  const fetchScoringRules = async () => {
    try {
      const response = await fetch('/api/scoring-rules')
      if (response.ok) {
        const data = await response.json()
        setScoringRules(data.rules || [])
      }
    } catch (error) {
      console.error('Failed to fetch scoring rules:', error)
    }
  }

  const fetchLeadSegments = async () => {
    try {
      const response = await fetch('/api/lead-segments')
      if (response.ok) {
        const data = await response.json()
        setLeadSegments(data.segments || [])
      }
    } catch (error) {
      console.error('Failed to fetch lead segments:', error)
    }
  }

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newActivity.client_id || !newActivity.activity_type) {
      setMessage({ type: 'error', text: 'Client and activity type are required' })
      return
    }

    setActionLoading('add-activity')
    try {
      const response = await fetch('/api/lead-scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity)
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: `Activity recorded! Score updated to ${data.updated_score?.current_score || 0}` })
        setAddActivityOpen(false)
        setNewActivity({
          client_id: '',
          activity_type: '',
          activity_data: {},
          source: 'manual'
        })
        fetchLeadScores()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to record activity' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to record activity' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newRule.rule_name || !newRule.trigger_event || newRule.score_impact === 0) {
      setMessage({ type: 'error', text: 'Rule name, trigger event, and score impact are required' })
      return
    }

    setActionLoading('add-rule')
    try {
      const response = await fetch('/api/scoring-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Scoring rule created successfully' })
        setNewRule({
          rule_name: '',
          rule_type: 'engagement',
          trigger_event: '',
          score_impact: 0,
          conditions: {},
          priority: 1
        })
        fetchScoringRules()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to create rule' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create rule' })
    } finally {
      setActionLoading(null)
    }
  }

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    setActionLoading(ruleId)
    try {
      const response = await fetch(`/api/scoring-rules?id=${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (response.ok) {
        fetchScoringRules()
        setMessage({ type: 'success', text: `Rule ${!isActive ? 'activated' : 'deactivated'}` })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to update rule' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update rule' })
    } finally {
      setActionLoading(null)
    }
  }

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Star
    return <IconComponent className="h-4 w-4" />
  }

  const getActivityIcon = (activityType: string) => {
    const IconComponent = activityIcons[activityType] || Activity
    return <IconComponent className="h-4 w-4" />
  }

  const sortedLeadScores = [...leadScores].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.current_score - a.current_score
      case 'name':
        return `${a.client.first_name} ${a.client.last_name}`.localeCompare(`${b.client.first_name} ${b.client.last_name}`)
      case 'recent':
        return new Date(b.last_activity_date).getTime() - new Date(a.last_activity_date).getTime()
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading lead scores...</span>
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

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">By Score</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
              <SelectItem value="recent">By Activity</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex space-x-2">
          <Dialog open={addActivityOpen} onOpenChange={setAddActivityOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record Activity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Lead Activity</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div>
                  <Label htmlFor="client_select">Select Client</Label>
                  <Select value={newActivity.client_id} onValueChange={(value) => setNewActivity(prev => ({ ...prev, client_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadScores.map(score => (
                        <SelectItem key={score.client_id} value={score.client_id}>
                          {score.client.first_name} {score.client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="activity_type">Activity Type</Label>
                  <Select value={newActivity.activity_type} onValueChange={(value) => setNewActivity(prev => ({ ...prev, activity_type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email_opened">Email Opened</SelectItem>
                      <SelectItem value="email_link_clicked">Email Link Clicked</SelectItem>
                      <SelectItem value="property_viewed">Property Viewed</SelectItem>
                      <SelectItem value="form_submitted">Form Submitted</SelectItem>
                      <SelectItem value="phone_call_made">Phone Call Made</SelectItem>
                      <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                      <SelectItem value="website_visit">Website Visit</SelectItem>
                      <SelectItem value="social_interaction">Social Media Interaction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select value={newActivity.source} onValueChange={(value) => setNewActivity(prev => ({ ...prev, source: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="email">Email Campaign</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setAddActivityOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading === 'add-activity'}>
                    {actionLoading === 'add-activity' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      'Record Activity'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={manageRulesOpen} onOpenChange={setManageRulesOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Manage Rules
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Scoring Rules Management</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="rules" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="rules">Current Rules</TabsTrigger>
                  <TabsTrigger value="add">Add New Rule</TabsTrigger>
                </TabsList>

                <TabsContent value="rules" className="space-y-4">
                  {scoringRules.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No scoring rules configured</p>
                  ) : (
                    <div className="space-y-2">
                      {scoringRules.map((rule) => (
                        <Card key={rule.id} className={`${rule.is_active ? '' : 'opacity-50'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-medium">{rule.rule_name}</h4>
                                  <Badge variant="outline">{rule.rule_type}</Badge>
                                  <Badge variant={rule.score_impact > 0 ? 'default' : 'destructive'}>
                                    {rule.score_impact > 0 ? '+' : ''}{rule.score_impact} points
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                  Trigger: {rule.trigger_event} | Priority: {rule.priority}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant={rule.is_active ? "destructive" : "default"}
                                onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                                disabled={actionLoading === rule.id}
                              >
                                {actionLoading === rule.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  rule.is_active ? 'Deactivate' : 'Activate'
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="add">
                  <form onSubmit={handleAddRule} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="rule_name">Rule Name</Label>
                        <Input
                          id="rule_name"
                          value={newRule.rule_name}
                          onChange={(e) => setNewRule(prev => ({ ...prev, rule_name: e.target.value }))}
                          placeholder="Enter rule name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="rule_type">Rule Type</Label>
                        <Select value={newRule.rule_type} onValueChange={(value) => setNewRule(prev => ({ ...prev, rule_type: value as any }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="demographic">Demographic</SelectItem>
                            <SelectItem value="behavioral">Behavioral</SelectItem>
                            <SelectItem value="engagement">Engagement</SelectItem>
                            <SelectItem value="property_interest">Property Interest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="trigger_event">Trigger Event</Label>
                        <Input
                          id="trigger_event"
                          value={newRule.trigger_event}
                          onChange={(e) => setNewRule(prev => ({ ...prev, trigger_event: e.target.value }))}
                          placeholder="e.g., email_opened"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="score_impact">Score Impact</Label>
                        <Input
                          id="score_impact"
                          type="number"
                          value={newRule.score_impact}
                          onChange={(e) => setNewRule(prev => ({ ...prev, score_impact: parseInt(e.target.value) || 0 }))}
                          placeholder="Points to add/subtract"
                          min={-100}
                          max={100}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority (1-10)</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={newRule.priority}
                        onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                        min={1}
                        max={10}
                      />
                    </div>

                    <Button type="submit" disabled={actionLoading === 'add-rule'}>
                      {actionLoading === 'add-rule' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Rule'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lead Scoring Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Lead Scores</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_leads}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Qualified</CardTitle>
                <Award className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.qualified}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.total_leads > 0 ? Math.round((summary.qualified / summary.total_leads) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
                <Flame className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.hot}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.total_leads > 0 ? Math.round((summary.hot / summary.total_leads) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warm Leads</CardTitle>
                <ThermometerSun className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{summary.warm}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.total_leads > 0 ? Math.round((summary.warm / summary.total_leads) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cold Leads</CardTitle>
                <Snowflake className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summary.cold}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.total_leads > 0 ? Math.round((summary.cold / summary.total_leads) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.average_score}</div>
                <p className="text-xs text-muted-foreground">
                  Out of 100 points
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Leads */}
          <Card>
            <CardHeader>
              <CardTitle>Top Scoring Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedLeadScores.slice(0, 5).length === 0 ? (
                <p className="text-center text-gray-500 py-8">No lead scores available</p>
              ) : (
                <div className="space-y-3">
                  {sortedLeadScores.slice(0, 5).map((score) => (
                    <div key={score.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className={`${categoryColors[score.score_category]} flex items-center space-x-1`}>
                          {getCategoryIcon(score.score_category)}
                          <span className="capitalize">{score.score_category}</span>
                        </Badge>
                        <div>
                          <div className="font-medium">
                            {score.client.first_name} {score.client.last_name}
                          </div>
                          <div className="text-sm text-gray-600">{score.client.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{score.current_score}</div>
                        <div className="text-xs text-gray-500">
                          Max: {score.max_score}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          {sortedLeadScores.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No lead scores found</h3>
                  <p className="text-gray-500">Lead scores will appear here as client activities are recorded.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedLeadScores.map((score) => (
                <Card 
                  key={score.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedLead(score)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Badge className={`${categoryColors[score.score_category]} flex items-center space-x-1`}>
                          {getCategoryIcon(score.score_category)}
                          <span className="capitalize">{score.score_category}</span>
                        </Badge>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {score.client.first_name} {score.client.last_name}
                          </h3>
                          <p className="text-sm text-gray-600">{score.client.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{score.current_score}</div>
                        <div className="text-xs text-gray-500">Max: {score.max_score}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Score Progress</span>
                        <span>{score.current_score}/100</span>
                      </div>
                      <Progress value={score.current_score} className="h-2" />
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
                      <span>Last activity: {formatDistanceToNow(new Date(score.last_activity_date), { addSuffix: true })}</span>
                      <span>Client since: {formatDistanceToNow(new Date(score.client.created_at), { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leadSegments.map((segment) => (
              <Card key={segment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full bg-${segment.color}-500`}></div>
                      <span>{segment.segment_name}</span>
                    </CardTitle>
                    <Badge variant="outline">{segment.client_count} leads</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{segment.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className={segment.auto_assign ? 'text-green-600' : 'text-gray-500'}>
                      {segment.auto_assign ? 'Auto-assigned' : 'Manual only'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Score Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="mx-auto h-12 w-12 mb-4" />
                <p>Score analytics and trending charts coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lead Detail Dialog */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <Badge className={`${categoryColors[selectedLead.score_category]} flex items-center space-x-1`}>
                  {getCategoryIcon(selectedLead.score_category)}
                  <span className="capitalize">{selectedLead.score_category}</span>
                </Badge>
                <span>{selectedLead.client.first_name} {selectedLead.client.last_name}</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Score Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{selectedLead.current_score}</div>
                  <div className="text-sm text-gray-500">Current Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{selectedLead.max_score}</div>
                  <div className="text-sm text-gray-500">Max Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold capitalize">{selectedLead.score_category}</div>
                  <div className="text-sm text-gray-500">Category</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Score Progress</span>
                  <span>{selectedLead.current_score}/100</span>
                </div>
                <Progress value={selectedLead.current_score} className="h-3" />
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Contact Information</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Email:</strong> {selectedLead.client.email}</div>
                  {selectedLead.client.phone && (
                    <div><strong>Phone:</strong> {selectedLead.client.phone}</div>
                  )}
                  <div><strong>Client since:</strong> {new Date(selectedLead.client.created_at).toLocaleDateString()}</div>
                  <div><strong>Last activity:</strong> {new Date(selectedLead.last_activity_date).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Recent Activities */}
              {selectedLead.recent_activities && selectedLead.recent_activities.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Recent Activities</h4>
                  <div className="space-y-2">
                    {selectedLead.recent_activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          {getActivityIcon(activity.activity_type)}
                          <div>
                            <div className="font-medium capitalize">
                              {activity.activity_type.replace('_', ' ')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={activity.score_awarded > 0 ? 'default' : 'destructive'}>
                            {activity.score_awarded > 0 ? '+' : ''}{activity.score_awarded}
                          </Badge>
                          <div className="text-xs text-gray-500">{activity.source}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
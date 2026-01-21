"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, TrendingUp, Users, Zap, Target, Clock, CheckCircle, AlertCircle, RefreshCw, Sparkles, BarChart3 } from "lucide-react"
import { toast } from "sonner"

interface AIScoreFactor {
  name: string
  score: number
  weight: number
  details: string
}

interface AILeadScore {
  client_id: string
  ai_score: number
  confidence: number
  factors: AIScoreFactor[]
  recommendations: string[]
  updated_at?: string
}

interface AIScoreStats {
  total_scored_clients: number
  average_score: number
  score_distribution: {
    high: number
    medium: number
    low: number
  }
  last_update: string
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  ai_lead_score?: number
  ai_score_confidence?: number
  ai_score_updated_at?: string
  lead_score?: number
}

export function AILeadScoring() {
  const [stats, setStats] = useState<AIScoreStats | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [clientScore, setClientScore] = useState<AILeadScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [recalculatingAll, setRecalculatingAll] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchClients()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/lead-scoring/ai')
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching AI scoring stats:', error)
      toast.error('Failed to load AI scoring statistics')
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (!response.ok) throw new Error('Failed to fetch clients')
      
      const data = await response.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error('Failed to load clients')
    }
  }

  const calculateClientScore = async (clientId: string) => {
    setCalculating(true)
    try {
      const response = await fetch('/api/lead-scoring/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: clientId })
      })

      if (!response.ok) throw new Error('Failed to calculate score')

      const data = await response.json()
      setClientScore(data)
      
      // Update client in list
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, ai_lead_score: data.ai_score, ai_score_confidence: data.confidence }
          : client
      ))

      await fetchStats() // Refresh stats
      toast.success('AI score calculated successfully')
    } catch (error) {
      console.error('Error calculating AI score:', error)
      toast.error('Failed to calculate AI score')
    } finally {
      setCalculating(false)
    }
  }

  const recalculateAllScores = async () => {
    setRecalculatingAll(true)
    try {
      const response = await fetch('/api/lead-scoring/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recalculate_all: true })
      })

      if (!response.ok) throw new Error('Failed to recalculate scores')

      const data = await response.json()
      
      await Promise.all([fetchStats(), fetchClients()])
      toast.success(data.message)
    } catch (error) {
      console.error('Error recalculating all scores:', error)
      toast.error('Failed to recalculate all scores')
    } finally {
      setRecalculatingAll(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default' as const
    if (score >= 60) return 'secondary' as const
    return 'destructive' as const
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'High Priority'
    if (score >= 60) return 'Medium Priority'
    return 'Low Priority'
  }

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence)}% confidence`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Lead Scoring
          </CardTitle>
          <CardDescription>
            Advanced AI-powered lead scoring system that analyzes multiple factors to predict lead quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="calculator">Score Calculator</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="ml-2">
                          <p className="text-sm font-medium leading-none">Total Scored</p>
                          <p className="text-2xl font-bold">{stats.total_scored_clients}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <div className="ml-2">
                          <p className="text-sm font-medium leading-none">Average Score</p>
                          <p className="text-2xl font-bold">{stats.average_score}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <div className="ml-2">
                          <p className="text-sm font-medium leading-none">High Priority</p>
                          <p className="text-2xl font-bold text-green-600">{stats.score_distribution.high}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div className="ml-2">
                          <p className="text-sm font-medium leading-none">Last Update</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(stats.last_update).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Score Distribution</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={recalculateAllScores}
                    disabled={recalculatingAll}
                  >
                    {recalculatingAll ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Recalculating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Recalculate All
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  {stats && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-green-600">High Priority (80-100)</span>
                          <span className="text-sm font-medium">{stats.score_distribution.high} leads</span>
                        </div>
                        <Progress 
                          value={(stats.score_distribution.high / stats.total_scored_clients) * 100} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-yellow-600">Medium Priority (60-79)</span>
                          <span className="text-sm font-medium">{stats.score_distribution.medium} leads</span>
                        </div>
                        <Progress 
                          value={(stats.score_distribution.medium / stats.total_scored_clients) * 100} 
                          className="h-2"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-red-600">Low Priority (0-59)</span>
                          <span className="text-sm font-medium">{stats.score_distribution.low} leads</span>
                        </div>
                        <Progress 
                          value={(stats.score_distribution.low / stats.total_scored_clients) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI-Scored Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {clients
                        .filter(client => client.ai_lead_score !== null && client.ai_lead_score !== undefined)
                        .sort((a, b) => (b.ai_lead_score || 0) - (a.ai_lead_score || 0))
                        .map((client) => (
                          <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <p className="font-medium">{client.first_name} {client.last_name}</p>
                              <p className="text-sm text-muted-foreground">{client.email}</p>
                              {client.ai_score_updated_at && (
                                <p className="text-xs text-muted-foreground">
                                  Updated: {new Date(client.ai_score_updated_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={getScoreBadgeVariant(client.ai_lead_score || 0)}>
                                  {client.ai_lead_score}/100
                                </Badge>
                                <span className={`text-sm font-medium ${getScoreColor(client.ai_lead_score || 0)}`}>
                                  {getScoreLabel(client.ai_lead_score || 0)}
                                </span>
                              </div>
                              {client.ai_score_confidence && (
                                <p className="text-xs text-muted-foreground">
                                  {formatConfidence(client.ai_score_confidence)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calculator" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Individual Score Calculator
                  </CardTitle>
                  <CardDescription>
                    Calculate or recalculate AI score for a specific client
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Client</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a client to score" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.first_name} {client.last_name} ({client.email})
                            {client.ai_lead_score && (
                              <Badge variant="outline" className="ml-2">
                                Current: {client.ai_lead_score}
                              </Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={() => calculateClientScore(selectedClient)}
                    disabled={!selectedClient || calculating}
                    className="w-full"
                  >
                    {calculating ? (
                      <>
                        <Zap className="h-4 w-4 mr-2 animate-pulse" />
                        Calculating AI Score...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Calculate AI Score
                      </>
                    )}
                  </Button>

                  {clientScore && (
                    <div className="space-y-4 mt-6">
                      <Separator />
                      
                      <div className="text-center space-y-2">
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-center">
                            <p className="text-3xl font-bold text-primary">{clientScore.ai_score}</p>
                            <p className="text-sm text-muted-foreground">AI Score</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold">{clientScore.confidence}%</p>
                            <p className="text-sm text-muted-foreground">Confidence</p>
                          </div>
                        </div>
                        <Badge 
                          variant={getScoreBadgeVariant(clientScore.ai_score)}
                          className="text-sm"
                        >
                          {getScoreLabel(clientScore.ai_score)}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Scoring Factors</h4>
                        {clientScore.factors.map((factor, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{factor.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{factor.weight}% weight</Badge>
                                <span className="text-sm font-medium">{factor.score}/100</span>
                              </div>
                            </div>
                            <Progress value={factor.score} className="h-2" />
                            <p className="text-xs text-muted-foreground">{factor.details}</p>
                          </div>
                        ))}
                      </div>

                      {clientScore.recommendations && clientScore.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium">AI Recommendations</h4>
                          <div className="space-y-2">
                            {clientScore.recommendations.map((rec, index) => (
                              <Alert key={index}>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>{rec}</AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    AI Scoring Insights
                  </CardTitle>
                  <CardDescription>
                    Understanding how the AI lead scoring algorithm works
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Scoring Factors</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Financial Capacity</span>
                          <Badge variant="outline">30% weight</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Engagement Level</span>
                          <Badge variant="outline">25% weight</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Timeline & Urgency</span>
                          <Badge variant="outline">20% weight</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Profile Completeness</span>
                          <Badge variant="outline">15% weight</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Communication Quality</span>
                          <Badge variant="outline">10% weight</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Score Ranges</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">80-100</Badge>
                          <span className="text-sm">High Priority - Immediate follow-up</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">60-79</Badge>
                          <span className="text-sm">Medium Priority - Schedule consultation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">0-59</Badge>
                          <span className="text-sm">Low Priority - Nurture with content</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">How It Works</h4>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        Our AI scoring system analyzes multiple data points about each lead to predict their likelihood of converting. 
                        The algorithm considers engagement patterns, financial indicators, communication quality, and timeline urgency.
                      </p>
                      <p>
                        <strong>Financial Capacity (30%):</strong> Budget range, income levels, employment status, and budget-to-income ratios.
                      </p>
                      <p>
                        <strong>Engagement Level (25%):</strong> Recent activity frequency, interaction diversity, and activity scores over the past 30 days.
                      </p>
                      <p>
                        <strong>Timeline & Urgency (20%):</strong> Purchase timeline, recent activity patterns, and communication frequency.
                      </p>
                      <p>
                        <strong>Profile Completeness (15%):</strong> How complete their profile is, including contact info, preferences, and requirements.
                      </p>
                      <p>
                        <strong>Communication Quality (10%):</strong> Call outcomes, response times, and engagement quality in conversations.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
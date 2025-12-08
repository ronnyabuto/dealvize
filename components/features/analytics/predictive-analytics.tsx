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
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, Users, Calendar, BarChart3, Zap, Brain, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface PredictiveAnalytics {
  timeframe: string
  predictions: {
    deal_conversion: any
    revenue_forecast: any
    lead_quality_trends: any
    pipeline_performance: any
    seasonal_patterns: any
    risk_assessment: any
  }
  generated_at: string
}

export function PredictiveAnalytics() {
  const [analytics, setAnalytics] = useState<PredictiveAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [timeframe, setTimeframe] = useState('30')
  const [selectedMetric, setSelectedMetric] = useState('all')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        timeframe,
        metric: selectedMetric
      })

      const response = await fetch(`/api/analytics/predictive?${params}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')
      
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching predictive analytics:', error)
      toast.error('Failed to load predictive analytics')
    } finally {
      setLoading(false)
    }
  }

  const refreshAnalytics = () => {
    fetchAnalytics()
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'decreasing':
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />
    }
  }

  const getRiskSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 10) / 10}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Brain className="h-12 w-12 mx-auto animate-pulse text-primary" />
          <div>
            <p className="text-lg font-medium">Generating Predictions</p>
            <p className="text-sm text-muted-foreground">Analyzing your data with AI...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Failed to load predictive analytics</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
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
                <Brain className="h-5 w-5" />
                Predictive Analytics Dashboard
              </CardTitle>
              <CardDescription>
                AI-powered predictions and insights based on your business data
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeframe} onValueChange={(value) => { setTimeframe(value); fetchAnalytics(); }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="180">6 Months</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={refreshAnalytics}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="conversion">Conversion</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                        <p className="text-2xl font-bold">{formatPercentage(analytics.predictions.deal_conversion.predicted_conversion_rate)}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getTrendIcon(analytics.predictions.deal_conversion.trend)}
                          <span className="text-xs text-muted-foreground">{analytics.predictions.deal_conversion.trend}</span>
                        </div>
                      </div>
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Revenue Forecast</p>
                        <p className="text-2xl font-bold">{formatCurrency(analytics.predictions.revenue_forecast.next_month_forecast)}</p>
                        <p className="text-xs text-muted-foreground">Next month</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Lead Quality</p>
                        <p className="text-2xl font-bold">{Math.round(analytics.predictions.lead_quality_trends.average_lead_score)}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {getTrendIcon(analytics.predictions.lead_quality_trends.quality_trend)}
                          <span className="text-xs text-muted-foreground">{analytics.predictions.lead_quality_trends.quality_trend}</span>
                        </div>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Risk Score</p>
                        <p className="text-2xl font-bold">{analytics.predictions.risk_assessment.overall_risk_score}</p>
                        <Badge 
                          variant={analytics.predictions.risk_assessment.overall_risk_score > 50 ? 'destructive' : analytics.predictions.risk_assessment.overall_risk_score > 25 ? 'secondary' : 'outline'}
                          className="mt-1"
                        >
                          {analytics.predictions.risk_assessment.overall_risk_score > 50 ? 'High' : analytics.predictions.risk_assessment.overall_risk_score > 25 ? 'Medium' : 'Low'}
                        </Badge>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Lead Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.predictions.lead_quality_trends.best_sources?.map((source: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{source.source}</p>
                            <p className="text-sm text-muted-foreground">{source.count} leads</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{Math.round(source.avg_score)}</Badge>
                            <p className="text-xs text-muted-foreground">{formatPercentage(source.conversion_rate)} conversion</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pipeline Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Health Score</span>
                          <span className="text-sm font-bold">{analytics.predictions.pipeline_performance.pipeline_health_score}/100</span>
                        </div>
                        <Progress value={analytics.predictions.pipeline_performance.pipeline_health_score} className="h-2" />
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">Identified Issues</p>
                        {analytics.predictions.pipeline_performance.identified_bottlenecks?.length > 0 ? (
                          <div className="space-y-1">
                            {analytics.predictions.pipeline_performance.identified_bottlenecks.slice(0, 3).map((bottleneck: any, index: number) => (
                              <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                {bottleneck.stage}: {bottleneck.issue === 'long_duration' ? 'Long duration' : 'Low conversion'}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No major issues detected</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="conversion" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Conversion Predictions</CardTitle>
                  <CardDescription>
                    Analysis and predictions for lead-to-deal conversion rates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-primary">{formatPercentage(analytics.predictions.deal_conversion.current_conversion_rate)}</p>
                      <p className="text-sm text-muted-foreground">Current Rate</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{formatPercentage(analytics.predictions.deal_conversion.predicted_conversion_rate)}</p>
                      <p className="text-sm text-muted-foreground">Predicted Rate</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{analytics.predictions.deal_conversion.expected_conversions}</p>
                      <p className="text-sm text-muted-foreground">Expected Conversions</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Prediction Confidence</span>
                      <span className="text-sm font-bold">{analytics.predictions.deal_conversion.confidence}%</span>
                    </div>
                    <Progress value={analytics.predictions.deal_conversion.confidence} className="h-2" />
                  </div>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      Based on current trends, we expect {analytics.predictions.deal_conversion.expected_conversions} conversions 
                      from {analytics.predictions.deal_conversion.expected_new_leads} new leads in the next 30 days.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Forecast</CardTitle>
                  <CardDescription>
                    Predictive revenue analysis based on pipeline and historical data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-xl font-bold">{formatCurrency(analytics.predictions.revenue_forecast.current_month_revenue)}</p>
                      <p className="text-sm text-muted-foreground">This Month</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-xl font-bold">{formatCurrency(analytics.predictions.revenue_forecast.next_month_forecast)}</p>
                      <p className="text-sm text-muted-foreground">Next Month</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-xl font-bold">{formatCurrency(analytics.predictions.revenue_forecast.quarter_forecast)}</p>
                      <p className="text-sm text-muted-foreground">Quarter</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {getTrendIcon(analytics.predictions.revenue_forecast.growth_rate > 0 ? 'increasing' : analytics.predictions.revenue_forecast.growth_rate < 0 ? 'decreasing' : 'stable')}
                        <p className="text-xl font-bold">{formatPercentage(analytics.predictions.revenue_forecast.growth_rate)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">Growth Rate</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Pipeline Value</span>
                      <span className="text-sm font-bold">{formatCurrency(analytics.predictions.revenue_forecast.pipeline_value)}</span>
                    </div>
                    <Progress 
                      value={Math.min(100, (analytics.predictions.revenue_forecast.pipeline_value / analytics.predictions.revenue_forecast.quarter_forecast) * 100)} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((analytics.predictions.revenue_forecast.pipeline_value / analytics.predictions.revenue_forecast.quarter_forecast) * 100)}% of quarter forecast
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Forecast Confidence</span>
                      <span className="text-sm font-bold">{analytics.predictions.revenue_forecast.confidence}%</span>
                    </div>
                    <Progress value={analytics.predictions.revenue_forecast.confidence} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pipeline" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Performance Analysis</CardTitle>
                  <CardDescription>
                    Stage-by-stage analysis and predictions for your sales pipeline
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{analytics.predictions.pipeline_performance.average_deal_duration}</p>
                      <p className="text-sm text-muted-foreground">Avg Deal Duration (days)</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{analytics.predictions.pipeline_performance.pipeline_health_score}</p>
                      <p className="text-sm text-muted-foreground">Health Score</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Stage Performance</h4>
                    <div className="space-y-3">
                      {analytics.predictions.pipeline_performance.stage_performance?.map((stage: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium capitalize">{stage.stage.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">{stage.deal_count} deals</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">{stage.avg_time_in_stage}d</span> avg time
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">{formatPercentage(stage.conversion_rate)}</span> conversion
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {analytics.predictions.pipeline_performance.identified_bottlenecks?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 text-yellow-600">Identified Bottlenecks</h4>
                      <div className="space-y-2">
                        {analytics.predictions.pipeline_performance.identified_bottlenecks.map((bottleneck: any, index: number) => (
                          <Alert key={index}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>{bottleneck.stage}:</strong> {bottleneck.issue === 'long_duration' 
                                ? `Deals taking too long (${bottleneck.avg_time} days average)` 
                                : `Low conversion rate (${formatPercentage(bottleneck.conversion_rate)})`}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-3">Recommendations</h4>
                    <div className="space-y-2">
                      {analytics.predictions.pipeline_performance.recommendations?.map((rec: string, index: number) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <Zap className="h-4 w-4 text-blue-500 mt-0.5" />
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seasonal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Seasonal Patterns Analysis</CardTitle>
                  <CardDescription>
                    Historical patterns and seasonal trends in your business
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {analytics.predictions.seasonal_patterns.patterns?.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.predictions.seasonal_patterns.patterns.map((pattern: any, index: number) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4" />
                            <h4 className="font-medium capitalize">{pattern.pattern_type.replace('_', ' ')}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Months: {pattern.months.join(', ')}
                          </p>
                          <Badge variant="outline">
                            {pattern.average_increase 
                              ? `+${formatPercentage(pattern.average_increase)} above average`
                              : `-${formatPercentage(pattern.average_decrease)} below average`}
                          </Badge>
                        </div>
                      ))}

                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Next Month Prediction</h4>
                        <p className="text-sm">
                          Trend: <strong>{analytics.predictions.seasonal_patterns.next_month_prediction}</strong>
                        </p>
                      </div>

                      {analytics.predictions.seasonal_patterns.seasonal_recommendations?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3">Seasonal Recommendations</h4>
                          <div className="space-y-2">
                            {analytics.predictions.seasonal_patterns.seasonal_recommendations.map((rec: string, index: number) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-green-500 mt-0.5" />
                                {rec}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">{analytics.predictions.seasonal_patterns.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risks" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Risk Assessment
                  </CardTitle>
                  <CardDescription>
                    Identified risks and mitigation recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{analytics.predictions.risk_assessment.total_risks}</p>
                      <p className="text-sm text-muted-foreground">Total Risks</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{analytics.predictions.risk_assessment.high_severity_count}</p>
                      <p className="text-sm text-muted-foreground">High Severity</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{analytics.predictions.risk_assessment.overall_risk_score}</p>
                      <p className="text-sm text-muted-foreground">Risk Score</p>
                    </div>
                  </div>

                  {analytics.predictions.risk_assessment.risks?.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-medium">Identified Risks</h4>
                      {analytics.predictions.risk_assessment.risks.map((risk: any, index: number) => (
                        <Alert key={index}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex items-center justify-between mb-2">
                              <strong className="capitalize">{risk.type.replace('_', ' ')}</strong>
                              <Badge variant={getRiskSeverityColor(risk.severity) as any}>
                                {risk.severity}
                              </Badge>
                            </div>
                            <p className="text-sm">{risk.description}</p>
                            {risk.potential_value_at_risk && (
                              <p className="text-sm text-red-600 mt-1">
                                Potential value at risk: {formatCurrency(risk.potential_value_at_risk)}
                              </p>
                            )}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p className="text-muted-foreground">No significant risks identified</p>
                    </div>
                  )}

                  {analytics.predictions.risk_assessment.recommendations?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Risk Mitigation Recommendations</h4>
                      <div className="space-y-2">
                        {analytics.predictions.risk_assessment.recommendations.map((rec: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <Zap className="h-4 w-4 text-blue-500 mt-0.5" />
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>Analytics generated: {new Date(analytics.generated_at).toLocaleString()}</p>
        <p>Based on {analytics.timeframe} of historical data</p>
      </div>
    </div>
  )
}
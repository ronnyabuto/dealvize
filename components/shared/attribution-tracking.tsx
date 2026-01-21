"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { TrendingUp, Users, DollarSign, Target, Clock, ArrowRight, BarChart3, PieChart, Activity, Zap, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface AttributionAnalytics {
  channel_performance: ChannelPerformance[]
  conversion_paths: ConversionPath[]
  attribution_summary: AttributionSummary
  touchpoint_analysis: TouchpointAnalysis
  time_to_conversion: TimeToConversion
}

interface ChannelPerformance {
  touchpoint_type: string
  channel: string
  total_touchpoints: number
  unique_clients: number
  total_value: number
  attributed_value: number
  conversions: number
  conversion_rate: number
  roi: number
}

interface ConversionPath {
  path: string
  count: number
  conversions: number
  conversion_rate: number
  total_value: number
  avg_value_per_journey: number
  avg_touchpoints: number
  avg_time_to_conversion: number
}

interface AttributionSummary {
  total_touchpoints: number
  unique_clients: number
  total_value: number
  conversions: number
  conversion_rate: number
  avg_touchpoints_per_client: number
  avg_value_per_touchpoint: number
  channel_breakdown: ChannelBreakdown[]
}

interface ChannelBreakdown {
  touchpoint_type: string
  count: number
  percentage: number
}

interface TouchpointAnalysis {
  hourly_distribution: HourlyData[]
  daily_distribution: DailyData[]
  top_sources: SourceData[]
}

interface HourlyData {
  hour: number
  count: number
  conversion_rate: number
}

interface DailyData {
  day: number
  day_name: string
  count: number
  conversion_rate: number
}

interface SourceData {
  source: string
  count: number
  conversions: number
  conversion_rate: number
}

interface TimeToConversion {
  avg_time_to_conversion: number
  median_time_to_conversion: number
  avg_touchpoints_to_conversion: number
  conversion_timeframes: {
    same_day: number
    within_week: number
    within_month: number
    over_month: number
  }
}

export function AttributionTracking() {
  const [analytics, setAnalytics] = useState<AttributionAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [timeframe, setTimeframe] = useState('90')
  const [attributionModel, setAttributionModel] = useState('multi_touch')

  useEffect(() => {
    fetchAnalytics()
  }, [timeframe, attributionModel])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        timeframe,
        model: attributionModel
      })

      const response = await fetch(`/api/attribution?${params}`)
      if (!response.ok) throw new Error('Failed to fetch attribution analytics')
      
      const data = await response.json()
      setAnalytics(data.analytics)
    } catch (error) {
      console.error('Error fetching attribution analytics:', error)
      toast.error('Failed to load attribution analytics')
    } finally {
      setLoading(false)
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

  const getChannelIcon = (touchpointType: string) => {
    const iconMap: { [key: string]: any } = {
      email: '📧',
      sms: '💬',
      call: 'Call',
      website: '🌐',
      social: '📱',
      ad: '📢',
      referral: 'Group',
      direct: 'Target'
    }
    return iconMap[touchpointType] || '📍'
  }

  const getROIColor = (roi: number) => {
    if (roi > 100) return 'text-green-600'
    if (roi > 0) return 'text-green-500'
    if (roi > -50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <BarChart3 className="h-12 w-12 mx-auto animate-pulse text-primary" />
          <div>
            <p className="text-lg font-medium">Analyzing Attribution Data</p>
            <p className="text-sm text-muted-foreground">Processing customer journey data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No attribution data available</p>
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
                <BarChart3 className="h-5 w-5" />
                Multi-Channel Attribution Tracking
              </CardTitle>
              <CardDescription>
                Track customer journey across all touchpoints and analyze channel performance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={attributionModel} onValueChange={setAttributionModel}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_touch">First Touch</SelectItem>
                  <SelectItem value="last_touch">Last Touch</SelectItem>
                  <SelectItem value="multi_touch">Multi-Touch</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeframe} onValueChange={setTimeframe}>
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
              <Button variant="outline" size="sm" onClick={fetchAnalytics}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="channels">Channels</TabsTrigger>
              <TabsTrigger value="journeys">Journeys</TabsTrigger>
              <TabsTrigger value="timing">Timing</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Touchpoints</p>
                        <p className="text-2xl font-bold">{analytics.attribution_summary.total_touchpoints.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(analytics.attribution_summary.avg_touchpoints_per_client)} avg per client
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Unique Clients</p>
                        <p className="text-2xl font-bold">{analytics.attribution_summary.unique_clients}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercentage(analytics.attribution_summary.conversion_rate)} conversion rate
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                        <p className="text-2xl font-bold">{formatCurrency(analytics.attribution_summary.total_value)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(analytics.attribution_summary.avg_value_per_touchpoint)} per touchpoint
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Conversions</p>
                        <p className="text-2xl font-bold">{analytics.attribution_summary.conversions}</p>
                        <p className="text-xs text-muted-foreground">
                          {analytics.time_to_conversion.avg_time_to_conversion}d avg time
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Channel Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.attribution_summary.channel_breakdown.map((channel, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getChannelIcon(channel.touchpoint_type)}</span>
                              <span className="font-medium capitalize">{channel.touchpoint_type}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-medium">{channel.count}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({formatPercentage(channel.percentage)})
                              </span>
                            </div>
                          </div>
                          <Progress value={channel.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Conversion Timing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 border rounded-lg">
                          <p className="text-2xl font-bold">{analytics.time_to_conversion.avg_time_to_conversion}</p>
                          <p className="text-sm text-muted-foreground">Avg Days</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <p className="text-2xl font-bold">{analytics.time_to_conversion.avg_touchpoints_to_conversion}</p>
                          <p className="text-sm text-muted-foreground">Avg Touchpoints</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Same Day</span>
                          <Badge variant="outline">{analytics.time_to_conversion.conversion_timeframes.same_day}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Within Week</span>
                          <Badge variant="outline">{analytics.time_to_conversion.conversion_timeframes.within_week}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Within Month</span>
                          <Badge variant="outline">{analytics.time_to_conversion.conversion_timeframes.within_month}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Over Month</span>
                          <Badge variant="outline">{analytics.time_to_conversion.conversion_timeframes.over_month}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="channels" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Channel Performance Analysis</CardTitle>
                  <CardDescription>
                    Performance metrics for each marketing channel using {attributionModel.replace('_', '-')} attribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Channel</TableHead>
                          <TableHead className="text-right">Touchpoints</TableHead>
                          <TableHead className="text-right">Unique Clients</TableHead>
                          <TableHead className="text-right">Attributed Value</TableHead>
                          <TableHead className="text-right">Conversions</TableHead>
                          <TableHead className="text-right">Conv. Rate</TableHead>
                          <TableHead className="text-right">ROI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.channel_performance.map((channel, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getChannelIcon(channel.touchpoint_type)}</span>
                                <div>
                                  <p className="font-medium capitalize">{channel.touchpoint_type}</p>
                                  <p className="text-sm text-muted-foreground">{channel.channel}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{channel.total_touchpoints}</TableCell>
                            <TableCell className="text-right">{channel.unique_clients}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(channel.attributed_value)}
                            </TableCell>
                            <TableCell className="text-right">{channel.conversions}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={channel.conversion_rate > 10 ? 'default' : channel.conversion_rate > 5 ? 'secondary' : 'outline'}>
                                {formatPercentage(channel.conversion_rate)}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${getROIColor(channel.roi)}`}>
                              {channel.roi > 0 ? '+' : ''}{formatPercentage(channel.roi)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="journeys" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Conversion Paths</CardTitle>
                  <CardDescription>
                    Most common customer journey paths leading to conversions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {analytics.conversion_paths.slice(0, 15).map((path, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {path.count} journeys
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {path.conversions} conversions
                              </span>
                              <Badge variant={path.conversion_rate > 20 ? 'default' : path.conversion_rate > 10 ? 'secondary' : 'outline'}>
                                {formatPercentage(path.conversion_rate)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            {path.path.split(' -> ').map((step, stepIndex, steps) => (
                              <div key={stepIndex} className="flex items-center gap-2">
                                <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded">
                                  <span className="text-xs">{getChannelIcon(step.split(':')[0])}</span>
                                  <span className="capitalize">{step.split(':')[0]}</span>
                                  {step.split(':')[1] !== 'direct' && (
                                    <span className="text-xs text-muted-foreground">({step.split(':')[1]})</span>
                                  )}
                                </div>
                                {stepIndex < steps.length - 1 && (
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Avg Value</p>
                              <p className="font-medium">{formatCurrency(path.avg_value_per_journey)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Touchpoints</p>
                              <p className="font-medium">{path.avg_touchpoints}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Time to Convert</p>
                              <p className="font-medium">{Math.round(path.avg_time_to_conversion)}d</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timing" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hourly Activity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.touchpoint_analysis.hourly_distribution.map((hour) => (
                        <div key={hour.hour} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>
                              {hour.hour.toString().padStart(2, '0')}:00 - {((hour.hour + 1) % 24).toString().padStart(2, '0')}:00
                            </span>
                            <div className="flex items-center gap-2">
                              <span>{hour.count} touchpoints</span>
                              <Badge variant="outline" className="text-xs">
                                {formatPercentage(hour.conversion_rate)}
                              </Badge>
                            </div>
                          </div>
                          <Progress 
                            value={(hour.count / Math.max(...analytics.touchpoint_analysis.hourly_distribution.map(h => h.count))) * 100} 
                            className="h-2" 
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Daily Activity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.touchpoint_analysis.daily_distribution.map((day) => (
                        <div key={day.day} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{day.day_name}</span>
                            <div className="flex items-center gap-2">
                              <span>{day.count} touchpoints</span>
                              <Badge variant="outline" className="text-xs">
                                {formatPercentage(day.conversion_rate)}
                              </Badge>
                            </div>
                          </div>
                          <Progress 
                            value={(day.count / Math.max(...analytics.touchpoint_analysis.daily_distribution.map(d => d.count))) * 100} 
                            className="h-2" 
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Traffic Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.touchpoint_analysis.top_sources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{source.source}</p>
                          <p className="text-sm text-muted-foreground">{source.count} touchpoints</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{source.conversions} conversions</p>
                          <Badge variant="outline" className="text-xs">
                            {formatPercentage(source.conversion_rate)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Best Performing Channel:</strong> {analytics.channel_performance[0]?.touchpoint_type} 
                        with {formatCurrency(analytics.channel_performance[0]?.attributed_value)} attributed value
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Average Customer Journey:</strong> {analytics.time_to_conversion.avg_touchpoints_to_conversion} touchpoints 
                        over {analytics.time_to_conversion.avg_time_to_conversion} days
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <PieChart className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Quick Conversions:</strong> {analytics.time_to_conversion.conversion_timeframes.same_day + analytics.time_to_conversion.conversion_timeframes.within_week} 
                        out of {analytics.attribution_summary.conversions} conversions happened within a week
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Attribution Model Comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm space-y-3">
                      <div className="p-3 border rounded-lg">
                        <p className="font-medium">First-Touch Attribution</p>
                        <p className="text-muted-foreground">
                          Credits 100% to the first interaction. Best for understanding awareness drivers.
                        </p>
                      </div>
                      
                      <div className="p-3 border rounded-lg">
                        <p className="font-medium">Last-Touch Attribution</p>
                        <p className="text-muted-foreground">
                          Credits 100% to the final interaction. Best for understanding conversion drivers.
                        </p>
                      </div>
                      
                      <div className="p-3 border rounded-lg bg-muted">
                        <p className="font-medium flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Multi-Touch Attribution (Current)
                        </p>
                        <p className="text-muted-foreground">
                          Distributes credit across all touchpoints with time-decay weighting. 
                          Most accurate for full customer journey analysis.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList 
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Users, Activity, Clock, Target, 
  DollarSign, Eye, MousePointer, Zap, AlertTriangle, CheckCircle 
} from 'lucide-react'

interface AnalyticsDashboardProps {
  userId?: string
  showBusiness?: boolean
  showPerformance?: boolean
}

export function AnalyticsDashboard({ 
  userId, 
  showBusiness = true, 
  showPerformance = true 
}: AnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState('7d')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalyticsData = async (metric: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?timeframe=${timeframe}&metric=${metric}`)
      if (!response.ok) throw new Error('Failed to fetch analytics data')
      
      const result = await response.json()
      setData(result.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData('overview')
  }, [timeframe, fetchAnalyticsData])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const getMetricTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change).toFixed(1),
      direction: change >= 0 ? 'up' : 'down',
      positive: change >= 0
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load analytics data: {error}</p>
          <Button 
            onClick={() => fetchAnalyticsData('overview')} 
            variant="outline" 
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600">Track your application performance and user engagement</p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 Hours</SelectItem>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
            <SelectItem value="90d">90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {showPerformance && <TabsTrigger value="performance">Performance</TabsTrigger>}
          {showBusiness && <TabsTrigger value="business">Business</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data?.totalUsers || 0)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  +12.5% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data?.totalSessions || 0)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  +8.2% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Session Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(data?.averageSessionDuration || 0)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  -3.1% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((data?.conversionRate || 0) * 100).toFixed(1)}%
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  +5.7% from last period
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Pages and Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Most visited pages in the selected timeframe</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.topPages?.map((page: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <div className="font-medium">{page.path}</div>
                          <div className="text-sm text-gray-500">{page.uniqueViews} unique views</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatNumber(page.views)}</div>
                        <div className="text-sm text-gray-500">views</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Events</CardTitle>
                <CardDescription>Most tracked events in the selected timeframe</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.topEvents?.map((event: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <div className="font-medium">{event.event.replace(/_/g, ' ')}</div>
                          <div className="text-sm text-gray-500">Event</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatNumber(event.count)}</div>
                        <div className="text-sm text-gray-500">occurrences</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {showPerformance && (
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Core Web Vitals</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>LCP (Largest Contentful Paint)</span>
                      <span>{data?.performance?.coreWebVitals?.lcp}s</span>
                    </div>
                    <Progress 
                      value={(data?.performance?.coreWebVitals?.lcp / 4) * 100} 
                      className="mt-1"
                    />
                    <div className="text-xs text-gray-500 mt-1">Good: &lt;2.5s</div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>FID (First Input Delay)</span>
                      <span>{data?.performance?.coreWebVitals?.fid}ms</span>
                    </div>
                    <Progress 
                      value={(data?.performance?.coreWebVitals?.fid / 100) * 100} 
                      className="mt-1"
                    />
                    <div className="text-xs text-gray-500 mt-1">Good: &lt;100ms</div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>CLS (Cumulative Layout Shift)</span>
                      <span>{data?.performance?.coreWebVitals?.cls}</span>
                    </div>
                    <Progress 
                      value={(data?.performance?.coreWebVitals?.cls / 0.25) * 100} 
                      className="mt-1"
                    />
                    <div className="text-xs text-gray-500 mt-1">Good: &lt;0.1</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Page Load Performance</CardTitle>
                  <CardDescription>Average load times by page</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data?.performance?.slowestPages || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="path" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}ms`, 'Load Time']} />
                      <Bar dataKey="averageLoadTime" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {showBusiness && (
          <TabsContent value="business" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${formatNumber(data?.business?.totalRevenue || 0)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    +23.1% from last period
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.business?.totalDeals || 0}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    +15.3% from last period
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Deals Won</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.business?.dealsWon || 0}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    +18.7% from last period
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Deal Size</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${formatNumber(data?.business?.averageDealSize || 0)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    +7.2% from last period
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sales Funnel</CardTitle>
                <CardDescription>Deal progression through sales stages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart data={data?.business?.conversionFunnel || []}>
                    <Tooltip />
                    <Funnel
                      dataKey="count"
                      data={data?.business?.conversionFunnel || []}
                      isAnimationActive
                    >
                      <LabelList position="center" fill="#fff" stroke="none" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
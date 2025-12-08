/**
 * Real-time Admin Dashboard Component
 * Enterprise-grade monitoring dashboard with live metrics and alerts
 */

"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Users,
  Server,
  Database,
  Cpu,
  HardDrive,
  Shield,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  Eye,
  Clock,
  Zap,
  Globe,
  Mail,
  MessageSquare,
  BarChart3,
  Loader2
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts'

interface DashboardMetrics {
  timestamp: string
  time_range: string
  system_health: {
    tenants: { total: number; active: number; health_score: number }
    users: { total: number; active: number; activity_rate: number }
    subscriptions: { active: number; trial: number; cancelled: number; past_due: number }
    plan_distribution: { starter: number; professional: number; enterprise: number }
    error_count: number
    uptime: number
  }
  user_activity: {
    login_count: number
    total_actions: number
    active_sessions: number
    hourly_activity: Array<{ hour: string; activity_count: number }>
    peak_hour: { hour: string; activity_count: number }
  }
  business_metrics: {
    new_deals: number
    new_clients: number
    messages_sent: number
    automation_executions: number
    email_delivery_rate: number
  }
  performance: {
    avg_response_time: number
    api_success_rate: number
    database_connections: number
    memory_usage: number
    cpu_usage: number
    storage_usage: { used_gb: number; total_gb: number; percentage: number }
  }
  security: {
    failed_login_attempts: number
    suspicious_activities: number
    admin_actions: number
    security_score: number
    vulnerabilities: { critical: number; high: number; medium: number; low: number }
  }
  alerts: Array<{
    id: string
    type: 'error' | 'warning' | 'info' | 'success'
    title: string
    message: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    created_at: string
    resolved: boolean
  }>
}

export function RealtimeDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadMetrics()
    
    if (isAutoRefresh) {
      intervalRef.current = setInterval(loadMetrics, refreshInterval * 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [refreshInterval, isAutoRefresh, timeRange])

  const loadMetrics = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/admin/dashboard/realtime?range=${timeRange}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics')
      }

      const data = await response.json()
      setMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    loadMetrics()
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading dashboard metrics...
      </div>
    )
  }

  if (error && !metrics) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!metrics) return null

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-time Dashboard</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant={isAutoRefresh ? 'default' : 'outline'}
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Auto: {isAutoRefresh ? 'On' : 'Off'}
          </Button>
        </div>
      </div>

      {/* System Alerts */}
      {metrics.alerts && metrics.alerts.length > 0 && (
        <div className="space-y-2">
          {metrics.alerts.map((alert) => (
            <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              <div className="flex items-center gap-2">
                {alert.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : 
                 alert.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
                 alert.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                 <Bell className="h-4 w-4" />}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong>{alert.title}</strong>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <AlertDescription className="mt-1">
                    {alert.message}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.system_health.uptime}%</div>
                <p className="text-xs text-muted-foreground">Uptime</p>
                <div className="mt-2">
                  <Progress value={metrics.system_health.uptime} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.system_health.users.active}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.system_health.users.activity_rate}% of total users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.business_metrics.messages_sent}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.business_metrics.email_delivery_rate}% delivery rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.security.security_score}%</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.security.failed_login_attempts} failed logins
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.user_activity.hourly_activity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString([], {hour: '2-digit'})}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                    formatter={(value) => [value, 'Actions']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="activity_count" 
                    stroke="#0088FE" 
                    fill="#0088FE" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tenant Health */}
            <Card>
              <CardHeader>
                <CardTitle>Tenant Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Tenants</span>
                    <span className="font-bold">{metrics.system_health.tenants.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Tenants</span>
                    <span className="font-bold">{metrics.system_health.tenants.active}</span>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Health Score</span>
                      <span className="font-bold">{metrics.system_health.tenants.health_score}%</span>
                    </div>
                    <Progress value={metrics.system_health.tenants.health_score} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: metrics.system_health.subscriptions.active },
                        { name: 'Trial', value: metrics.system_health.subscriptions.trial },
                        { name: 'Cancelled', value: metrics.system_health.subscriptions.cancelled },
                        { name: 'Past Due', value: metrics.system_health.subscriptions.past_due }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.performance.avg_response_time}ms</div>
                <p className="text-xs text-muted-foreground">Average response time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.performance.api_success_rate}%</div>
                <p className="text-xs text-muted-foreground">API success rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.performance.cpu_usage}%</div>
                <Progress value={metrics.performance.cpu_usage} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.performance.memory_usage}%</div>
                <Progress value={metrics.performance.memory_usage} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Storage Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Used Storage</span>
                  <span>{metrics.performance.storage_usage.used_gb}GB / {metrics.performance.storage_usage.total_gb}GB</span>
                </div>
                <Progress value={metrics.performance.storage_usage.percentage} />
                <p className="text-sm text-muted-foreground">
                  {metrics.performance.storage_usage.percentage}% of total capacity
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.security.security_score}%</div>
                <Progress value={metrics.security.security_score} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.security.failed_login_attempts}</div>
                <p className="text-xs text-muted-foreground">In selected time range</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Suspicious Activities</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.security.suspicious_activities}</div>
                <p className="text-xs text-muted-foreground">Detected events</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admin Actions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.security.admin_actions}</div>
                <p className="text-xs text-muted-foreground">Admin operations</p>
              </CardContent>
            </Card>
          </div>

          {/* Vulnerabilities */}
          <Card>
            <CardHeader>
              <CardTitle>Security Vulnerabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{metrics.security.vulnerabilities.critical}</div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{metrics.security.vulnerabilities.high}</div>
                  <p className="text-sm text-muted-foreground">High</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{metrics.security.vulnerabilities.medium}</div>
                  <p className="text-sm text-muted-foreground">Medium</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{metrics.security.vulnerabilities.low}</div>
                  <p className="text-sm text-muted-foreground">Low</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  LineChart,
  Line,
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
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Eye,
  Edit,
  Trash,
  Download,
  AlertTriangle,
  Calendar,
  CreditCard,
  Building,
  Loader2,
  Plus,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface BillingOverview {
  overview: {
    totalActiveSubscriptions: number
    totalNewSubscriptions: number
    monthlyRecurringRevenue: number
    churnRate: number
    averageRevenuePerUser: number
  }
  planDistribution: {
    starter: number
    professional: number
    enterprise: number
  }
  subscriptionHealth: {
    healthy: number
    atRisk: number
    expired: number
  }
  dailyMetrics: Array<{
    date: string
    signups: number
    churns: number
    net: number
  }>
  recentTransactions: Array<{
    id: string
    tenantName: string
    planType: string
    status: string
    amount: number
    date: string
    type: string
  }>
}

interface Subscription {
  id: string
  tenant_id: string
  plan_type: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  stripe_customer_id?: string
  tenants: {
    id: string
    name: string
    domain: string
    industry?: string
  }
}

const PLAN_COLORS = {
  starter: '#f59e0b',
  professional: '#3b82f6', 
  enterprise: '#8b5cf6'
}

const STATUS_COLORS = {
  active: '#10b981',
  cancelled: '#ef4444',
  past_due: '#f59e0b',
  incomplete: '#6b7280'
}

export function BillingManagement() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<BillingOverview | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [timeRange, setTimeRange] = useState('30d')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadData()
  }, [timeRange])

  const loadData = async () => {
    try {
      setLoading(true)
      const [overviewResponse, subscriptionsResponse] = await Promise.all([
        fetch(`/api/admin/billing/overview?range=${timeRange}`),
        fetch('/api/admin/billing/subscriptions')
      ])

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json()
        setOverview(overviewData)
      }

      if (subscriptionsResponse.ok) {
        const subscriptionsData = await subscriptionsResponse.json()
        setSubscriptions(subscriptionsData.subscriptions)
      }
    } catch (error) {
      console.error('Error loading billing data:', error)
      toast.error('Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  const updateSubscription = async (subscriptionId: string, updates: any) => {
    try {
      const response = await fetch(`/api/admin/billing/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        toast.success('Subscription updated successfully')
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update subscription')
      }
    } catch (error) {
      toast.error('Failed to update subscription')
    }
  }

  const cancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/billing/subscriptions/${subscriptionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Subscription cancelled successfully')
        await loadData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      toast.error('Failed to cancel subscription')
    }
  }

  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case 'starter': return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'professional': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'enterprise': return 'bg-purple-100 text-purple-800 border-purple-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300'
      case 'past_due': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'incomplete': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlanPricing = (planType: string) => {
    const pricing = {
      starter: 29,
      professional: 79,
      enterprise: 149
    }
    return pricing[planType as keyof typeof pricing] || 0
  }

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.tenants.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.tenants.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.stripe_customer_id?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter
    const matchesPlan = planFilter === 'all' || subscription.plan_type === planFilter
    
    return matchesSearch && matchesStatus && matchesPlan
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading billing management...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Billing Management</h1>
          <p className="text-gray-600 mt-1">Monitor subscriptions, revenue, and billing health</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-slate-900">{overview.overview.totalActiveSubscriptions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-slate-900">${overview.overview.monthlyRecurringRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">ARPU</p>
                  <p className="text-2xl font-bold text-slate-900">${overview.overview.averageRevenuePerUser}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Churn Rate</p>
                  <p className="text-2xl font-bold text-slate-900">{overview.overview.churnRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">At Risk</p>
                  <p className="text-2xl font-bold text-slate-900">{overview.subscriptionHealth.atRisk}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="subscriptions" className="w-full">
        <TabsList>
          <TabsTrigger value="subscriptions">All Subscriptions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search subscriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {}}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Subscriptions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Current Period</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.tenants.name}</div>
                          <div className="text-sm text-gray-500">{subscription.tenants.domain}</div>
                          {subscription.tenants.industry && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {subscription.tenants.industry}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPlanBadgeColor(subscription.plan_type)}>
                          {subscription.plan_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(subscription.status)}>
                          {subscription.status.toUpperCase()}
                        </Badge>
                        {subscription.cancel_at_period_end && (
                          <div className="text-xs text-yellow-600 mt-1">Cancelling</div>
                        )}
                      </TableCell>
                      <TableCell>${getPlanPricing(subscription.plan_type)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(subscription.current_period_start).toLocaleDateString()}</div>
                          <div className="text-gray-500">
                            to {new Date(subscription.current_period_end).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(subscription.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSubscription(subscription)
                              setIsDetailModalOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelSubscription(subscription.id)}
                            className="text-red-600"
                            disabled={subscription.status === 'cancelled'}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {overview && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={overview.dailyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="signups" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="churns" stroke="#ef4444" strokeWidth={2} />
                      <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Plan Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Starter', value: overview.planDistribution.starter, color: PLAN_COLORS.starter },
                          { name: 'Professional', value: overview.planDistribution.professional, color: PLAN_COLORS.professional },
                          { name: 'Enterprise', value: overview.planDistribution.enterprise, color: PLAN_COLORS.enterprise }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { color: PLAN_COLORS.starter },
                          { color: PLAN_COLORS.professional },
                          { color: PLAN_COLORS.enterprise }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {overview && overview.recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {overview.recentTransactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{transaction.tenantName}</div>
                          <div className="text-sm text-gray-500">
                            {transaction.type} - {transaction.planType}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${transaction.amount}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent transactions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Subscription Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              {selectedSubscription && `${selectedSubscription.tenants.name} - ${selectedSubscription.plan_type} plan`}
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Organization</Label>
                  <p className="font-medium">{selectedSubscription.tenants.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Plan</Label>
                  <Badge className={getPlanBadgeColor(selectedSubscription.plan_type)}>
                    {selectedSubscription.plan_type.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge className={getStatusBadgeColor(selectedSubscription.status)}>
                    {selectedSubscription.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Monthly Revenue</Label>
                  <p className="font-medium">${getPlanPricing(selectedSubscription.plan_type)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Current Period</Label>
                  <p className="text-sm">
                    {new Date(selectedSubscription.current_period_start).toLocaleDateString()} - 
                    {new Date(selectedSubscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="text-sm">{new Date(selectedSubscription.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              
              {selectedSubscription.cancel_at_period_end && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This subscription is set to cancel at the end of the current period.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
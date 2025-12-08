"use client"

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Plus, BarChart3, FileText, Settings } from "lucide-react"
import { CommissionDashboard } from "@/components/commission-dashboard"
import { useDeals } from "@/hooks/use-deals"
import { useClients } from "@/hooks/use-clients"
import { useTasks } from "@/hooks/use-tasks"
import Link from "next/link"
import type { ReportsFilters } from "@/app/(dashboard)/reports/page"

interface ReportsContentProps {
  filters: ReportsFilters
}

export function ReportsContent({ filters }: ReportsContentProps) {
  const { deals: allDeals, loading: dealsLoading } = useDeals()
  const { clients: allClients, loading: clientsLoading } = useClients()
  const { tasks, loading: tasksLoading } = useTasks()

  // Filter data based on filters
  const { deals, clients } = useMemo(() => {
    let filteredDeals = [...allDeals]
    let filteredClients = [...allClients]

    // Apply date range filter
    if (filters.dateRange !== '30days' || filters.startDate || filters.endDate) {
      const now = new Date()
      let startDate: Date
      let endDate = new Date()

      if (filters.startDate && filters.endDate) {
        startDate = new Date(filters.startDate)
        endDate = new Date(filters.endDate)
      } else {
        switch (filters.dateRange) {
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '90days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          case '1year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            break
          default: // 30days
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
      }

      filteredDeals = filteredDeals.filter(deal => {
        if (!deal.createdAt) return true
        const dealDate = new Date(deal.createdAt)
        return dealDate >= startDate && dealDate <= endDate
      })
    }

    // Apply status filter
    if (filters.status) {
      filteredDeals = filteredDeals.filter(deal => deal.status === filters.status)
    }

    // Apply client filter
    if (filters.clientId) {
      filteredDeals = filteredDeals.filter(deal => deal.clientId === filters.clientId)
      filteredClients = filteredClients.filter(client => client.id === filters.clientId)
    }

    return { deals: filteredDeals, clients: filteredClients }
  }, [allDeals, allClients, filters])

  // Utility function for getting status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Closed': return 'bg-green-500'
      case 'Under Contract': return 'bg-blue-500'
      case 'In Progress': return 'bg-yellow-500'
      case 'Lead': return 'bg-purple-500'
      case 'Lost': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  // Calculate dynamic metrics
  const metrics = useMemo(() => {
    if (dealsLoading || clientsLoading) return null

    // Parse currency values and calculate totals
    const parseValue = (value: string) => {
      const cleanValue = value.replace(/[$,]/g, '')
      return parseFloat(cleanValue) || 0
    }

    const closedDeals = deals.filter(deal => deal.status === 'Closed')
    const totalRevenue = closedDeals.reduce((sum, deal) => sum + parseValue(deal.value), 0)
    const totalCommission = closedDeals.reduce((sum, deal) => sum + parseValue(deal.commission), 0)
    const avgDealSize = closedDeals.length > 0 ? totalRevenue / closedDeals.length : 0

    // Calculate deals by status
    const statusCounts = deals.reduce((acc, deal) => {
      acc[deal.status] = (acc[deal.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalDeals = deals.length
    const dealsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: totalDeals > 0 ? Math.round((count / totalDeals) * 100) : 0,
      color: getStatusColor(status)
    })).sort((a, b) => b.count - a.count)

    return {
      totalRevenue,
      totalCommission,
      closedDealsCount: closedDeals.length,
      totalClients: clients.length,
      avgDealSize,
      dealsByStatus
    }
  }, [deals, clients, dealsLoading, clientsLoading])

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    } else {
      return `$${amount.toFixed(0)}`
    }
  }

  if (dealsLoading || clientsLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const performanceMetrics = [
    {
      title: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      change: "Current period",
      trend: "up" as const,
      icon: DollarSign,
    },
    {
      title: "Deals Closed",
      value: metrics.closedDealsCount.toString(),
      change: `${deals.length} total deals`,
      trend: "up" as const,
      icon: Target,
    },
    {
      title: "Total Clients",
      value: metrics.totalClients.toString(),
      change: "All time",
      trend: "up" as const,
      icon: Users,
    },
    {
      title: "Avg. Deal Size",
      value: formatCurrency(metrics.avgDealSize),
      change: "Closed deals",
      trend: "up" as const,
      icon: TrendingUp,
    },
  ]
  
  return (
    <div className="space-y-6">
      {/* Custom Report Builder Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Reports</CardTitle>
              <p className="text-gray-600">Create and manage your custom reports and dashboards</p>
            </div>
            <Link href="/reports/custom">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Report
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-dashed border-2 hover:border-blue-300 cursor-pointer transition-colors">
              <CardContent className="p-6 text-center">
                <Link href="/reports/custom">
                  <div>
                    <Plus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="font-semibold mb-2">Build Custom Report</h3>
                    <p className="text-sm text-gray-600">Create reports with drag-and-drop interface</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md cursor-pointer transition-shadow">
              <CardContent className="p-6">
                <BarChart3 className="h-8 w-8 text-blue-600 mb-4" />
                <h3 className="font-semibold mb-2">Sales Performance</h3>
                <p className="text-sm text-gray-600 mb-3">Track deals, revenue, and conversion rates</p>
                <Badge variant="outline">Template</Badge>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md cursor-pointer transition-shadow">
              <CardContent className="p-6">
                <FileText className="h-8 w-8 text-green-600 mb-4" />
                <h3 className="font-semibold mb-2">Client Engagement</h3>
                <p className="text-sm text-gray-600 mb-3">Analyze client interactions and communications</p>
                <Badge variant="outline">Template</Badge>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      {/* Commission Dashboard */}
      <CommissionDashboard deals={deals} />
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                  <div
                    className={`flex items-center mt-1 text-sm ${
                      metric.trend === "up" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {metric.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {metric.change}
                  </div>
                </div>
                <metric.icon className="h-8 w-8 text-dealvize-teal" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deals by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Deals by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.dealsByStatus.length > 0 ? (
              metrics.dealsByStatus.map((deal) => (
                <div key={deal.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{deal.status}</span>
                    <span className="text-gray-600">
                      {deal.count} deals ({deal.percentage}%)
                    </span>
                  </div>
                  <Progress value={deal.percentage} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No deals yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Deals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deals.slice(0, 4).length > 0 ? (
                deals.slice(0, 4).map((deal, index) => (
                  <div key={deal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${deal.statusColor}`}></div>
                      <div>
                        <p className="font-medium text-slate-900">{deal.title}</p>
                        <p className="text-sm text-gray-600">{deal.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{deal.value}</p>
                      <p className="text-sm text-gray-600">{deal.commission} commission</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No deals yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Closed Deals</p>
              <p className="text-3xl font-bold text-green-600">{metrics.closedDealsCount}</p>
              <p className="text-sm text-gray-600 mt-1">{formatCurrency(metrics.totalRevenue)} volume</p>
            </div>
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Active Pipeline</p>
              <p className="text-3xl font-bold text-blue-600">
                {deals.filter(d => ['Lead', 'In Progress', 'Under Contract'].includes(d.status)).length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Deals in progress</p>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Avg. Deal Size</p>
              <p className="text-3xl font-bold text-purple-600">{formatCurrency(metrics.avgDealSize)}</p>
              <p className="text-sm text-gray-600 mt-1">Closed deals only</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Total Commission</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(metrics.totalCommission)}</p>
              <p className="text-sm text-gray-600 mt-1">From closed deals</p>
            </div>
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Potential Commission</p>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(
                  deals
                    .filter(d => ['Lead', 'In Progress', 'Under Contract'].includes(d.status))
                    .reduce((sum, deal) => {
                      const commission = deal.commission.replace(/[$,]/g, '')
                      return sum + (parseFloat(commission) || 0)
                    }, 0)
                )}
              </p>
              <p className="text-sm text-gray-600 mt-1">Pipeline potential</p>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Commission Rate</p>
              <p className="text-3xl font-bold text-purple-600">
                {metrics.totalRevenue > 0 ? ((metrics.totalCommission / metrics.totalRevenue) * 100).toFixed(1) + '%' : 'N/A'}
              </p>
              <p className="text-sm text-gray-600 mt-1">Average rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

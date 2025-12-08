'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Building2, 
  DollarSign,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  ArrowRight,
  MoreHorizontal,
  Target,
  Activity,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DashboardData {
  metrics: {
    totalClients: number
    activeDeals: number
    monthlyRevenue: number
    conversionRate: number
    clientsChange: number
    dealsChange: number
    revenueChange: number
    conversionChange: number
  }
  recentActivity: Array<{
    id: string
    type: 'call' | 'email' | 'meeting' | 'deal' | 'client'
    title: string
    description: string
    time: string
    client?: string
    status?: string
  }>
  upcomingTasks: Array<{
    id: string
    title: string
    type: 'call' | 'meeting' | 'follow-up' | 'deadline'
    time: string
    client: string
    priority: 'high' | 'medium' | 'low'
  }>
  hotDeals: Array<{
    id: string
    title: string
    client: string
    value: number
    probability: number
    stage: string
    lastActivity: string
  }>
}

interface MobileDashboardProps {
  data: DashboardData
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  deal: Building2,
  client: Users
}

const taskIcons = {
  call: Phone,
  meeting: Calendar,
  'follow-up': MessageSquare,
  deadline: Clock
}

const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200'
}

export function MobileDashboard({ data }: MobileDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatChange = (change: number) => {
    const isPositive = change >= 0
    return (
      <span className={cn(
        'inline-flex items-center text-xs font-medium',
        isPositive ? 'text-green-600' : 'text-red-600'
      )}>
        {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
        {Math.abs(change)}%
      </span>
    )
  }

  return (
    <div className="lg:hidden">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex space-x-4 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'tasks', label: 'Tasks', icon: CheckCircle },
            { id: 'deals', label: 'Hot Deals', icon: Target },
            { id: 'activity', label: 'Recent', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{data.metrics.totalClients}</p>
                      <p className="text-xs text-gray-600">Clients</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <Users className="h-5 w-5 text-blue-500 mb-1" />
                      {formatChange(data.metrics.clientsChange)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{data.metrics.activeDeals}</p>
                      <p className="text-xs text-gray-600">Active Deals</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <Building2 className="h-5 w-5 text-green-500 mb-1" />
                      {formatChange(data.metrics.dealsChange)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold">{formatCurrency(data.metrics.monthlyRevenue)}</p>
                      <p className="text-xs text-gray-600">Revenue</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <DollarSign className="h-5 w-5 text-yellow-500 mb-1" />
                      {formatChange(data.metrics.revenueChange)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{data.metrics.conversionRate}%</p>
                      <p className="text-xs text-gray-600">Conversion</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <Target className="h-5 w-5 text-purple-500 mb-1" />
                      {formatChange(data.metrics.conversionChange)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/clients/new">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Add Client
                    </Button>
                  </Link>
                  <Link href="/deals/new">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Building2 className="h-4 w-4 mr-2" />
                      New Deal
                    </Button>
                  </Link>
                  <Link href="/calendar/new">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                  </Link>
                  <Link href="/analytics">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Upcoming Tasks</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {data.upcomingTasks.map((task) => {
                    const Icon = taskIcons[task.type]
                    return (
                      <div key={task.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <Icon className="h-4 w-4 text-gray-600 mt-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-500">{task.client}</p>
                          <p className="text-xs text-gray-400">{task.time}</p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', priorityColors[task.priority])}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Hot Deals Tab */}
        {activeTab === 'deals' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Hot Deals</CardTitle>
              <Link href="/deals">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {data.hotDeals.map((deal) => (
                    <div key={deal.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{deal.title}</p>
                          <p className="text-xs text-gray-500">{deal.client}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">{formatCurrency(deal.value)}</p>
                          <p className="text-xs text-gray-500">{deal.probability}% prob</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">{deal.stage}</Badge>
                        <span className="text-xs text-gray-400">{deal.lastActivity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Tab */}
        {activeTab === 'activity' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {data.recentActivity.map((activity) => {
                    const Icon = activityIcons[activity.type]
                    return (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Icon className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-600">{activity.description}</p>
                          {activity.client && (
                            <p className="text-xs text-gray-500">Client: {activity.client}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-gray-400">{activity.time}</p>
                          {activity.status && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {activity.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
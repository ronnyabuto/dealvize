'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  TrendingUp,
  DollarSign,
  Users,
  Share2,
  Target,
  Award,
  Eye,
  ExternalLink,
  Clock,
  CheckCircle,
  Zap,
  Activity,
  Crown
} from 'lucide-react'
import { getTrendIcon, getTrendColor, getTierIcon, getTierColor } from '@/lib/utils/ui-helpers'

interface AffiliateMonitoringProps {
  className?: string
}

export function AffiliateMonitoring({ className }: AffiliateMonitoringProps) {
  const [timeframe, setTimeframe] = useState('30d')
  
  const [affiliateData, setAffiliateData] = useState({
    totalAffiliates: 0,
    activeAffiliates: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    conversionRate: 0,
    averageCommission: 0,
    topPerformers: [],
    recentActivity: []
  })

  const performanceMetrics = [
    {
      title: 'Total Commissions',
      value: `$${affiliateData.totalCommissions.toLocaleString()}`,
      change: 12.5,
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Active Affiliates',
      value: affiliateData.activeAffiliates.toString(),
      change: 8.3,
      trend: 'up' as const,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Conversion Rate',
      value: `${affiliateData.conversionRate}%`,
      change: -0.8,
      trend: 'down' as const,
      icon: Target,
      color: 'text-purple-600'
    },
    {
      title: 'Avg Commission',
      value: `$${affiliateData.averageCommission}`,
      change: 15.2,
      trend: 'up' as const,
      icon: Award,
      color: 'text-orange-600'
    }
  ]

  const commissionTiers = [
    { name: 'Bronze', rate: '10%', affiliates: 0, color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { name: 'Silver', rate: '15%', affiliates: 0, color: 'bg-gray-100 text-gray-800 border-gray-300' },
    { name: 'Gold', rate: '20%', affiliates: 0, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { name: 'Platinum', rate: '30%', affiliates: 0, color: 'bg-purple-100 text-purple-800 border-purple-300' }
  ]


  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversion': return CheckCircle
      case 'referral': return Users
      case 'payout': return DollarSign
      default: return Activity
    }
  }

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600'
      case 'completed': return 'text-blue-600'
      case 'pending': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Affiliate Marketing</h2>
            <p className="text-sm text-gray-500">Monitor partner performance and commissions</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          Affiliate Portal
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric) => {
          const TrendIcon = getTrendIcon(metric.trend)
          
          return (
            <Card key={metric.title} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    getTrendColor(metric.trend)
                  }`}>
                    <TrendIcon className="h-3 w-3" />
                    {Math.abs(metric.change)}%
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold">{metric.value}</p>
                  <p className="text-sm text-gray-600">{metric.title}</p>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20"></div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="affiliates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="affiliates">Top Performers</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="tiers">Commission Tiers</TabsTrigger>
        </TabsList>

        {/* Top Performing Affiliates */}
        <TabsContent value="affiliates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" />
                Top Performing Affiliates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {affiliateData.topPerformers.map((affiliate: any, index: number) => {
                  const TierIcon = getTierIcon(affiliate.tier)
                  
                  return (
                    <div key={affiliate.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center p-0">
                          #{index + 1}
                        </Badge>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-dealvize-teal text-white text-sm">
                            {affiliate.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{affiliate.name}</p>
                          <Badge className={getTierColor(affiliate.tier)}>
                            <TierIcon className="h-3 w-3 mr-1" />
                            {affiliate.tier}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{affiliate.email}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span><strong>{affiliate.referrals}</strong> referrals</span>
                          <span><strong>{affiliate.conversions}</strong> conversions</span>
                          <span className="text-green-600"><strong>${affiliate.commissions}</strong> earned</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {affiliate.conversionRate}%
                        </p>
                        <p className="text-xs text-gray-500">conversion rate</p>
                        <Button variant="ghost" size="sm" className="mt-2">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission Management */}
        <TabsContent value="commissions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  ${affiliateData.paidCommissions.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-600">
                  ${affiliateData.pendingCommissions.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Awaiting payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">+12.5%</p>
                <p className="text-sm text-gray-500">vs last month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pending Commission Payouts</CardTitle>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  Process All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending payouts</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Recent Affiliate Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {affiliateData.recentActivity.map((activity: any) => {
                  const ActivityIcon = getActivityIcon(activity.type)
                  
                  return (
                    <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-full ${getActivityColor(activity.status)} bg-opacity-10`}>
                        <ActivityIcon className={`h-4 w-4 ${getActivityColor(activity.status)}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">
                            {activity.type === 'conversion' ? 'New Conversion' :
                             activity.type === 'referral' ? 'New Referral' : 'Commission Payout'}
                          </p>
                          <Badge variant="outline" className={`text-xs ${
                            activity.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                            activity.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {activity.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {activity.type === 'payout' ? 
                            `${activity.affiliate} received payout` :
                            `${activity.affiliate} → ${activity.user}`
                          }
                        </p>
                      </div>
                      
                      <div className="text-right">
                        {activity.amount > 0 && (
                          <p className="font-bold text-green-600">${activity.amount}</p>
                        )}
                        <p className="text-xs text-gray-500">{activity.date}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission Tiers */}
        <TabsContent value="tiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Commission Tier Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {commissionTiers.map((tier) => (
                  <Card key={tier.name} className="relative overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={tier.color}>
                          {tier.name}
                        </Badge>
                        <span className="text-lg font-bold text-green-600">{tier.rate}</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <strong>{tier.affiliates}</strong> affiliates in this tier
                        </p>
                        <Progress 
                          value={(tier.affiliates / affiliateData.totalAffiliates) * 100} 
                          className="h-2" 
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tier Advancement Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Silver Tier</p>
                    <p className="text-sm text-gray-500">5+ successful referrals</p>
                  </div>
                  <Badge variant="outline">15% commission</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Gold Tier</p>
                    <p className="text-sm text-gray-500">15+ successful referrals</p>
                  </div>
                  <Badge variant="outline">20% commission</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Platinum Tier</p>
                    <p className="text-sm text-gray-500">50+ successful referrals</p>
                  </div>
                  <Badge variant="outline">30% commission</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
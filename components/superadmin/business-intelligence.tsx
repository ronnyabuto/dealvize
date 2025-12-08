'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp,
  DollarSign,
  Users,
  UserMinus,
  Activity,
  AlertCircle,
  Clock,
  Target,
  Zap,
  Brain,
  Lightbulb
} from 'lucide-react'
import { getTrendIcon, getTrendColor, getConfidenceColor } from '@/lib/utils/ui-helpers'

interface BusinessIntelligenceProps {
  className?: string
}

export function BusinessIntelligence({ className }: BusinessIntelligenceProps) {
  const [timeframe, setTimeframe] = useState('30d')
  
  const [insights, setInsights] = useState({
    revenueForecasting: {
      current: 0,
      predicted: 0,
      confidence: 0,
      trend: 'stable' as const,
      change: 0
    },
    userChurn: {
      rate: 0,
      trend: 'stable' as const,
      change: 0,
      at_risk: 0,
      preventable: 0
    },
    featureAdoption: [],
    supportTickets: {
      sentiment: {
        positive: 0,
        neutral: 0,
        negative: 0
      },
      resolution_time: 0,
      satisfaction: 0,
      trend: 'stable' as const
    }
  })

  const predictiveMetrics = [
    {
      title: 'Revenue Forecast',
      current: '$0',
      predicted: '$0',
      confidence: 0,
      change: 0,
      trend: 'stable' as const,
      icon: DollarSign,
      description: 'Next 30 days projection',
      color: 'text-gray-600'
    },
    {
      title: 'User Growth',
      current: '0',
      predicted: '0',
      confidence: 0,
      change: 0,
      trend: 'stable' as const,
      icon: Users,
      description: 'Expected new registrations',
      color: 'text-gray-600'
    },
    {
      title: 'Churn Risk',
      current: '0%',
      predicted: '0%',
      confidence: 0,
      change: 0,
      trend: 'stable' as const,
      icon: UserMinus,
      description: 'Monthly churn rate',
      color: 'text-gray-600'
    },
    {
      title: 'Feature Usage',
      current: '0%',
      predicted: '0%',
      confidence: 0,
      change: 0,
      trend: 'stable' as const,
      icon: Activity,
      description: 'Average feature adoption',
      color: 'text-gray-600'
    }
  ]

  const aiInsights: any[] = []

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'border-green-200 bg-green-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      case 'insight': return 'border-blue-200 bg-blue-50'
      case 'recommendation': return 'border-purple-200 bg-purple-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Business Intelligence</h2>
            <p className="text-sm text-gray-500">AI-powered insights and predictions</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="forecasting" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          <TabsTrigger value="churn">Churn Analysis</TabsTrigger>
          <TabsTrigger value="features">Feature Adoption</TabsTrigger>
          <TabsTrigger value="support">Support Intelligence</TabsTrigger>
        </TabsList>

        {/* Revenue Forecasting */}
        <TabsContent value="forecasting" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {predictiveMetrics.map((metric) => {
              const TrendIcon = getTrendIcon(metric.trend)
              const isChurnMetric = metric.title === 'Churn Risk'
              
              return (
                <Card key={metric.title} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <metric.icon className={`h-5 w-5 ${metric.color}`} />
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        getTrendColor(metric.trend, !isChurnMetric)
                      }`}>
                        <TrendIcon className="h-3 w-3" />
                        {Math.abs(metric.change)}%
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{metric.current}</p>
                      <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Predicted: {metric.predicted}</span>
                        <Badge variant="outline" className="text-xs px-2">
                          {metric.confidence}% sure
                        </Badge>
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20"></div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Revenue Prediction Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence Level</span>
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    87% Accurate
                  </Badge>
                </div>
                <Progress value={87} className="h-2" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="font-medium text-green-600">+$20K</p>
                    <p className="text-gray-500">Predicted Growth</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="font-medium text-blue-600">16%</p>
                    <p className="text-gray-500">Growth Rate</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="font-medium text-purple-600">30 days</p>
                    <p className="text-gray-500">Forecast Period</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Churn Analysis */}
        <TabsContent value="churn" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Churn Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-red-600">3.2%</span>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <ArrowDown className="h-3 w-3" />
                    0.8%
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Industry average: 5.1%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">At-Risk Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-yellow-600">23</span>
                  <Badge variant="outline" className="text-xs">
                    High Risk
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">18 preventable with outreach</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Retention Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-600">96.8%</span>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <ArrowUp className="h-3 w-3" />
                    0.8%
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">30-day retention rate</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Churn Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { factor: 'Low feature usage', risk: 85, users: 12 },
                  { factor: 'No recent logins', risk: 72, users: 8 },
                  { factor: 'Support tickets unresolved', risk: 68, users: 3 },
                  { factor: 'Trial period ending', risk: 45, users: 5 }
                ].map((item) => (
                  <div key={item.factor} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.factor}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={item.risk} className="flex-1 h-2" />
                        <span className="text-xs text-gray-500 w-10">{item.risk}%</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-3">
                      {item.users} users
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Adoption */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature Adoption Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.featureAdoption.map((feature) => (
                  <div key={feature.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{feature.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{feature.adoption}%</span>
                        <div className={`flex items-center text-xs ${
                          feature.growth > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {feature.growth > 0 ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          {Math.abs(feature.growth)}%
                        </div>
                      </div>
                    </div>
                    <Progress value={feature.adoption} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Intelligence */}
        <TabsContent value="support" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg Resolution Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-600">4.2h</span>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <ArrowDown className="h-3 w-3" />
                    12%
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Target: 4h</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Customer Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-600">4.6</span>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <ArrowUp className="h-3 w-3" />
                    0.3
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Out of 5.0</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ticket Sentiment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Positive</span>
                    <span className="font-medium">65%</span>
                  </div>
                  <Progress value={65} className="h-1" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* AI-Powered Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {aiInsights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-white bg-opacity-50">
                    <insight.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <Badge className={`text-xs ${getConfidenceColor(insight.confidence)}`}>
                        {insight.confidence} confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
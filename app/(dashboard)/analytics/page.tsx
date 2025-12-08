'use client'

import { Suspense } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Users, DollarSign, Target, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Loading skeleton component
const AnalyticsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
)

const analyticsCards = [
  {
    title: "Deal Conversion Rate",
    description: "Percentage of leads that convert to closed deals",
    value: "68.4%",
    trend: "+5.2%",
    icon: Target,
    color: "text-green-600"
  },
  {
    title: "Average Deal Value",
    description: "Mean value of successfully closed deals",
    value: "$284,500",
    trend: "+12.3%",
    icon: DollarSign,
    color: "text-green-600"
  },
  {
    title: "Pipeline Velocity",
    description: "Average time from lead to close",
    value: "42 days",
    trend: "-8.5%",
    icon: Clock,
    color: "text-green-600"
  },
  {
    title: "Active Prospects",
    description: "Currently engaged potential clients",
    value: "127",
    trend: "+18.7%",
    icon: Users,
    color: "text-green-600"
  },
  {
    title: "Monthly Revenue",
    description: "Total revenue generated this month",
    value: "$1.2M",
    trend: "+23.1%",
    icon: BarChart3,
    color: "text-green-600"
  },
  {
    title: "Deal Pipeline",
    description: "Total value of deals in progress",
    value: "$4.8M",
    trend: "+15.4%",
    icon: TrendingUp,
    color: "text-green-600"
  }
]

export default function AnalyticsPage() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-gray-600">Track your performance and business metrics</p>
              </div>
              <Badge variant="secondary" className="bg-dealvize-teal/10 text-dealvize-teal">
                Real-time Data
              </Badge>
            </div>
          </div>

          {/* Main Content */}
          <main className="p-6">
            <Suspense fallback={<AnalyticsSkeleton />}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {analyticsCards.map((card, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {card.title}
                      </CardTitle>
                      <card.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{card.value}</div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {card.description}
                      </p>
                      <div className={`text-xs ${card.color} flex items-center`}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {card.trend} from last month
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Detailed Analytics Section */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trends</CardTitle>
                    <CardDescription>
                      Monthly revenue performance over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Chart will be displayed here</p>
                        <p className="text-sm text-gray-400">Connect to your data source to view charts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Deal Pipeline Analysis</CardTitle>
                    <CardDescription>
                      Breakdown of deals by stage and probability
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <Target className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Pipeline chart will be displayed here</p>
                        <p className="text-sm text-gray-400">Connect to your data source to view charts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Suspense>
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
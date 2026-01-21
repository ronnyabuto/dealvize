"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, Building, DollarSign, Calendar } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { APIErrorBoundary } from "@/components/shared/error-boundary"
import { cachedFetch, cacheKeys, backgroundRefresh } from "@/lib/cache/query-cache"
import Link from "next/link"

import type { IconComponent } from "@/lib/types"

// Create a global refresh function that components can call
let globalRefreshMetrics: (() => void) | null = null

export const refreshDashboardMetrics = () => {
  if (globalRefreshMetrics) {
    globalRefreshMetrics()
  }
}

interface Metric {
  title: string
  value: string
  trend: string
  trendUp: boolean
  icon: IconComponent
  href: string
}

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    } else {
      return `$${amount.toFixed(0)}`
    }
  }

  const calculateGrowth = (current: number, previous: number): { trend: string; trendUp: boolean } => {
    if (previous === 0) {
      return { trend: current > 0 ? "+100%" : "0%", trendUp: current > 0 }
    }
    const growth = ((current - previous) / previous) * 100
    const rounded = Math.round(growth)
    return {
      trend: rounded >= 0 ? `+${rounded}%` : `${rounded}%`,
      trendUp: growth >= 0
    }
  }

  const fetchMetrics = useCallback(async () => {
      try {
        // Use cached fetch with 2-minute TTL for dashboard metrics
        const data = await cachedFetch(
          '/api/dashboard/metrics',
          cacheKeys.dashboardMetrics(),
          2 // 2-minute cache
        ) as any

        const metrics = data.metrics
        
        // Start background refresh for next time
        backgroundRefresh(
          '/api/dashboard/metrics',
          cacheKeys.dashboardMetrics(),
          2
        )
        
        // Enhanced metrics including lead scoring data
        const metricsArray = [
          {
            title: "Total Clients",
            value: metrics.totalClients?.toString() || "0",
            trend: metrics.clientsChange ? `${metrics.clientsChange > 0 ? '+' : ''}${metrics.clientsChange}%` : "0%",
            trendUp: (metrics.clientsChange || 0) >= 0,
            icon: Users,
            href: "/clients"
          },
          {
            title: "Active Deals",
            value: metrics.activeDeals?.toString() || "0",
            trend: metrics.dealsChange ? `${metrics.dealsChange > 0 ? '+' : ''}${metrics.dealsChange}%` : "0%",
            trendUp: (metrics.dealsChange || 0) >= 0,
            icon: Building,
            href: "/deals"
          },
          {
            title: "Pipeline Value",
            value: formatCurrency(metrics.pipelineValue || 0),
            trend: metrics.revenueChange ? `${metrics.revenueChange > 0 ? '+' : ''}${metrics.revenueChange}%` : "0%",
            trendUp: (metrics.revenueChange || 0) >= 0,
            icon: DollarSign,
            href: "/deals"
          },
          {
            title: "Total Leads",
            value: metrics.totalLeads?.toString() || "0",
            trend: metrics.leadConversionRate ? `${metrics.leadConversionRate}% qualified` : "0% qualified",
            trendUp: (metrics.leadConversionRate || 0) > 0,
            icon: Calendar,
            href: "/lead-scoring"
          }
        ]
        setMetrics(metricsArray)
      } catch (error) {
        if ((error as any).name === 'AbortError') {
          console.warn('Analytics request timed out')
        } else {
          console.error('Failed to fetch metrics:', error)
        }
        // Set fallback metrics with consistent structure
        setMetrics([
          { title: "Total Clients", value: "0", trend: "0%", trendUp: false, icon: Users, href: "/clients" },
          { title: "Active Deals", value: "0", trend: "0%", trendUp: false, icon: Building, href: "/deals" },
          { title: "Pipeline Value", value: "$0", trend: "0%", trendUp: false, icon: DollarSign, href: "/deals" },
          { title: "Total Leads", value: "0", trend: "0% qualified", trendUp: false, icon: Calendar, href: "/lead-scoring" }
        ])
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    fetchMetrics()
    // Set up global refresh function
    globalRefreshMetrics = () => {
      setLoading(true)
      fetchMetrics()
    }

    // Cleanup
    return () => {
      globalRefreshMetrics = null
    }
  }, [fetchMetrics])

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <APIErrorBoundary>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {metrics.map((metric, index) => (
          <Link key={metric.title} href={metric.href} className="block">
            <Card className="relative overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate pr-2">
                  {metric.title}
                </CardTitle>
                <metric.icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 truncate">
                  {metric.value}
                </div>
                <p className={`text-xs ${metric.trendUp ? "text-green-600" : "text-red-600"} flex items-center mt-1`}>
                  {metric.trendUp ? (
                    <TrendingUp className="h-3 w-3 mr-1 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1 flex-shrink-0" />
                  )}
                  <span className="truncate">{metric.trend}</span>
                </p>
              </CardContent>
              {index === 0 && <div className="absolute bottom-0 left-0 right-0 h-1 bg-dealvize-teal" />}
            </Card>
          </Link>
        ))}
      </div>
    </APIErrorBoundary>
  )
}

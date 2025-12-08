import { Suspense } from 'react'
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { DashboardHeader } from "@/components/features/analytics/dashboard-header"
import { DashboardMetrics } from "@/components/features/analytics/dashboard-metrics"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getUser } from '@/lib/auth/utils'
import { SmartDashboard } from '@/components/features/analytics/smart-dashboard'

// Lazy load non-critical components with optimized loading
import dynamic from 'next/dynamic'

const LazyRecentClients = dynamic(
  () => import("@/components/features/clients/recent-clients").then(mod => ({ default: mod.RecentClients })),
  {
    loading: () => <DashboardSkeleton />
  }
)

const LazyTasksDueToday = dynamic(
  () => import("@/components/shared/tasks-due-today").then(mod => ({ default: mod.TasksDueToday })),
  {
    loading: () => <DashboardSkeleton />
  }
)

const LazyRevenueChart = dynamic(
  () => import("@/components/shared/enhanced-chart").then(mod => ({ default: mod.RevenueChart })),
  { loading: () => <ChartSkeleton /> }
)

const LazyPipelineChart = dynamic(
  () => import("@/components/shared/enhanced-chart").then(mod => ({ default: mod.PipelineChart })),
  { loading: () => <ChartSkeleton /> }
)

const LazyConversionChart = dynamic(
  () => import("@/components/shared/enhanced-chart").then(mod => ({ default: mod.ConversionChart })),
  { loading: () => <ChartSkeleton /> }
)

// Optimized skeleton components
const DashboardSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-1/3" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full" />
    </CardContent>
  </Card>
)

export default async function DashboardPage() {
  const user = await getUser()
  
  const sidebarUser = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin || false
  } : undefined

  return (
    <SmartDashboard>
      <AppSidebar user={sidebarUser} />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader user={user} />
          <main className="p-4 sm:p-6">
            <DashboardMetrics />
            
            {/* Advanced Analytics Section - Lazy loaded */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mt-8">
              <Suspense fallback={<ChartSkeleton />}>
                <LazyRevenueChart />
              </Suspense>
              <Suspense fallback={<ChartSkeleton />}>
                <LazyConversionChart />
              </Suspense>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mt-6">
              <Suspense fallback={<ChartSkeleton />}>
                <LazyPipelineChart />
              </Suspense>
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                <Suspense fallback={<DashboardSkeleton />}>
                  <LazyRecentClients />
                </Suspense>
                <Suspense fallback={<DashboardSkeleton />}>
                  <LazyTasksDueToday />
                </Suspense>
              </div>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SmartDashboard>
  )
}

// Force dynamic rendering for this page
DashboardPage.dynamic = 'force-dynamic'
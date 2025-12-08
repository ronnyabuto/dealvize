import { Suspense } from 'react'
import { DashboardHeader } from "@/components/features/analytics/dashboard-header"
import { MLSSettings } from "@/components/shared/mls-settings"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getUser } from '@/lib/auth/utils'

const MLSSettingsSkeleton = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </CardContent>
    </Card>
  </div>
)

export default async function MLSSettingsPage() {
  const user = await getUser()

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <DashboardHeader user={user} />
      <main className="p-4 sm:p-6">
        <Suspense fallback={<MLSSettingsSkeleton />}>
          <MLSSettings />
        </Suspense>
      </main>
    </div>
  )
}

export const metadata = {
  title: 'MLS Settings - Dealvize CRM',
  description: 'Configure Columbus MLS integration settings',
}
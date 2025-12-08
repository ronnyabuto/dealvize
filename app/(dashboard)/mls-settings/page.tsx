import { Suspense } from 'react'
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { MLSSettings } from "@/components/mls-settings"
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
  
  const sidebarUser = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin || false
  } : undefined

  return (
    <>
      <AppSidebar user={sidebarUser} />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <DashboardHeader user={user} />
          <main className="p-4 sm:p-6">
            <Suspense fallback={<MLSSettingsSkeleton />}>
              <MLSSettings />
            </Suspense>
          </main>
        </div>
      </SidebarInset>
    </>
  )
}

export const metadata = {
  title: 'MLS Settings - Dealvize CRM',
  description: 'Configure Columbus MLS integration settings',
}
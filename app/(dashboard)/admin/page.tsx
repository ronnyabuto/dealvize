'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AdminDashboard } from "@/components/admin-dashboard"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminData, setAdminData] = useState(null)

  useEffect(() => {
    async function loadAdminData() {
      try {
        const response = await fetch('/api/admin/overview')
        if (response.ok) {
          const data = await response.json()
          setAdminData(data)
        } else if (response.status === 403) {
          setError('Access denied. Admin privileges required.')
        } else {
          throw new Error('Failed to load admin data')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [])

  if (loading) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading admin dashboard...</span>
            </div>
          </div>
        </SidebarInset>
      </>
    )
  }

  if (error) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </div>
        </SidebarInset>
      </>
    )
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-red-600" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage team members and monitor system activity
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="p-6">
            <AdminDashboard data={adminData} />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
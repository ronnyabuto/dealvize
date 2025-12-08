'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AffiliateDashboard } from "@/components/affiliate/affiliate-dashboard"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AffiliateDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [affiliateData, setAffiliateData] = useState(null)

  useEffect(() => {
    async function loadAffiliateData() {
      try {
        const response = await fetch('/api/affiliate/stats')
        if (response.ok) {
          const data = await response.json()
          setAffiliateData(data)
        } else if (response.status === 404) {
          // User not enrolled in affiliate program
          setError('You are not enrolled in the affiliate program yet.')
        } else {
          throw new Error('Failed to load affiliate data')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load affiliate dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadAffiliateData()
  }, [])

  if (loading) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading affiliate dashboard...</span>
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
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Affiliate Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Track your referrals and commissions
                </p>
              </div>
            </div>
          </header>
          <main className="p-6">
            <AffiliateDashboard data={affiliateData} />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
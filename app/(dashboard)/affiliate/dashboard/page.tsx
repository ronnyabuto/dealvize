'use client'

import { useState, useEffect } from 'react'
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AffiliateDashboard } from "@/components/affiliate/affiliate-dashboard"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function AffiliateDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          setError('You must be logged in to view this page')
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', authUser.id)
          .single()

        setUser({
          id: authUser.id,
          name: profile?.name || authUser.user_metadata?.name || authUser.email || 'User',
          email: profile?.email || authUser.email || ''
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user data')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading affiliate dashboard...</span>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Failed to load user data'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Affiliate Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">
              Track your referrals and commissions
            </p>
          </div>
        </div>
      </header>
      <main className="p-6">
        <AffiliateDashboard userId={user.id} userName={user.name} userEmail={user.email} />
      </main>
    </div>
  )
}
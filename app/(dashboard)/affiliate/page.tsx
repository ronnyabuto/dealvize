import { redirect } from 'next/navigation'
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AffiliateDashboard } from '@/components/affiliate/affiliate-dashboard'
import { getUser } from '@/lib/auth/utils'

export default async function AffiliatePage() {
  const user = await getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Partner Hub</h1>
              <p className="text-sm text-slate-600">
                Manage your affiliate program, track earnings, and access marketing tools
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="p-6">
        <AffiliateDashboard
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
        />
      </main>
    </div>
  )
}
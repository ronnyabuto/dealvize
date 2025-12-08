'use client'

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LeadScoringContent } from "@/components/features/clients/lead-scoring-content"

export const dynamic = 'force-dynamic'

export default function LeadScoringPage() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Lead Scoring</h1>
                <p className="text-sm text-gray-500 mt-1">
                  AI-powered lead scoring and qualification system
                </p>
              </div>
            </div>
          </header>
          <main className="p-6">
            <LeadScoringContent />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
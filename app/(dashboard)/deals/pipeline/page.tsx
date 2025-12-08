'use client'

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { DealPipeline } from "@/components/features/deals/deal-pipeline"
import { ArrowLeft, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export const dynamic = 'force-dynamic'

export default function DealPipelinePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deal Pipeline</h1>
              <p className="text-sm text-slate-600 mt-1">
                Manage your deals through each stage of the sales process
              </p>
            </div>
          </div>
          <Button
            className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white"
            onClick={() => router.push('/deals/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Deal
          </Button>
        </div>
      </header>
      <main className="p-6">
        <DealPipeline />
      </main>
    </div>
  )
}
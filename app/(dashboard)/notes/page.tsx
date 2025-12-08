'use client'

import { SidebarTrigger } from "@/components/ui/sidebar"
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"

export const dynamic = 'force-dynamic'

export default function NotesPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notes</h1>
        </div>
      </header>
      <main className="p-6">
        <BreadcrumbNav />
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Notes functionality coming soon!</p>
        </div>
      </main>
    </div>
  )
}
'use client'

import { Suspense } from 'react'
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ClientForm } from "@/components/features/clients/client-form"

export const dynamic = 'force-dynamic'

export default function NewClientPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Client</h1>
            <p className="text-sm text-slate-600 mt-1">
              Create a new client record in your CRM
            </p>
          </div>
        </div>
      </header>
      <main className="p-6">
        <Suspense fallback={<div>Loading...</div>}>
          <ClientForm mode="create" />
        </Suspense>
      </main>
    </div>
  )
}
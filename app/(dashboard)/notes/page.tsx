'use client'

import { useState } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"

export const dynamic = 'force-dynamic'

export default function NotesPage() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-900">Notes</h1>
            </div>
          </header>
          <main className="p-6">
            <BreadcrumbNav />
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Notes functionality coming soon!</p>
            </div>
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
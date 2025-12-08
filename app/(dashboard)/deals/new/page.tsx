'use client'

import { Suspense } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DealForm } from "@/components/deal-form"
import { useMobileDetection } from "@/hooks/use-mobile-detection"

export const dynamic = 'force-dynamic'

export default function NewDealPage() {
  const { isMobile } = useMobileDetection()

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <header className={`bg-white border-b border-gray-200 ${
            isMobile ? 'px-4 py-3' : 'px-6 py-4'
          }`}>
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className={`font-bold text-slate-900 ${
                  isMobile ? 'text-lg' : 'text-2xl'
                }`}>
                  Add New Deal
                </h1>
                <p className={`text-gray-500 mt-1 ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  Create a new deal in your pipeline
                </p>
              </div>
            </div>
          </header>
          <main className={isMobile ? 'p-4' : 'p-6'}>
            <Suspense fallback={<div>Loading...</div>}>
              <DealForm mode="create" />
            </Suspense>
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
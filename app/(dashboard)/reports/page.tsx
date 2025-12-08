'use client'

import { useState } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { ReportsHeader } from "@/components/reports-header"
import { ReportsContent } from "@/components/reports-content"

export const dynamic = 'force-dynamic'

export interface ReportsFilters {
  dateRange: string
  status?: string
  clientId?: string
  startDate?: string
  endDate?: string
}

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportsFilters>({
    dateRange: '30days'
  })

  const handleFiltersChange = (newFilters: Partial<ReportsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <ReportsHeader filters={filters} onFiltersChange={handleFiltersChange} />
          <main className="p-6">
            <ReportsContent filters={filters} />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}

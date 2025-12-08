'use client'

import { useState } from 'react'
import { ReportsHeader } from "@/components/features/analytics/reports-header"
import { ReportsContent } from "@/components/features/analytics/reports-content"

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
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <ReportsHeader filters={filters} onFiltersChange={handleFiltersChange} />
      <main className="p-6">
        <ReportsContent filters={filters} />
      </main>
    </div>
  )
}

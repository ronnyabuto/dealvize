'use client'

import { useState } from 'react'
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { DealsHeader } from "@/components/layout/deals-header"
import { DealsList } from "@/components/features/deals/deals-list"
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"
import { SmartActionBar } from "@/components/smart-action-bar"
import { Zap, DollarSign, Calendar } from "lucide-react"

export const dynamic = 'force-dynamic'

interface DealFilters {
  status: string
  propertyType: string
  minValue: string
  maxValue: string
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
}

export default function DealsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState<DealFilters>({
    status: '',
    propertyType: '',
    minValue: '',
    maxValue: '',
    dateRange: { from: undefined, to: undefined }
  })

  const handleFiltersChange = (newFilters: DealFilters) => {
    setFilters(newFilters)
    setStatus(newFilters.status) // Keep backward compatibility
  }

  // Smart automation suggestions for deals page
  const smartActions = [
    {
      id: 'deal-stage-automation',
      title: 'Stage-Based Tasks',
      description: 'Auto-create inspection & appraisal tasks when deals reach "Under Contract"',
      actionLabel: 'Setup Automation',
      variant: 'primary' as const,
      icon: Zap,
      onAction: () => {
        const confirmed = confirm('Create automation for "Under Contract" stage? This will automatically create inspection and appraisal tasks.')
        if (confirmed) {
          alert('✅ Deal stage automation enabled! Tasks will be created automatically.')
        }
      }
    },
    {
      id: 'deal-value-alerts',
      title: 'High-Value Deal Alerts',
      description: 'Get notified when deals over $500K need special attention',
      actionLabel: 'Enable Alerts',
      variant: 'secondary' as const,
      icon: DollarSign,
      onAction: () => {
        alert('✅ High-value deal alerts enabled! You\'ll be notified for deals over $500K.')
      }
    },
    {
      id: 'closing-reminders',
      title: 'Closing Reminders',
      description: 'Automatic preparation tasks 7 days before closing',
      actionLabel: 'Set Reminders',
      variant: 'success' as const,
      icon: Calendar,
      onAction: () => {
        alert('✅ Closing reminders enabled! You\'ll get preparation tasks 7 days before each closing.')
      }
    }
  ]

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <DealsHeader 
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onFiltersChange={handleFiltersChange}
          />
          <main className="p-6">
            <BreadcrumbNav />
            <SmartActionBar 
              actions={smartActions}
              title="Smart Deal Automation"
              className="mb-6"
            />
            <DealsList 
              search={search}
              status={status}
              filters={filters}
            />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}

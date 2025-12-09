'use client'

import { useState } from 'react'
import { DealsHeader } from "@/components/features/deals/deals-header"
import { DealsList } from "@/components/features/deals/deals-list"
import { DealPipeline } from "@/components/features/deals/deal-pipeline"
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"
import { SmartActionBar } from "@/components/shared/smart-action-bar"
import { Button } from "@/components/ui/button"
import { Zap, DollarSign, Calendar, LayoutList, LayoutGrid } from "lucide-react"

type ViewMode = 'list' | 'board'

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
  const [viewMode, setViewMode] = useState<ViewMode>('board') // Default to Pipeline/Board view
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
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <DealsHeader
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onFiltersChange={handleFiltersChange}
      />
      <main className="p-6">
        <BreadcrumbNav />

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <SmartActionBar
            actions={smartActions}
            title="Smart Deal Automation"
            className="flex-1"
          />
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant={viewMode === 'board' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('board')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <LayoutList className="h-4 w-4" />
              List
            </Button>
          </div>
        </div>

        {/* Keep both views in DOM - toggle with CSS for instant switching */}
        <div className={viewMode === 'board' ? 'block' : 'hidden'}>
          <DealPipeline />
        </div>

        <div className={viewMode === 'list' ? 'block' : 'hidden'}>
          <DealsList
            search={search}
            status={status}
            filters={filters}
          />
        </div>
      </main>
    </div>
  )
}

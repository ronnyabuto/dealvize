"use client"

import { useState } from 'react'
import { Download, Filter, Calendar, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalSearch } from "@/components/shared/global-search"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useDeals } from "@/hooks/use-deals"
import { useClients } from "@/hooks/use-clients"
import type { ReportsFilters } from "@/app/(dashboard)/reports/page"

interface ReportsHeaderProps {
  filters: ReportsFilters
  onFiltersChange: (filters: Partial<ReportsFilters>) => void
}

export function ReportsHeader({ filters, onFiltersChange }: ReportsHeaderProps) {
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false)
  const { deals } = useDeals()
  const { clients } = useClients()

  const handleExport = async () => {
    try {
      // Build query parameters based on current filters
      const searchParams = new URLSearchParams()
      if (filters.dateRange) searchParams.set('dateRange', filters.dateRange)
      if (filters.status) searchParams.set('status', filters.status)
      if (filters.clientId) searchParams.set('clientId', filters.clientId)
      if (filters.startDate) searchParams.set('startDate', filters.startDate)
      if (filters.endDate) searchParams.set('endDate', filters.endDate)
      searchParams.set('export', 'csv')
      
      const response = await fetch(`/api/reports?${searchParams.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dealvize-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      // Fallback to current basic export
      const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`
      
      const totalRevenue = deals
        .filter(deal => deal.status === 'Closed')
        .reduce((sum, deal) => {
          const value = parseFloat(deal.value.replace(/[$,]/g, '')) || 0
          return sum + value
        }, 0)
      
      const data = [
        ['Metric', 'Value'],
        ['Total Revenue', formatCurrency(totalRevenue)],
        ['Deals Closed', deals.filter(d => d.status === 'Closed').length.toString()],
        ['Total Clients', clients.length.toString()],
        ['Avg Deal Size', formatCurrency(totalRevenue / Math.max(deals.filter(d => d.status === 'Closed').length, 1))]
      ]
      
      const csvContent = data.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `dealvize-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }
  }

  const handleDateRangeChange = (range: string) => {
    onFiltersChange({ dateRange: range })
  }

  const handleCustomDateRange = (startDate: string, endDate: string) => {
    onFiltersChange({ 
      dateRange: 'custom',
      startDate,
      endDate
    })
    setDateRangeDialogOpen(false)
  }

  const handleFilterApply = (status: string, clientId: string) => {
    onFiltersChange({ 
      status: status || undefined,
      clientId: clientId || undefined
    })
    setFilterDialogOpen(false)
  }

  const clearFilters = () => {
    onFiltersChange({
      status: undefined,
      clientId: undefined,
      startDate: undefined,
      endDate: undefined,
      dateRange: '30days'
    })
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          {(filters.status || filters.clientId) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
        
        <div className="w-80">
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-4">
          <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {(filters.status || filters.clientId) && (
                  <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {[filters.status, filters.clientId].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter Reports</DialogTitle>
              </DialogHeader>
              <FilterDialog 
                currentStatus={filters.status}
                currentClientId={filters.clientId}
                onApply={handleFilterApply}
                deals={deals}
                clients={clients}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={dateRangeDialogOpen} onOpenChange={setDateRangeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Date Range
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Custom Date Range</DialogTitle>
              </DialogHeader>
              <DateRangeDialog 
                startDate={filters.startDate}
                endDate={filters.endDate}
                onApply={handleCustomDateRange}
              />
            </DialogContent>
          </Dialog>

          <Button className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>
    </header>
  )
}

function FilterDialog({ 
  currentStatus, 
  currentClientId, 
  onApply, 
  deals, 
  clients 
}: {
  currentStatus?: string
  currentClientId?: string
  onApply: (status: string, clientId: string) => void
  deals: any[]
  clients: any[]
}) {
  const [status, setStatus] = useState(currentStatus || '')
  const [clientId, setClientId] = useState(currentClientId || '')

  const handleApply = () => {
    onApply(status, clientId)
  }

  const statuses = [...new Set(deals.map(deal => deal.status))].filter(Boolean)

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="status">Deal Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="client">Client</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleApply} className="flex-1">
          Apply Filters
        </Button>
        <Button variant="outline" onClick={() => { setStatus(''); setClientId('') }}>
          Clear
        </Button>
      </div>
    </div>
  )
}

function DateRangeDialog({ 
  startDate, 
  endDate, 
  onApply 
}: {
  startDate?: string
  endDate?: string
  onApply: (startDate: string, endDate: string) => void
}) {
  const [start, setStart] = useState(startDate || '')
  const [end, setEnd] = useState(endDate || '')

  const handleApply = () => {
    if (start && end) {
      onApply(start, end)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="startDate">Start Date</Label>
        <Input 
          id="startDate"
          type="date" 
          value={start} 
          onChange={(e) => setStart(e.target.value)} 
        />
      </div>

      <div>
        <Label htmlFor="endDate">End Date</Label>
        <Input 
          id="endDate"
          type="date" 
          value={end} 
          onChange={(e) => setEnd(e.target.value)} 
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={handleApply} disabled={!start || !end} className="flex-1">
          Apply Date Range
        </Button>
      </div>
    </div>
  )
}

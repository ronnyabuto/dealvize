"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Filter, TrendingUp, Calendar, DollarSign, Home, X, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalSearch } from "@/components/shared/global-search"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface DealsHeaderProps {
  onSearchChange: (search: string) => void
  onStatusChange: (status: string) => void
  onFiltersChange: (filters: DealFilters) => void
}

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

export function DealsHeader({ onSearchChange, onStatusChange, onFiltersChange }: DealsHeaderProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState<DealFilters>({
    status: '',
    propertyType: '',
    minValue: '',
    maxValue: '',
    dateRange: { from: undefined, to: undefined }
  })
  const [showFilters, setShowFilters] = useState(false)

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Lead', label: 'Lead' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Under Contract', label: 'Under Contract' },
    { value: 'Closed', label: 'Closed' },
    { value: 'Lost', label: 'Lost' }
  ]

  const propertyTypes = [
    { value: '', label: 'All Property Types' },
    { value: 'Single Family', label: 'Single Family' },
    { value: 'Condo', label: 'Condo' },
    { value: 'Townhouse', label: 'Townhouse' },
    { value: 'Multi-Family', label: 'Multi-Family' },
    { value: 'Commercial', label: 'Commercial' },
    { value: 'Land', label: 'Land' }
  ]

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchChange(searchValue)
  }

  const handleStatusSelect = (status: string) => {
    const newFilters = { ...filters, status }
    setFilters(newFilters)
    onStatusChange(status)
    onFiltersChange(newFilters)
  }

  const handleFilterChange = (key: keyof DealFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const emptyFilters: DealFilters = {
      status: '',
      propertyType: '',
      minValue: '',
      maxValue: '',
      dateRange: { from: undefined, to: undefined }
    }
    setFilters(emptyFilters)
    onStatusChange('')
    onFiltersChange(emptyFilters)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.status) count++
    if (filters.propertyType) count++
    if (filters.minValue || filters.maxValue) count++
    if (filters.dateRange.from || filters.dateRange.to) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  const handleAddDeal = () => {
    router.push('/deals/new')
  }

  const handleViewPipeline = () => {
    router.push('/deals/pipeline')
  }

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams()
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.propertyType) queryParams.append('property_type', filters.propertyType)
      if (filters.minValue) queryParams.append('min_value', filters.minValue)
      if (filters.maxValue) queryParams.append('max_value', filters.maxValue)
      if (filters.dateRange.from) queryParams.append('date_from', filters.dateRange.from.toISOString())
      if (filters.dateRange.to) queryParams.append('date_to', filters.dateRange.to.toISOString())
      
      const response = await fetch(`/api/deals/export?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deals-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export deals. Please try again.')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-slate-900">Deals</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Search for all content types */}
            <div className="w-80">
              <GlobalSearch />
            </div>
            
            {/* Local search for deals filtering */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Filter deals..." 
                className="pl-10 w-60" 
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                title="Filter deals on this page"
              />
            </form>

            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Filters</h3>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Property Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Property Type</label>
                    <Select value={filters.propertyType} onValueChange={(value) => handleFilterChange('propertyType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Deal Value Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Deal Value Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          placeholder="Min value"
                          value={filters.minValue}
                          onChange={(e) => handleFilterChange('minValue', e.target.value)}
                          type="number"
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Max value"
                          value={filters.maxValue}
                          onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                          type="number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expected Close Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {filters.dateRange?.from ? (
                            filters.dateRange.to ? (
                              <>
                                {filters.dateRange.from.toLocaleDateString()} -{" "}
                                {filters.dateRange.to.toLocaleDateString()}
                              </>
                            ) : (
                              filters.dateRange.from.toLocaleDateString()
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={filters.dateRange?.from}
                          selected={filters.dateRange}
                          onSelect={(range) => handleFilterChange('dateRange', range)}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button variant="outline" size="sm" onClick={handleViewPipeline}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Pipeline
            </Button>

            <Button 
              className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white"
              onClick={handleAddDeal}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="px-6 py-2 bg-gray-50 border-t">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Active filters:</span>
            {filters.status && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Status: {statusOptions.find(opt => opt.value === filters.status)?.label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('status', '')}
                />
              </Badge>
            )}
            {filters.propertyType && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Type: {propertyTypes.find(type => type.value === filters.propertyType)?.label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('propertyType', '')}
                />
              </Badge>
            )}
            {(filters.minValue || filters.maxValue) && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Value: ${filters.minValue || '0'} - ${filters.maxValue || '∞'}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    handleFilterChange('minValue', '')
                    handleFilterChange('maxValue', '')
                  }}
                />
              </Badge>
            )}
            {(filters.dateRange.from || filters.dateRange.to) && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Date: {filters.dateRange.from?.toLocaleDateString() || 'Start'} - {filters.dateRange.to?.toLocaleDateString() || 'End'}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('dateRange', { from: undefined, to: undefined })}
                />
              </Badge>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

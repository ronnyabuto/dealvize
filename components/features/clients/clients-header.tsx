"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Filter, Download, X, ArrowUpDown, ArrowUp, ArrowDown, Upload, FileText, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalSearch } from "@/components/shared/global-search"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { SmartImportDialog } from "@/components/features/clients/smart-import-dialog"

interface ClientsHeaderProps {
  onSearchChange: (search: string) => void
  onStatusFilter: (status: string) => void
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  onExport?: () => void
  onImport?: (file: File) => void
  currentSearch: string
  currentStatus: string
  currentSort?: { field: string; order: 'asc' | 'desc' }
  totalCount: number
}

export function ClientsHeader({ 
  onSearchChange, 
  onStatusFilter, 
  onSortChange,
  onExport,
  onImport,
  currentSearch, 
  currentStatus, 
  currentSort,
  totalCount 
}: ClientsHeaderProps) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(currentSearch)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const statusOptions = [
    { value: '', label: 'All Status', count: totalCount },
    { value: 'Buyer', label: 'Buyer' },
    { value: 'Seller', label: 'Seller' },
    { value: 'In Contract', label: 'In Contract' }
  ]

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'lastContact', label: 'Last Contact' },
    { value: 'dealValue', label: 'Deal Value' },
    { value: 'createdAt', label: 'Date Added' },
    { value: 'status', label: 'Status' }
  ]

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchChange(searchValue)
  }

  const handleSearchClear = () => {
    setSearchValue('')
    onSearchChange('')
  }

  const handleStatusSelect = (status: string) => {
    onStatusFilter(status)
  }

  const handleSortSelect = (field: string) => {
    if (!onSortChange) return
    
    const newOrder = currentSort?.field === field && currentSort?.order === 'asc' ? 'desc' : 'asc'
    onSortChange(field, newOrder)
  }

  const handleAddClient = () => {
    router.push('/clients/new')
  }

  const handleExport = () => {
    if (onExport) {
      onExport()
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onImport) {
      if (file.type !== 'text/csv') {
        alert('Please select a CSV file')
        return
      }
      onImport(file)
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/import/templates?type=clients')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'clients_import_template.csv'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Failed to download template')
      }
    } catch (error) {
      console.error('Error downloading template:', error)
      alert('Failed to download template')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <SidebarTrigger />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Clients</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
              {totalCount} {totalCount === 1 ? 'client' : 'clients'}
              {currentStatus && ` · ${currentStatus}`}
              {currentSearch && ` · Search: "${currentSearch}"`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2 lg:gap-4">
          {/* Global Search for all content types */}
          <div className="order-1 w-full sm:w-64 lg:w-80">
            <GlobalSearch />
          </div>

          {/* Local search for client filtering */}
          <form onSubmit={handleSearchSubmit} className="relative order-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Filter clients..." 
              className="pl-10 pr-10 w-full sm:w-60 lg:w-72" 
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              title="Filter clients on this page"
            />
            {searchValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={handleSearchClear}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </form>

          {/* Action buttons */}
          <div className="flex items-center gap-2 order-2">
            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Filter className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Filter</span>
                {currentStatus && (
                  <Badge variant="secondary" className="ml-2 hidden sm:inline-flex">
                    {currentStatus}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={currentStatus === option.value ? 'bg-blue-50' : ''}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <Badge variant="outline" className="ml-2">
                        {option.count}
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
              {currentStatus && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleStatusSelect('')}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <ArrowUpDown className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sort</span>
                {currentSort && (
                  <div className="ml-2 flex items-center">
                    {currentSort.order === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleSortSelect(option.value)}
                  className={currentSort?.field === option.value ? 'bg-blue-50' : ''}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {currentSort?.field === option.value && (
                      <div className="ml-2">
                        {currentSort.order === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:flex flex-shrink-0">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Import Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <FileText className="h-4 w-4 mr-2" />
                Download Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportClick}>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV File
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1">
                <SmartImportDialog 
                  onClientCreated={(client) => {
                    // Refresh the client list when a new client is created
                    window.location.reload()
                  }}
                  trigger={
                    <Button variant="ghost" size="sm" className="w-full justify-start h-8 px-2 py-1.5">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Smart Import
                    </Button>
                  }
                />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex flex-shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          {/* Add Client */}
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0" 
            size="sm"
            onClick={handleAddClient}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Client</span>
          </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

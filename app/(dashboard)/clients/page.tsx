'use client'

import { useState } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { ClientsHeader } from "@/components/features/clients/clients-header"
import { ClientsList } from "@/components/features/clients/clients-list"
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"
import { useClients } from "@/hooks/use-clients"

export const dynamic = 'force-dynamic'

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<{ field: string; order: 'asc' | 'desc' }>({ field: 'name', order: 'asc' })
  const [page, setPage] = useState(1)
  const limit = 10

  const { totalCount, exportClients, importClients, refreshClients } = useClients({ 
    search, 
    status, 
    page, 
    limit, 
    sortBy: sort.field, 
    sortOrder: sort.order 
  })

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch)
    setPage(1) // Reset to first page when searching
  }

  const handleStatusFilter = (newStatus: string) => {
    setStatus(newStatus)
    setPage(1) // Reset to first page when filtering
  }

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    setSort({ field, order })
    setPage(1) // Reset to first page when sorting
  }

  const handleImport = async (file: File) => {
    try {
      const success = await importClients(file)
      if (success) {
        alert('Clients imported successfully!')
        refreshClients()
        setPage(1) // Reset to first page after import
      } else {
        alert('Import failed. Please check your file format and try again.')
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed. Please try again.')
    }
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <ClientsHeader 
            onSearchChange={handleSearchChange}
            onStatusFilter={handleStatusFilter}
            onSortChange={handleSortChange}
            onExport={exportClients}
            onImport={handleImport}
            currentSearch={search}
            currentStatus={status}
            currentSort={sort}
            totalCount={totalCount}
          />
          <main className="p-6">
            <BreadcrumbNav />
            <ClientsList 
              search={search}
              status={status}
              page={page}
              limit={limit}
              sortBy={sort.field}
              sortOrder={sort.order}
            />
            {/* TODO: Add pagination component */}
          </main>
        </div>
      </SidebarInset>
    </>
  )
}

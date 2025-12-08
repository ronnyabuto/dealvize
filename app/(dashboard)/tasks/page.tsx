'use client'

import { useState } from 'react'
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { TasksHeader } from "@/components/layout/tasks-header"
import { TasksList } from "@/components/tasks-list"
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"

export const dynamic = 'force-dynamic'

export default function TasksPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [dueSoon, setDueSoon] = useState(false)
  const [overdue, setOverdue] = useState(false)

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <TasksHeader 
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onPriorityChange={setPriority}
            onDueSoonChange={setDueSoon}
            onOverdueChange={setOverdue}
            currentSearch={search}
            currentStatus={status}
            currentPriority={priority}
            dueSoon={dueSoon}
            overdue={overdue}
          />
          <main className="p-6">
            <BreadcrumbNav />
            <TasksList 
              search={search}
              status={status}
              priority={priority}
              dueSoon={dueSoon}
              overdue={overdue}
            />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}

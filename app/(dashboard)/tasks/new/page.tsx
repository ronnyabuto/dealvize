'use client'

import { Suspense } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TaskForm } from "@/components/task-form"

export const dynamic = 'force-dynamic'

export default function NewTaskPage() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Add New Task</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Create a new task to track your work and deadlines
                </p>
              </div>
            </div>
          </header>
          <main className="p-6">
            <Suspense fallback={<div>Loading...</div>}>
              <TaskForm mode="create" />
            </Suspense>
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
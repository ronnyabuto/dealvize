'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TaskForm } from "@/components/task-form"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
export const dynamic = 'force-dynamic'

export default function EditTaskPage() {
  const params = useParams()
  const router = useRouter()
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTask = async () => {
      if (!params.id) return
      
      try {
        setLoading(true)
        setError(null)

        // Use the API route instead of direct Supabase calls
        const response = await fetch(`/api/tasks/${params.id}`, {
          credentials: 'include'
        })

        if (!response.ok) {
          if (response.status === 404) {
            setError('Task not found')
          } else {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to fetch task')
          }
          return
        }

        const data = await response.json()

        // Transform the task data to match the expected format
        const transformedTask = {
          id: data.id,
          title: data.title,
          description: data.description || '',
          dueDate: data.due_date || '',
          priority: data.priority || 'Medium',
          status: data.status || 'Pending',
          type: data.type || 'Other',
          clientId: data.client_id || '',
          dealId: data.deal_id || '',
          client: data.clients ? {
            name: data.clients.name || 'Unknown Client',
            initials: data.clients.initials || 
              (data.clients.name
                ? data.clients.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2)
                : 'UC')
          } : undefined,
          deal: data.deals ? {
            title: data.deals.title
          } : undefined
        }

        setTask(transformedTask)
      } catch (err: any) {
        setError(err.message || 'Failed to load task')
        console.error('Error fetching task:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTask()
  }, [params.id])

  if (loading) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading task...</span>
            </div>
          </div>
        </SidebarInset>
      </>
    )
  }

  if (error || !task) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Task not found'}
              </AlertDescription>
            </Alert>
          </div>
        </SidebarInset>
      </>
    )
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Edit Task</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Update task information and requirements
                </p>
              </div>
            </div>
          </header>
          <main className="p-6">
            <TaskForm task={task} mode="edit" />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
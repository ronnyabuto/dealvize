'use client'

import { useState, useEffect } from 'react'
import { useResource, createResourceHook, type ResourceOptions } from './use-resource'
import { type Task } from '@/lib/types'

interface UseTasksOptions extends ResourceOptions {
  status?: string
  priority?: string
  clientId?: string
  dealId?: string
  dueSoon?: boolean
  overdue?: boolean
}

interface UseTasksReturn {
  tasks: Task[]
  loading: boolean
  error: string | null
  totalCount: number
  createTask: (taskData: Partial<Task>) => Promise<Task | null>
  updateTask: (id: string, taskData: Partial<Task>) => Promise<Task | null>
  deleteTask: (id: string) => Promise<boolean>
  toggleTaskComplete: (id: string, completed: boolean) => Promise<boolean>
  refreshTasks: () => Promise<void>
}

// Utility functions for task data transformation
const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'Low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

const formatDate = (dateString: string): string => {
  if (!dateString) return 'No due date'
  
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Reset time for comparison
  today.setHours(0, 0, 0, 0)
  yesterday.setHours(0, 0, 0, 0)
  tomorrow.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === yesterday.getTime()) return 'Yesterday'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const transformTaskData = (taskData: any): Task => {
  return {
    id: taskData.id,
    title: taskData.title,
    description: taskData.description || '',
    dueDate: formatDate(taskData.due_date),
    priority: taskData.priority as Task['priority'],
    priorityColor: getPriorityColor(taskData.priority),
    status: taskData.status as Task['status'],
    assignedTo: taskData.assigned_to,
    clientId: taskData.client_id,
    dealId: taskData.deal_id,
    type: taskData.type as Task['type'],
    client: taskData.clients ? {
      first_name: taskData.clients.first_name || '',
      last_name: taskData.clients.last_name || '',
      initials: taskData.clients.initials || 
        (taskData.clients.first_name && taskData.clients.last_name
          ? `${taskData.clients.first_name.charAt(0)}${taskData.clients.last_name.charAt(0)}`.toUpperCase()
          : 'UC')
    } : undefined,
    deal: taskData.deals ? {
      title: taskData.deals.title
    } : undefined,
    completed: taskData.status === 'Completed'
  }
}

// Create the task-specific hook using the generic resource pattern
const useTasksResource = createResourceHook<Task>({
  tableName: 'tasks',
  selectQuery: `
    *,
    clients (
      id,
      first_name,
      last_name,
      initials
    ),
    deals (
      id,
      title
    )
  `,
  transformData: transformTaskData,
  defaultOrderBy: { column: 'due_date', ascending: true }
})

export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const { status, priority, clientId, dealId, dueSoon, overdue, ...resourceOptions } = options
  
  // Override the resource hook to use our own fetch implementation for tasks
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters
      const searchParams = new URLSearchParams()
      if (options.search) searchParams.set('search', options.search)
      if (status) searchParams.set('status', status)
      if (priority) searchParams.set('priority', priority)
      if (clientId) searchParams.set('client_id', clientId)
      if (dealId) searchParams.set('deal_id', dealId)
      if (dueSoon) searchParams.set('due_soon', 'true')
      if (overdue) searchParams.set('overdue', 'true')
      
      const response = await fetch(`/api/tasks?${searchParams.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data = await response.json()
      const transformedTasks = (data.tasks || []).map(transformTaskData)
      
      setTasks(transformedTasks)
      setTotalCount(transformedTasks.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Re-fetch when parameters change
  useEffect(() => {
    fetchTasks()
  }, [options.search, status, priority, clientId, dealId, dueSoon, overdue])

  const refresh = fetchTasks

  // Create wrapper functions that handle task-specific data transformation
  const createTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    try {
      const requestData = {
        title: taskData.title,
        description: taskData.description || '',
        due_date: taskData.dueDate || null,
        priority: taskData.priority || 'Medium',
        status: taskData.status || 'Pending',
        client_id: taskData.clientId && taskData.clientId !== 'none' ? taskData.clientId : null,
        deal_id: taskData.dealId && taskData.dealId !== 'none' ? taskData.dealId : null,
        type: taskData.type || 'Other'
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || `Failed to create task (${response.status})`)
      }

      const createdTask = await response.json()
      const transformedTask = transformTaskData(createdTask)
      
      // Update local state
      setTasks([transformedTask, ...tasks])
      
      // Refresh the data to get updated count
      await refresh()
      
      return transformedTask
    } catch (error) {
      console.error('Error creating task:', error)
      return null
    }
  }

  const updateTask = async (id: string, taskData: Partial<Task>): Promise<Task | null> => {
    try {
      const updateData: any = {}
      
      if (taskData.title !== undefined) updateData.title = taskData.title
      if (taskData.description !== undefined) updateData.description = taskData.description
      if (taskData.dueDate !== undefined) updateData.due_date = taskData.dueDate
      if (taskData.priority !== undefined) updateData.priority = taskData.priority
      if (taskData.status !== undefined) updateData.status = taskData.status
      if (taskData.assignedTo !== undefined) updateData.assigned_to = taskData.assignedTo
      if (taskData.type !== undefined) updateData.type = taskData.type

      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update task')
      }

      const updatedTask = await response.json()
      const transformedTask = transformTaskData(updatedTask)
      
      // Update local state
      setTasks(tasks.map(task => task.id === id ? transformedTask : task))
      
      return transformedTask
    } catch (error) {
      console.error('Error updating task:', error)
      return null
    }
  }

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      // Remove from local state
      setTasks(tasks.filter(task => task.id !== id))
      
      return true
    } catch (error) {
      console.error('Error deleting task:', error)
      return false
    }
  }

  const toggleTaskComplete = async (id: string, completed: boolean): Promise<boolean> => {
    try {
      const status = completed ? 'Completed' : 'Pending'
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Task toggle error:', errorData)
        throw new Error(errorData.error || 'Failed to update task')
      }

      const updatedTask = await response.json()
      const transformedTask = transformTaskData(updatedTask)
      
      // Update local state
      setTasks(tasks.map(task => task.id === id ? transformedTask : task))
      
      return true
    } catch (error) {
      console.error('Error toggling task completion:', error)
      return false
    }
  }

  const refreshTasks = refresh

  return {
    tasks,
    loading,
    error,
    totalCount,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    refreshTasks
  }
}